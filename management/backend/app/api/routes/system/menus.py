import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlmodel import select

from app import dao
from app.api.deps import (
    AsyncSessionDep,
    CurrentUser,
    get_current_active_superuser,
)
from app.core.exceptions import BusinessException
from app.model.common import GenericPage, Message
from app.model.system.menu import (
    MenuCreate,
    MenuListFilter,
    MenuPublic,
    MenuTreeNode,
    MenuUpdate,
)
from app.model.system.workspace import WorkspaceMember

router = APIRouter(prefix="/menus", tags=["system-menus"])


async def _require_workspace_membership(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    workspace_uuid: uuid.UUID,
) -> None:
    """
    Verify that the current user is an active member of the given workspace.
    Used by menu read routes where workspace is optional (dual-track: root vs tenant).
    Raises 403 if the user is not a member or their membership is inactive.
    """
    statement = (
        select(WorkspaceMember)
        .where(
            WorkspaceMember.account_id == current_user.id,
            WorkspaceMember.workspace_id == workspace_uuid,
            WorkspaceMember.is_active,
        )
        .execution_options(exempt_workspace_filter=True)
    )
    result = await session.exec(statement)
    member = result.first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


# --- READ ROUTES (Dual-Track permissions) ---


@router.get("/", response_model=GenericPage[MenuPublic])
async def read_menus(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    filters: MenuListFilter = Query(),
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> Any:
    """
    Get menus as a flat, paginated list (Admin search view).
    """
    # 造物主：无视工作区，返回所有菜单
    if current_user.is_root:
        count, menus = await dao.get_menus(session=session, filters=filters)
        return GenericPage(data=menus, count=count)

    if not x_workspace_id:
        raise BusinessException(
            code=400,
            msg="X-Workspace-Id header is required for non-superuser",
        )

    workspace_uuid = uuid.UUID(x_workspace_id)
    await _require_workspace_membership(session, current_user, workspace_uuid)
    count, menus = await dao.get_menus(
        session=session, filters=filters, workspace_id=workspace_uuid
    )
    return GenericPage(data=menus, count=count)


@router.get("/tree", response_model=list[MenuTreeNode])
async def read_menus_tree(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> Any:
    """
    Get menu tree.
    Root users always see all menus.
    Non-root users must provide X-Workspace-Id and will only see workspace-restricted menus.
    """
    # 造物主：无视工作区，返回全局菜单树
    if current_user.is_root:
        return await dao.get_menus_tree(session=session)

    if not x_workspace_id:
        raise BusinessException(
            code=400,
            msg="X-Workspace-Id header is required for non-superuser",
        )

    workspace_uuid = uuid.UUID(x_workspace_id)
    await _require_workspace_membership(session, current_user, workspace_uuid)
    return await dao.get_menus_tree_workspace(
        session=session, workspace_id=workspace_uuid
    )


@router.get("/options", response_model=list[MenuTreeNode])
async def read_menus_options(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
    type: int | None = None,
) -> Any:
    """
    Get menus tree specifically for dropdowns/options. Defaults to is_active=True.
    Root users always see all menus.
    Non-root users must provide X-Workspace-Id and will only see workspace-restricted menus.
    """
    # 造物主：无视工作区，返回所有活跃菜单
    if current_user.is_root:
        return await dao.get_menus_tree(session=session, is_active=True, type=type)

    if not x_workspace_id:
        raise BusinessException(
            code=400,
            msg="X-Workspace-Id header is required for non-superuser",
        )

    workspace_uuid = uuid.UUID(x_workspace_id)
    await _require_workspace_membership(session, current_user, workspace_uuid)
    return await dao.get_menus_tree_workspace(
        session=session, workspace_id=workspace_uuid, is_active=True, type=type
    )


@router.get("/me", response_model=list[MenuTreeNode])
async def read_menus_tree_me(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> Any:
    """
    Get menus specifically for the current logged-in user in their active workspace context.
    This generates the personalized left-hand sidebar navigation based on their roles.
    """
    # 造物主：无视工作区，返回所有活跃菜单
    if current_user.is_root:
        return await dao.get_menus_tree(session=session, is_active=True)

    if not x_workspace_id:
        raise BusinessException(
            code=400,
            msg="X-Workspace-Id header is required to build user sidebar navigation",
        )

    try:
        workspace_uuid = uuid.UUID(x_workspace_id)
    except ValueError:
        raise BusinessException(code=400, msg="Invalid workspace ID format")

    workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=workspace_uuid
    )
    if not workspace:
        raise BusinessException(code=404, msg="Workspace not found")

    # 工作区管理员：该工作区所有菜单
    if current_user.username == f"admin-{workspace.name}":
        return await dao.get_menus_tree_workspace(
            session=session, workspace_id=workspace_uuid, is_active=True
        )

    # 普通成员：根据角色工作区鉴权
    return await dao.get_menus_tree_me(
        session=session, user_id=current_user.id, workspace_id=workspace_uuid
    )


@router.get(
    "/{id}",
    response_model=MenuPublic,
)
async def read_menu(
    session: AsyncSessionDep,
    id: uuid.UUID,
) -> Any:
    """Retrieve a single menu by ID."""
    db_menu = await dao.get_menu_by_id(session=session, menu_id=id)
    if not db_menu:
        raise BusinessException(msg="Menu not found", code=404)
    return db_menu


# --- WRITE ROUTES (Superuser Exclusive) ---


@router.post(
    "/",
    response_model=MenuPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def create_menu(
    session: AsyncSessionDep,
    menu_in: MenuCreate,
) -> Any:
    """Create new menu."""
    if menu_in.parent_id:
        parent = await dao.get_menu_by_id(session=session, menu_id=menu_in.parent_id)
        if not parent:
            raise BusinessException(code=404, msg="Parent menu not found")

    menu = await dao.create_menu(session=session, menu_create=menu_in)
    return menu


@router.put(
    "/{id}",
    response_model=MenuPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def update_menu(
    session: AsyncSessionDep,
    id: uuid.UUID,
    menu_in: MenuUpdate,
) -> Any:
    """Update a menu."""
    menu = await dao.get_menu_by_id(session=session, menu_id=id)
    if not menu:
        raise BusinessException(code=404, msg="Menu not found")

    if menu_in.parent_id:
        if menu_in.parent_id == id:
            raise BusinessException(code=400, msg="Menu cannot be its own parent")
        parent = await dao.get_menu_by_id(session=session, menu_id=menu_in.parent_id)
        if not parent:
            raise BusinessException(code=404, msg="Parent menu not found")

    menu = await dao.update_menu(session=session, db_menu=menu, menu_in=menu_in)
    return menu


@router.delete(
    "/{id}",
    response_model=Message,
    dependencies=[Depends(get_current_active_superuser)],
)
async def delete_menu(
    session: AsyncSessionDep,
    id: uuid.UUID,
) -> Any:
    """Delete a menu if it has no active child descendants."""
    menu = await dao.get_menu_by_id(session=session, menu_id=id)
    if not menu:
        raise BusinessException(code=404, msg="Menu not found")

    await dao.delete_menu(session=session, db_menu=menu)
    return Message(message="Menu deleted")
