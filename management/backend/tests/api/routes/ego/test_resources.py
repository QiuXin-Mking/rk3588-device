from typing import Any

from httpx import AsyncClient


async def create_sop(
    client: AsyncClient, headers: dict[str, str], name: str
) -> str:
    response = await client.post(
        "/api/v1/ego/collection-sops/",
        headers=headers,
        json={"name": name, "content": "第一步：检查设备。\n第二步：开始采集。"},
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


async def create_physical_kit(
    client: AsyncClient,
    headers: dict[str, str],
    template_id: str,
    serial_number: str,
) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/ego/physical-kits/",
        headers=headers,
        json={
            "serial_number": serial_number,
            "name": f"实体套件 {serial_number}",
            "template_id": template_id,
            "bound_username": "admin",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


async def test_all_ego_resource_pages_support_crud_and_pagination(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    disposable_sop_id = await create_sop(client, headers, "Disposable SOP")
    deleted_sop = await client.delete(
        f"/api/v1/ego/collection-sops/{disposable_sop_id}", headers=headers
    )
    assert deleted_sop.status_code == 200
    sop_id = await create_sop(client, headers, "Task SOP")
    resources = [
        ("product-kits", {"code": "KIT-API", "name": "API kit"}),
        (
            "device-bindings",
            {"serial_number": "SN-API", "device_name": "API device"},
        ),
        (
            "collection-tasks",
            {"task_no": "TASK-API", "project_name": "API", "name": "API task", "sop_id": sop_id},
        ),
        (
            "collection-records",
            {"record_no": "REC-API", "task_name": "API task"},
        ),
        ("cloud-storage", {"name": "API cloud", "provider": "S3"}),
        ("feedback", {"category": "功能建议", "content": "API feedback"}),
        ("release-versions", {"platform": "device", "version": "1.0.0"}),
    ]

    for path, payload in resources:
        created = await client.post(
            f"/api/v1/ego/{path}/", headers=headers, json=payload
        )
        assert created.status_code == 200, created.text
        item_id = created.json()["id"]

        listed = await client.get(
            f"/api/v1/ego/{path}/?skip=0&limit=1", headers=headers
        )
        assert listed.status_code == 200, listed.text
        assert listed.json()["count"] == 1
        assert len(listed.json()["data"]) == 1

        deleted = await client.delete(
            f"/api/v1/ego/{path}/{item_id}", headers=headers
        )
        assert deleted.status_code == 200, deleted.text


async def test_product_kit_topology_and_device_slot_binding(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    slots = [
        {
            "role": "head",
            "label": "头戴四目",
            "device_model": "HEAD_QUAD",
            "quantity": 1,
            "required": True,
            "channel_count": 4,
            "channel_labels": ["头戴 1", "头戴 2", "头戴 3", "头戴 4"],
            "service_key": "",
            "channel_keys": [],
            "sort": 1,
        },
        {
            "role": "wrist_left",
            "label": "左腕单目",
            "device_model": "WRIST_MONO",
            "quantity": 1,
            "required": True,
            "channel_count": 1,
            "channel_labels": ["左腕"],
            "service_key": "",
            "channel_keys": [],
            "sort": 2,
        },
    ]
    kit = await client.post(
        "/api/v1/ego/product-kits/",
        headers=headers,
        json={"code": "KIT-TOPOLOGY", "name": "Topology kit", "device_slots": slots},
    )
    assert kit.status_code == 200, kit.text
    assert kit.json()["device_slots"] == slots

    physical_kit = await create_physical_kit(
        client, headers, kit.json()["id"], "PHYSICAL-TOPOLOGY-001"
    )

    binding = await client.post(
        "/api/v1/ego/device-bindings/",
        headers=headers,
        json={
            "serial_number": "HEAD-QUAD-001",
            "device_name": "四目头戴 001",
            "device_model": "HEAD_QUAD",
            "slot_role": "head",
            "physical_kit_id": physical_kit["id"],
        },
    )
    assert binding.status_code == 200, binding.text
    assert binding.json()["device_model"] == "HEAD_QUAD"
    assert binding.json()["slot_role"] == "head"

    terminal = await client.get(
        "/api/v1/ego/device-bindings/mine/config", headers=headers
    )
    assert terminal.status_code == 200, terminal.text
    assert terminal.json()["physical_kit"]["serial_number"] == "PHYSICAL-TOPOLOGY-001"
    assert terminal.json()["template"]["device_slots"] == slots
    assert terminal.json()["devices"][0]["slot_role"] == "head"


async def test_claim_task_and_dashboard_summary(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    sop_id = await create_sop(client, headers, "Claim SOP")
    kit = await client.post(
        "/api/v1/ego/product-kits/", headers=headers,
        json={"code": "KIT-CLAIM", "name": "Claim kit"},
    )
    kit_id = kit.json()["id"]
    await create_physical_kit(client, headers, kit_id, "PHYSICAL-CLAIM-001")
    created = await client.post(
        "/api/v1/ego/collection-tasks/",
        headers=headers,
        json={
            "task_no": "TASK-CLAIM",
            "project_name": "Claim project",
            "name": "Claim task",
            "kit_id": kit_id,
            "sop_id": sop_id,
        },
    )
    task_id = created.json()["id"]
    claimed = await client.post(
        f"/api/v1/ego/collection-tasks/{task_id}/claim", headers=headers
    )
    assert claimed.status_code == 200
    assert claimed.json()["status"] == "CLAIMED"
    assert claimed.json()["assigned_username"] == "admin"

    referenced_sop = await client.delete(
        f"/api/v1/ego/collection-sops/{sop_id}", headers=headers
    )
    assert referenced_sop.status_code == 409

    current = await client.get(
        "/api/v1/ego/collection-tasks/mine/current", headers=headers
    )
    assert current.json()["id"] == task_id

    abandoned = await client.post(
        f"/api/v1/ego/collection-tasks/{task_id}/abandon", headers=headers
    )
    assert abandoned.status_code == 200
    assert abandoned.json()["status"] == "PENDING"
    assert abandoned.json()["assigned_username"] == ""
    assert abandoned.json()["device_serial"] == ""

    current_after_abandon = await client.get(
        "/api/v1/ego/collection-tasks/mine/current", headers=headers
    )
    assert current_after_abandon.json() is None
    available_after_abandon = await client.get(
        "/api/v1/ego/collection-tasks/mine/available", headers=headers
    )
    assert task_id in {item["id"] for item in available_after_abandon.json()}

    summary = await client.get("/api/v1/ego/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["pending_task_count"] == 1


async def test_mango_task_auto_number_location_and_record_dimensions(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    sop_id = await create_sop(client, headers, "Mango SOP")
    kit = await client.post(
        "/api/v1/ego/product-kits/",
        headers=headers,
        json={"code": "MANGO-PROTO", "name": "Mango 六目套件"},
    )
    kit_id = kit.json()["id"]
    await create_physical_kit(client, headers, kit_id, "MANGO-PHYSICAL-01")
    task = await client.post(
        "/api/v1/ego/collection-tasks/",
        headers=headers,
        json={
            "project_name": "Mango 室内采集",
            "name": "桌面整理",
            "subtask_name": "抽屉整理",
            "scene_type": "客厅",
            "kit_id": kit_id,
            "sop_id": sop_id,
            "target_count": 20,
        },
    )
    assert task.status_code == 200, task.text
    task_payload = task.json()
    assert task_payload["task_no"].startswith("MANGO-")
    assert task_payload["subtask_name"] == "抽屉整理"

    claimed = await client.post(
        f"/api/v1/ego/collection-tasks/{task_payload['id']}/claim",
        headers=headers,
        json={
            "location": "深圳市龙岗区",
            "target_objects": "抽屉和收纳盒",
            "object_count": 12,
        },
    )
    assert claimed.status_code == 200, claimed.text
    assert claimed.json()["location"] == "深圳市龙岗区"
    assert claimed.json()["sop_name"] == "Mango SOP"
    assert "第一步：检查设备" in claimed.json()["sop_content"]
    assert claimed.json()["object_count"] == 12

    record = await client.post(
        "/api/v1/ego/collection-records/",
        headers=headers,
        json={
            "record_no": "MANGO-DATA-0001",
            "task_id": task_payload["id"],
            "file_name": "mango-data-0001.mkv",
        },
    )
    assert record.status_code == 200, record.text
    assert record.json()["project_name"] == "Mango 室内采集"
    assert record.json()["subtask_name"] == "抽屉整理"
    assert record.json()["kit_name"] == "Mango 六目套件"
    assert record.json()["capture_location"] == "深圳市龙岗区"
    assert record.json()["qa_status"] == "PENDING"
    assert record.json()["data_status"] == "ON_DISK"


async def test_workspace_header_is_required(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    response = await client.get(
        "/api/v1/ego/product-kits/", headers=superuser_token_headers
    )
    assert response.status_code == 422


async def test_operator_terminal_task_and_recording_workflow(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    sop_id = await create_sop(client, headers, "Workflow SOP")
    kit = await client.post(
        "/api/v1/ego/product-kits/",
        headers=headers,
        json={
            "code": "MANGO-01",
            "name": "Mango 采集套件",
            "product_type": "Mango",
            "device_slots": [
                {
                    "role": "head",
                    "label": "头戴双目",
                    "device_model": "HEAD_STEREO",
                    "channel_count": 2,
                    "channel_labels": ["头戴左目", "头戴右目"],
                }
            ],
        },
    )
    kit_id = kit.json()["id"]
    physical_kit = await create_physical_kit(
        client, headers, kit_id, "PHYSICAL-WORKFLOW-01"
    )
    await client.post(
        "/api/v1/ego/device-bindings/",
        headers=headers,
        json={
            "serial_number": "RK3588-01",
            "device_name": "Ego 采集终端",
            "device_model": "HEAD_STEREO",
            "slot_role": "head",
            "physical_kit_id": physical_kit["id"],
        },
    )
    task = await client.post(
        "/api/v1/ego/collection-tasks/",
        headers=headers,
        json={
            "task_no": "TASK-WORKFLOW",
            "project_name": "Workflow",
            "name": "Operator task",
            "kit_id": kit_id,
            "sop_id": sop_id,
            "target_count": 3,
        },
    )
    task_id = task.json()["id"]
    completed_pending = await client.post(
        "/api/v1/ego/collection-tasks/",
        headers=headers,
        json={
            "task_no": "TASK-ALREADY-DONE",
            "project_name": "Workflow",
            "name": "Already complete pending task",
            "kit_id": kit_id,
            "sop_id": sop_id,
            "target_count": 3,
            "completed_count": 3,
            "status": "PENDING",
        },
    )
    completed_pending_id = completed_pending.json()["id"]

    config = await client.get("/api/v1/ego/device-bindings/mine/config", headers=headers)
    assert config.status_code == 200
    assert config.json()["template"]["id"] == kit_id
    assert config.json()["physical_kit"]["id"] == physical_kit["id"]
    assert config.json()["devices"][0]["serial_number"] == "RK3588-01"

    available = await client.get("/api/v1/ego/collection-tasks/mine/available", headers=headers)
    assert [item["id"] for item in available.json()] == [task_id]
    completed_claim = await client.post(
        f"/api/v1/ego/collection-tasks/{completed_pending_id}/claim", headers=headers
    )
    assert completed_claim.status_code == 409

    claimed = await client.post(f"/api/v1/ego/collection-tasks/{task_id}/claim", headers=headers)
    assert claimed.status_code == 200
    duplicate_claim = await client.post(f"/api/v1/ego/collection-tasks/{task_id}/claim", headers=headers)
    assert duplicate_claim.status_code == 409

    second_task = await client.post(
        "/api/v1/ego/collection-tasks/",
        headers=headers,
        json={
            "task_no": "TASK-WORKFLOW-SECOND",
            "project_name": "Workflow",
            "name": "Second available task",
            "kit_id": kit_id,
            "sop_id": sop_id,
            "target_count": 3,
        },
    )
    available_with_current = await client.get(
        "/api/v1/ego/collection-tasks/mine/available", headers=headers
    )
    assert second_task.json()["id"] in {
        item["id"] for item in available_with_current.json()
    }

    started = await client.post(f"/api/v1/ego/collection-tasks/{task_id}/start", headers=headers)
    assert started.json()["status"] == "IN_PROGRESS"
    record = await client.post(
        "/api/v1/ego/collection-records/",
        headers=headers,
        json={"record_no": "REC-WORKFLOW", "task_id": task_id, "file_name": "capture-workflow"},
    )
    assert record.status_code == 200
    assert record.json()["operator_username"] == "admin"
    assert record.json()["task_name"] == "Operator task"

    current = await client.get("/api/v1/ego/collection-tasks/mine/current", headers=headers)
    assert current.json()["completed_count"] == 1
    mine = await client.get("/api/v1/ego/collection-records/mine", headers=headers)
    assert [item["record_no"] for item in mine.json()] == ["REC-WORKFLOW"]

    completed = await client.post(f"/api/v1/ego/collection-tasks/{task_id}/complete", headers=headers)
    assert completed.json()["status"] == "COMPLETED"
    current_after = await client.get("/api/v1/ego/collection-tasks/mine/current", headers=headers)
    assert current_after.json() is None


async def test_generic_task_is_available_without_a_bound_kit(
    client: AsyncClient, superuser_workspace: dict[str, Any]
) -> None:
    headers = superuser_workspace["headers"]
    sop_id = await create_sop(client, headers, "Generic SOP")
    task = await client.post(
        "/api/v1/ego/collection-tasks/",
        headers=headers,
        json={
            "project_name": "Mango generic",
            "name": "Generic task without kit",
            "subtask_name": "GPS optional",
            "sop_id": sop_id,
            "target_count": 10,
        },
    )

    available = await client.get(
        "/api/v1/ego/collection-tasks/mine/available", headers=headers
    )

    assert task.status_code == 200
    assert task.json()["id"] in {item["id"] for item in available.json()}
    claimed = await client.post(
        f"/api/v1/ego/collection-tasks/{task.json()['id']}/claim",
        headers=headers,
        json={"location": "Manual location"},
    )
    assert claimed.status_code == 200
    assert claimed.json()["location"] == "Manual location"
    assert claimed.json()["device_serial"] == ""
