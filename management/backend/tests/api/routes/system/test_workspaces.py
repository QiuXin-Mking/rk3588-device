import uuid

from httpx import AsyncClient

from app.core.config import settings
from tests.utils.utils import random_lower_string

# ── Happy Path ──


async def test_create_workspace(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": random_lower_string(), "description": "Test workspace API"}
    r = await client.post(
        f"{settings.API_V1_STR}/system/workspaces/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    assert r.json()["name"] == data["name"]
    assert "id" in r.json()


async def test_read_workspaces(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    # create some
    await client.post(
        f"{settings.API_V1_STR}/system/workspaces/",
        headers=superuser_token_headers,
        json={"name": random_lower_string(), "description": "1"},
    )
    r = await client.get(
        f"{settings.API_V1_STR}/system/workspaces/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["count"] >= 1
    assert len(r.json()["data"]) >= 1


async def test_read_workspace(
    client: AsyncClient, superuser_token_headers: dict[str, str], generic_workspace
) -> None:
    r = await client.get(
        f"{settings.API_V1_STR}/system/workspaces/{generic_workspace.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["id"] == str(generic_workspace.id)


async def test_update_workspace(
    client: AsyncClient, superuser_token_headers: dict[str, str], generic_workspace
) -> None:
    data = {"name": "Updated name", "description": "Updated desc"}
    r = await client.put(
        f"{settings.API_V1_STR}/system/workspaces/{generic_workspace.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    assert r.json()["name"] == data["name"]


async def test_delete_workspace(
    client: AsyncClient, superuser_token_headers: dict[str, str], generic_workspace
) -> None:
    r = await client.delete(
        f"{settings.API_V1_STR}/system/workspaces/{generic_workspace.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert "deleted" in r.json()["message"]


async def test_set_workspace_menus_api(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    r_create = await client.post(
        f"{settings.API_V1_STR}/system/workspaces/",
        headers=superuser_token_headers,
        json={"name": random_lower_string()},
    )
    ws_id = r_create.json()["id"]

    headers = superuser_token_headers.copy()
    headers["X-Workspace-Id"] = ws_id

    r_menu = await client.post(
        f"{settings.API_V1_STR}/system/menus/",
        headers=headers,
        json={"name": "Some API Menu", "type": 0},
    )
    menu_id = r_menu.json()["id"]

    data = {"menu_ids": [menu_id]}
    r = await client.put(
        f"{settings.API_V1_STR}/system/workspaces/{ws_id}/menus",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200


# ── Error Path ──


async def test_read_workspace_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    bad_id = str(uuid.uuid4())
    r = await client.get(
        f"{settings.API_V1_STR}/system/workspaces/{bad_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_update_workspace_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    bad_id = str(uuid.uuid4())
    r = await client.put(
        f"{settings.API_V1_STR}/system/workspaces/{bad_id}",
        headers=superuser_token_headers,
        json={"name": "Ghost"},
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_delete_workspace_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    bad_id = str(uuid.uuid4())
    r = await client.delete(
        f"{settings.API_V1_STR}/system/workspaces/{bad_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_workspace_api_requires_superuser(
    client: AsyncClient, normal_user_token_headers: dict[str, str]
) -> None:
    bad_id = str(uuid.uuid4())
    r = await client.get(
        f"{settings.API_V1_STR}/system/workspaces/{bad_id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403
