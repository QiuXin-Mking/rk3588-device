import uuid
from typing import TYPE_CHECKING

from sqlmodel import Field, SQLModel

if TYPE_CHECKING:
    pass

from app.model.common import BaseTimestampModel


class BusinessLineBase(SQLModel):
    name: str = Field(min_length=1, max_length=128)
    external_id: str | None = Field(default=None, max_length=128, index=True)
    parent_id: str | None = Field(default=None, max_length=128, index=True)
    path: str | None = Field(default=None, max_length=512, index=True)
    status: int = Field(default=1)  # 0=disabled, 1=enabled


class BusinessLineListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    name: str | None = Field(default=None)
    status: int | None = Field(default=None)


class BusinessLineCreate(BusinessLineBase):
    pass


class BusinessLineUpdate(BusinessLineBase):
    pass


class BusinessLine(BusinessLineBase, BaseTimestampModel, table=True):
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )


class BusinessLinePublic(BusinessLineBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None


class BusinessLineTreeNode(BusinessLinePublic):
    children: list["BusinessLineTreeNode"] = []
