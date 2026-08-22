from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .workspace import WorkspaceMember

from sqlmodel import Field, Relationship, SQLModel

from app.model.common import BaseTimestampModel

PASSWORD_MIN_LENGTH = 5


class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=1, max_length=150)
    avatar: str | None = Field(default=None, max_length=255)
    status: int = Field(default=1)  # global external status: 0=disabled, 1=enabled
    is_active: bool = Field(default=True)
    is_root: bool = Field(default=False)
    last_login: datetime | None = None


class UserListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    username: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class UserRegister(SQLModel):
    username: str = Field(max_length=150)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)


class UserCreate(UserBase):
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)


class UserUpdate(UserBase):
    password: str | None = Field(
        default=None, min_length=PASSWORD_MIN_LENGTH, max_length=128
    )


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)


class User(UserBase, BaseTimestampModel, table=True):
    hashed_password: str
    members: list["WorkspaceMember"] = Relationship(
        back_populates="user", cascade_delete=True
    )


class UserPublic(UserBase, BaseTimestampModel):
    creator_name: str | None = None
    updater_name: str | None = None
