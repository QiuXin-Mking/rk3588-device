import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core import context
from app.model.system.user import UserCreate
from app.model.system.workspace import Workspace, WorkspaceMemberCreate
from app.model.workspace.business_line import BusinessLineCreate
from tests.utils.user import authentication_token_from_username
from tests.utils.utils import random_lower_string


@pytest.mark.asyncio
async def test_workspace_isolation(client: AsyncClient, db: AsyncSession) -> None:
    """
    Test deep data isolation via generic APIs asserting workspace restrictions.
    """
    context.reset_workspace_id()
    # 1. Setup Workspaces
    w1 = Workspace(name="Company A")
    w2 = Workspace(name="Company B")
    db.add(w1)
    db.add(w2)
    await db.commit()
    await db.refresh(w1)
    await db.refresh(w2)

    # 2. Setup global workspace admin users
    username1 = f"admin-{w1.name}"
    password = random_lower_string()
    user1 = await dao.create_user(
        session=db, user_create=UserCreate(username=username1, password=password)
    )

    username2 = f"admin-{w2.name}"
    user2 = await dao.create_user(
        session=db, user_create=UserCreate(username=username2, password=password)
    )

    # 3. Bind Users to Workspaces
    context.set_workspace_id(w1.id)
    await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(
            username=user1.username, employee_name="Employee A"
        ),
    )
    context.set_workspace_id(w2.id)
    await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(
            username=user2.username, employee_name="Employee B"
        ),
    )

    # Setup Workspace Data (Business Line)
    context.set_workspace_id(w1.id)
    await dao.create_business_line(
        session=db,
        business_line_create=BusinessLineCreate(name="W1 Business"),
    )

    context.set_workspace_id(w2.id)
    await dao.create_business_line(
        session=db,
        business_line_create=BusinessLineCreate(name="W2 Business"),
    )
    await db.commit()

    context.reset_workspace_id()

    # 4. Get Tokens
    token1 = await authentication_token_from_username(
        client=client, username=username1, db=db, password=password
    )
    token2 = await authentication_token_from_username(
        client=client, username=username2, db=db, password=password
    )

    # 5. Test Access valid workspace
    token1["X-Workspace-Id"] = str(w1.id)
    r1 = await client.get("/api/v1/workspace/business-lines/", headers=token1)
    assert r1.status_code == 200, r1.text
    data1 = r1.json()["data"]
    assert len(data1) == 1
    assert data1[0]["name"] == "W1 Business"

    # 6. User1 Attempts to Access User2's workspace_id
    token1_malicious = token1.copy()
    token1_malicious["X-Workspace-Id"] = str(w2.id)
    r_malicious = await client.get("/api/v1/workspace/business-lines/", headers=token1_malicious)
    assert r_malicious.status_code == 403
    assert (
        r_malicious.json()["detail"]
        == "You do not have access to this workspace or your account is deactivated."
    )

    # 7. Test /workspaces/me enumeration (Global discovery)
    r_me = await client.get("/api/v1/system/workspaces/me", headers=token1)  # Token 1
    assert r_me.status_code == 200
    assert r_me.json()["count"] == 1
    assert r_me.json()["data"][0]["workspace"]["name"] == "Company A"
    assert r_me.json()["data"][0]["member_info"]["employee_name"] == "Employee A"

    # Verify token2 isolation (Company B only)
    token2["X-Workspace-Id"] = str(w2.id)
    r2 = await client.get("/api/v1/workspace/business-lines/", headers=token2)
    assert r2.status_code == 200, r2.text
    data2 = r2.json()["data"]
    assert len(data2) == 1
    assert data2[0]["name"] == "W2 Business"
