import uuid

from sqlmodel import Field, SQLModel

from app.model.common import BaseTimestampModel


class MenuBase(SQLModel):
    parent_id: uuid.UUID | None = Field(default=None, index=True)
    name: str = Field(min_length=1, max_length=64)
    type: int = Field(default=0)  # 0=Directory, 1=Menu, 2=Button, 3=External API
    path: str | None = Field(default=None, max_length=128)
    icon: str | None = Field(default=None, max_length=64)
    permission_code: str | None = Field(default=None, max_length=128)
    sort: int = Field(default=1)
    is_active: bool = Field(default=True)
    is_visible: bool = Field(default=True)
    is_cache: bool = Field(default=True)

class MenuCreate(MenuBase):
    pass


class MenuUpdate(MenuBase):
    pass


class MenuListFilter(SQLModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, le=500)
    name: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class Menu(MenuBase, BaseTimestampModel, table=True):
    parent_id: uuid.UUID | None = Field(
        default=None, foreign_key="menu.id", ondelete="CASCADE", index=True
    )


class MenuPublic(MenuBase, BaseTimestampModel):
    creator_name: str | None = None
    updater_name: str | None = None


class MenuTreeNode(MenuPublic):
    children: list["MenuTreeNode"] = []
