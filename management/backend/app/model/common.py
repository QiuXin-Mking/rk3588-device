import uuid
from datetime import datetime, timezone
from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Generic message
class Message(SQLModel):
    message: str


# Core Base Model for all domain entities providing Audit, Auth and soft delete context
class BaseTimestampModel(SQLModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_column_kwargs={"onupdate": get_datetime_utc},
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    creator_id: uuid.UUID | None = Field(default=None, index=True)
    updater_id: uuid.UUID | None = Field(default=None, index=True)
    deleter_id: uuid.UUID | None = Field(default=None, index=True)


T = TypeVar("T")


class GenericPage(BaseModel, Generic[T]):
    count: int
    data: list[T]
