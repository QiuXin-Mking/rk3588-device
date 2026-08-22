import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import engine
from app.core.ego_permissions import EGO_OPERATOR_ROLE_ID
from app.core.security import get_password_hash
from app.model import (
    AsyncTask,
    BusinessLine,
    CloudStorage,
    CollectionRecord,
    CollectionScene,
    CollectionSop,
    CollectionTask,
    DeviceBinding,
    Feedback,
    MemberRoleLink,
    Menu,
    PhysicalKit,
    ProductKit,
    ReleaseVersion,
    Role,
    SystemAuditLog,
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceMenuLink,
)

NAMESPACE = uuid.UUID("b9ddd600-bafe-4d2b-b527-b91438653ae2")
TASK_CHILDREN_PER_TASK = 5


def stable_id(kind: str, index: int) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f"{kind}:{index}")


def task_group(index: int) -> int:
    return index // TASK_CHILDREN_PER_TASK


def task_subtask_name(index: int) -> str:
    return f"子任务 {index % TASK_CHILDREN_PER_TASK + 1:02d}"


async def bulk_insert(
    session: AsyncSession,
    model: type[Any],
    rows: list[dict[str, Any]],
    chunk_size: int = 1000,
) -> None:
    table = model.__table__
    for start in range(0, len(rows), chunk_size):
        statement = insert(table).values(rows[start : start + chunk_size])
        statement = statement.on_conflict_do_nothing()
        await session.exec(statement)
        await session.commit()


async def bulk_upsert(
    session: AsyncSession,
    model: type[Any],
    rows: list[dict[str, Any]],
    update_columns: tuple[str, ...],
    chunk_size: int = 1000,
) -> None:
    """Keep time-sensitive QA fixtures fresh without deleting existing data."""
    table = model.__table__
    for start in range(0, len(rows), chunk_size):
        statement = insert(table).values(rows[start : start + chunk_size])
        statement = statement.on_conflict_do_update(
            index_elements=[table.c.id],
            set_={
                column: getattr(statement.excluded, column) for column in update_columns
            },
        )
        await session.exec(statement)
        await session.commit()


