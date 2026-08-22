import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import distinct, func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import engine
from app.model import (
    BusinessLine,
    CloudStorage,
    CollectionRecord,
    CollectionTask,
    DeviceBinding,
    Feedback,
    Menu,
    PhysicalKit,
    ProductKit,
    ReleaseVersion,
    Role,
    User,
    Workspace,
    WorkspaceMember,
)


async def scalar(session: AsyncSession, statement: Any) -> int:
    result = await session.exec(statement)
    return int(result.one())


async def audit() -> dict[str, Any]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        counts = {
            "stress_users": await scalar(
                session,
                select(func.count()).select_from(User).where(User.username.like("stress.operator.%")),
            ),
            "workspaces": await scalar(session, select(func.count()).select_from(Workspace)),
            "business_lines": await scalar(session, select(func.count()).select_from(BusinessLine)),
            "roles": await scalar(session, select(func.count()).select_from(Role)),
            "workspace_members": await scalar(session, select(func.count()).select_from(WorkspaceMember)),
            "product_kits": await scalar(session, select(func.count()).select_from(ProductKit)),
            "physical_kits": await scalar(session, select(func.count()).select_from(PhysicalKit)),
            "device_bindings": await scalar(session, select(func.count()).select_from(DeviceBinding)),
            "collection_tasks": await scalar(session, select(func.count()).select_from(CollectionTask)),
            "tasks_with_subtasks": await scalar(
                session,
                select(func.count())
                .select_from(CollectionTask)
                .where(CollectionTask.subtask_name != ""),
            ),
            "collection_records": await scalar(session, select(func.count()).select_from(CollectionRecord)),
            "records_with_mango_dimensions": await scalar(
                session,
                select(func.count())
                .select_from(CollectionRecord)
                .where(
                    CollectionRecord.project_name != "",
                    CollectionRecord.subtask_name != "",
                    CollectionRecord.kit_name != "",
                    CollectionRecord.capture_location != "",
                    CollectionRecord.data_status != "",
                ),
            ),
            "cloud_storage": await scalar(session, select(func.count()).select_from(CloudStorage)),
            "feedback": await scalar(session, select(func.count()).select_from(Feedback)),
            "release_versions": await scalar(session, select(func.count()).select_from(ReleaseVersion)),
            "menus": await scalar(session, select(func.count()).select_from(Menu)),
        }
        minimums = {
            "stress_users": 1000,
            "workspaces": 101,
            "business_lines": 500,
            "roles": 201,
            "workspace_members": 1000,
            "product_kits": 500,
            "physical_kits": 1000,
            "device_bindings": 3000,
            "collection_tasks": 20000,
            "tasks_with_subtasks": 20000,
            "collection_records": 72000,
            "records_with_mango_dimensions": 72000,
            "cloud_storage": 1000,
            "feedback": 10000,
            "release_versions": 1000,
            "menus": 500,
        }
        diversity = {
            "device_statuses": await scalar(
                session, select(func.count(distinct(DeviceBinding.status)))
            ),
            "task_statuses": await scalar(
                session, select(func.count(distinct(CollectionTask.status)))
            ),
            "record_qa_statuses": await scalar(
                session, select(func.count(distinct(CollectionRecord.qa_status)))
            ),
            "record_upload_statuses": await scalar(
                session, select(func.count(distinct(CollectionRecord.upload_status)))
            ),
            "feedback_statuses": await scalar(
                session, select(func.count(distinct(Feedback.status)))
            ),
            "release_statuses": await scalar(
                session, select(func.count(distinct(ReleaseVersion.status)))
            ),
        }
        diversity_minimums = {
            "device_statuses": 3,
            "task_statuses": 5,
            "record_qa_statuses": 3,
            "record_upload_statuses": 4,
            "feedback_statuses": 4,
            "release_statuses": 2,
        }

        operator = "stress.operator.0020"
        recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
        operator_coverage = {
            "physical_kits": await scalar(
                session,
                select(func.count())
                .select_from(PhysicalKit)
                .where(PhysicalKit.bound_username == operator),
            ),
            "tasks": await scalar(
                session,
                select(func.count())
                .select_from(CollectionTask)
                .where(CollectionTask.assigned_username == operator),
            ),
            "records": await scalar(
                session,
                select(func.count())
                .select_from(CollectionRecord)
                .where(CollectionRecord.operator_username == operator),
            ),
            "recent_records": await scalar(
                session,
                select(func.count())
                .select_from(CollectionRecord)
                .where(
                    CollectionRecord.operator_username == operator,
                    CollectionRecord.captured_at >= recent_cutoff,
                ),
            ),
            "qa_statuses": await scalar(
                session,
                select(func.count(distinct(CollectionRecord.qa_status))).where(
                    CollectionRecord.operator_username == operator
                ),
            ),
            "upload_statuses": await scalar(
                session,
                select(func.count(distinct(CollectionRecord.upload_status))).where(
                    CollectionRecord.operator_username == operator
                ),
            ),
        }
        operator_minimums = {
            "physical_kits": 1,
            "tasks": 1,
            "records": 72,
            "recent_records": 22,
            "qa_statuses": 3,
            "upload_statuses": 4,
        }

    failures = [
        f"{key}: {counts[key]} < {minimum}"
        for key, minimum in minimums.items()
        if counts[key] < minimum
    ]
    failures.extend(
        f"{key}: {diversity[key]} < {minimum}"
        for key, minimum in diversity_minimums.items()
        if diversity[key] < minimum
    )
    failures.extend(
        f"operator.{key}: {operator_coverage[key]} < {minimum}"
        for key, minimum in operator_minimums.items()
        if operator_coverage[key] < minimum
    )
    report = {
        "ok": not failures,
        "counts": counts,
        "diversity": diversity,
        "operator_coverage": operator_coverage,
        "failures": failures,
    }
    if failures:
        raise RuntimeError(json.dumps(report, ensure_ascii=False, indent=2))
    return report


async def main() -> None:
    sys.stdout.write(f"{json.dumps(await audit(), ensure_ascii=False, indent=2)}\n")


if __name__ == "__main__":
    asyncio.run(main())
