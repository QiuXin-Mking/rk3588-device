from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core import context
from app.model.system.menu import MenuCreate
from app.model.system.user import UserCreate
from app.model.system.workspace import (
    WorkspaceCreate,
    WorkspaceMemberCreate,
    WorkspaceMemberListFilter,
    WorkspaceUpdate,
)
from tests.utils.utils import random_lower_string


async def test_create_workspace(db: AsyncSession) -> None:
    name = random_lower_string()
    workspace_in = WorkspaceCreate(name=name)
    workspace = await dao.create_workspace(session=db, workspace_create=workspace_in)
    assert workspace.name == name
    assert workspace.id is not None


async def test_update_workspace(db: AsyncSession, generic_workspace) -> None:
    new_name = random_lower_string()
    workspace_update = WorkspaceUpdate(name=new_name, description="updated desc")
    updated_workspace = await dao.update_workspace(
        session=db, db_workspace=generic_workspace, workspace_in=workspace_update
    )
    assert updated_workspace.name == new_name
    assert updated_workspace.description == "updated desc"


async def test_set_workspace_menus(
    db: AsyncSession, generic_workspace, generic_menu
) -> None:
    # 2. Create some menus (one from generic_menu)
    menu2 = await dao.create_menu(
        session=db,
        menu_create=MenuCreate(name="M2", component_path="/m2", type=1),
    )

    # 3. Associate
    await dao.set_workspace_menus(
        session=db,
        workspace_id=generic_workspace.id,
        menu_ids=[generic_menu.id, menu2.id],
    )

    # Verify menus using get_menus_workspace
    workspace_menus = await dao.get_menus_workspace(
        session=db, workspace_id=generic_workspace.id
    )
    assert len(workspace_menus) == 2
    ids = {m.id for m in workspace_menus}
    assert generic_menu.id in ids
    assert menu2.id in ids

    # 4. Remove one menu
    await dao.set_workspace_menus(
        session=db, workspace_id=generic_workspace.id, menu_ids=[generic_menu.id]
    )
    workspace_menus2 = await dao.get_menus_workspace(
        session=db, workspace_id=generic_workspace.id
    )
    assert len(workspace_menus2) == 1
    assert workspace_menus2[0].id == generic_menu.id


async def test_get_workspace_by_id(db: AsyncSession, generic_workspace) -> None:
    fetched = await dao.get_workspace_by_id(
        session=db, workspace_id=generic_workspace.id
    )
    assert fetched is not None
    assert fetched.id == generic_workspace.id


async def test_get_workspaces(db: AsyncSession) -> None:
    name1 = random_lower_string()
    name2 = random_lower_string()
    await dao.create_workspace(session=db, workspace_create=WorkspaceCreate(name=name1))
    await dao.create_workspace(session=db, workspace_create=WorkspaceCreate(name=name2))

    from app.model.system.workspace import WorkspaceListFilter

    count, workspaces = await dao.get_workspaces(
        session=db, filters=WorkspaceListFilter()
    )
    assert count >= 2
    assert len(workspaces) >= 2


async def test_get_workspace_members_with_account_ids_filter(
    db: AsyncSession, generic_workspace
) -> None:
    user_one = await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=f"wm_{random_lower_string()}",
            password=random_lower_string(),
        ),
    )
    user_two = await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=f"wm_{random_lower_string()}",
            password=random_lower_string(),
        ),
    )

    context.set_workspace_id(generic_workspace.id)
    try:
        member_one = await dao.create_workspace_member(
            session=db,
            member_create=WorkspaceMemberCreate(
                username=user_one.username,
                employee_name="成员一",
            ),
        )
        member_two = await dao.create_workspace_member(
            session=db,
            member_create=WorkspaceMemberCreate(
                username=user_two.username,
                employee_name="成员二",
            ),
        )
    finally:
        context.reset_workspace_id()

    count, members = await dao.get_workspace_members(
        session=db,
        workspace_id=generic_workspace.id,
        filters=WorkspaceMemberListFilter(
            skip=0,
            limit=10,
            account_ids=[member_one.account_id],
        ),
    )
    assert count == 1
    assert [member.id for member in members] == [member_one.id]

    count_all, members_all = await dao.get_workspace_members(
        session=db,
        workspace_id=generic_workspace.id,
        filters=WorkspaceMemberListFilter(
            skip=0,
            limit=10,
            account_ids=[member_one.account_id, member_two.account_id],
        ),
    )
    assert count_all == 2
    assert {member.id for member in members_all} == {member_one.id, member_two.id}


async def test_delete_workspace(db: AsyncSession, generic_workspace) -> None:
    await dao.delete_workspace(session=db, db_workspace=generic_workspace)

    fetched = await dao.get_workspace_by_id(
        session=db, workspace_id=generic_workspace.id
    )
    assert fetched is None
