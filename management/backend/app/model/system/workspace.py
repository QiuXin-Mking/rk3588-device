import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from pydantic import model_validator
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.model.common import BaseTimestampModel

from .user import PASSWORD_MIN_LENGTH

if TYPE_CHECKING:
    from .menu import Menu
    from .role import Role
    from .user import User


class WorkspaceBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, index=True)
    description: str | None = Field(default=None, max_length=500)
    logo: str | None = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(WorkspaceBase):
    pass


class WorkspaceListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    name: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


# Workspace Menu Link Table for Workspace Isolation
class WorkspaceMenuLink(SQLModel, table=True):
    workspace_id: uuid.UUID = Field(
        foreign_key="workspace.id", primary_key=True, ondelete="CASCADE"
    )
    menu_id: uuid.UUID = Field(
        foreign_key="menu.id", primary_key=True, ondelete="CASCADE"
    )


class Workspace(WorkspaceBase, BaseTimestampModel, table=True):
    members: list["WorkspaceMember"] = Relationship(
        back_populates="workspace", cascade_delete=True
    )
    menus: list["Menu"] = Relationship(link_model=WorkspaceMenuLink)


class WorkspacePublic(WorkspaceBase, BaseTimestampModel):
    creator_name: str | None = None
    updater_name: str | None = None


# Workspace Member Link Table for Roles
class MemberRoleLink(SQLModel, table=True):
    member_id: uuid.UUID = Field(foreign_key="workspacemember.id", primary_key=True)
    role_id: uuid.UUID = Field(foreign_key="role.id", primary_key=True)


class WorkspaceMemberBase(SQLModel):
    # HR fields inherited from old User spec
    user_id: str | None = Field(default=None, max_length=255)
    job_number: str | None = Field(default=None, max_length=255)
    employee_name: str | None = Field(default=None, max_length=255)
    sex: str | None = Field(default=None, max_length=255)
    mobile: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    telephone: str | None = Field(default=None, max_length=255)
    employee_status: str | None = Field(default=None, max_length=255)
    report_manager: str | None = Field(default=None, max_length=255)
    employee_type: str | None = Field(default=None, max_length=255)
    work_region: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    cooperation_mode: str | None = Field(default=None, max_length=64)
    work_serial_number: str | None = Field(default=None, max_length=128)
    height_cm: int | None = Field(default=None, ge=0, le=300)
    position: str | None = Field(default=None, max_length=255)
    entry_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    exit_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    # Department fields
    main_dept: str | None = Field(default=None, max_length=255)
    main_dept_id: str | None = Field(default=None, max_length=255)
    first_dept: str | None = Field(default=None, max_length=255)
    second_dept: str | None = Field(default=None, max_length=255)
    third_dept: str | None = Field(default=None, max_length=255)
    fourth_dept: str | None = Field(default=None, max_length=255)
    fifth_dept: str | None = Field(default=None, max_length=255)
    sixth_dept: str | None = Field(default=None, max_length=255)

    is_active: bool = Field(default=True)


class WorkspaceMemberCreate(WorkspaceMemberBase):
    username: str = Field(min_length=1, max_length=150)
    new_user_password: str | None = Field(
        default=None, min_length=PASSWORD_MIN_LENGTH, max_length=128
    )


class WorkspaceMemberUpdate(WorkspaceMemberBase):
    pass


class WorkspaceMemberListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    job_number: str | None = Field(default=None)
    employee_name: str | None = Field(default=None)
    sex: str | None = Field(default=None)
    mobile: str | None = Field(default=None)
    employee_status: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)
    account_ids: list[uuid.UUID] | None = Field(default=None)
    business_line_ids: list[uuid.UUID] | None = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def parse_comma_separated_lists(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for field_name in ("account_ids", "business_line_ids"):
            values = data.get(field_name)
            if isinstance(values, str):
                data[field_name] = [
                    uuid.UUID(part.strip())
                    for part in values.split(",")
                    if part.strip()
                ]
            elif (
                isinstance(values, list)
                and len(values) == 1
                and isinstance(values[0], str)
                and "," in values[0]
            ):
                data[field_name] = [
                    uuid.UUID(part.strip())
                    for part in values[0].split(",")
                    if part.strip()
                ]
        return data


class WorkspaceMember(WorkspaceMemberBase, BaseTimestampModel, table=True):
    account_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    workspace_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="workspace.id",
        index=True,
        sa_column_kwargs={"nullable": False},
    )
    workspace: Workspace = Relationship(back_populates="members")
    user: "User" = Relationship(back_populates="members")
    roles: list["Role"] = Relationship(link_model=MemberRoleLink)


class WorkspaceMemberPublic(WorkspaceMemberBase, BaseTimestampModel):
    account_id: uuid.UUID
    workspace_id: uuid.UUID
    creator_name: str | None = None
    updater_name: str | None = None
