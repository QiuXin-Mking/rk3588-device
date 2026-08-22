import uuid
from typing import Any

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.model.system.menu import MenuCreate


async def test_create_menu(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "name": "System Management",
        "type": 0,
        "path": "/system",
        "icon": "settings",
        "sort": 1,
    }
    response = await client.post(
        "/api/v1/system/menus/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["type"] == data["type"]
    assert "id" in content


async def test_read_menus(
    client: AsyncClient,
    superuser_workspace: dict[str, Any],
    db: AsyncSession,
) -> None:
    headers = superuser_workspace["headers"]

    # Create test menus
    menu_in = MenuCreate(name="Dashboard List 1", type=1, path="/dash1")
    menu = await dao.create_menu(session=db, menu_create=menu_in)
    await dao.set_workspace_menus(
        session=db, workspace_id=superuser_workspace["workspace"].id, menu_ids=[menu.id]
    )

    response = await client.get("/api/v1/system/menus/", headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert content["count"] > 0
    assert any(item["name"] == "Dashboard List 1" for item in content["data"])


async def test_read_menu(
    client: AsyncClient, superuser_token_headers: dict[str, str], api_menu
) -> None:
    response = await client.get(
        f"/api/v1/system/menus/{api_menu.id}", headers=superuser_token_headers
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == api_menu.name
    assert content["id"] == str(api_menu.id)


async def test_update_menu(
    client: AsyncClient, superuser_token_headers: dict[str, str], api_menu
) -> None:
    data = {"name": "Main Dashboard Updated", "type": 1, "path": "/dashboard-main"}
    response = await client.put(
        f"/api/v1/system/menus/{api_menu.id}", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["path"] == data["path"]


async def test_delete_menu(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
    api_menu,
    db: AsyncSession,
) -> None:
    # Delete menu via API
    response = await client.delete(
        f"/api/v1/system/menus/{api_menu.id}", headers=superuser_token_headers
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Menu deleted"

    # Verify it is soft-deleted
    result = await dao.get_menu_by_id(session=db, menu_id=api_menu.id)
    if result:
        assert result.deleted_at is not None
    else:
        assert result is None


async def test_read_menus_tree(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
    db: AsyncSession,
) -> None:
    root_in = MenuCreate(name="Root", type=0, sort=1)
    root = await dao.create_menu(session=db, menu_create=root_in)

    child1_in = MenuCreate(name="Child 1", type=1, parent_id=root.id, sort=1)
    child2_in = MenuCreate(name="Child 2", type=1, parent_id=root.id, sort=2)
    await dao.create_menu(session=db, menu_create=child1_in)
    await dao.create_menu(session=db, menu_create=child2_in)

    # Tree is un-wrapped now (returns list directly)
    response = await client.get("/api/v1/system/menus/tree", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()

    root_node = next((node for node in data if str(node["id"]) == str(root.id)), None)
    assert root_node is not None
    assert len(root_node["children"]) >= 2
    assert root_node["children"][0]["name"] == "Child 1"
    assert root_node["children"][1]["name"] == "Child 2"


async def test_read_menus_options(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
    db: AsyncSession,
) -> None:
    menu_in = MenuCreate(name="Options Menu", type=0)
    await dao.create_menu(session=db, menu_create=menu_in)

    response = await client.get(
        "/api/v1/system/menus/options", headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(node["name"] == "Options Menu" for node in data)


async def test_read_menus_tree_me(
    client: AsyncClient,
    superuser_workspace: dict[str, Any],
) -> None:
    headers = superuser_workspace["headers"]

    response = await client.get("/api/v1/system/menus/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# --- Error Paths ---


async def test_read_menu_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    response = await client.get(
        f"/api/v1/system/menus/{uuid.uuid4()}", headers=superuser_token_headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Menu not found"


async def test_update_menu_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Test", "type": 1}
    response = await client.put(
        f"/api/v1/system/menus/{uuid.uuid4()}", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Menu not found"


async def test_delete_menu_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    response = await client.delete(
        f"/api/v1/system/menus/{uuid.uuid4()}", headers=superuser_token_headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Menu not found"


async def test_create_menu_invalid(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    # Missing required 'name' field
    data = {
        "type": 0,
    }
    response = await client.post(
        "/api/v1/system/menus/", headers=superuser_token_headers, json=data
    )
    assert response.status_code == 422


async def test_read_menus_workspace_isolation(
    client: AsyncClient,
    normal_user_workspace: dict[str, Any],
    db: AsyncSession,
) -> None:
    from app.model.system.workspace import WorkspaceCreate
    from tests.utils.utils import random_lower_string

    workspace = normal_user_workspace["workspace"]
    headers = normal_user_workspace["headers"]

    # Create alien workspace
    alien_workspace_in = WorkspaceCreate(name=random_lower_string())
    alien_workspace = await dao.create_workspace(
        session=db, workspace_create=alien_workspace_in
    )

    # 1. Add menu and link to workspace
    menu_in = MenuCreate(name="Workspace Specific Menu", type=0)
    menu = await dao.create_menu(session=db, menu_create=menu_in)
    await dao.set_workspace_menus(
        session=db, workspace_id=workspace.id, menu_ids=[menu.id]
    )

    # 2. Test: Unauthorized workspace throws 403
    alien_headers = headers.copy()
    alien_headers["X-Workspace-Id"] = str(alien_workspace.id)
    response = await client.get("/api/v1/system/menus/tree", headers=alien_headers)
    assert response.status_code == 403
    assert "Not a member" in response.json()["detail"]

    # 3. Test: Valid workspace gets the isolated tree
    response = await client.get("/api/v1/system/menus/tree", headers=headers)
    assert response.status_code == 200

    # Unwrapped list
    data = response.json()
    found = any(str(node["id"]) == str(menu.id) for node in data)
    assert found is True
