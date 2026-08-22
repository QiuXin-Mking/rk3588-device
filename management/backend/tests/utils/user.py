from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.model.system.user import User, UserCreate, UserUpdate
from tests.utils.utils import random_lower_string


async def user_authentication_headers(
    *, client: AsyncClient, username: str, password: str
) -> dict[str, str]:
    data = {"username": username, "password": password}

    r = await client.post("/api/v1/login/access-token", data=data)
    response = r.json()
    auth_token = response["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    return headers


async def create_random_user(db: AsyncSession) -> User:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    return user


async def authentication_token_from_username(
    *, client: AsyncClient, username: str, db: AsyncSession, password: str | None = None
) -> dict[str, str]:
    """
    Return a valid token for the user with given username.
    If the user doesn't exist it is created first.
    """
    if password is None:
        password = random_lower_string()

    user = await dao.get_user_by_username(session=db, username=username)
    if not user:
        user_in_create = UserCreate(username=username, password=password)
        await dao.create_user(session=db, user_create=user_in_create)
    else:
        user_in_update = UserUpdate(username=username, password=password)
        await dao.update_user(session=db, db_user=user, user_in=user_in_update)

    return await user_authentication_headers(
        client=client, username=username, password=password
    )
