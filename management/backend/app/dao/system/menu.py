import uuid

from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.exceptions import BusinessException
from app.model.common import get_datetime_utc
from app.model.system.menu import (
    Menu,
    MenuCreate,
    MenuListFilter,
    MenuTreeNode,
    MenuUpdate,
)
from app.model.system.workspace import WorkspaceMenuLink


async def create_menu(*, session: AsyncSession, menu_create: MenuCreate) -> Menu:
    db_obj = Menu.model_validate(menu_create)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def get_menu_by_id(*, session: AsyncSession, menu_id: uuid.UUID) -> Menu | None:
    statement = select(Menu).where(Menu.id == menu_id)
    result = await session.exec(statement)
    return result.first()


async def get_menus_all(
    *, session: AsyncSession, is_active: bool | None = None, type: int | None = None
) -> list[Menu]:
    statement = select(Menu).order_by(col(Menu.sort).asc())
    if is_active is not None:
        statement = statement.where(Menu.is_active == is_active)
    if type is not None:
        statement = statement.where(Menu.type == type)

    result = await session.exec(statement)
    return list(result.all())


async def update_menu(
    *, session: AsyncSession, db_menu: Menu, menu_in: MenuUpdate
) -> Menu:
    menu_data = menu_in.model_dump(exclude_unset=True)
    db_menu.sqlmodel_update(menu_data)
    session.add(db_menu)
    await session.commit()
    await session.refresh(db_menu)
    return db_menu


async def delete_menu(*, session: AsyncSession, db_menu: Menu) -> None:
    statement = select(Menu).where(Menu.parent_id == db_menu.id)
    result = await session.exec(statement)
    if result.first():
        raise BusinessException(
            msg="Cannot delete menu with active sub-menus. Please delete them first.",
            code=400,
        )
    db_menu.deleted_at = get_datetime_utc()
    session.add(db_menu)
    await session.commit()


def build_menus_tree(menus: list[Menu]) -> list[MenuTreeNode]:
    """
    Convert flat DB models to recursive Pydantic structures.
    """
    node_map = {m.id: MenuTreeNode.model_validate(m) for m in menus}
    tree: list[MenuTreeNode] = []

    for m in menus:
        node = node_map[m.id]
        # Only attach to parent if the parent actually exists in the current result set
        if m.parent_id and m.parent_id in node_map:
            node_map[m.parent_id].children.append(node)
        else:
            tree.append(node)

    return tree


async def get_menus_tree(
    *, session: AsyncSession, is_active: bool | None = None, type: int | None = None
) -> list[MenuTreeNode]:
    """
    Returns the hierarchy of menus as a nested tree globally.
    """
    menus = await get_menus_all(session=session, is_active=is_active, type=type)
    return build_menus_tree(menus)


async def get_menus_workspace(
    *,
    session: AsyncSession,
    workspace_id: uuid.UUID,
    is_active: bool | None = None,
    type: int | None = None,
) -> list[Menu]:
    statement = (
        select(Menu)
        .join(WorkspaceMenuLink, onclause=Menu.id == WorkspaceMenuLink.menu_id)  # ty: ignore
        .where(WorkspaceMenuLink.workspace_id == workspace_id)
        .order_by(col(Menu.sort).asc())
    )
    if is_active is not None:
        statement = statement.where(Menu.is_active == is_active)
    if type is not None:
        statement = statement.where(Menu.type == type)

    result = await session.exec(statement)
    return list(result.all())


async def get_menus_tree_workspace(
    *,
    session: AsyncSession,
    workspace_id: uuid.UUID,
    is_active: bool | None = None,
    type: int | None = None,
) -> list[MenuTreeNode]:
    """
    Returns the hierarchy of menus authorized to a specific workspace.
    """
    menus = await get_menus_workspace(
        session=session, workspace_id=workspace_id, is_active=is_active, type=type
    )
    return build_menus_tree(menus)


