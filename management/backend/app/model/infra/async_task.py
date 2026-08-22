import uuid
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from app.model.common import BaseTimestampModel


class AsyncTaskBase(SQLModel):
    name: str | None = Field(
        default=None,
        max_length=100,
        description="Display name shown in task center",
    )
    task_type: str = Field(
        max_length=50, description="Task category, e.g. 'import_opportunity'"
    )
    status: str = Field(
        default="pending",
        max_length=50,
        description="pending|processing|completed|partial_failed|failed|cancelled",
    )
    progress: dict[str, Any] = Field(
        default_factory=dict, sa_column=Column(JSON)
    )  # {"total": int, "processed": int, "success": int, "error": int}
    result_file_url: str | None = Field(default=None, max_length=1000)


class AsyncTaskCreate(AsyncTaskBase):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)


class AsyncTaskUpdate(SQLModel):
    status: str | None = None
    progress: dict[str, Any] | None = None
    result_file_url: str | None = None


class AsyncTaskListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    status: str | None = None


class AsyncTask(AsyncTaskBase, BaseTimestampModel, table=True):
    __tablename__ = "async_task"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workspace_id: uuid.UUID | None = Field(
        default=None, foreign_key="workspace.id", index=True
    )
    creator_id: uuid.UUID | None = Field(default=None)
    updater_id: uuid.UUID | None = None
    deleter_id: uuid.UUID | None = None


class AsyncTaskPublic(AsyncTaskBase):
    id: uuid.UUID
    created_at: Any
