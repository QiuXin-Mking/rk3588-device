from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core.exceptions import BusinessException
from app.model.system.menu import MenuCreate, MenuListFilter, MenuUpdate


async def test_create_menu(db: AsyncSession) -> None:
    menu_in = MenuCreate(name="Settings", type=0, sort=1)
    menu = await dao.create_menu(session=db, menu_create=menu_in)

    assert menu.id is not None
    assert menu.name == "Settings"
    assert menu.sort == 1
    assert menu.is_visible is True


async def test_update_menu(db: AsyncSession, generic_menu) -> None:
    menu_update = MenuUpdate(name="Settings New", type=0)
    menu = await dao.update_menu(session=db, db_menu=generic_menu, menu_in=menu_update)

    assert menu.name == "Settings New"


async def test_get_menus_tree(db: AsyncSession) -> None:
    parent_in = MenuCreate(name="Parent", type=0, sort=1)
    parent = await dao.create_menu(session=db, menu_create=parent_in)

    child_in = MenuCreate(name="Child", type=1, parent_id=parent.id, sort=2)
    await dao.create_menu(session=db, menu_create=child_in)

    # Active tree
    tree = await dao.get_menus_tree(session=db, is_active=True)

    parent_node = next((node for node in tree if str(node.id) == str(parent.id)), None)
    assert parent_node is not None
    assert len(parent_node.children) >= 1
    assert parent_node.children[0].name == "Child"


async def test_get_workspace_menus_tree(db: AsyncSession) -> None:
    from app.model.system.workspace import WorkspaceCreate
    from tests.utils.utils import random_lower_string

    # Create workspace
    workspace = await dao.create_workspace(
        session=db, workspace_create=WorkspaceCreate(name=random_lower_string())
    )

    # Create menu tree
    parent_in = MenuCreate(name="WsParent", type=0, sort=1)
    parent = await dao.create_menu(session=db, menu_create=parent_in)

    child_in = MenuCreate(name="WsChild", type=1, parent_id=parent.id, sort=2)
    child = await dao.create_menu(session=db, menu_create=child_in)

    hidden_in = MenuCreate(name="HiddenParent", type=0, sort=3)
    await dao.create_menu(session=db, menu_create=hidden_in)

    # Associate only WsParent and WsChild to workspace
    await dao.set_workspace_menus(
        session=db, workspace_id=workspace.id, menu_ids=[parent.id, child.id]
    )

    # Fetch tree isolated by workspace
    tree = await dao.get_menus_tree_workspace(session=db, workspace_id=workspace.id)

    # Verify hidden is NOT present, parent IS present, and child IS present inside parent
    parent_node = next((node for node in tree if str(node.id) == str(parent.id)), None)
    assert parent_node is not None
    assert len(parent_node.children) == 1
    assert parent_node.children[0].id == child.id

    # Verify no hidden node
    hidden_node = next((node for node in tree if node.name == "HiddenParent"), None)
    assert hidden_node is None


async def test_get_menu_by_id(db: AsyncSession, generic_menu) -> None:
    fetched_menu = await dao.get_menu_by_id(session=db, menu_id=generic_menu.id)
    assert fetched_menu is not None
    assert fetched_menu.id == generic_menu.id
    assert fetched_menu.name == generic_menu.name


async def test_get_menus(db: AsyncSession) -> None:
    menu_in_1 = MenuCreate(name="List Menu 1", type=0)
    menu_in_2 = MenuCreate(name="List Menu 2", type=0)
    await dao.create_menu(session=db, menu_create=menu_in_1)
    await dao.create_menu(session=db, menu_create=menu_in_2)

    filters = MenuListFilter(name="List Menu")
    count, menus = await dao.get_menus(session=db, filters=filters, workspace_id=None)
    assert count >= 2
    assert len(menus) >= 2


async def test_delete_menu(db: AsyncSession, generic_menu) -> None:
    # Test child rejection
    parent_in = MenuCreate(name="Parent Node", type=0)
    parent = await dao.create_menu(session=db, menu_create=parent_in)
    child_in = MenuCreate(name="Child Node", type=1, parent_id=parent.id)
    await dao.create_menu(session=db, menu_create=child_in)

    import pytest

    with pytest.raises(BusinessException) as context:
        await dao.delete_menu(session=db, db_menu=parent)
    assert context.value.code == 400

    # Test real soft delete
    await dao.delete_menu(session=db, db_menu=generic_menu)
    assert generic_menu.deleted_at is not None

    # Verify it doesn't show up in normal find or is marked soft deleted
    fetched = await dao.get_menu_by_id(session=db, menu_id=generic_menu.id)
    if fetched:
        assert fetched.deleted_at is not None
    else:
        assert fetched is None


