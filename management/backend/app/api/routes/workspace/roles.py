import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app import dao
from app.api.deps import (
    AsyncSessionDep,
    CurrentWorkspaceMember,
    get_current_workspace_member,
    require_perm,
)
from app.api.name_resolver import resolve_names
from app.core.exceptions import BusinessException
from app.model.common import GenericPage, Message
from app.model.system.workspace import WorkspaceMemberPublic
from app.model.workspace.role import RoleCreate, RoleListFilter, RolePublic, RoleUpdate

router = APIRouter(
    prefix="/roles",
    tags=["workspace-roles"],
    dependencies=[Depends(get_current_workspace_member)],
)


@router.get(
    "/",
    response_model=GenericPage[RolePublic],
    dependencies=[Depends(require_perm("roles:list"))],
)
async def read_roles(
    session: AsyncSessionDep,
    current_member: CurrentWorkspaceMember,
    filters: RoleListFilter = Query(),
) -> Any:
    """
    Retrieve roles.
    """
    count, roles_data = await dao.get_roles(
        session=session,
        workspace_id=current_member.workspace_id,
        filters=filters,
    )
    role_objs = [role for role, _ in roles_data]
    biz_name_map = {str(role.id): biz_name for role, biz_name in roles_data}

    public_items = await resolve_names(session, role_objs, RolePublic)
    for item in public_items:
        item.business_line_name = biz_name_map.get(str(item.id))

    return GenericPage(data=public_items, count=count)


@router.get(
    "/options",
    response_model=list[RolePublic],
    dependencies=[Depends(require_perm("roles:options"))],
)
async def read_role_options(
    session: AsyncSessionDep,
    current_member: CurrentWorkspaceMember,
) -> Any:
    """
    Retrieve role options for dropdowns. Only active roles, unpaginated.
    """
    roles_data = await dao.get_role_options(
        session=session, workspace_id=current_member.workspace_id
    )
    role_objs = [role for role, _ in roles_data]
    biz_name_map = {str(role.id): biz_name for role, biz_name in roles_data}

    public_items = await resolve_names(session, role_objs, RolePublic)
    for item in public_items:
        item.business_line_name = biz_name_map.get(str(item.id))

    return public_items


@router.post(
    "/",
    response_model=RolePublic,
    dependencies=[Depends(require_perm("roles:create"))],
)
async def create_role(
    session: AsyncSessionDep,
    role_in: RoleCreate,
) -> Any:
    """
    Create new role.
    """
    role = await dao.create_role(
        session=session,
        role_create=role_in,
    )
    public_items = await resolve_names(session, [role], RolePublic)
    return public_items[0]


@router.put(
    "/{role_id}",
    response_model=RolePublic,
    dependencies=[Depends(require_perm("roles:update"))],
)
async def update_role(
    session: AsyncSessionDep,
    role_id: uuid.UUID,
    role_in: RoleUpdate,
) -> Any:
    """
    Update a role.
    """
    db_role = await dao.get_role_by_id(session=session, role_id=role_id)
    if not db_role:
        raise BusinessException(msg="Role not found", code=404)

    role = await dao.update_role(session=session, db_role=db_role, role_in=role_in)
    public_items = await resolve_names(session, [role], RolePublic)
    return public_items[0]


@router.delete(
    "/{role_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("roles:delete"))],
)
async def delete_role(session: AsyncSessionDep, role_id: uuid.UUID) -> Any:
    """
    Delete a role.
    """
    db_role = await dao.get_role_by_id(session=session, role_id=role_id)
    if not db_role:
        raise BusinessException(msg="Role not found", code=404)

    await dao.delete_role(session=session, db_role=db_role)
    return Message(message="Role deleted successfully")


class RoleMenuUpdate(BaseModel):
    menu_ids: list[uuid.UUID]


@router.put(
    "/{role_id}/menus",
    response_model=RolePublic,
    dependencies=[Depends(require_perm("roles:assign_menus"))],
)
async def set_role_menus(
    session: AsyncSessionDep,
    role_id: uuid.UUID,
    payload: RoleMenuUpdate,
) -> Any:
    """
    Assign menus to a role.
    """
    db_role = await dao.get_role_by_id(session=session, role_id=role_id)
    if not db_role:
        raise BusinessException(msg="Role not found", code=404)

    await dao.set_role_menus(
        session=session, role_id=role_id, menu_ids=payload.menu_ids
    )

    # Return refreshed role to include the menu relations if needed
    await session.refresh(db_role)
    return db_role


@router.get(
    "/{role_id}/menus",
    response_model=list[uuid.UUID],
    dependencies=[Depends(require_perm("roles:read"))],
)
async def read_role_menus(
    session: AsyncSessionDep,
    role_id: uuid.UUID,
) -> Any:
    """
    Get menus assigned to a role.
    """
    db_role = await dao.get_role_by_id(session=session, role_id=role_id)
    if not db_role:
        raise BusinessException(msg="Role not found", code=404)

    return await dao.get_role_menus(session=session, role_id=role_id)


@router.get(
    "/{role_id}/members",
    response_model=list[WorkspaceMemberPublic],
    dependencies=[Depends(require_perm("roles:read"))],
)
async def read_role_members(
    session: AsyncSessionDep,
    role_id: uuid.UUID,
) -> Any:
    """Get workspace members currently assigned to a role."""
    db_role = await dao.get_role_by_id(session=session, role_id=role_id)
    if not db_role:
        raise BusinessException(msg="Role not found", code=404)

    members = await dao.get_role_members(session=session, role_id=role_id)
    return await resolve_names(session, members, WorkspaceMemberPublic)
