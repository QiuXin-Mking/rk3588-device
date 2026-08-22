import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import (
    AsyncSessionDep,
    CurrentUser,
    get_current_workspace_member,
)
from app.core.exceptions import BusinessException
from app.dao.infra import async_task as async_task_dao
from app.model.common import GenericPage
from app.model.infra.async_task import (
    AsyncTaskListFilter,
    AsyncTaskPublic,
)

router = APIRouter(
    prefix="/async-tasks",
    tags=["infra-async-tasks"],
    dependencies=[Depends(get_current_workspace_member)],
)


@router.get(
    "/my_tasks",
    response_model=GenericPage[AsyncTaskPublic],
    summary="Get user's async tasks",
)
async def read_my_async_tasks(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    filters: AsyncTaskListFilter = Query(),
) -> Any:
    count, data = await async_task_dao.get_async_tasks(
        session, filters, creator_id=current_user.id
    )
    return GenericPage(count=count, data=data)


@router.get(
    "/{id}",
    response_model=AsyncTaskPublic,
    summary="Get a specific async task",
)
async def read_async_task(
    id: uuid.UUID,
    session: AsyncSessionDep,
    current_user: CurrentUser,
) -> Any:
    task = await async_task_dao.get_async_task(session, id, creator_id=current_user.id)
    if not task:
        raise BusinessException(code=404, msg="AsyncTask not found")
    return task


@router.post(
    "/{id}/cancel",
    response_model=AsyncTaskPublic,
    summary="Cancel a specific async task",
)
async def cancel_async_task(
    id: uuid.UUID,
    session: AsyncSessionDep,
    current_user: CurrentUser,
) -> Any:
    task = await async_task_dao.get_async_task(session, id, creator_id=current_user.id)
    if not task:
        raise BusinessException(code=404, msg="AsyncTask not found")
    if task.status != "processing":
        raise BusinessException(code=400, msg="Only processing tasks can be cancelled")
    return await async_task_dao.cancel_async_task(session, task)
