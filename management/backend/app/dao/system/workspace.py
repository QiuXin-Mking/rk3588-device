import uuid
from typing import Any

from sqlalchemy import text
from sqlmodel import col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.dao.workspace.business_line import get_business_line_ids_with_descendants
from app.model.common import get_datetime_utc
from app.model.system.workspace import (
    MemberRoleLink,
    Workspace,
    WorkspaceCreate,
    WorkspaceListFilter,
    WorkspaceMember,
    WorkspaceMemberCreate,
    WorkspaceMemberListFilter,
    WorkspaceMemberUpdate,
    WorkspaceMenuLink,
    WorkspaceUpdate,
)
from app.model.workspace.business_line import BusinessLine

# --- Workspace DAO ---


async def create_workspace(
    *, session: AsyncSession, workspace_create: WorkspaceCreate
) -> Workspace:
    db_obj = Workspace.model_validate(workspace_create)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)

    # 自动为主工作区创建对应的 administrator 成员
    from app.dao.system.user import create_user, get_user_by_username
    from app.model.system.user import UserCreate

    admin_username = f"admin-{db_obj.name}"
    user = await get_user_by_username(session=session, username=admin_username)

    if not user:
        # 如果不存在，则创建对应的 admin 登录账号，密码与账号同名
        user_in = UserCreate(username=admin_username, password=admin_username)
        user = await create_user(session=session, user_create=user_in)

    # 将其自动加入并激活
    db_member = WorkspaceMember(
        account_id=user.id,
        workspace_id=db_obj.id,
        job_number="001",
        employee_name="超级管理员",
        is_active=True,
    )
    session.add(db_member)
    await session.commit()

    return db_obj


async def get_workspace_by_id(
    *, session: AsyncSession, workspace_id: uuid.UUID
) -> Workspace | None:
    statement = select(Workspace).where(Workspace.id == workspace_id)
    result = await session.exec(statement)
    return result.first()


async def get_workspaces(
    *, session: AsyncSession, filters: WorkspaceListFilter
) -> tuple[int, list[Workspace]]:
    count_statement = select(func.count()).select_from(Workspace)

    if filters.name:
        count_statement = count_statement.where(
            col(Workspace.name).contains(filters.name)
        )
    if filters.is_active is not None:
        count_statement = count_statement.where(
            Workspace.is_active == filters.is_active
        )

    result_count = await session.exec(count_statement)
    count = result_count.one()

    statement = select(Workspace)
    if filters.name:
        statement = statement.where(col(Workspace.name).contains(filters.name))
    if filters.is_active is not None:
        statement = statement.where(Workspace.is_active == filters.is_active)

    statement = (
        statement.order_by(col(Workspace.created_at).desc())
        .offset(filters.skip)
        .limit(filters.limit)
    )
    result_workspaces = await session.exec(statement)
    workspaces = result_workspaces.all()
    return count, list(workspaces)


async def get_workspaces_me(
    *, session: AsyncSession, user_id: uuid.UUID
) -> list[tuple[WorkspaceMember, Workspace]]:
    statement = (
        select(WorkspaceMember, Workspace)
        .join(Workspace, onclause=WorkspaceMember.workspace_id == Workspace.id)  # ty: ignore
        .where(
            WorkspaceMember.account_id == user_id,
            WorkspaceMember.is_active,
            Workspace.is_active,
        )
        .execution_options(exempt_workspace_filter=True)
    )
    result = await session.exec(statement)
    return list(result.all())


async def update_workspace(
    *, session: AsyncSession, db_workspace: Workspace, workspace_in: WorkspaceUpdate
) -> Workspace:
    workspace_data = workspace_in.model_dump(exclude_unset=True)
    db_workspace.sqlmodel_update(workspace_data)
    session.add(db_workspace)
    await session.commit()
    await session.refresh(db_workspace)
    return db_workspace


async def delete_workspace(*, session: AsyncSession, db_workspace: Workspace) -> None:
    db_workspace.deleted_at = get_datetime_utc()
    session.add(db_workspace)
    await session.commit()


# --- WorkspaceMember DAO ---


async def next_work_serial_number(*, session: AsyncSession) -> str:
    """Return the next globally unique, human-readable operator serial number."""
    await session.exec(
        text("SELECT pg_advisory_xact_lock(:lock_id)"),
        params={"lock_id": 682_358_800_001},
    )
    statement = (
        select(WorkspaceMember.work_serial_number)
        .where(
            col(WorkspaceMember.work_serial_number).op("~")(r"^OP-[0-9]{8}$")
        )
        .order_by(col(WorkspaceMember.work_serial_number).desc())
        .limit(1)
        .execution_options(exempt_workspace_filter=True)
    )
    result = await session.exec(statement)
    latest = result.first()
    next_number = int((latest or "OP-00000000").removeprefix("OP-")) + 1
    return f"OP-{next_number:08d}"


