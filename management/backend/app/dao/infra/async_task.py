import uuid

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.model.infra.async_task import (
    AsyncTask,
    AsyncTaskCreate,
    AsyncTaskListFilter,
    AsyncTaskUpdate,
)


async def get_async_task(
    session: AsyncSession,
    id: uuid.UUID,
    creator_id: uuid.UUID | None = None,
) -> AsyncTask | None:
    statement = select(AsyncTask).where(AsyncTask.id == id)
    if creator_id is not None:
        statement = statement.where(AsyncTask.creator_id == creator_id)
    result = await session.execute(statement)
    return result.scalars().first()


async def get_async_tasks(
    session: AsyncSession,
    filters: AsyncTaskListFilter,
    creator_id: uuid.UUID | None = None,
) -> tuple[int, list[AsyncTask]]:
    statement = select(AsyncTask).order_by(AsyncTask.created_at.desc())

    if creator_id is not None:
        statement = statement.where(AsyncTask.creator_id == creator_id)

    if filters.status:
        statement = statement.where(AsyncTask.status == filters.status)

    statement = statement.offset(filters.skip).limit(filters.limit)

    count_statement = select(func.count()).select_from(statement.subquery())
    count_result = await session.execute(count_statement)
    count = count_result.scalar_one()

    result = await session.execute(statement)
    return count, list(result.scalars().all())


async def create_async_task(
    session: AsyncSession, task_create: AsyncTaskCreate
) -> AsyncTask:
    new_task = AsyncTask.model_validate(task_create)
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)
    return new_task


async def update_async_task(
    session: AsyncSession, task: AsyncTask, task_update: AsyncTaskUpdate
) -> AsyncTask:
    update_data = task_update.model_dump(exclude_unset=True)
    task.sqlmodel_update(update_data)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def cancel_async_task(session: AsyncSession, task: AsyncTask) -> AsyncTask:
    return await update_async_task(
        session,
        task,
        AsyncTaskUpdate(status="cancelled"),
    )
