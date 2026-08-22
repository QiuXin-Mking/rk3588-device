from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.model.system.workspace import MemberRoleLink
from app.model.workspace.role import (
    RoleCreate,
    RoleListFilter,
    RoleMenuLink,
    RoleUpdate,
)


async def test_create_role(db: AsyncSession, generic_workspace) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)
    role_in = RoleCreate(role_name="Test Role")
    role = await dao.create_role(session=db, role_create=role_in)
    context.reset_workspace_id()

    assert role.id is not None
    assert role.role_name == "Test Role"
    assert role.workspace_id == generic_workspace.id


async def test_update_role(db: AsyncSession, generic_role) -> None:
    role_update = RoleUpdate(role_name="New Role")
    role = await dao.update_role(session=db, db_role=generic_role, role_in=role_update)

    assert role.role_name == "New Role"


async def test_get_roles(db: AsyncSession, generic_workspace) -> None:
    from app.core import context

    role_in1 = RoleCreate(role_name="Role 1")
    role_in2 = RoleCreate(role_name="Role 2")
    context.set_workspace_id(generic_workspace.id)
    await dao.create_role(session=db, role_create=role_in1)
    await dao.create_role(session=db, role_create=role_in2)
    context.reset_workspace_id()

    count, roles = await dao.get_roles(
        session=db, workspace_id=generic_workspace.id, filters=RoleListFilter()
    )
    assert count >= 2
    assert len(roles) >= 2


async def test_set_role_menus(db: AsyncSession, generic_role, generic_menu) -> None:
    await dao.set_role_menus(
        session=db, role_id=generic_role.id, menu_ids=[generic_menu.id]
    )

    links = await db.exec(
        select(RoleMenuLink).where(RoleMenuLink.role_id == generic_role.id)
    )
    link_list = links.all()
    assert len(link_list) == 1
    assert link_list[0].menu_id == generic_menu.id


async def test_get_role_by_id(db: AsyncSession, generic_role) -> None:
    fetched = await dao.get_role_by_id(session=db, role_id=generic_role.id)
    assert fetched is not None
    assert fetched.id == generic_role.id
    assert fetched.role_name == generic_role.role_name


async def test_delete_role(
    db: AsyncSession, generic_role, generic_workspace, generic_user
) -> None:
    from app.core import context
    from app.model.system.workspace import WorkspaceMemberCreate

    context.set_workspace_id(generic_workspace.id)
    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=generic_user.username),
    )
    context.reset_workspace_id()
    db.add(MemberRoleLink(member_id=member.id, role_id=generic_role.id))
    await db.commit()

    await dao.delete_role(session=db, db_role=generic_role)

    # Verify soft delete
    deleted_role = await dao.get_role_by_id(session=db, role_id=generic_role.id)
    assert deleted_role is None

    links = await db.exec(
        select(MemberRoleLink).where(MemberRoleLink.role_id == generic_role.id)
    )
    assert links.all() == []


async def test_get_role_menus(db: AsyncSession, generic_role, generic_menu) -> None:
    # First assign the menu
    await dao.set_role_menus(
        session=db, role_id=generic_role.id, menu_ids=[generic_menu.id]
    )

    # Then retrieve and check
    menus = await dao.get_role_menus(session=db, role_id=generic_role.id)
    assert len(menus) == 1
    assert menus[0] == generic_menu.id


async def test_get_role_members(
    db: AsyncSession, generic_role, generic_workspace, generic_user
) -> None:
    from app.core import context
    from app.model.system.workspace import WorkspaceMemberCreate

    context.set_workspace_id(generic_workspace.id)
    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(
            username=generic_user.username,
            employee_name="Role Member",
        ),
    )
    context.reset_workspace_id()
    db.add(MemberRoleLink(member_id=member.id, role_id=generic_role.id))
    await db.commit()

    members = await dao.get_role_members(session=db, role_id=generic_role.id)

    assert [item.id for item in members] == [member.id]