async def get_menus(
    *,
    session: AsyncSession,
    filters: MenuListFilter,
    workspace_id: uuid.UUID | None = None,
) -> tuple[int, list[Menu]]:
    from sqlmodel import func

    def _apply_filters(stmt):
        if workspace_id:
            stmt = stmt.join(
                WorkspaceMenuLink, onclause=Menu.id == WorkspaceMenuLink.menu_id
            )
            stmt = stmt.where(WorkspaceMenuLink.workspace_id == workspace_id)
        if filters.name:
            stmt = stmt.where(col(Menu.name).contains(filters.name))
        if filters.is_active is not None:
            stmt = stmt.where(Menu.is_active == filters.is_active)
        return stmt

    count_stmt = _apply_filters(select(func.count()).select_from(Menu))
    count = (await session.exec(count_stmt)).one()

    data_stmt = _apply_filters(select(Menu))
    data_stmt = (
        data_stmt.order_by(col(Menu.sort).asc())
        .offset(filters.skip)
        .limit(filters.limit)
    )
    result = await session.exec(data_stmt)

    return count, list(result.all())


async def get_menus_tree_me(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
) -> list[MenuTreeNode]:
    from app.model.system.workspace import MemberRoleLink, WorkspaceMember
    from app.model.workspace.role import RoleMenuLink

    statement = (
        select(Menu)
        .join(RoleMenuLink, RoleMenuLink.menu_id == Menu.id)  # ty: ignore
        .join(MemberRoleLink, MemberRoleLink.role_id == RoleMenuLink.role_id)  # ty: ignore
        .join(WorkspaceMember, WorkspaceMember.id == MemberRoleLink.member_id)  # ty: ignore
        .where(
            WorkspaceMember.account_id == user_id,
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.is_active,
            Menu.is_active,
        )
        .order_by(col(Menu.sort).asc())
    )
    result = await session.exec(statement)
    menus = list(result.all())

    # Deduplicate menus because a user might get the same menu from multiple roles
    unique_menus_map = {m.id: m for m in menus}

    # Auto-complete ancestor nodes so the navigation tree is always complete.
    # e.g. if role only assigns "角色管理" (child), we still need its parent
    # directory "系统管理" to render the sidebar correctly.
    all_ids = set(unique_menus_map.keys())
    missing_parent_ids = {
        m.parent_id
        for m in unique_menus_map.values()
        if m.parent_id and m.parent_id not in all_ids
    }
    while missing_parent_ids:
        stmt = select(Menu).where(
            col(Menu.id).in_(missing_parent_ids),  # type: ignore
            Menu.is_active,
        )
        parents = list((await session.exec(stmt)).all())
        next_missing: set[uuid.UUID] = set()
        for p in parents:
            unique_menus_map[p.id] = p
            all_ids.add(p.id)
            if p.parent_id and p.parent_id not in all_ids:
                next_missing.add(p.parent_id)
        missing_parent_ids = next_missing

    return build_menus_tree(list(unique_menus_map.values()))


def _wildcard_patterns(permission_code: str) -> list[str]:
    """Generate wildcard patterns that could match a permission code.

    e.g. 'sys:user:read' -> ['sys:user:*', 'sys:*', '*']
    """
    parts = permission_code.split(":")
    patterns: list[str] = []
    for i in range(len(parts) - 1, 0, -1):
        patterns.append(":".join(parts[:i]) + ":*")
    patterns.append("*")
    return patterns


async def has_permission(
    *,
    session: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    permission_code: str,
) -> bool:
    from app.model.system.workspace import MemberRoleLink, WorkspaceMember
    from app.model.workspace.role import RoleMenuLink

    # Match exact code + all possible wildcard ancestors
    all_codes = [permission_code, *_wildcard_patterns(permission_code)]

    statement = (
        select(1)
        .select_from(Menu)
        .join(RoleMenuLink, RoleMenuLink.menu_id == Menu.id)  # type: ignore
        .join(MemberRoleLink, MemberRoleLink.role_id == RoleMenuLink.role_id)  # type: ignore
        .join(WorkspaceMember, WorkspaceMember.id == MemberRoleLink.member_id)  # type: ignore
        .where(
            WorkspaceMember.account_id == user_id,
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.is_active,
            Menu.is_active,
            col(Menu.permission_code).in_(all_codes),
        )
    )
    result = await session.exec(statement)
    return bool(result.first())
