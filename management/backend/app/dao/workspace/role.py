import uuid
from typing import Any

from sqlmodel import col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.model.common import get_datetime_utc
from app.model.system.workspace import MemberRoleLink, WorkspaceMember
from app.model.workspace.business_line import BusinessLine
from app.model.workspace.role import (
    Role,
    RoleCreate,
    RoleListFilter,
    RoleMenuLink,
    RoleUpdate,
)


async def create_role(*, session: AsyncSession, role_create: RoleCreate) -> Role:
    db_obj = Role.model_validate(role_create)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def get_role_by_id(*, session: AsyncSession, role_id: uuid.UUID) -> Role | None:
    statement = select(Role).where(Role.id == role_id)
    result = await session.exec(statement)
    return result.first()


async def get_roles_by_ids(
    *, session: AsyncSession, workspace_id: uuid.UUID, role_ids: list[uuid.UUID]
) -> list[Role]:
    statement = select(Role).where(
        Role.workspace_id == workspace_id,
        col(Role.id).in_(role_ids),
    )
    result = await session.exec(statement)
    return list(result.all())


async def get_roles(
    *,
    session: AsyncSession,
    workspace_id: uuid.UUID,
    filters: RoleListFilter,
) -> tuple[int, list[tuple[Role, str | None]]]:
    def _apply_filters(stmt: Any) -> Any:
        if filters.role_name:
            stmt = stmt.where(col(Role.role_name).ilike(f"%{filters.role_name}%"))
        if filters.business_line_id:
            stmt = stmt.where(Role.business_line_id == filters.business_line_id)
        if filters.is_active is not None:
            stmt = stmt.where(Role.is_active == filters.is_active)
        return stmt

    count_statement = (
        select(func.count()).select_from(Role).where(Role.workspace_id == workspace_id)
    )
    count_statement = _apply_filters(count_statement)

    result_count = await session.exec(count_statement)
    count = result_count.one()

    statement = (
        select(Role, BusinessLine.name)
        .outerjoin(BusinessLine, Role.business_line_id == BusinessLine.id)  # type: ignore
        .where(Role.workspace_id == workspace_id)
    )
    statement = _apply_filters(statement)

    statement = (
        statement.order_by(col(Role.sort).asc(), col(Role.created_at).desc())
        .offset(filters.skip)
        .limit(filters.limit)
    )

    result = await session.exec(statement)
    return count, list(result.all())


async def get_role_options(
    *, session: AsyncSession, workspace_id: uuid.UUID
) -> list[tuple[Role, str | None]]:
    statement = (
        select(Role, BusinessLine.name)
        .outerjoin(BusinessLine, Role.business_line_id == BusinessLine.id)  # ty: ignore
        .where(Role.workspace_id == workspace_id, Role.is_active)
        .order_by(col(Role.sort).asc(), col(Role.created_at).desc())
    )
    result = await session.exec(statement)
    return list(result.all())


async def update_role(
    *, session: AsyncSession, db_role: Role, role_in: RoleUpdate
) -> Role:
    role_data = role_in.model_dump(exclude_unset=True)
    db_role.sqlmodel_update(role_data)
    session.add(db_role)
    await session.commit()
    await session.refresh(db_role)
    return db_role


async def delete_role(*, session: AsyncSession, db_role: Role) -> None:
    statement = select(MemberRoleLink).where(MemberRoleLink.role_id == db_role.id)
    result = await session.exec(statement)
    for link in result.all():
        await session.delete(link)

    db_role.deleted_at = get_datetime_utc()
    session.add(db_role)
    await session.commit()


async def set_role_menus(
    *, session: AsyncSession, role_id: uuid.UUID, menu_ids: list[uuid.UUID]
) -> None:
    # 1. Delete existing links
    delete_statement = select(RoleMenuLink).where(RoleMenuLink.role_id == role_id)
    existing_links = await session.exec(delete_statement)
    for link in existing_links:
        await session.delete(link)

    # 2. Add new links
    for menu_id in menu_ids:
        new_link = RoleMenuLink(role_id=role_id, menu_id=menu_id)
        session.add(new_link)

    await session.commit()


async def get_role_menus(
    *, session: AsyncSession, role_id: uuid.UUID
) -> list[uuid.UUID]:
    statement = select(RoleMenuLink.menu_id).where(RoleMenuLink.role_id == role_id)
    result = await session.exec(statement)
    return list(result.all())


async def get_role_members(
    *, session: AsyncSession, role_id: uuid.UUID
) -> list[WorkspaceMember]:
    statement = (
        select(WorkspaceMember)
        .join(MemberRoleLink, MemberRoleLink.member_id == WorkspaceMember.id)
        .where(MemberRoleLink.role_id == role_id)
        .order_by(
            col(WorkspaceMember.employee_name).asc(),
            col(WorkspaceMember.created_at).asc(),
        )
    )
    result = await session.exec(statement)
    return list(result.all())
