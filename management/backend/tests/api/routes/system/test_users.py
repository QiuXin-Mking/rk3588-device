import uuid

from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core.config import settings
from app.core.security import verify_password
from app.model import User, UserCreate
from tests.utils.user import create_random_user
from tests.utils.utils import random_lower_string


async def test_get_users_superuser_me(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    r = await client.get(
        f"{settings.API_V1_STR}/system/users/me", headers=superuser_token_headers
    )
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert current_user["is_root"]
    assert current_user["username"] == settings.FIRST_SUPERUSER


async def test_get_users_normal_user_me(
    client: AsyncClient, normal_user_token_headers: dict[str, str]
) -> None:
    r = await client.get(
        f"{settings.API_V1_STR}/system/users/me", headers=normal_user_token_headers
    )
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert current_user["is_root"] is False
    assert "username" in current_user


async def test_create_user_new_username(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    data = {"username": username, "password": password}
    r = await client.post(
        f"{settings.API_V1_STR}/system/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert 200 <= r.status_code < 300
    created_user = r.json()
    user = await dao.get_user_by_username(session=db, username=username)
    assert user
    assert user.username == created_user["username"]


async def test_get_existing_user_as_superuser(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
    db: AsyncSession,
    generic_user,
) -> None:
    r = await client.get(
        f"{settings.API_V1_STR}/system/users/{generic_user.id}",
        headers=superuser_token_headers,
    )
    assert 200 <= r.status_code < 300
    api_user = r.json()
    existing_user = await dao.get_user_by_username(
        session=db, username=generic_user.username
    )
    assert existing_user
    assert existing_user.username == api_user["username"]


async def test_get_non_existing_user_as_superuser(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    r = await client.get(
        f"{settings.API_V1_STR}/system/users/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "User not found"


async def test_get_existing_user_current_user(
    client: AsyncClient, db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()

    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    user_id = user.id

    login_data = {"username": username, "password": password}
    r = await client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    r = await client.get(
        f"{settings.API_V1_STR}/system/users/{user_id}",
        headers=headers,
    )
    assert 200 <= r.status_code < 300
    api_user = r.json()
    existing_user = await dao.get_user_by_username(session=db, username=username)
    assert existing_user
    assert existing_user.username == api_user["username"]


async def test_get_existing_user_permissions_error(
    db: AsyncSession,
    client: AsyncClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    user = await create_random_user(db)

    r = await client.get(
        f"{settings.API_V1_STR}/system/users/{user.id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "The user doesn't have enough privileges"


async def test_get_non_existing_user_permissions_error(
    client: AsyncClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    user_id = uuid.uuid4()

    r = await client.get(
        f"{settings.API_V1_STR}/system/users/{user_id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "The user doesn't have enough privileges"


async def test_create_user_existing_username(
    client: AsyncClient, superuser_token_headers: dict[str, str], generic_user
) -> None:
    data = {"username": generic_user.username, "password": "password"}
    r = await client.post(
        f"{settings.API_V1_STR}/system/users/",
        headers=superuser_token_headers,
        json=data,
    )
    created_user = r.json()
    assert r.status_code == 400
    assert "_id" not in created_user


async def test_create_user_by_normal_user(
    client: AsyncClient, normal_user_token_headers: dict[str, str]
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    data = {"username": username, "password": password}
    r = await client.post(
        f"{settings.API_V1_STR}/system/users/",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 403


async def test_retrieve_users(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username2 = random_lower_string()
    password2 = random_lower_string()
    user_in2 = UserCreate(username=username2, password=password2)
    await dao.create_user(session=db, user_create=user_in2)

    r = await client.get(
        f"{settings.API_V1_STR}/system/users/", headers=superuser_token_headers
    )
    all_users = r.json()

    assert len(all_users["data"]) > 1
    assert "count" in all_users
    for item in all_users["data"]:
        assert "username" in item


async def test_retrieve_users_with_filters(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    # 1 inactive user
    await dao.create_user(
        session=db,
        user_create=UserCreate(
            username="ApiInactive", password="password", is_active=False
        ),
    )
    # 1 active user
    await dao.create_user(
        session=db,
        user_create=UserCreate(
            username="ApiActiveBob", password="password", is_active=True
        ),
    )

    # Test username partial matching
    r = await client.get(
        f"{settings.API_V1_STR}/system/users/?username=ApiActiveBob",
        headers=superuser_token_headers,
    )
    all_users = r.json()
    assert all_users["count"] >= 1
    usernames = [u["username"] for u in all_users["data"]]
    assert "ApiActiveBob" in usernames
    assert "ApiInactive" not in usernames

    # Test is_active boolean mapping (false mapping via query param)
    r = await client.get(
        f"{settings.API_V1_STR}/system/users/?is_active=false", headers=superuser_token_headers
    )
    all_users = r.json()
    assert all_users["count"] >= 1
    usernames = [u["username"] for u in all_users["data"]]
    assert "ApiInactive" in usernames
    assert "ApiActiveBob" not in usernames


async def test_update_user_me(
    client: AsyncClient, normal_user_token_headers: dict[str, str], db: AsyncSession
) -> None:
    new_avatar = random_lower_string()
    new_username = random_lower_string()
    data = {
        "avatar": new_avatar,
        "username": new_username,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/me",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["username"] == new_username
    assert updated_user["avatar"] == new_avatar

    user_db = await dao.get_user_by_username(session=db, username=new_username)
    assert user_db
    assert user_db.username == new_username
    assert user_db.avatar == new_avatar


async def test_update_user_me_preserves_root_flags(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    new_avatar = random_lower_string()
    new_password = random_lower_string()
    data = {
        "username": settings.FIRST_SUPERUSER,
        "avatar": new_avatar,
        "password": new_password,
    }
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/me",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["avatar"] == new_avatar
    assert updated_user["is_root"] is True

    user_db = await dao.get_user_by_username(
        session=db, username=settings.FIRST_SUPERUSER
    )
    assert user_db
    assert user_db.is_root is True
    assert user_db.is_active is True
    assert user_db.avatar == new_avatar
    verified, _ = verify_password(new_password, user_db.hashed_password)
    assert verified

    revert_data = {
        "username": settings.FIRST_SUPERUSER,
        "avatar": user_db.avatar,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/me",
        headers=superuser_token_headers,
        json=revert_data,
    )
    assert r.status_code == 200


async def test_update_password_me(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    new_password = random_lower_string()
    data = {
        "current_password": settings.FIRST_SUPERUSER_PASSWORD,
        "new_password": new_password,
    }
    r = await client.patch(
        f"{settings.API_V1_STR}/system/users/me/password",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["message"] == "Password updated successfully"

    user_db = await dao.get_user_by_username(
        session=db, username=settings.FIRST_SUPERUSER
    )
    assert user_db
    assert user_db.username == settings.FIRST_SUPERUSER
    assert user_db.is_root is True
    assert user_db.is_active is True
    verified, _ = verify_password(new_password, user_db.hashed_password)
    assert verified

    # Revert to the old password to keep consistency in test
    old_data = {
        "current_password": new_password,
        "new_password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = await client.patch(
        f"{settings.API_V1_STR}/system/users/me/password",
        headers=superuser_token_headers,
        json=old_data,
    )
    await db.refresh(user_db)

    assert r.status_code == 200
    verified, _ = verify_password(
        settings.FIRST_SUPERUSER_PASSWORD, user_db.hashed_password
    )
    assert verified
    assert user_db.is_root is True


async def test_update_password_me_incorrect_password(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    new_password = random_lower_string()
    data = {"current_password": new_password, "new_password": new_password}
    r = await client.patch(
        f"{settings.API_V1_STR}/system/users/me/password",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    updated_user = r.json()
    assert updated_user["detail"] == "Incorrect password"


async def test_update_user_me_username_exists(
    client: AsyncClient, normal_user_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)

    data = {"username": user.username, "password": settings.FIRST_SUPERUSER_PASSWORD}
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/me",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "User with this username already exists"


async def test_update_password_me_same_password_error(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "current_password": settings.FIRST_SUPERUSER_PASSWORD,
        "new_password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = await client.patch(
        f"{settings.API_V1_STR}/system/users/me/password",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    updated_user = r.json()
    assert (
        updated_user["detail"] == "New password cannot be the same as the current one"
    )


async def test_register_user(
    client: AsyncClient,
    superuser_token_headers: dict[str, str],
    db: AsyncSession,
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    data = {"username": username, "password": password}
    r = await client.post(
        f"{settings.API_V1_STR}/system/users/signup",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["username"] == username

    user_db = await dao.get_user_by_username(session=db, username=username)
    assert user_db
    assert user_db.username == username
    verified, _ = verify_password(password, user_db.hashed_password)
    assert verified


async def test_register_user_already_exists_error(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    password = random_lower_string()
    data = {
        "username": settings.FIRST_SUPERUSER,
        "password": password,
    }
    r = await client.post(
        f"{settings.API_V1_STR}/system/users/signup",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    assert (
        r.json()["detail"] == "The user with this username already exists in the system"
    )


async def test_register_user_unauthorized(client: AsyncClient) -> None:
    """Signup must be inaccessible without authentication."""
    data = {"username": random_lower_string(), "password": random_lower_string()}
    r = await client.post(f"{settings.API_V1_STR}/system/users/signup", json=data)
    assert r.status_code == 401


async def test_update_user(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)

    data = {"username": username, "avatar": "updated_avatar", "password": password}
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/{user.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()

    assert updated_user["avatar"] == "updated_avatar"

    user_db = await dao.get_user_by_username(session=db, username=username)
    await db.refresh(user_db)
    assert user_db
    assert user_db.avatar == "updated_avatar"


async def test_update_user_not_exists(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"username": "foo", "avatar": "updated_avatar", "password": "password"}
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "The user with this id does not exist in the system"


async def test_update_user_username_exists(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)

    username2 = random_lower_string()
    password2 = random_lower_string()
    user_in2 = UserCreate(username=username2, password=password2)
    user2 = await dao.create_user(session=db, user_create=user_in2)

    data = {"username": user2.username, "password": password}
    r = await client.put(
        f"{settings.API_V1_STR}/system/users/{user.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "User with this username already exists"


async def test_delete_user_me(client: AsyncClient, db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()

    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    user_id = user.id

    login_data = {"username": username, "password": password}
    r = await client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    r = await client.delete(
        f"{settings.API_V1_STR}/system/users/me",
        headers=headers,
    )
    assert r.status_code == 200
    deleted_user = r.json()
    assert deleted_user["message"] == "User deleted successfully"

    user_query = select(User).where(User.id == user_id)
    user_db = (await db.exec(user_query)).first()
    assert user_db is None


async def test_delete_user_me_as_superuser(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    r = await client.delete(
        f"{settings.API_V1_STR}/system/users/me",
        headers=superuser_token_headers,
    )
    assert r.status_code == 403
    response = r.json()
    assert response["detail"] == "Super users are not allowed to delete themselves"


async def test_delete_user_super_user(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    user_id = user.id
    r = await client.delete(
        f"{settings.API_V1_STR}/system/users/{user_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    deleted_user = r.json()
    assert deleted_user["message"] == "User deleted successfully"
    result = (await db.exec(select(User).where(User.id == user_id))).first()
    assert result is None


async def test_delete_user_not_found(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    r = await client.delete(
        f"{settings.API_V1_STR}/system/users/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "User not found"


async def test_delete_user_current_super_user_error(
    client: AsyncClient, superuser_token_headers: dict[str, str], db: AsyncSession
) -> None:
    super_user = await dao.get_user_by_username(
        session=db, username=settings.FIRST_SUPERUSER
    )
    assert super_user
    user_id = super_user.id

    r = await client.delete(
        f"{settings.API_V1_STR}/system/users/{user_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Super users are not allowed to delete themselves"


async def test_delete_user_without_privileges(
    client: AsyncClient, normal_user_token_headers: dict[str, str], db: AsyncSession
) -> None:
    username = random_lower_string()
    password = random_lower_string()

    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)

    r = await client.delete(
        f"{settings.API_V1_STR}/system/users/{user.id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "The user doesn't have enough privileges"