async def create_workspace_member(
    *, session: AsyncSession, member_create: WorkspaceMemberCreate
) -> WorkspaceMember:
    from app.dao.system.user import create_user, get_user_by_username
    from app.model.system.user import UserCreate

    # 1. Look up user by username
    user = await get_user_by_username(session=session, username=member_create.username)

    # 2. Automatically create User if not found
    if not user:
        # Generate a default or use the provided password
        pwd = member_create.new_user_password or "12345678"
        user_in = UserCreate(username=member_create.username, password=pwd)
        user = await create_user(session=session, user_create=user_in)

    # 3. Create WorkspaceMember linked to that User
    db_member_data = member_create.model_dump(
        exclude={"username", "new_user_password", "work_serial_number"}
    )
    db_member_data["account_id"] = user.id
    db_member_data["work_serial_number"] = await next_work_serial_number(
        session=session
    )

    db_obj = WorkspaceMember.model_validate(db_member_data)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def get_workspace_member_by_id(
    *, session: AsyncSession, member_id: uuid.UUID
) -> WorkspaceMember | None:
    statement = select(WorkspaceMember).where(WorkspaceMember.id == member_id)
    result = await session.exec(statement)
    return result.first()


async def get_workspace_members(
    *,
    session: AsyncSession,
    workspace_id: uuid.UUID,
    filters: WorkspaceMemberListFilter,
) -> tuple[int, list[WorkspaceMember]]:
    business_line_external_ids: list[str] | None = None
    if filters.business_line_ids:
        business_line_ids = await get_business_line_ids_with_descendants(
            session=session, business_line_ids=filters.business_line_ids
        )
        external_ids_statement = select(BusinessLine.external_id).where(
            col(BusinessLine.id).in_(business_line_ids),
            BusinessLine.workspace_id == workspace_id,
            col(BusinessLine.external_id).is_not(None),
        )
        external_ids_result = await session.exec(external_ids_statement)
        business_line_external_ids = [
            external_id
            for external_id in external_ids_result.all()
            if external_id is not None
        ]

    def _apply_filters(stmt: Any) -> Any:
        if filters.job_number:
            stmt = stmt.where(
                col(WorkspaceMember.job_number).contains(filters.job_number)
            )
        if filters.employee_name:
            stmt = stmt.where(
                col(WorkspaceMember.employee_name).contains(filters.employee_name)
            )
        if filters.sex:
            stmt = stmt.where(WorkspaceMember.sex == filters.sex)
        if filters.mobile:
            stmt = stmt.where(col(WorkspaceMember.mobile).contains(filters.mobile))
        if filters.employee_status:
            stmt = stmt.where(
                WorkspaceMember.employee_status == filters.employee_status
            )
        if filters.is_active is not None:
            stmt = stmt.where(WorkspaceMember.is_active == filters.is_active)
        if filters.account_ids:
            stmt = stmt.where(col(WorkspaceMember.account_id).in_(filters.account_ids))
        if filters.business_line_ids:
            stmt = stmt.where(
                col(WorkspaceMember.main_dept_id).in_(
                    business_line_external_ids or []
                )
            )
        return stmt

    count_statement = (
        select(func.count())
        .select_from(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    count_statement = _apply_filters(count_statement)

    result_count = await session.exec(count_statement)
    count = result_count.one()

    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id
    )
    statement = _apply_filters(statement)

    statement = (
        statement.order_by(col(WorkspaceMember.created_at).desc())
        .offset(filters.skip)
        .limit(filters.limit)
    )
    result_members = await session.exec(statement)
    return count, list(result_members.all())


async def update_workspace_member(
    *,
    session: AsyncSession,
    db_member: WorkspaceMember,
    member_in: WorkspaceMemberUpdate,
) -> WorkspaceMember:
    member_data = member_in.model_dump(exclude_unset=True)
    member_data.pop("work_serial_number", None)
    db_member.sqlmodel_update(member_data)
    session.add(db_member)
    await session.commit()
    await session.refresh(db_member)
    return db_member


async def get_workspace_members_by_ids(
    *,
    session: AsyncSession,
    workspace_id: uuid.UUID,
    member_ids: list[uuid.UUID],
) -> list[WorkspaceMember]:
    statement = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        col(WorkspaceMember.id).in_(member_ids),
    )
    result = await session.exec(statement)
    return list(result.all())


