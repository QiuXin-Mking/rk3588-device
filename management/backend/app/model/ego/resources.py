import uuid
from datetime import datetime

from sqlalchemy import JSON, BigInteger, Column, DateTime, Text
from sqlmodel import Field, SQLModel

from app.model.common import BaseTimestampModel, get_datetime_utc


class ResourceListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=500)
    q: str | None = Field(default=None, max_length=128)
    status: str | None = Field(default=None, max_length=32)


class KitDeviceSlot(SQLModel):
    role: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=128)
    device_model: str = Field(min_length=1, max_length=128)
    quantity: int = Field(default=1, ge=1, le=32)
    required: bool = True
    channel_count: int = Field(default=0, ge=0, le=32)
    channel_labels: list[str] = Field(default_factory=list)
    service_key: str = Field(default="", max_length=128)
    channel_keys: list[str] = Field(default_factory=list)
    sort: int = Field(default=1, ge=0)


class ProductKitBase(SQLModel):
    code: str = Field(min_length=1, max_length=64, index=True)
    name: str = Field(min_length=1, max_length=128, index=True)
    product_type: str = Field(default="通用采集套件", max_length=64)
    instructions: str = Field(default="", max_length=8000)
    exam_enabled: bool = False
    status: str = Field(default="ACTIVE", max_length=32, index=True)
    sort: int = 1
    device_slots: list[KitDeviceSlot] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )


class ProductKitCreate(ProductKitBase):
    pass


class ProductKitUpdate(ProductKitBase):
    pass


