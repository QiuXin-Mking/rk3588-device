from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.model.system.workspace import (
    MemberRoleLink,
    WorkspaceMemberCreate,
    WorkspaceMemberListFilter,
    WorkspaceMemberUpdate,
)
from app.model.workspace.role import RoleCreate


async def test_create_workspace_member(
    db: AsyncSession, generic_workspace, generic_user
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)

    member_in = WorkspaceMemberCreate(
        username=generic_user.username, employee_name="tester"
    )
    member = await dao.create_workspace_member(session=db, member_create=member_in)

    assert member.id is not None
    assert member.workspace_id == generic_workspace.id
    assert member.account_id == generic_user.id
    assert member.employee_name == "tester"


async def test_get_workspace_member_by_id(
    db: AsyncSession, generic_workspace, generic_user
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)
    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=generic_user.username),
    )

    fetched = await dao.get_workspace_member_by_id(session=db, member_id=member.id)
    assert fetched is not None
    assert fetched.id == member.id


async def test_get_workspace_members(
    db: AsyncSession, generic_workspace, generic_user
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)

    from app.model.system.user import UserCreate
    from tests.utils.utils import random_lower_string

    user2 = await dao.create_user(
        session=db,
        user_create=UserCreate(username=random_lower_string(), password="password"),
    )

    await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=generic_user.username),
    )
    await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=user2.username),
    )

    count, members = await dao.get_workspace_members(
        session=db,
        workspace_id=generic_workspace.id,
        filters=WorkspaceMemberListFilter(),
    )
    assert count >= 2
    assert len(members) >= 2


async def test_get_workspace_members_by_business_line(
    db: AsyncSession,
    generic_workspace,
    generic_user,
    generic_business_line,
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)
    generic_business_line.external_id = "dept-business-line"
    db.add(generic_business_line)
    await db.commit()

    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(
            username=generic_user.username,
            main_dept_id=generic_business_line.external_id,
        ),
    )

    count, members = await dao.get_workspace_members(
        session=db,
        workspace_id=generic_workspace.id,
        filters=WorkspaceMemberListFilter(
            business_line_ids=[generic_business_line.id]
        ),
    )

    assert count == 1
    assert [item.id for item in members] == [member.id]


async def test_update_workspace_member(
    db: AsyncSession, generic_workspace, generic_user
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)

    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(
            username=generic_user.username, employee_name="old"
        ),
    )

    member_update = WorkspaceMemberUpdate(employee_name="new")
    updated_member = await dao.update_workspace_member(
        session=db, db_member=member, member_in=member_update
    )

    assert updated_member.employee_name == "new"


async def test_delete_workspace_member(
    db: AsyncSession, generic_workspace, generic_user
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)

    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=generic_user.username),
    )

    await dao.delete_workspace_member(session=db, db_member=member)

    fetched = await dao.get_workspace_member_by_id(session=db, member_id=member.id)
    assert fetched is None


async def test_set_workspacemember_roles(
    db: AsyncSession, generic_workspace, generic_user, generic_role
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)

    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=generic_user.username),
    )

    role2 = await dao.create_role(
        session=db,
        role_create=RoleCreate(role_name="Role 2"),
    )

    await dao.set_workspacemember_roles(
        session=db, member_id=member.id, role_ids=[generic_role.id, role2.id]
    )

    links = await db.exec(
        select(MemberRoleLink).where(MemberRoleLink.member_id == member.id)
    )
    link_list = links.all()
    assert len(link_list) == 2
    ids = {lnk.role_id for lnk in link_list}
    assert generic_role.id in ids
    assert role2.id in ids


async def test_add_workspacemember_roles_preserves_existing_roles(
    db: AsyncSession, generic_workspace, generic_user, generic_role
) -> None:
    from app.core import context

    context.set_workspace_id(generic_workspace.id)
    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(username=generic_user.username),
    )
    added_role = await dao.create_role(
        session=db,
        role_create=RoleCreate(role_name="Added Role"),
    )
    await dao.set_workspacemember_roles(
        session=db,
        member_id=member.id,
        role_ids=[generic_role.id],
    )

    added_count = await dao.add_workspacemember_roles(
        session=db,
        member_ids=[member.id],
        role_ids=[added_role.id],
    )
    role_ids = await dao.get_workspacemember_roles(
        session=db, member_id=member.id
    )

    assert added_count == 1
    assert set(role_ids) == {generic_role.id, added_role.id}