async def enable_workspace_members(
    *, session: AsyncSession, members: list[WorkspaceMember]
) -> int:
    changed_count = 0
    for member in members:
        if not member.is_active:
            member.is_active = True
            session.add(member)
            changed_count += 1
    await session.commit()
    return changed_count


async def delete_workspace_member(
    *, session: AsyncSession, db_member: WorkspaceMember
) -> None:
    db_member.deleted_at = get_datetime_utc()
    session.add(db_member)
    await session.commit()


async def set_workspacemember_roles(
    *, session: AsyncSession, member_id: uuid.UUID, role_ids: list[uuid.UUID]
) -> None:
    """
    Synchronize the member's roles to exactly match the provided list of role_ids.
    """
    # First, get current roles
    statement = select(MemberRoleLink).where(MemberRoleLink.member_id == member_id)
    result = await session.exec(statement)
    current_links = result.all()

    current_role_ids = {link.role_id for link in current_links}
    target_role_ids = set(role_ids)

    # Roles to add
    roles_to_add = target_role_ids - current_role_ids
    for r_id in roles_to_add:
        session.add(MemberRoleLink(member_id=member_id, role_id=r_id))

    # Roles to remove
    roles_to_remove = current_role_ids - target_role_ids
    for link in current_links:
        if link.role_id in roles_to_remove:
            await session.delete(link)

    await session.commit()


async def add_workspacemember_roles(
    *,
    session: AsyncSession,
    member_ids: list[uuid.UUID],
    role_ids: list[uuid.UUID],
) -> int:
    """Add missing member-role links without removing existing assignments."""
    if not member_ids or not role_ids:
        return 0

    statement = select(MemberRoleLink).where(
        col(MemberRoleLink.member_id).in_(member_ids),
        col(MemberRoleLink.role_id).in_(role_ids),
    )
    result = await session.exec(statement)
    existing_links = {(link.member_id, link.role_id) for link in result.all()}

    added_count = 0
    for member_id in set(member_ids):
        for role_id in set(role_ids):
            if (member_id, role_id) in existing_links:
                continue
            session.add(MemberRoleLink(member_id=member_id, role_id=role_id))
            added_count += 1

    await session.commit()
    return added_count


async def get_workspacemember_roles(
    *, session: AsyncSession, member_id: uuid.UUID
) -> list[uuid.UUID]:
    """
    Get role IDs currently assigned to a workspace member.
    """
    statement = select(MemberRoleLink.role_id).where(
        MemberRoleLink.member_id == member_id
    )
    result = await session.exec(statement)
    return list(result.all())


async def get_workspace_menus(
    *, session: AsyncSession, workspace_id: uuid.UUID
) -> list[uuid.UUID]:
    """
    Get menu IDs bound to a workspace.
    """
    statement = select(WorkspaceMenuLink.menu_id).where(
        WorkspaceMenuLink.workspace_id == workspace_id
    )
    result = await session.exec(statement)
    return list(result.all())


async def append_workspace_menus(
    *, session: AsyncSession, workspace_id: uuid.UUID, menu_ids: list[uuid.UUID]
) -> None:
    """Add menus to a workspace without removing existing bindings."""
    if not menu_ids:
        return
    current_menu_ids = await get_workspace_menus(
        session=session, workspace_id=workspace_id
    )
    merged_menu_ids = list({*current_menu_ids, *menu_ids})
    await set_workspace_menus(
        session=session, workspace_id=workspace_id, menu_ids=merged_menu_ids
    )


async def set_workspace_menus(
    *, session: AsyncSession, workspace_id: uuid.UUID, menu_ids: list[uuid.UUID]
) -> None:
    """
    Synchronize the workspace's menus to exactly match the provided list of menu_ids.
    """
    # First, get current menus
    statement = select(WorkspaceMenuLink).where(
        WorkspaceMenuLink.workspace_id == workspace_id
    )
    result = await session.exec(statement)
    current_links = result.all()

    current_menu_ids = {link.menu_id for link in current_links}
    target_menu_ids = set(menu_ids)

    # Menus to add
    menus_to_add = target_menu_ids - current_menu_ids
    for m_id in menus_to_add:
        session.add(WorkspaceMenuLink(workspace_id=workspace_id, menu_id=m_id))

    # Menus to remove
    menus_to_remove = current_menu_ids - target_menu_ids
    for link in current_links:
        if link.menu_id in menus_to_remove:
            await session.delete(link)

    await session.commit()
