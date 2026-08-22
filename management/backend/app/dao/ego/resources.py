import uuid
from datetime import datetime, timezone
from typing import Any, TypeVar

from sqlalchemy import JSON, or_
from sqlmodel import SQLModel, col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.model.common import BaseTimestampModel, get_datetime_utc
from app.model.ego.resources import (
    CollectionRecord,
    CollectionTask,
    DashboardSummary,
    DeviceBinding,
    Feedback,
    PhysicalKit,
    ResourceListFilter,
)

ResourceTable = TypeVar("ResourceTable", bound=BaseTimestampModel)


def _normalize_json_columns(
    db_obj: ResourceTable, model: type[ResourceTable], payload: SQLModel
) -> None:
    json_payload = payload.model_dump(mode="json", exclude_unset=True)
    table = getattr(model, "__table__", None)
    if table is None:
        return
    for column in table.columns:
        if isinstance(column.type, JSON) and column.name in json_payload:
            setattr(db_obj, column.name, json_payload[column.name])


async def create_resource(
    *, session: AsyncSession, model: type[ResourceTable], payload: SQLModel
) -> ResourceTable:
    db_obj = model.model_validate(payload)
    _normalize_json_columns(db_obj, model, payload)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def get_resource_by_id(
    *, session: AsyncSession, model: type[ResourceTable], resource_id: uuid.UUID
) -> ResourceTable | None:
    statement = select(model).where(model.id == resource_id)
    result = await session.exec(statement)
    return result.first()


async def get_collection_task_for_update(
    *, session: AsyncSession, resource_id: uuid.UUID
) -> CollectionTask | None:
    result = await session.exec(
        select(CollectionTask).where(CollectionTask.id == resource_id).with_for_update()
    )
    return result.first()


async def get_resources(
    *,
    session: AsyncSession,
    model: type[ResourceTable],
    filters: ResourceListFilter,
    search_fields: tuple[str, ...],
) -> tuple[int, list[ResourceTable]]:
    conditions: list[Any] = []
    if filters.q:
        search_conditions = [
            col(getattr(model, field)).ilike(f"%{filters.q}%")
            for field in search_fields
        ]
        if search_conditions:
            from sqlalchemy import or_

            conditions.append(or_(*search_conditions))
    if filters.status is not None and hasattr(model, "status"):
        conditions.append(model.status == filters.status)

    count_statement = select(func.count()).select_from(model)
    statement = select(model)
    for condition in conditions:
        count_statement = count_statement.where(condition)
        statement = statement.where(condition)

    count_result = await session.exec(count_statement)
    count = count_result.one()
    statement = (
        statement.order_by(col(model.created_at).desc())
        .offset(filters.skip)
        .limit(filters.limit)
    )
    result = await session.exec(statement)
    return count, list(result.all())


async def update_resource(
    *, session: AsyncSession, db_obj: ResourceTable, payload: SQLModel
) -> ResourceTable:
    db_obj.sqlmodel_update(payload.model_dump(exclude_unset=True))
    _normalize_json_columns(db_obj, type(db_obj), payload)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def delete_resource(*, session: AsyncSession, db_obj: ResourceTable) -> None:
    db_obj.deleted_at = get_datetime_utc()
    session.add(db_obj)
    await session.commit()


async def claim_collection_task(
    *,
    session: AsyncSession,
    task: CollectionTask,
    username: str,
    device_serial: str,
    location: str = "",
    target_objects: str = "",
    object_count: int = 0,
) -> CollectionTask:
    if task.status != "PENDING" or task.assigned_username:
        raise ValueError("Task is no longer available")
    if task.completed_count >= task.target_count:
        raise ValueError("Task target is already complete")
    task.assigned_username = username
    task.device_serial = device_serial
    if location:
        task.location = location
    if target_objects:
        task.target_objects = target_objects
    if object_count > 0:
        task.object_count = object_count
    task.status = "CLAIMED"
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def get_operator_physical_kit(
    *, session: AsyncSession, username: str
) -> PhysicalKit | None:
    result = await session.exec(
        select(PhysicalKit)
        .where(
            PhysicalKit.bound_username == username,
            PhysicalKit.status != "RETIRED",
        )
        .order_by(col(PhysicalKit.updated_at).desc())
    )
    return result.first()


async def get_physical_kit_devices(
    *, session: AsyncSession, physical_kit_id: uuid.UUID
) -> list[DeviceBinding]:
    result = await session.exec(
        select(DeviceBinding)
        .where(DeviceBinding.physical_kit_id == physical_kit_id)
        .order_by(col(DeviceBinding.created_at).asc())
    )
    return list(result.all())


