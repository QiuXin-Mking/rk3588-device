import pytest
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.model.system.menu import MenuCreate
from app.model.system.workspace import Workspace

pytestmark = pytest.mark.asyncio


async def test_append_workspace_menus_keeps_existing(
    db: AsyncSession, generic_workspace: Workspace
) -> None:
    menu_a = await dao.create_menu(
        session=db, menu_create=MenuCreate(name="Menu A", type=0, sort=1)
    )
    menu_b = await dao.create_menu(
        session=db, menu_create=MenuCreate(name="Menu B", type=0, sort=2)
    )
    await dao.set_workspace_menus(
        session=db, workspace_id=generic_workspace.id, menu_ids=[menu_a.id]
    )

    await dao.append_workspace_menus(
        session=db, workspace_id=generic_workspace.id, menu_ids=[menu_b.id]
    )

    menu_ids = await dao.get_workspace_menus(
        session=db, workspace_id=generic_workspace.id
    )
    assert set(menu_ids) == {menu_a.id, menu_b.id}
