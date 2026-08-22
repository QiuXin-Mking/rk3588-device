import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

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
from app.model.system.workspace import (
    WorkspaceMember,
    WorkspaceMemberCreate,
    WorkspaceMemberListFilter,
    WorkspaceMemberPublic,
    WorkspaceMemberUpdate,
)

router = APIRouter(
    prefix="/workspace-members",
    tags=["workspace-members"],
    dependencies=[Depends(get_current_workspace_member)],
)


@router.get("/me", response_model=WorkspaceMemberPublic)
async def read_current_workspace_member(
    session: AsyncSessionDep, current_member: CurrentWorkspaceMember
) -> Any:
    public_items = await resolve_names(session, [current_member], WorkspaceMemberPublic)
    return public_items[0]


@router.put("/me", response_model=WorkspaceMemberPublic)
async def update_current_workspace_member(
    session: AsyncSessionDep,
    current_member: CurrentWorkspaceMember,
    member_in: WorkspaceMemberUpdate,
) -> Any:
    member = await dao.update_workspace_member(
        session=session, db_member=current_member, member_in=member_in
    )
    public_items = await resolve_names(session, [member], WorkspaceMemberPublic)
    return public_items[0]


@router.get(
    "/",
    response_model=GenericPage[WorkspaceMemberPublic],
    dependencies=[Depends(require_perm("workspace_members:list"))],
)
async def read_workspace_members(
    session: AsyncSessionDep,
    current_member: CurrentWorkspaceMember,
    filters: WorkspaceMemberListFilter = Query(),
) -> Any:
    """
    Retrieve workspace members.
    workspace_id is derived from the authenticated X-Workspace-Id header — no need to pass it explicitly.
    """
    count, members_data = await dao.get_workspace_members(
        session=session,
        workspace_id=current_member.workspace_id,
        filters=filters,
    )
    public_items = await resolve_names(session, members_data, WorkspaceMemberPublic)
    return GenericPage(data=public_items, count=count)


@router.post(
    "/",
    response_model=WorkspaceMemberPublic,
    dependencies=[Depends(require_perm("workspace_members:create"))],
)
async def create_workspace_member(
    session: AsyncSessionDep, member_in: WorkspaceMemberCreate
) -> Any:
    """
    Create a new workspace member.
    """
    member = await dao.create_workspace_member(session=session, member_create=member_in)
    public_items = await resolve_names(session, [member], WorkspaceMemberPublic)
    return public_items[0]


@router.put(
    "/{member_id:uuid}",
    response_model=WorkspaceMemberPublic,
    dependencies=[Depends(require_perm("workspace_members:update"))],
)
async def update_workspace_member(
    session: AsyncSessionDep, member_id: uuid.UUID, member_in: WorkspaceMemberUpdate
) -> Any:
    """
    Update a workspace member. Uses PUT for full object replacement.
    """
    db_member = await dao.get_workspace_member_by_id(
        session=session, member_id=member_id
    )
    if not db_member:
        raise BusinessException(msg="Workspace member not found", code=404)

    user = await dao.get_user_by_id(session=session, user_id=db_member.account_id)
    workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=db_member.workspace_id
    )

    if user and workspace and user.username == f"admin-{workspace.name}":
        if (
            member_in.employee_name is not None
            and member_in.employee_name != db_member.employee_name
        ):
            raise BusinessException(msg="系统预置超级管理员禁止修改姓名", code=400)

    member = await dao.update_workspace_member(
        session=session, db_member=db_member, member_in=member_in
    )
    public_items = await resolve_names(session, [member], WorkspaceMemberPublic)
    return public_items[0]


@router.delete(
    "/{member_id:uuid}",
    response_model=Message,
    dependencies=[Depends(require_perm("workspace_members:delete"))],
)
async def delete_workspace_member(
    session: AsyncSessionDep, member_id: uuid.UUID
) -> Any:
    """
    Delete a workspace member.
    """
    db_member = await dao.get_workspace_member_by_id(
        session=session, member_id=member_id
    )
    if not db_member:
        raise BusinessException(msg="Workspace member not found", code=404)

    user = await dao.get_user_by_id(session=session, user_id=db_member.account_id)
    workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=db_member.workspace_id
    )

    if user and workspace and user.username == f"admin-{workspace.name}":
        raise BusinessException(msg="系统预置超级管理员账号无法被删除", code=400)

    await dao.delete_workspace_member(session=session, db_member=db_member)
    return Message(message="Workspace member deleted")


