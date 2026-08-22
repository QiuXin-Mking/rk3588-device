import uuid
from typing import Any

from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.model.system.workspace import MemberRoleLink

# ── Happy Path ──


async def test_create_role(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    data = {"role_name": "Admin Role"}
    response = await client.post("/api/v1/workspace/roles/", headers=headers, json=data)
    assert response.status_code == 200
    assert response.json()["role_name"] == "Admin Role"


async def test_get_roles(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    await client.post(
        "/api/v1/workspace/roles/", headers=headers, json={"role_name": "Read Role"}
    )
    response = await client.get("/api/v1/workspace/roles/", headers=headers)
    assert response.status_code == 200
    assert response.json()["count"] >= 1

    resp_options = await client.get("/api/v1/workspace/roles/options", headers=headers)
    assert resp_options.status_code == 200
    assert len(resp_options.json()) >= 1


async def test_update_role(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_role
) -> None:
    headers = superuser_workspace["headers"]

    r_up = await client.put(
        f"/api/v1/workspace/roles/{api_role.id}", headers=headers, json={"role_name": "After"}
    )
    assert r_up.status_code == 200
    assert r_up.json()["role_name"] == "After"


async def test_delete_role(
    client: AsyncClient,
    db: AsyncSession,
    superuser_workspace: dict[str, Any],
    api_role,
    api_workspace_member,
) -> None:
    headers = superuser_workspace["headers"]
    assign_response = await client.put(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}/roles",
        headers=headers,
        json={"role_ids": [str(api_role.id)]},
    )
    assert assign_response.status_code == 200

    r_del = await client.delete(f"/api/v1/workspace/roles/{api_role.id}", headers=headers)
    assert r_del.status_code == 200
    assert "deleted" in r_del.json()["message"]

    links = await db.exec(
        select(MemberRoleLink).where(MemberRoleLink.role_id == api_role.id)
    )
    assert links.all() == []


async def test_assign_role_menus(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_role, api_menu
) -> None:
    headers = superuser_workspace["headers"]

    r_assign = await client.put(
        f"/api/v1/workspace/roles/{api_role.id}/menus",
        headers=headers,
        json={"menu_ids": [str(api_menu.id)]},
    )
    assert r_assign.status_code == 200
    assert r_assign.json()["role_name"] == api_role.role_name

    # Check that we can get the menus back correctly
    r_get = await client.get(
        f"/api/v1/workspace/roles/{api_role.id}/menus",
        headers=headers,
    )
    assert r_get.status_code == 200
    assert len(r_get.json()) == 1
    assert r_get.json()[0] == str(api_menu.id)


async def test_get_role_members(
    client: AsyncClient,
    superuser_workspace: dict[str, Any],
    api_role,
    api_workspace_member,
) -> None:
    headers = superuser_workspace["headers"]
    assign_response = await client.put(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}/roles",
        headers=headers,
        json={"role_ids": [str(api_role.id)]},
    )
    assert assign_response.status_code == 200

    response = await client.get(
        f"/api/v1/workspace/roles/{api_role.id}/members",
        headers=headers,
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(api_workspace_member.id)]
    assert response.json()[0]["employee_name"] == api_workspace_member.employee_name


# ── Error Path ──


async def test_update_role_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    r = await client.put(
        f"/api/v1/workspace/roles/{bad_id}", headers=headers, json={"role_name": "Ghost"}
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_delete_role_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    r = await client.delete(f"/api/v1/workspace/roles/{bad_id}", headers=headers)
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_get_role_members_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    response = await client.get(
        f"/api/v1/workspace/roles/{uuid.uuid4()}/members",
        headers=superuser_workspace["headers"],
    )

    assert response.status_code == 404
    assert response.json()["error_code"] == "BUSINESS_LOGIC_ERROR"
