import uuid
from typing import Any

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.model.system.workspace import WorkspaceCreate
from tests.utils.utils import random_lower_string

# ── Fixture based Tests ──


async def test_read_business_lines_no_workspace(
    client: AsyncClient, normal_user_token_headers: dict[str, str]
) -> None:
    r = await client.get("/api/v1/workspace/business-lines/", headers=normal_user_token_headers)
    assert r.status_code == 422


async def test_read_business_lines_unauthorized_workspace(
    client: AsyncClient, normal_user_token_headers: dict[str, str], db: AsyncSession
) -> None:
    alien_ws = await dao.create_workspace(
        session=db, workspace_create=WorkspaceCreate(name=random_lower_string())
    )
    headers = normal_user_token_headers.copy()
    headers["X-Workspace-Id"] = str(alien_ws.id)
    r = await client.get("/api/v1/workspace/business-lines/", headers=headers)
    assert r.status_code == 403


# ── Happy Path ──


async def test_create_business_line(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    data = {"name": "Dept A"}
    r = await client.post("/api/v1/workspace/business-lines/", headers=headers, json=data)
    assert r.status_code == 200
    assert r.json()["name"] == "Dept A"


async def test_read_business_lines(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    data1 = {"name": "Dept B"}
    data2 = {"name": "Dept C"}
    await client.post("/api/v1/workspace/business-lines/", headers=headers, json=data1)
    await client.post("/api/v1/workspace/business-lines/", headers=headers, json=data2)

    r = await client.get("/api/v1/workspace/business-lines/", headers=headers)
    assert r.status_code == 200
    assert r.json()["count"] >= 2
    assert len(r.json()["data"]) >= 2


async def test_read_business_lines_tree(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    # Create parent
    p_data = {"name": "Parent", "external_id": "P_ID"}
    await client.post("/api/v1/workspace/business-lines/", headers=headers, json=p_data)

    # Create child
    c_data = {"name": "Child", "external_id": "C_ID", "parent_id": "P_ID"}
    await client.post("/api/v1/workspace/business-lines/", headers=headers, json=c_data)

    r = await client.get("/api/v1/workspace/business-lines/tree", headers=headers)
    assert r.status_code == 200
    tree = r.json()
    assert isinstance(tree, list)
    assert len(tree) >= 1
    # Check if child is nested inside parent
    parent_node = next((n for n in tree if n["external_id"] == "P_ID"), None)
    assert parent_node is not None
    assert len(parent_node["children"]) == 1
    assert parent_node["children"][0]["external_id"] == "C_ID"


async def test_update_business_line(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_business_line
) -> None:
    headers = superuser_workspace["headers"]

    update_data = {"name": "Dept D Updated"}
    r_up = await client.put(
        f"/api/v1/workspace/business-lines/{api_business_line.id}",
        headers=headers,
        json=update_data,
    )
    assert r_up.status_code == 200
    assert r_up.json()["name"] == "Dept D Updated"


async def test_delete_business_line(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_business_line
) -> None:
    headers = superuser_workspace["headers"]

    r_del = await client.delete(
        f"/api/v1/workspace/business-lines/{api_business_line.id}", headers=headers
    )
    assert r_del.status_code == 200
    assert "deleted" in r_del.json()["message"]


# ── Error Path ──


async def test_update_business_line_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    update_data = {"name": "Ghost"}
    r = await client.put(
        f"/api/v1/workspace/business-lines/{bad_id}", headers=headers, json=update_data
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_delete_business_line_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    r = await client.delete(f"/api/v1/workspace/business-lines/{bad_id}", headers=headers)
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_create_business_line_invalid(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    data = {"external_id": "MISSING_NAME"}
    r = await client.post("/api/v1/workspace/business-lines/", headers=headers, json=data)
    assert r.status_code == 422