class WorkspaceMemberRoleUpdate(BaseModel):
    role_ids: list[uuid.UUID]


class WorkspaceMemberBatchUpdate(BaseModel):
    member_ids: list[uuid.UUID] = Field(min_length=1)


class WorkspaceMemberRoleAdd(WorkspaceMemberBatchUpdate):
    role_ids: list[uuid.UUID] = Field(min_length=1)


async def _get_batch_members(
    session: AsyncSessionDep,
    workspace_id: uuid.UUID,
    member_ids: list[uuid.UUID],
) -> list[WorkspaceMember]:
    unique_member_ids = set(member_ids)
    members = await dao.get_workspace_members_by_ids(
        session=session,
        workspace_id=workspace_id,
        member_ids=list(unique_member_ids),
    )
    if len(members) != len(unique_member_ids):
        raise BusinessException(msg="部分成员不存在或不属于当前工作区", code=400)
    return members


@router.post(
    "/batch-enable",
    response_model=Message,
    dependencies=[Depends(require_perm("workspace_members:batch_enable"))],
)
async def batch_enable_workspace_members(
    session: AsyncSessionDep,
    current_member: CurrentWorkspaceMember,
    payload: WorkspaceMemberBatchUpdate,
) -> Any:
    """Enable selected workspace-member accounts without changing other fields."""
    members = await _get_batch_members(
        session, current_member.workspace_id, payload.member_ids
    )
    changed_count = await dao.enable_workspace_members(session=session, members=members)
    return Message(message=f"已开启 {changed_count} 个账号")


@router.post(
    "/batch-add-roles",
    response_model=Message,
    dependencies=[Depends(require_perm("workspace_members:add_roles"))],
)
async def add_workspace_member_roles(
    session: AsyncSessionDep,
    current_member: CurrentWorkspaceMember,
    payload: WorkspaceMemberRoleAdd,
) -> Any:
    """Append roles to selected members while preserving every existing role."""
    members = await _get_batch_members(
        session, current_member.workspace_id, payload.member_ids
    )
    unique_role_ids = set(payload.role_ids)
    roles = await dao.get_roles_by_ids(
        session=session,
        workspace_id=current_member.workspace_id,
        role_ids=list(unique_role_ids),
    )
    if len(roles) != len(unique_role_ids):
        raise BusinessException(msg="部分角色不存在或不属于当前工作区", code=400)

    added_count = await dao.add_workspacemember_roles(
        session=session,
        member_ids=[member.id for member in members],
        role_ids=list(unique_role_ids),
    )
    return Message(message=f"已新增 {added_count} 条成员角色关联")


@router.get(
    "/{member_id:uuid}/roles",
    response_model=list[uuid.UUID],
    dependencies=[Depends(require_perm("workspace_members:assign_roles"))],
)
async def read_workspacemember_roles(
    session: AsyncSessionDep, member_id: uuid.UUID
) -> Any:
    """
    Get role IDs currently assigned to a workspace member.
    """
    db_member = await dao.get_workspace_member_by_id(
        session=session, member_id=member_id
    )
    if not db_member:
        raise BusinessException(msg="Workspace member not found", code=404)

    return await dao.get_workspacemember_roles(session=session, member_id=member_id)


@router.put(
    "/{member_id:uuid}/roles",
    response_model=WorkspaceMemberPublic,
    dependencies=[Depends(require_perm("workspace_members:assign_roles"))],
)
async def set_workspacemember_roles(
    session: AsyncSessionDep, member_id: uuid.UUID, payload: WorkspaceMemberRoleUpdate
) -> Any:
    """
    A specialized endpoint to completely overwrite the role assignments for a member.
    """
    db_member = await dao.get_workspace_member_by_id(
        session=session, member_id=member_id
    )
    if not db_member:
        raise BusinessException(msg="Workspace member not found", code=404)

    await dao.set_workspacemember_roles(
        session=session, member_id=member_id, role_ids=payload.role_ids
    )

    # Reload the member to return public view
    await session.refresh(db_member)
    public_items = await resolve_names(session, [db_member], WorkspaceMemberPublic)
    return public_items[0]