async def seed() -> None:
    now = datetime.now(timezone.utc)
    workspace_id = settings.DEFAULT_WORKSPACE_ID
    async with AsyncSession(engine, expire_on_commit=False) as session:
        root_result = await session.exec(
            select(User).where(User.username == settings.FIRST_SUPERUSER)
        )
        root = root_result.first()
        if root is None:
            raise RuntimeError("Run app/initial_data.py before stress seeding")

        hashed_password = get_password_hash("Stress123!")
        users = [
            {
                "id": stable_id("user", index),
                "username": f"stress.operator.{index:04d}",
                "hashed_password": hashed_password,
                "status": 1,
                "is_active": index % 23 != 0,
                "is_root": False,
                "created_at": now - timedelta(days=index % 365),
                "updated_at": now,
            }
            for index in range(1000)
        ]
        await bulk_insert(session, User, users)

        workspaces = [
            {
                "id": stable_id("workspace", index),
                "name": f"压测采集站 {index:03d}",
                "description": "持久化压力测试工作区",
                "is_active": index % 17 != 0,
                "created_at": now - timedelta(days=index),
                "updated_at": now,
            }
            for index in range(100)
        ]
        await bulk_insert(session, Workspace, workspaces)

        business_lines = [
            {
                "id": stable_id("business-line", index),
                "workspace_id": workspace_id,
                "name": f"采集运营组 {index:03d}",
                "external_id": f"EGO-DEPT-{index:04d}",
                "path": f"/EGO/{index // 20:02d}/{index:04d}",
                "status": 1,
                "created_at": now - timedelta(days=index % 180),
                "updated_at": now,
            }
            for index in range(500)
        ]
        await bulk_insert(session, BusinessLine, business_lines)

        roles = [
            {
                "id": stable_id("role", index),
                "workspace_id": workspace_id,
                "role_name": f"采集角色 {index:03d}",
                "business_line_id": stable_id("business-line", index % 500),
                "sort": index,
                "is_active": True,
                "remark": "压力测试角色",
                "created_at": now,
                "updated_at": now,
            }
            for index in range(200)
        ]
        await bulk_insert(session, Role, roles)

        members = [
            {
                "id": stable_id("member", index),
                "account_id": stable_id("user", index),
                "workspace_id": workspace_id,
                "job_number": f"EGO-{index:05d}",
                "employee_name": f"采集员 {index:04d}",
                "mobile": f"138{index:08d}",
                "email": f"operator.{index:04d}@ego.test",
                "work_serial_number": f"OP-{index:08d}",
                "employee_status": "在职",
                "position": "数据采集员",
                "main_dept": f"采集运营组 {index % 500:03d}",
                "main_dept_id": f"EGO-DEPT-{index % 500:04d}",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            for index in range(1000)
        ]
        await bulk_insert(session, WorkspaceMember, members)
        await bulk_insert(
            session,
            MemberRoleLink,
            [
                {
                    "member_id": stable_id("member", index),
                    "role_id": EGO_OPERATOR_ROLE_ID,
                }
                for index in range(1000)
            ],
        )

        kits = [
            {
                "id": stable_id("kit", index),
                "workspace_id": workspace_id,
                "code": f"KIT-{index:04d}",
                "name": f"采集套件 {index:04d}",
                "product_type": ["视频采集", "多模态采集", "车载采集", "室内采集"][
                    index % 4
                ],
                "instructions": f"套件 {index:04d} 操作说明：登录、领取任务、核对状态后开始采集。",
                "exam_enabled": index % 3 == 0,
                "status": "ACTIVE" if index % 19 else "INACTIVE",
                "sort": index,
                "device_slots": [
                    {
                        "role": "head",
                        "label": "头戴双目",
                        "device_model": "HEAD_STEREO",
                        "quantity": 1,
                        "required": True,
                        "channel_count": 2,
                        "channel_labels": ["头戴左目", "头戴右目"],
                        "sort": 1,
                    },
                    {
                        "role": "wrist_left",
                        "label": "左腕单目",
                        "device_model": "WRIST_MONO",
                        "quantity": 1,
                        "required": True,
                        "channel_count": 1,
                        "channel_labels": ["左腕"],
                        "sort": 2,
                    },
                    {
                        "role": "wrist_right",
                        "label": "右腕单目",
                        "device_model": "WRIST_MONO",
                        "quantity": 1,
                        "required": True,
                        "channel_count": 1,
                        "channel_labels": ["右腕"],
                        "sort": 3,
                    },
                ],
                "created_at": now - timedelta(days=index % 365),
                "updated_at": now,
            }
            for index in range(500)
        ]
        await bulk_insert(session, ProductKit, kits)

        sops = [
            {
                "id": stable_id("sop", index),
                "workspace_id": workspace_id,
                "name": f"标准采集 SOP {index:03d}",
                "content": (
                    "一、检查设备连接和存储状态。\n"
                    "二、核对任务场景、目标物体和采集次数。\n"
                    "三、按要求完成标零后开始采集。\n"
                    "四、结束后检查记录并等待同步完成。"
                ),
                "created_at": now - timedelta(days=index % 180),
                "updated_at": now,
            }
            for index in range(200)
        ]
        await bulk_insert(session, CollectionSop, sops)

        scenes = [
            {
                "id": stable_id("scene", index),
                "workspace_id": workspace_id,
                "name": f"压测场景 {index:03d}",
                "description": "由场景管理统一维护的采集场景",
                "status": "ACTIVE",
                "sort": index + 1,
                "created_at": now,
                "updated_at": now,
            }
            for index in range(200)
        ]
        await bulk_insert(session, CollectionScene, scenes)

        physical_kits = [
            {
                "id": stable_id("physical-kit", index),
                "workspace_id": workspace_id,
                "serial_number": f"MANGO-KIT-{index:06d}",
                "name": f"实体采集套件 {index:04d}",
                "template_id": stable_id("kit", index % 500),
                "terminal_serial": f"RK3588-{index:06d}",
                "bound_username": f"stress.operator.{index:04d}",
                "status": "READY",
                "location": "压测仓库",
                "remark": "压测实体套件",
                "created_at": now,
                "updated_at": now,
            }
            for index in range(1000)
        ]
        await bulk_insert(session, PhysicalKit, physical_kits)

        devices = [
            {
                "id": stable_id("device", index),
                "workspace_id": workspace_id,
                "serial_number": f"EGO-RK3588-{index:07d}",
                "pid": f"PID-{index % 2500:05d}",
                "device_name": f"采集终端 {index:05d}",
                "device_model": "HEAD_STEREO"
                if index % 3 == 0
                else "WRIST_MONO",
                "slot_role": ["head", "wrist_left", "wrist_right"][index % 3],
                "physical_kit_id": stable_id("physical-kit", index // 3),
                "status": "UNKNOWN",
                "firmware_version": f"1.{index % 12}.{index % 40}",
                "last_seen_at": now - timedelta(minutes=index % 10080),
                "remark": "压测设备绑定数据",
                "created_at": now - timedelta(days=index % 365),
                "updated_at": now,
            }
            for index in range(3000)
        ]
        await bulk_insert(session, DeviceBinding, devices)

        tasks = [
            {
                "id": stable_id("task", index),
                "workspace_id": workspace_id,
                "task_no": f"TASK-{task_group(index):08d}",
                "project_name": f"采集项目 {task_group(index) % 200:03d}",
                "name": f"场景采集任务 {task_group(index):06d}",
                "subtask_name": task_subtask_name(index),
                "scene_type": ["室内", "室外", "车载", "人机交互"][
                    task_group(index) % 4
                ],
                "kit_id": stable_id("kit", task_group(index) % 500),
                "sop_id": stable_id("sop", task_group(index) % 200),
                "assigned_username": ""
                if task_group(index) % 5 == 0
                else f"stress.operator.{task_group(index) % 1000:04d}",
                "device_serial": ""
                if task_group(index) % 5 == 0
                else f"EGO-RK3588-{task_group(index) % 10000:07d}",
                # 待领取任务的采集位置由设备领取时自动写入，不由后台预设。
                "location": ""
                if task_group(index) % 5 == 0
                else f"采集点 {task_group(index) % 300:03d}",
                "target_objects": f"目标对象 {task_group(index) % 80:02d}",
                "object_count": 1 + task_group(index) % 40,
                "duration_minutes": 10 + task_group(index) % 110,
                "target_count": 20 + task_group(index) % 180,
                "completed_count": (
                    20 + task_group(index) % 180
                    if task_group(index) % 5 == 3
                    else min(task_group(index) % 100, 19 + task_group(index) % 180)
                ),
                "published_at": now
                - timedelta(
                    days=task_group(index) % 180, minutes=task_group(index) % 1440
                ),
                "status": ["PENDING", "CLAIMED", "IN_PROGRESS", "COMPLETED", "PAUSED"][
                    task_group(index) % 5
                ],
                "created_at": now
                - timedelta(
                    days=task_group(index) % 180, minutes=task_group(index) % 1440
                ),
                "updated_at": now,
            }
            for index in range(20000)
        ]
        await bulk_upsert(
            session,
            CollectionTask,
            tasks,
            (
                "task_no",
                "project_name",
                "name",
                "subtask_name",
                "scene_type",
                "kit_id",
                "sop_id",
                "assigned_username",
                "device_serial",
                "location",
                "target_objects",
                "object_count",
                "duration_minutes",
                "target_count",
                "completed_count",
                "published_at",
                "status",
                "created_at",
                "updated_at",
            ),
        )

        records = [
            {
                "id": stable_id("record", index),
                "workspace_id": workspace_id,
                "record_no": f"REC-{index:09d}",
                "task_id": stable_id("task", index % 20000),
                "project_name": f"采集项目 {task_group(index % 20000) % 200:03d}",
                "task_name": f"场景采集任务 {task_group(index % 20000):06d}",
                "subtask_name": task_subtask_name(index % 20000),
                "kit_name": f"采集套件 {index % 500:04d}",
                "capture_location": f"采集点 {index % 300:03d}",
                "device_serial": f"EGO-RK3588-{index % 10000:07d}",
                "operator_username": f"stress.operator.{index % 1000:04d}",
                "file_name": f"capture-{index:09d}.mp4",
                "file_size_bytes": 50_000_000 + (index % 900) * 1_000_000,
                "duration_seconds": 30 + index % 1800,
                "status": "COMPLETED",
                "qa_status": ["PENDING", "PASS", "PASS", "PASS", "REJECTED"][index % 5],
                "upload_status": ["LOCAL", "UPLOADING", "UPLOADED", "UPLOADED"][
                    index % 4
                ],
                "data_status": ["ON_DISK", "UPLOADING", "UPLOADED", "MISSING"][
                    index % 4
                ],
                "captured_at": now - timedelta(minutes=index % 525600),
                "remark": "持久化压力测试采集记录",
                "created_at": now - timedelta(minutes=index % 525600),
                "updated_at": now,
            }
            for index in range(50000)
        ]
        await bulk_upsert(
            session,
            CollectionRecord,
            records,
            (
                "project_name",
                "task_name",
                "subtask_name",
                "kit_name",
                "capture_location",
                "data_status",
                "updated_at",
            ),
        )

        # Every operator must have enough records in the default "today" range to
        # exercise scrolling, status filters, batching, totals, and pagination.
        # These fixtures use stable IDs and refresh their timestamps on every seed
        # run, so repeated QA runs do not create unbounded duplicate rows.
        recent_records = [
            {
                "id": stable_id("recent-record", index),
                "workspace_id": workspace_id,
                "record_no": f"REC-TODAY-{index:08d}",
                "task_id": stable_id("task", index % 20000),
                "project_name": f"采集项目 {task_group(index % 20000) % 200:03d}",
                "task_name": f"场景采集任务 {task_group(index % 20000):06d}",
                "subtask_name": task_subtask_name(index % 20000),
                "kit_name": f"采集套件 {index % 500:04d}",
                "capture_location": f"采集点 {index % 300:03d}",
                "device_serial": f"EGO-RK3588-{index % 10000:07d}",
                "operator_username": f"stress.operator.{index % 1000:04d}",
                "file_name": f"today-capture-{index:08d}.mp4",
                "file_size_bytes": 25_000_000 + (index % 1200) * 1_000_000,
                "duration_seconds": 15 + index % 3600,
                "status": "COMPLETED",
                "qa_status": ["PENDING", "PASS", "REJECTED", "PASS"][index % 4],
                "upload_status": ["LOCAL", "UPLOADING", "UPLOADED", "FAILED"][
                    index % 4
                ],
                "data_status": ["ON_DISK", "UPLOADING", "UPLOADED", "MISSING"][
                    index % 4
                ],
                "captured_at": now - timedelta(seconds=index % 10800),
                "remark": "当日持久化压力测试采集记录",
                "created_at": now - timedelta(seconds=index % 10800),
                "updated_at": now,
            }
            for index in range(10000)
        ]
        await bulk_upsert(
            session,
            CollectionRecord,
            recent_records,
            (
                "project_name",
                "task_name",
                "subtask_name",
                "kit_name",
                "capture_location",
                "data_status",
                "captured_at",
                "created_at",
                "updated_at",
            ),
        )

        # A second per-operator fixture set deliberately varies review/upload
        # states independently of the operator number. This guarantees every
        # terminal account can exercise every record filter instead of getting
        # one repeated status because of modulo alignment.
        recent_filter_records = [
            {
                "id": stable_id("recent-filter-record", operator_index * 12 + variant),
                "workspace_id": workspace_id,
                "record_no": f"REC-FILTER-{operator_index:04d}-{variant:02d}",
                "task_id": stable_id("task", (operator_index + variant * 1000) % 20000),
                "project_name": f"筛选压力项目 {operator_index % 200:03d}",
                "task_name": f"筛选压力任务 {operator_index:04d}-{variant:02d}",
                "subtask_name": f"筛选子任务 {variant:02d}",
                "kit_name": f"采集套件 {(operator_index + variant) % 500:04d}",
                "capture_location": f"采集点 {(operator_index + variant) % 300:03d}",
                "device_serial": f"EGO-RK3588-{(operator_index + variant * 1000) % 10000:07d}",
                "operator_username": f"stress.operator.{operator_index:04d}",
                "file_name": f"filter-capture-{operator_index:04d}-{variant:02d}.mp4",
                "file_size_bytes": 40_000_000 + variant * 125_000_000,
                "duration_seconds": 30 + variant * 90,
                "status": "COMPLETED",
                "qa_status": ["PENDING", "PASS", "REJECTED"][variant % 3],
                "upload_status": ["LOCAL", "UPLOADING", "UPLOADED", "FAILED"][
                    variant % 4
                ],
                "data_status": ["ON_DISK", "UPLOADING", "UPLOADED", "MISSING"][
                    variant % 4
                ],
                "captured_at": now - timedelta(minutes=variant * 7),
                "remark": "当日筛选状态压力测试记录",
                "created_at": now - timedelta(minutes=variant * 7),
                "updated_at": now,
            }
            for operator_index in range(1000)
            for variant in range(12)
        ]
        await bulk_upsert(
            session,
            CollectionRecord,
            recent_filter_records,
            (
                "project_name",
                "subtask_name",
                "kit_name",
                "capture_location",
                "data_status",
                "captured_at",
                "created_at",
                "updated_at",
            ),
        )

        clouds = [
            {
                "id": stable_id("cloud", index),
                "workspace_id": workspace_id,
                "name": f"存储连接 {index:04d}",
                "provider": ["S3", "MinIO", "OSS", "COS"][index % 4],
                "endpoint": f"https://storage-{index % 100}.ego.test",
                "bucket": f"ego-capture-{index:04d}",
                "region": f"cn-region-{index % 20}",
                "used_bytes": (index + 1) * 10_000_000_000,
                "total_bytes": 20_000_000_000_000,
                "status": ["CONNECTED", "CONNECTED", "DISCONNECTED"][index % 3],
                "is_active": index % 11 != 0,
                "created_at": now,
                "updated_at": now,
            }
            for index in range(1000)
        ]
        await bulk_insert(session, CloudStorage, clouds)

        feedback_rows = [
            {
                "id": stable_id("feedback", index),
                "workspace_id": workspace_id,
                "category": ["功能建议", "使用问题", "采集异常", "账号权限"][index % 4],
                "content": f"压力测试反馈 {index:06d}：请核查采集任务和记录状态是否同步。",
                "contact": f"operator.{index % 1000:04d}@ego.test",
                "submitter_username": f"stress.operator.{index % 1000:04d}",
                "status": ["OPEN", "PROCESSING", "RESOLVED", "CLOSED"][index % 4],
                "reply": "" if index % 4 == 0 else "已收到，将根据任务编号继续处理。",
                "created_at": now - timedelta(minutes=index % 100000),
                "updated_at": now,
            }
            for index in range(10000)
        ]
        await bulk_insert(session, Feedback, feedback_rows)

        versions = [
            {
                "id": stable_id("version", index),
                "workspace_id": workspace_id,
                "platform": ["device", "mobile", "management"][index % 3],
                "version": f"{1 + index // 500}.{index % 50}.{index % 100}",
                "build_number": index + 1,
                "release_notes": f"压测版本 {index:04d}：任务、记录、同步和交互优化。",
                "download_url": f"https://releases.ego.test/{index:04d}",
                "status": "PUBLISHED" if index % 7 else "DRAFT",
                "is_current": index < 3,
                "published_at": now - timedelta(days=index % 365),
                "created_at": now,
                "updated_at": now,
            }
            for index in range(1000)
        ]
        await bulk_insert(session, ReleaseVersion, versions)

        hidden_menus = [
            {
                "id": stable_id("menu", index),
                "parent_id": uuid.UUID("c0000000-0000-4000-8000-000000000000"),
                "name": f"压测权限 {index:03d}",
                "type": 2,
                "permission_code": f"stress:permission:{index:03d}",
                "sort": 1000 + index,
                "is_active": True,
                "is_visible": False,
                "is_cache": False,
                "created_at": now,
                "updated_at": now,
            }
            for index in range(500)
        ]
        await bulk_insert(session, Menu, hidden_menus)
        await bulk_insert(
            session,
            WorkspaceMenuLink,
            [
                {"workspace_id": workspace_id, "menu_id": stable_id("menu", index)}
                for index in range(500)
            ],
        )

        async_tasks = [
            {
                "id": stable_id("async-task", index),
                "workspace_id": workspace_id,
                "creator_id": root.id,
                "name": f"数据同步任务 {index:04d}",
                "task_type": "stress_sync",
                "status": ["completed", "completed", "processing", "failed"][index % 4],
                "progress": {
                    "total": 1000,
                    "processed": 1000 if index % 4 < 2 else index % 1000,
                    "success": 990,
                    "error": 10,
                },
                "created_at": now - timedelta(minutes=index),
                "updated_at": now,
            }
            for index in range(2000)
        ]
        await bulk_insert(session, AsyncTask, async_tasks)

        audit_logs = [
            {
                "id": stable_id("audit", index),
                "entity_type": [
                    "collection_task",
                    "collection_record",
                    "device_binding",
                    "feedback",
                ][index % 4],
                "workspace_id": workspace_id,
                "operator_id": root.id,
                "entity_id": str(stable_id("audit-entity", index)),
                "action": ["CREATE", "UPDATE", "DELETE"][index % 3],
                "diff_payload": {"stress": {"old": index - 1, "new": index}},
                "created_at": now - timedelta(seconds=index),
            }
            for index in range(20000)
        ]
        await bulk_insert(session, SystemAuditLog, audit_logs)


if __name__ == "__main__":
    asyncio.run(seed())
