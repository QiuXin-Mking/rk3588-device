from __future__ import annotations

import uuid

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core import context
from app.dao.infra.async_task import get_async_task
from app.model.infra.async_task import AsyncTaskCreate, AsyncTaskUpdate
from app.model.system.user import UserCreate
from tests.utils.utils import random_lower_string


def _set_task_context(workspace_id: uuid.UUID, user_id: uuid.UUID) -> None:
    context.set_workspace_id(workspace_id)
    context.set_user_id(user_id)


def _reset_task_context() -> None:
    context.reset_user_id()
    context.reset_workspace_id()


async def _create_processing_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    name: str,
) -> uuid.UUID:
    _set_task_context(workspace_id, user_id)
    try:
        task = await dao.create_async_task(
            session=db,
            task_create=AsyncTaskCreate(
                task_type="import_recruitment_resume",
                name=name,
            ),
        )
        task = await dao.update_async_task(
            session=db,
            task=task,
            task_update=AsyncTaskUpdate(status="processing"),
        )
        return task.id
    finally:
        _reset_task_context()


async def test_read_my_async_tasks_only_returns_own_tasks(
    client: AsyncClient,
    db: AsyncSession,
    superuser_workspace: dict[str, object],
) -> None:
    workspace = superuser_workspace["workspace"]
    current_user = superuser_workspace["user"]

    own_task_id = await _create_processing_task(
        db,
        workspace.id,
        current_user.id,
        name="我的任务",
    )

    other_user = await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=f"other_{random_lower_string()}",
            password="password",
        ),
    )
    await _create_processing_task(
        db,
        workspace.id,
        other_user.id,
        name="别人的任务",
    )

    response = await client.get(
        "/api/v1/async-tasks/my_tasks",
        headers=superuser_workspace["headers"],
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["count"] == 1
    assert [item["id"] for item in payload["data"]] == [str(own_task_id)]
    assert payload["data"][0]["name"] == "我的任务"


async def test_read_async_task_cannot_view_other_task(
    client: AsyncClient,
    db: AsyncSession,
    superuser_workspace: dict[str, object],
) -> None:
    workspace = superuser_workspace["workspace"]
    current_user = superuser_workspace["user"]

    other_user = await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=f"other_{random_lower_string()}",
            password="password",
        ),
    )
    other_task_id = await _create_processing_task(
        db,
        workspace.id,
        other_user.id,
        name="别人的任务",
    )
    await _create_processing_task(
        db,
        workspace.id,
        current_user.id,
        name="我的任务",
    )

    response = await client.get(
        f"/api/v1/async-tasks/{other_task_id}",
        headers=superuser_workspace["headers"],
    )
    assert response.status_code == 404, response.text


async def test_cancel_async_task_cannot_cancel_other_task(
    client: AsyncClient,
    db: AsyncSession,
    superuser_workspace: dict[str, object],
) -> None:
    workspace = superuser_workspace["workspace"]
    current_user = superuser_workspace["user"]

    other_user = await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=f"other_{random_lower_string()}",
            password="password",
        ),
    )
    other_task_id = await _create_processing_task(
        db,
        workspace.id,
        other_user.id,
        name="别人的任务",
    )
    await _create_processing_task(
        db,
        workspace.id,
        current_user.id,
        name="我的任务",
    )

    response = await client.post(
        f"/api/v1/async-tasks/{other_task_id}/cancel",
        headers=superuser_workspace["headers"],
    )
    assert response.status_code == 404, response.text

    task = await get_async_task(db, other_task_id)
    assert task is not None
    assert task.status == "processing"
