import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .menu import Menu

from sqlmodel import Field, Relationship, SQLModel

from app.model.common import BaseTimestampModel


class RoleMenuLink(SQLModel, table=True):
    role_id: uuid.UUID = Field(
        foreign_key="role.id", primary_key=True, ondelete="CASCADE"
    )
    menu_id: uuid.UUID = Field(
        foreign_key="menu.id", primary_key=True, ondelete="CASCADE"
    )


class RoleBase(SQLModel):
    role_name: str = Field(min_length=1, max_length=64)
    business_line_id: uuid.UUID | None = Field(default=None, index=True)
    sort: int = Field(default=1)
    is_active: bool = Field(default=True)
    remark: str | None = Field(default=None)


class RoleListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    role_name: str | None = Field(default=None)
    business_line_id: uuid.UUID | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    pass


class Role(RoleBase, BaseTimestampModel, table=True):
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )
    menus: list["Menu"] = Relationship(link_model=RoleMenuLink)


class RolePublic(RoleBase, BaseTimestampModel):
    workspace_id: uuid.UUID
    business_line_name: str | None = None
    creator_name: str | None = None
    updater_name: str | None = None
