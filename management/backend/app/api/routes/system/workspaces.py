import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import SQLModel

from app import dao
from app.api.deps import AsyncSessionDep, CurrentUser, get_current_active_superuser
from app.core.exceptions import BusinessException
from app.model.common import GenericPage, Message
from app.model.system.workspace import (
    WorkspaceCreate,
    WorkspaceListFilter,
    WorkspaceMemberPublic,
    WorkspacePublic,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["system-workspaces"])


class WorkspaceWithMemberOut(BaseModel):
    workspace: WorkspacePublic
    member_info: WorkspaceMemberPublic


class WorkspaceMenuUpdate(BaseModel):
    """
    Workspace payload for menus binding.
    """

    menu_ids: list[uuid.UUID]


class WorkspacesMeResponse(SQLModel):
    data: list[WorkspaceWithMemberOut]
    count: int


@router.get("/me", response_model=WorkspacesMeResponse)
async def read_workspaces_me(
    session: AsyncSessionDep, current_user: CurrentUser
) -> Any:
    """
    Get all workspaces the current user belongs to.
    This bypasses the automatic global workspace isolation to provide a cross-workspace summary.
    """
    rows = await dao.get_workspaces_me(session=session, user_id=current_user.id)
    response_data = []
    for member, workspace in rows:
        response_data.append(
            WorkspaceWithMemberOut(
                workspace=WorkspacePublic.model_validate(workspace),
                member_info=WorkspaceMemberPublic.model_validate(member),
            )
        )
    return WorkspacesMeResponse(data=response_data, count=len(response_data))


@router.get(
    "/",
    response_model=GenericPage[WorkspacePublic],
    dependencies=[Depends(get_current_active_superuser)],
)
async def read_workspaces(
    session: AsyncSessionDep,
    filters: WorkspaceListFilter = Query(),
) -> Any:
    """
    Retrieve workspaces.
    Requires CurrentUser for basic authentication.
    """
    count, workspaces = await dao.get_workspaces(session=session, filters=filters)
    return GenericPage(data=workspaces, count=count)


@router.get(
    "/{workspace_id}",
    response_model=WorkspacePublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def read_workspace(session: AsyncSessionDep, workspace_id: uuid.UUID) -> Any:
    """
    Get workspace by ID.
    Requires CurrentUser for basic authentication.
    """
    workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=workspace_id
    )
    if not workspace:
        raise BusinessException(msg="Workspace not found", code=404)
    return workspace


@router.post(
    "/",
    response_model=WorkspacePublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def create_workspace(
    session: AsyncSessionDep, workspace_in: WorkspaceCreate
) -> Any:
    """
    Create a new workspace.
    Requires CurrentUser for authentication.
    """
    workspace = await dao.create_workspace(
        session=session, workspace_create=workspace_in
    )
    return workspace


@router.put(
    "/{workspace_id}",
    response_model=WorkspacePublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def update_workspace(
    session: AsyncSessionDep,
    workspace_id: uuid.UUID,
    workspace_in: WorkspaceUpdate,
) -> Any:
    """
    Update a workspace. Uses PUT for full object replacement.
    Requires CurrentUser for authentication.
    """
    db_workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=workspace_id
    )
    if not db_workspace:
        raise BusinessException(msg="Workspace not found", code=404)

    workspace = await dao.update_workspace(
        session=session, db_workspace=db_workspace, workspace_in=workspace_in
    )
    return workspace


@router.delete(
    "/{workspace_id}",
    response_model=Message,
    dependencies=[Depends(get_current_active_superuser)],
)
async def delete_workspace(session: AsyncSessionDep, workspace_id: uuid.UUID) -> Any:
    """
    Delete a workspace.
    Requires CurrentUser for authentication.
    """
    db_workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=workspace_id
    )
    if not db_workspace:
        raise BusinessException(msg="Workspace not found", code=404)

    await dao.delete_workspace(session=session, db_workspace=db_workspace)
    return Message(message="Workspace deleted")


@router.get(
    "/{workspace_id}/menus",
    response_model=list[uuid.UUID],
    dependencies=[Depends(get_current_active_superuser)],
)
async def read_workspace_menus(
    session: AsyncSessionDep,
    workspace_id: uuid.UUID,
) -> Any:
    """
    Get menu IDs bound to a workspace.
    """
    db_workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=workspace_id
    )
    if not db_workspace:
        raise BusinessException(msg="Workspace not found", code=404)

    return await dao.get_workspace_menus(session=session, workspace_id=workspace_id)


@router.put(
    "/{workspace_id}/menus",
    response_model=WorkspacePublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def set_workspace_menus(
    session: AsyncSessionDep,
    workspace_id: uuid.UUID,
    menu_in: WorkspaceMenuUpdate,
) -> Any:
    """
    Synchronize the workspace's allowed menus.
    Requires CurrentUser for authentication (and potentially superuser/root).
    """
    db_workspace = await dao.get_workspace_by_id(
        session=session, workspace_id=workspace_id
    )
    if not db_workspace:
        raise BusinessException(msg="Workspace not found", code=404)

    await dao.set_workspace_menus(
        session=session, workspace_id=workspace_id, menu_ids=menu_in.menu_ids
    )
    await session.refresh(db_workspace)
    return db_workspace
