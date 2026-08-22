import re
import uuid
from typing import Any

from httpx import AsyncClient

from tests.utils.utils import random_lower_string

# ── Happy Path ──


async def test_create_workspace_member(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    data = {"username": random_lower_string(), "employee_name": "John Doe"}
    r = await client.post("/api/v1/workspace/workspace-members/", headers=headers, json=data)
    assert r.status_code == 200
    assert r.json()["employee_name"] == "John Doe"
    assert "id" in r.json()
    assert re.fullmatch(r"OP-\d{8}", r.json()["work_serial_number"])

    original_serial = r.json()["work_serial_number"]
    update = await client.put(
        f"/api/v1/workspace/workspace-members/{r.json()['id']}",
        headers=headers,
        json={"employee_name": "John Updated", "work_serial_number": "OP-99999999"},
    )
    assert update.status_code == 200, update.text
    assert update.json()["work_serial_number"] == original_serial


async def test_read_workspace_members(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    data = {"username": random_lower_string(), "employee_name": "Jane Doe"}
    await client.post("/api/v1/workspace/workspace-members/", headers=headers, json=data)

    r = await client.get("/api/v1/workspace/workspace-members/", headers=headers)
    assert r.status_code == 200
    assert r.json()["count"] >= 1


async def test_current_workspace_member_can_read_and_update_operator_profile(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    read_response = await client.get(
        "/api/v1/workspace/workspace-members/me", headers=headers
    )
    assert read_response.status_code == 200, read_response.text

    update_response = await client.put(
        "/api/v1/workspace/workspace-members/me",
        headers=headers,
        json={
            "employee_name": "Ego Operator",
            "work_region": "上海市",
            "company": "Ego Lab",
            "cooperation_mode": "FULL_TIME",
            "work_serial_number": "EGO-OP-0001",
            "height_cm": 175,
        },
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["employee_name"] == "Ego Operator"
    assert update_response.json()["height_cm"] == 175


async def test_read_workspace_members_with_account_ids_filter(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_workspace_member
) -> None:
    headers = superuser_workspace["headers"]
    second_create = {
        "username": random_lower_string(),
        "employee_name": "Filter Member",
    }
    second_response = await client.post(
        "/api/v1/workspace/workspace-members/",
        headers=headers,
        json=second_create,
    )
    assert second_response.status_code == 200, second_response.text
    second_member = second_response.json()

    r = await client.get(
        "/api/v1/workspace/workspace-members/",
        headers=headers,
        params=[
            ("account_ids", str(api_workspace_member.account_id)),
            ("account_ids", second_member["account_id"]),
        ],
    )
    assert r.status_code == 200, r.text
    content = r.json()
    assert content["count"] == 2
    returned_ids = {item["account_id"] for item in content["data"]}
    assert returned_ids == {
        str(api_workspace_member.account_id),
        second_member["account_id"],
    }


async def test_read_workspace_members_with_business_line_filter(
    client: AsyncClient,
    db,
    superuser_workspace: dict[str, Any],
    api_workspace_member,
    api_business_line,
) -> None:
    headers = superuser_workspace["headers"]
    api_business_line.external_id = "api-dept-business-line"
    api_workspace_member.main_dept_id = api_business_line.external_id
    db.add(api_business_line)
    db.add(api_workspace_member)
    await db.commit()

    r = await client.get(
        "/api/v1/workspace/workspace-members/",
        headers=headers,
        params={"business_line_ids": str(api_business_line.id)},
    )

    assert r.status_code == 200, r.text
    assert r.json()["count"] == 1
    assert r.json()["data"][0]["id"] == str(api_workspace_member.id)


async def test_update_workspace_member(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_workspace_member
) -> None:
    headers = superuser_workspace["headers"]

    update_data = {"employee_name": "After"}
    r_up = await client.put(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}",
        headers=headers,
        json=update_data,
    )
    assert r_up.status_code == 200
    assert r_up.json()["employee_name"] == "After"


async def test_delete_workspace_member(
    client: AsyncClient, superuser_workspace: dict[str, Any], api_workspace_member
) -> None:
    headers = superuser_workspace["headers"]

    r_del = await client.delete(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}", headers=headers
    )
    assert r_del.status_code == 200
    assert "deleted" in r_del.json()["message"]


async def test_set_workspacemember_roles(
    client: AsyncClient,
    superuser_workspace: dict[str, Any],
    api_workspace_member,
    api_role,
) -> None:
    headers = superuser_workspace["headers"]

    assign_data = {"role_ids": [str(api_role.id)]}
    r = await client.put(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}/roles",
        headers=headers,
        json=assign_data,
    )
    assert r.status_code == 200


async def test_batch_enable_workspace_members(
    client: AsyncClient,
    superuser_workspace: dict[str, Any],
    api_workspace_member,
) -> None:
    headers = superuser_workspace["headers"]
    update_response = await client.put(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}",
        headers=headers,
        json={"is_active": False},
    )
    assert update_response.status_code == 200, update_response.text

    r = await client.post(
        "/api/v1/workspace/workspace-members/batch-enable",
        headers=headers,
        json={"member_ids": [str(api_workspace_member.id)]},
    )

    assert r.status_code == 200, r.text
    assert r.json()["message"] == "已开启 1 个账号"


async def test_batch_add_roles_preserves_existing_roles(
    client: AsyncClient,
    superuser_workspace: dict[str, Any],
    api_workspace_member,
    api_role,
) -> None:
    headers = superuser_workspace["headers"]
    role_response = await client.post(
        "/api/v1/workspace/roles/",
        headers=headers,
        json={"role_name": f"append_{random_lower_string()}"},
    )
    assert role_response.status_code == 200, role_response.text
    added_role_id = role_response.json()["id"]

    assign_response = await client.put(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}/roles",
        headers=headers,
        json={"role_ids": [str(api_role.id)]},
    )
    assert assign_response.status_code == 200, assign_response.text

    r = await client.post(
        "/api/v1/workspace/workspace-members/batch-add-roles",
        headers=headers,
        json={
            "member_ids": [str(api_workspace_member.id)],
            "role_ids": [added_role_id],
        },
    )
    assert r.status_code == 200, r.text

    roles_response = await client.get(
        f"/api/v1/workspace/workspace-members/{api_workspace_member.id}/roles",
        headers=headers,
    )
    assert roles_response.status_code == 200, roles_response.text
    assert set(roles_response.json()) == {str(api_role.id), added_role_id}


# ── Error Path ──


async def test_update_workspace_member_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    r = await client.put(
        f"/api/v1/workspace/workspace-members/{bad_id}",
        headers=headers,
        json={"employee_name": "Ghost"},
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_delete_workspace_member_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    r = await client.delete(f"/api/v1/workspace/workspace-members/{bad_id}", headers=headers)
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"


async def test_set_workspacemember_roles_not_found(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    bad_id = str(uuid.uuid4())
    assign_data = {"role_ids": []}
    r = await client.put(
        f"/api/v1/workspace/workspace-members/{bad_id}/roles", headers=headers, json=assign_data
    )
    assert r.status_code == 404
    assert r.json()["error_code"] == "BUSINESS_LOGIC_ERROR"