async def get_operator_current_task(
    *, session: AsyncSession, username: str
) -> CollectionTask | None:
    result = await session.exec(
        select(CollectionTask)
        .where(
            CollectionTask.assigned_username == username,
            col(CollectionTask.status).in_(["CLAIMED", "IN_PROGRESS", "PAUSED"]),
        )
        .order_by(col(CollectionTask.updated_at).desc())
    )
    return result.first()


async def get_operator_available_tasks(
    *,
    session: AsyncSession,
    username: str,
    limit: int = 100,
    q: str | None = None,
    scene_type: str | None = None,
    task_no: str | None = None,
) -> list[CollectionTask]:
    physical_kit = await get_operator_physical_kit(
        session=session, username=username
    )
    kit_ids = {physical_kit.template_id} if physical_kit is not None else set()
    kit_filter = col(CollectionTask.kit_id).is_(None)
    if kit_ids:
        kit_filter = or_(kit_filter, col(CollectionTask.kit_id).in_(kit_ids))
    statement = select(CollectionTask).where(
        CollectionTask.status == "PENDING",
        CollectionTask.assigned_username == "",
        CollectionTask.completed_count < CollectionTask.target_count,
        kit_filter,
    )
    if q:
        keyword = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                col(CollectionTask.name).ilike(keyword),
                col(CollectionTask.subtask_name).ilike(keyword),
                col(CollectionTask.task_no).ilike(keyword),
                col(CollectionTask.project_name).ilike(keyword),
                col(CollectionTask.scene_type).ilike(keyword),
            )
        )
    if scene_type:
        statement = statement.where(CollectionTask.scene_type == scene_type)
    if task_no:
        statement = statement.where(CollectionTask.task_no == task_no)
    result = await session.exec(
        statement.order_by(col(CollectionTask.created_at).desc()).limit(limit)
    )
    return list(result.all())


async def get_operator_records(
    *, session: AsyncSession, username: str, limit: int = 500
) -> list[CollectionRecord]:
    result = await session.exec(
        select(CollectionRecord)
        .where(CollectionRecord.operator_username == username)
        .order_by(col(CollectionRecord.captured_at).desc())
        .limit(limit)
    )
    return list(result.all())


async def transition_collection_task(
    *, session: AsyncSession, task: CollectionTask, username: str, target_status: str
) -> CollectionTask:
    if task.assigned_username != username:
        raise PermissionError("Task is assigned to another operator")
    allowed = {
        "IN_PROGRESS": {"CLAIMED", "PAUSED", "IN_PROGRESS"},
        "PAUSED": {"IN_PROGRESS", "PAUSED"},
        "COMPLETED": {"CLAIMED", "IN_PROGRESS", "PAUSED", "COMPLETED"},
    }
    if target_status not in allowed or task.status not in allowed[target_status]:
        raise ValueError(
            f"Cannot transition task from {task.status} to {target_status}"
        )
    task.status = target_status
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def abandon_collection_task(
    *, session: AsyncSession, task: CollectionTask, username: str
) -> CollectionTask:
    if task.assigned_username != username:
        raise PermissionError("Task is assigned to another operator")
    if task.status not in {"CLAIMED", "IN_PROGRESS", "PAUSED"}:
        raise ValueError(f"Cannot abandon task from {task.status}")
    task.status = "PENDING"
    task.assigned_username = ""
    task.device_serial = ""
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def increment_collection_task(
    *, session: AsyncSession, task: CollectionTask
) -> CollectionTask:
    task.completed_count = min(task.target_count, task.completed_count + 1)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def get_dashboard_summary(*, session: AsyncSession) -> DashboardSummary:
    today = datetime.now(timezone.utc).date()

    async def count(model: type[SQLModel], *conditions: Any) -> int:
        statement = select(func.count()).select_from(model)
        for condition in conditions:
            statement = statement.where(condition)
        result = await session.exec(statement)
        return result.one()

    stored_result = await session.exec(
        select(func.sum(CollectionRecord.file_size_bytes))
    )
    stored_bytes = stored_result.one() or 0
    return DashboardSummary(
        device_count=await count(DeviceBinding),
        online_device_count=await count(
            DeviceBinding, DeviceBinding.status == "ONLINE"
        ),
        pending_task_count=await count(
            CollectionTask, col(CollectionTask.status).in_(["PENDING", "CLAIMED"])
        ),
        today_record_count=await count(
            CollectionRecord,
            func.date(CollectionRecord.captured_at) == today,
        ),
        pending_qa_count=await count(
            CollectionRecord, CollectionRecord.qa_status == "PENDING"
        ),
        open_feedback_count=await count(Feedback, Feedback.status == "OPEN"),
        stored_bytes=int(stored_bytes),
    )