async def test_has_permission_exact_match(db: AsyncSession) -> None:
    """User with exact permission_code should pass."""
    from app.model.system.menu import MenuCreate
    from app.model.system.user import UserCreate
    from app.model.system.workspace import (
        MemberRoleLink,
        WorkspaceCreate,
        WorkspaceMember,
    )
    from app.model.workspace.role import RoleCreate
    from tests.utils.utils import random_lower_string

    # Setup: user -> workspace member -> role -> menu with permission
    user_in = UserCreate(username=random_lower_string(), password="password")
    user = await dao.create_user(session=db, user_create=user_in)
    ws = await dao.create_workspace(
        session=db, workspace_create=WorkspaceCreate(name=random_lower_string())
    )
    member = WorkspaceMember(account_id=user.id, workspace_id=ws.id, is_active=True)
    db.add(member)
    await db.flush()

    from app.core import context

    context.set_workspace_id(ws.id)
    role = await dao.create_role(
        session=db, role_create=RoleCreate(role_name=random_lower_string())
    )
    context.reset_workspace_id()

    menu = await dao.create_menu(
        session=db, menu_create=MenuCreate(name="btn", type=2, permission_code="users:delete"),
    )
    from app.model.workspace.role import RoleMenuLink

    db.add(RoleMenuLink(role_id=role.id, menu_id=menu.id))
    db.add(MemberRoleLink(member_id=member.id, role_id=role.id))
    await db.flush()

    result = await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="users:delete",
    )
    assert result is True

    # Should NOT match a different permission
    result_no = await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="roles:read",
    )
    assert result_no is False


async def test_has_permission_wildcard(db: AsyncSession) -> None:
    """User with 'users:*' should match any 'users:xxx' permission."""
    from app.model.system.menu import MenuCreate
    from app.model.system.user import UserCreate
    from app.model.system.workspace import (
        MemberRoleLink,
        WorkspaceCreate,
        WorkspaceMember,
    )
    from app.model.workspace.role import RoleCreate, RoleMenuLink
    from tests.utils.utils import random_lower_string

    user = await dao.create_user(
        session=db, user_create=UserCreate(username=random_lower_string(), password="password"),
    )
    ws = await dao.create_workspace(
        session=db, workspace_create=WorkspaceCreate(name=random_lower_string()),
    )
    member = WorkspaceMember(account_id=user.id, workspace_id=ws.id, is_active=True)
    db.add(member)
    await db.flush()

    from app.core import context

    context.set_workspace_id(ws.id)
    role = await dao.create_role(
        session=db, role_create=RoleCreate(role_name=random_lower_string()),
    )
    context.reset_workspace_id()

    # Menu with wildcard permission
    menu = await dao.create_menu(
        session=db, menu_create=MenuCreate(name="all-users", type=0, permission_code="users:*"),
    )
    db.add(RoleMenuLink(role_id=role.id, menu_id=menu.id))
    db.add(MemberRoleLink(member_id=member.id, role_id=role.id))
    await db.flush()

    # Should match any sub-permission
    assert await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="users:read",
    )
    assert await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="users:delete",
    )

    # Should NOT match a different domain
    assert not await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="roles:read",
    )


async def test_has_permission_multi_level_wildcard(db: AsyncSession) -> None:
    """User with 'sys:*' should match 'sys:user:read' (multi-level)."""
    from app.model.system.menu import MenuCreate
    from app.model.system.user import UserCreate
    from app.model.system.workspace import (
        MemberRoleLink,
        WorkspaceCreate,
        WorkspaceMember,
    )
    from app.model.workspace.role import RoleCreate, RoleMenuLink
    from tests.utils.utils import random_lower_string

    user = await dao.create_user(
        session=db, user_create=UserCreate(username=random_lower_string(), password="password"),
    )
    ws = await dao.create_workspace(
        session=db, workspace_create=WorkspaceCreate(name=random_lower_string()),
    )
    member = WorkspaceMember(account_id=user.id, workspace_id=ws.id, is_active=True)
    db.add(member)
    await db.flush()

    from app.core import context

    context.set_workspace_id(ws.id)
    role = await dao.create_role(
        session=db, role_create=RoleCreate(role_name=random_lower_string()),
    )
    context.reset_workspace_id()

    menu = await dao.create_menu(
        session=db, menu_create=MenuCreate(name="sys-all", type=0, permission_code="sys:*"),
    )
    db.add(RoleMenuLink(role_id=role.id, menu_id=menu.id))
    db.add(MemberRoleLink(member_id=member.id, role_id=role.id))
    await db.flush()

    # sys:* should match sys:user:read
    assert await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="sys:user:read",
    )
    # sys:* should match sys:menu:delete
    assert await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="sys:menu:delete",
    )
    # Should NOT match a completely different domain
    assert not await dao.has_permission(
        session=db, user_id=user.id, workspace_id=ws.id, permission_code="biz:report:view",
    )
