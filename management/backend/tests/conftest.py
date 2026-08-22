from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.api.deps import get_db
from app.core.config import settings
from app.core.db import init_db
from app.main import app
from app.model import *  # noqa: F403
from app.model import BusinessLine, Menu, Role, User, Workspace
from tests.utils.user import authentication_token_from_username
from tests.utils.utils import get_superuser_token_headers, random_lower_string

TEST_USERNAME = "test_normal_user"

test_engine = create_async_engine(
    str(settings.SQLALCHEMY_TEST_DATABASE_URI), poolclass=NullPool
)


@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.connect() as conn:
        transaction = await conn.begin()
        async with AsyncSession(
            bind=conn,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            await init_db(session)
            app.dependency_overrides[get_db] = lambda: session
            yield session
            app.dependency_overrides.clear()
        await transaction.rollback()


@pytest_asyncio.fixture()
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(
            app=app, client=("127.0.0.1", 123), raise_app_exceptions=True
        ),
        base_url="http://test",
    ) as test_client:
        yield test_client


@pytest_asyncio.fixture()
async def superuser_token_headers(client: AsyncClient) -> dict[str, str]:
    return await get_superuser_token_headers(client)


@pytest_asyncio.fixture()
async def normal_user_token_headers(
    client: AsyncClient, db: AsyncSession
) -> dict[str, str]:
    return await authentication_token_from_username(
        client=client, username=TEST_USERNAME, db=db
    )


@pytest_asyncio.fixture()
async def superuser_workspace(
    db: AsyncSession, superuser_token_headers: dict[str, str]
) -> dict[str, Any]:
    from app.model.system.workspace import WorkspaceCreate, WorkspaceMember

    user = await dao.get_user_by_username(
        session=db, username=settings.FIRST_SUPERUSER
    )
    assert user is not None
    workspace = await dao.create_workspace(
        session=db,
        workspace_create=WorkspaceCreate(name=f"root_ws_{random_lower_string()}"),
    )
    db.add(WorkspaceMember(account_id=user.id, workspace_id=workspace.id))
    await db.commit()
    headers = {**superuser_token_headers, "X-Workspace-Id": str(workspace.id)}
    return {"user": user, "workspace": workspace, "headers": headers}


@pytest_asyncio.fixture()
async def normal_user_workspace(
    db: AsyncSession, normal_user_token_headers: dict[str, str]
) -> dict[str, Any]:
    from app.model.system.workspace import WorkspaceCreate, WorkspaceMember

    user = await dao.get_user_by_username(session=db, username=TEST_USERNAME)
    assert user is not None
    workspace = await dao.create_workspace(
        session=db,
        workspace_create=WorkspaceCreate(name=f"normal_ws_{random_lower_string()}"),
    )
    db.add(WorkspaceMember(account_id=user.id, workspace_id=workspace.id))
    await db.commit()
    headers = {**normal_user_token_headers, "X-Workspace-Id": str(workspace.id)}
    return {"user": user, "workspace": workspace, "headers": headers}


@pytest_asyncio.fixture()
async def api_business_line(db: AsyncSession, superuser_workspace: dict[str, Any]):
    from app.core import context
    from app.model.workspace.business_line import BusinessLineCreate

    context.set_workspace_id(superuser_workspace["workspace"].id)
    item = await dao.create_business_line(
        session=db,
        business_line_create=BusinessLineCreate(
            name=f"api_bl_{random_lower_string()}"
        ),
    )
    context.reset_workspace_id()
    return item


@pytest_asyncio.fixture()
async def api_menu(db: AsyncSession, superuser_workspace: dict[str, Any]):
    from app.model.system.menu import MenuCreate

    menu = await dao.create_menu(
        session=db,
        menu_create=MenuCreate(name=f"api_menu_{random_lower_string()}", type=0),
    )
    await dao.set_workspace_menus(
        session=db,
        workspace_id=superuser_workspace["workspace"].id,
        menu_ids=[menu.id],
    )
    return menu


@pytest_asyncio.fixture()
async def api_role(db: AsyncSession, superuser_workspace: dict[str, Any]):
    from app.core import context
    from app.model.workspace.role import RoleCreate

    context.set_workspace_id(superuser_workspace["workspace"].id)
    role = await dao.create_role(
        session=db,
        role_create=RoleCreate(role_name=f"api_role_{random_lower_string()}"),
    )
    context.reset_workspace_id()
    return role


@pytest_asyncio.fixture()
async def api_workspace_member(db: AsyncSession, superuser_workspace: dict[str, Any]):
    from app.core import context
    from app.model.system.user import UserCreate
    from app.model.system.workspace import WorkspaceMemberCreate

    user = await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=f"mem_{random_lower_string()}", password="password"
        ),
    )
    context.set_workspace_id(superuser_workspace["workspace"].id)
    member = await dao.create_workspace_member(
        session=db,
        member_create=WorkspaceMemberCreate(
            username=user.username, employee_name="API Member"
        ),
    )
    context.reset_workspace_id()
    return member


@pytest_asyncio.fixture()
async def generic_workspace(db: AsyncSession) -> Workspace:
    from app.model.system.workspace import WorkspaceCreate

    return await dao.create_workspace(
        session=db,
        workspace_create=WorkspaceCreate(name=f"gen_ws_{random_lower_string()}"),
    )


@pytest_asyncio.fixture()
async def generic_user(db: AsyncSession) -> User:
    from app.model.system.user import UserCreate

    return await dao.create_user(
        session=db,
        user_create=UserCreate(
            username=random_lower_string(), password=random_lower_string()
        ),
    )


@pytest_asyncio.fixture()
async def generic_menu(db: AsyncSession) -> Menu:
    from app.model.system.menu import MenuCreate

    return await dao.create_menu(
        session=db,
        menu_create=MenuCreate(name=f"gen_menu_{random_lower_string()}", type=0),
    )


@pytest_asyncio.fixture()
async def generic_business_line(
    db: AsyncSession, generic_workspace: Workspace
) -> BusinessLine:
    from app.core import context
    from app.model.workspace.business_line import BusinessLineCreate

    context.set_workspace_id(generic_workspace.id)
    item = await dao.create_business_line(
        session=db,
        business_line_create=BusinessLineCreate(
            name=f"gen_bl_{random_lower_string()}"
        ),
    )
    context.reset_workspace_id()
    return item


@pytest_asyncio.fixture()
async def generic_role(db: AsyncSession, generic_workspace: Workspace) -> Role:
    from app.core import context
    from app.model.workspace.role import RoleCreate

    context.set_workspace_id(generic_workspace.id)
    role = await dao.create_role(
        session=db,
        role_create=RoleCreate(role_name=f"gen_role_{random_lower_string()}"),
    )
    context.reset_workspace_id()
    return role