class ProductKit(ProductKitBase, BaseTimestampModel, table=True):
    __tablename__ = "product_kit"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class ProductKitPublic(ProductKitBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class PhysicalKitBase(SQLModel):
    serial_number: str = Field(min_length=1, max_length=128, index=True)
    name: str = Field(min_length=1, max_length=128, index=True)
    template_id: uuid.UUID = Field(foreign_key="product_kit.id", index=True)
    terminal_serial: str = Field(default="", max_length=128, index=True)
    bound_username: str = Field(default="", max_length=128, index=True)
    status: str = Field(default="READY", max_length=32, index=True)
    location: str = Field(default="", max_length=256)
    remark: str = Field(default="", max_length=1000)


class PhysicalKitCreate(PhysicalKitBase):
    pass


class PhysicalKitUpdate(PhysicalKitBase):
    pass


class PhysicalKit(PhysicalKitBase, BaseTimestampModel, table=True):
    __tablename__ = "physical_kit"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class PhysicalKitPublic(PhysicalKitBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    template_name: str = ""
    device_slots: list[KitDeviceSlot] = Field(default_factory=list, sa_column=None)
    creator_name: str | None = None
    updater_name: str | None = None


class DeviceBindingBase(SQLModel):
    serial_number: str = Field(min_length=1, max_length=128, index=True)
    pid: str = Field(default="", max_length=128, index=True)
    device_name: str = Field(min_length=1, max_length=128)
    device_model: str = Field(default="", max_length=128, index=True)
    slot_role: str = Field(default="", max_length=64, index=True)
    physical_kit_id: uuid.UUID | None = Field(
        default=None, foreign_key="physical_kit.id", index=True
    )
    status: str = Field(default="UNKNOWN", max_length=32, index=True)
    firmware_version: str = Field(default="", max_length=64)
    last_seen_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    remark: str = Field(default="", max_length=1000)


class DeviceBindingCreate(DeviceBindingBase):
    pass


class DeviceBindingUpdate(DeviceBindingBase):
    pass


class DeviceBinding(DeviceBindingBase, BaseTimestampModel, table=True):
    __tablename__ = "device_binding"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class DeviceBindingPublic(DeviceBindingBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class CollectionSopBase(SQLModel):
    name: str = Field(min_length=1, max_length=128, index=True)
    content: str = Field(min_length=1, sa_type=Text)


class CollectionSopCreate(CollectionSopBase):
    pass


class CollectionSopUpdate(CollectionSopBase):
    pass


class CollectionSop(CollectionSopBase, BaseTimestampModel, table=True):
    __tablename__ = "collection_sop"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class CollectionSopPublic(CollectionSopBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class CollectionSceneBase(SQLModel):
    name: str = Field(min_length=1, max_length=64, index=True)
    description: str = Field(default="", max_length=1000)
    status: str = Field(default="ACTIVE", max_length=32, index=True)
    sort: int = 1


class CollectionSceneCreate(CollectionSceneBase):
    pass


class CollectionSceneUpdate(CollectionSceneBase):
    pass


class CollectionScene(CollectionSceneBase, BaseTimestampModel, table=True):
    __tablename__ = "collection_scene"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class CollectionScenePublic(CollectionSceneBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class CollectionTaskBase(SQLModel):
    task_no: str = Field(default="", max_length=64, index=True)
    project_name: str = Field(min_length=1, max_length=128, index=True)
    name: str = Field(min_length=1, max_length=128, index=True)
    subtask_name: str = Field(default="", max_length=128, index=True)
    scene_type: str = Field(default="室内", max_length=64)
    kit_id: uuid.UUID | None = Field(default=None, foreign_key="product_kit.id")
    sop_id: uuid.UUID = Field(foreign_key="collection_sop.id", index=True)
    assigned_username: str = Field(default="", max_length=128, index=True)
    device_serial: str = Field(default="", max_length=128, index=True)
    location: str = Field(default="", max_length=256)
    target_objects: str = Field(default="", max_length=1000)
    object_count: int = Field(default=0, ge=0)
    duration_minutes: int = Field(default=30, ge=0)
    target_count: int = Field(default=1, ge=0)
    completed_count: int = Field(default=0, ge=0)
    published_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    status: str = Field(default="PENDING", max_length=32, index=True)


class CollectionTaskCreate(CollectionTaskBase):
    pass


class CollectionTaskUpdate(CollectionTaskBase):
    pass


class CollectionTaskClaim(SQLModel):
    location: str = Field(default="", max_length=256)
    target_objects: str = Field(default="", max_length=1000)
    object_count: int = Field(default=0, ge=0)


class CollectionTask(CollectionTaskBase, BaseTimestampModel, table=True):
    __tablename__ = "collection_task"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class CollectionTaskPublic(CollectionTaskBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    kit_name: str = ""
    sop_name: str = ""
    sop_content: str = ""
    creator_name: str | None = None
    updater_name: str | None = None


class OperatorTerminalConfig(SQLModel):
    physical_kit: PhysicalKitPublic | None = None
    devices: list[DeviceBindingPublic] = Field(default_factory=list)
    template: ProductKitPublic | None = None


class CollectionRecordBase(SQLModel):
    record_no: str = Field(min_length=1, max_length=128, index=True)
    task_id: uuid.UUID | None = Field(default=None, foreign_key="collection_task.id")
    project_name: str = Field(default="", max_length=128, index=True)
    task_name: str = Field(default="", max_length=128, index=True)
    subtask_name: str = Field(default="", max_length=128, index=True)
    kit_name: str = Field(default="", max_length=128, index=True)
    capture_location: str = Field(default="", max_length=256)
    device_serial: str = Field(default="", max_length=128, index=True)
    operator_username: str = Field(default="", max_length=128, index=True)
    file_name: str = Field(default="", max_length=256)
    file_size_bytes: int = Field(default=0, ge=0)
    duration_seconds: int = Field(default=0, ge=0)
    status: str = Field(default="COMPLETED", max_length=32, index=True)
    qa_status: str = Field(default="PENDING", max_length=32, index=True)
    upload_status: str = Field(default="LOCAL", max_length=32, index=True)
    data_status: str = Field(default="ON_DISK", max_length=32, index=True)
    captured_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    remark: str = Field(default="", max_length=1000)


class CollectionRecordCreate(CollectionRecordBase):
    pass


class CollectionRecordUpdate(CollectionRecordBase):
    pass


class CollectionRecord(CollectionRecordBase, BaseTimestampModel, table=True):
    __tablename__ = "collection_record"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class CollectionRecordPublic(CollectionRecordBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class CloudStorageBase(SQLModel):
    name: str = Field(min_length=1, max_length=128, index=True)
    provider: str = Field(min_length=1, max_length=64, index=True)
    endpoint: str = Field(default="", max_length=512)
    bucket: str = Field(default="", max_length=128)
    region: str = Field(default="", max_length=64)
    used_bytes: int = Field(default=0, ge=0, sa_type=BigInteger)  # type: ignore
    total_bytes: int = Field(default=0, ge=0, sa_type=BigInteger)  # type: ignore
    status: str = Field(default="CONNECTED", max_length=32, index=True)
    is_active: bool = True


class CloudStorageCreate(CloudStorageBase):
    pass


class CloudStorageUpdate(CloudStorageBase):
    pass


class CloudStorage(CloudStorageBase, BaseTimestampModel, table=True):
    __tablename__ = "cloud_storage"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class CloudStoragePublic(CloudStorageBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class FeedbackBase(SQLModel):
    category: str = Field(min_length=1, max_length=64, index=True)
    content: str = Field(min_length=2, max_length=4000)
    contact: str = Field(default="", max_length=128)
    submitter_username: str = Field(default="", max_length=128, index=True)
    status: str = Field(default="OPEN", max_length=32, index=True)
    reply: str = Field(default="", max_length=4000)


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackUpdate(FeedbackBase):
    pass


class Feedback(FeedbackBase, BaseTimestampModel, table=True):
    __tablename__ = "feedback"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class FeedbackPublic(FeedbackBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class ReleaseVersionBase(SQLModel):
    platform: str = Field(min_length=1, max_length=32, index=True)
    version: str = Field(min_length=1, max_length=64, index=True)
    build_number: int = Field(default=1, ge=1)
    release_notes: str = Field(default="", max_length=8000)
    download_url: str = Field(default="", max_length=1000)
    status: str = Field(default="PUBLISHED", max_length=32, index=True)
    is_current: bool = False
    published_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class ReleaseVersionCreate(ReleaseVersionBase):
    pass


class ReleaseVersionUpdate(ReleaseVersionBase):
    pass


class ReleaseVersion(ReleaseVersionBase, BaseTimestampModel, table=True):
    __tablename__ = "release_version"
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class ReleaseVersionPublic(ReleaseVersionBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class DashboardSummary(SQLModel):
    device_count: int
    online_device_count: int
    pending_task_count: int
    today_record_count: int
    pending_qa_count: int
    open_feedback_count: int
    stored_bytes: int
