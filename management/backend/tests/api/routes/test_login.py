from httpx import AsyncClient
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core.config import settings
from app.core.security import (
    generate_password_reset_token,
    get_password_hash,
    verify_password,
)
from app.model import User, UserCreate
from tests.utils.user import user_authentication_headers
from tests.utils.utils import random_lower_string


async def test_get_access_token(client: AsyncClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = await client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    assert r.status_code == 200
    assert "access_token" in tokens
    assert tokens["access_token"]


async def test_get_access_token_incorrect_password(client: AsyncClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "incorrect",
    }
    r = await client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400


async def test_use_access_token(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    r = await client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers=superuser_token_headers,
    )
    result = r.json()
    assert r.status_code == 200
    assert "username" in result


async def test_recovery_password(
    client: AsyncClient, normal_user_token_headers: dict[str, str]
) -> None:
    username = random_lower_string()
    r = await client.post(
        f"{settings.API_V1_STR}/password-recovery/{username}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    assert r.json() == {
        "message": "If that username is registered, we sent a password recovery link"
    }


async def test_recovery_password_user_not_exits(
    client: AsyncClient, normal_user_token_headers: dict[str, str]
) -> None:
    username = random_lower_string()
    r = await client.post(
        f"{settings.API_V1_STR}/password-recovery/{username}",
        headers=normal_user_token_headers,
    )
    # Should return 200 with generic message to prevent username enumeration attacks
    assert r.status_code == 200
    assert r.json() == {
        "message": "If that username is registered, we sent a password recovery link"
    }


async def test_reset_password(client: AsyncClient, db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    new_password = "abcde"

    user_create = UserCreate(username=username, password=password)
    await dao.create_user(session=db, user_create=user_create)
    token = generate_password_reset_token(username=username)
    headers = await user_authentication_headers(
        client=client, username=username, password=password
    )
    data = {"new_password": new_password, "token": token}

    r = await client.post(
        f"{settings.API_V1_STR}/reset-password/",
        headers=headers,
        json=data,
    )

    assert r.status_code == 200
    assert r.json() == {"message": "Password updated successfully"}

    user = await dao.get_user_by_username(session=db, username=username)
    assert user
    verified, _ = verify_password(new_password, user.hashed_password)
    assert verified


async def test_reset_password_invalid_token(
    client: AsyncClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"new_password": "abcde", "token": "invalid"}
    r = await client.post(
        f"{settings.API_V1_STR}/reset-password/",
        headers=superuser_token_headers,
        json=data,
    )
    response = r.json()

    assert "detail" in response
    assert r.status_code == 400
    assert response["detail"] == "Invalid token"


async def test_login_with_bcrypt_password_upgrades_to_argon2(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Test that logging in with a bcrypt password hash upgrades it to argon2."""
    username = random_lower_string()
    password = random_lower_string()

    # Create a bcrypt hash directly (simulating legacy password)
    bcrypt_hasher = BcryptHasher()
    bcrypt_hash = bcrypt_hasher.hash(password)
    assert bcrypt_hash.startswith("$2")  # bcrypt hashes start with $2

    user = User(username=username, hashed_password=bcrypt_hash, is_active=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    assert user.hashed_password.startswith("$2")

    login_data = {"username": username, "password": password}
    r = await client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    await db.refresh(user)

    # Verify the hash was upgraded to argon2
    assert user.hashed_password.startswith("$argon2")

    verified, updated_hash = verify_password(password, user.hashed_password)
    assert verified
    # Should not need another update since it's already argon2
    assert updated_hash is None


async def test_login_with_argon2_password_keeps_hash(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Test that logging in with an argon2 password hash does not update it."""
    username = random_lower_string()
    password = random_lower_string()

    # Create an argon2 hash (current default)
    argon2_hash = get_password_hash(password)
    assert argon2_hash.startswith("$argon2")

    # Create user with argon2 hash
    user = User(username=username, hashed_password=argon2_hash, is_active=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    original_hash = user.hashed_password

    login_data = {"username": username, "password": password}
    r = await client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    await db.refresh(user)

    assert user.hashed_password == original_hash
    assert user.hashed_password.startswith("$argon2")
