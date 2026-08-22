from fastapi.encoders import jsonable_encoder
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core.security import verify_password
from app.model import User, UserCreate, UserListFilter, UserUpdate
from tests.utils.utils import random_lower_string


async def test_create_user(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    assert user.username == username
    assert hasattr(user, "hashed_password")


async def test_create_user_allows_five_character_password(db: AsyncSession) -> None:
    username = random_lower_string()
    password = "abcde"
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    assert user.username == username
    verified, _ = verify_password(password, user.hashed_password)
    assert verified


async def test_authenticate_user(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    authenticated_user = await dao.authenticate(
        session=db, username=username, password=password
    )
    assert authenticated_user
    assert user.username == authenticated_user.username


async def test_not_authenticate_user(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user = await dao.authenticate(session=db, username=username, password=password)
    assert user is None


async def test_check_if_user_is_active(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    assert user.is_active is True


async def test_check_if_user_is_active_inactive(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password, is_active=False)
    user = await dao.create_user(session=db, user_create=user_in)
    assert user.is_active is False


async def test_check_if_user_is_root(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password, is_root=True)
    user = await dao.create_user(session=db, user_create=user_in)
    assert user.is_root is True


async def test_check_if_user_is_root_normal_user(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)
    assert user.is_root is False


async def test_get_user(db: AsyncSession, generic_user) -> None:
    user_2 = await dao.get_user_by_id(session=db, user_id=generic_user.id)
    assert user_2
    assert generic_user.username == user_2.username
    assert jsonable_encoder(generic_user) == jsonable_encoder(user_2)


async def test_update_user(db: AsyncSession, generic_user) -> None:
    new_password = random_lower_string()
    user_in_update = UserUpdate(
        username=generic_user.username, password=new_password, is_root=True
    )
    if generic_user.id is not None:
        await dao.update_user(session=db, db_user=generic_user, user_in=user_in_update)
    user_2 = await db.get(User, generic_user.id)
    assert user_2
    assert generic_user.username == user_2.username
    verified, _ = verify_password(new_password, user_2.hashed_password)
    assert verified


async def test_update_user_password_preserves_flags(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user = await dao.create_user(
        session=db,
        user_create=UserCreate(username=username, password=password, is_root=True),
    )
    new_password = random_lower_string()

    updated_user = await dao.update_user_password(
        session=db, db_user=user, password=new_password
    )

    assert updated_user.is_root is True
    assert updated_user.is_active is True
    assert updated_user.username == username
    verified, _ = verify_password(new_password, updated_user.hashed_password)
    assert verified


async def test_authenticate_user_with_bcrypt_upgrades_to_argon2(
    db: AsyncSession,
) -> None:
    """Test that a user with bcrypt password hash gets upgraded to argon2 on login."""
    username = random_lower_string()
    password = random_lower_string()

    # Create a bcrypt hash directly (simulating legacy password)
    bcrypt_hasher = BcryptHasher()
    bcrypt_hash = bcrypt_hasher.hash(password)
    assert bcrypt_hash.startswith("$2")  # bcrypt hashes start with $2

    # Create user with bcrypt hash directly in the database
    user = User(username=username, hashed_password=bcrypt_hash)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Verify the hash is bcrypt before authentication
    assert user.hashed_password.startswith("$2")

    # Authenticate - this should upgrade the hash to argon2
    authenticated_user = await dao.authenticate(
        session=db, username=username, password=password
    )
    assert authenticated_user
    assert authenticated_user.username == username

    await db.refresh(authenticated_user)

    # Verify the hash was upgraded to argon2
    assert authenticated_user.hashed_password.startswith("$argon2")

    verified, updated_hash = verify_password(
        password, authenticated_user.hashed_password
    )
    assert verified
    # Should not need another update since it's already argon2
    assert updated_hash is None


async def test_get_multi_users(db: AsyncSession, generic_user) -> None:
    username2 = random_lower_string()
    password = random_lower_string()
    await dao.create_user(
        session=db, user_create=UserCreate(username=username2, password=password)
    )

    count, users = await dao.get_users(
        session=db, filters=UserListFilter(skip=0, limit=100)
    )
    assert count >= 2
    assert len(users) >= 2
    usernames = [u.username for u in users]
    assert generic_user.username in usernames
    assert username2 in usernames


async def test_get_multi_users_with_filters(db: AsyncSession) -> None:
    # Set up specific test records
    await dao.create_user(
        session=db,
        user_create=UserCreate(
            username="InactiveUser", password="password", is_active=False
        ),
    )
    await dao.create_user(
        session=db,
        user_create=UserCreate(
            username="ActiveBob", password="password", is_active=True
        ),
    )
    await dao.create_user(
        session=db,
        user_create=UserCreate(
            username="ActiveBobby", password="password", is_active=True
        ),
    )
    await dao.create_user(
        session=db,
        user_create=UserCreate(
            username="UnrelatedActive", password="password", is_active=True
        ),
    )

    # Test is_active extraction (only inactive)
    _, users = await dao.get_users(
        session=db, filters=UserListFilter(skip=0, limit=100, is_active=False)
    )
    assert any(u.username == "InactiveUser" for u in users)
    assert all(u.is_active is False for u in users)

    # Test username partial ilike match
    count, users = await dao.get_users(
        session=db, filters=UserListFilter(skip=0, limit=100, username="Bob")
    )
    assert count >= 2
    usernames = [u.username for u in users]
    assert "ActiveBob" in usernames
    assert "ActiveBobby" in usernames
    assert "UnrelatedActive" not in usernames

    # Test combination of filters
    count, users = await dao.get_users(
        session=db,
        filters=UserListFilter(skip=0, limit=100, username="Bob", is_active=False),
    )
    assert count == 0
    assert len(users) == 0


async def test_delete_user(db: AsyncSession) -> None:
    username = random_lower_string()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    user = await dao.create_user(session=db, user_create=user_in)

    await dao.delete_user(session=db, db_user=user)

    fetched_user = await dao.get_user_by_id(session=db, user_id=user.id)
    assert fetched_user is None or fetched_user.deleted_at is not None
