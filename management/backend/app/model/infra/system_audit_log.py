import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.model.common import get_datetime_utc


class FieldAuditLogOut(BaseModel):
    id: uuid.UUID
    action: str
    created_at: datetime
    operator_id: uuid.UUID | None = None
    operator_name: str | None = None
    old_value: Any | None = None
    new_value: Any | None = None


class SystemAuditLog(SQLModel, table=True):
    __tablename__ = "system_audit_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    entity_type: str = Field(primary_key=True)  # e.g. "role"

    workspace_id: uuid.UUID | None = Field(default=None, index=True)
    operator_id: uuid.UUID | None = Field(default=None, index=True)

    entity_id: str = Field(index=True)
    action: str  # CREATE, UPDATE, DELETE

    # Changes JSON representation
    diff_payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))

    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # ty: ignore
    )


class SystemAuditLogPublic(SQLModel):
    id: uuid.UUID
    entity_type: str
    workspace_id: uuid.UUID | None = None
    operator_id: uuid.UUID | None = None
    operator_name: str | None = None
    entity_id: str
    action: str
    diff_payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
