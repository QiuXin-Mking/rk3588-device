import uuid

from sqlmodel import col, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.model import User, UserCreate, UserListFilter, UserUpdate
from app.model.common import get_datetime_utc


async def create_user(*, session: AsyncSession, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def update_user(
    *, session: AsyncSession, db_user: User, user_in: UserUpdate
) -> User:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data and user_data["password"] is not None:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


async def update_user_password(
    *, session: AsyncSession, db_user: User, password: str
) -> User:
    db_user.hashed_password = get_password_hash(password)
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


async def get_user_by_username(*, session: AsyncSession, username: str) -> User | None:
    statement = select(User).where(User.username == username)
    result = await session.exec(statement)
    session_user = result.first()
    return session_user


async def get_user_by_id(*, session: AsyncSession, user_id: uuid.UUID) -> User | None:
    statement = select(User).where(User.id == user_id)
    result = await session.exec(statement)
    return result.first()


async def get_users(
    *,
    session: AsyncSession,
    filters: UserListFilter,
) -> tuple[int, list[User]]:
    count_statement = select(func.count()).select_from(User)
    statement = select(User).order_by(col(User.created_at).desc())

    if filters.username is not None:
        count_statement = count_statement.where(
            col(User.username).ilike(f"%{filters.username}%")
        )
        statement = statement.where(col(User.username).ilike(f"%{filters.username}%"))

    if filters.is_active is not None:
        count_statement = count_statement.where(User.is_active == filters.is_active)
        statement = statement.where(User.is_active == filters.is_active)

    result_count = await session.exec(count_statement)
    count = result_count.one()

    statement = statement.offset(filters.skip).limit(filters.limit)
    result_users = await session.exec(statement)
    users = result_users.all()
    return count, list(users)


async def delete_user(*, session: AsyncSession, db_user: User) -> None:
    db_user.deleted_at = get_datetime_utc()
    session.add(db_user)
    await session.commit()


# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


async def authenticate(
    *, session: AsyncSession, username: str, password: str
) -> User | None:
    db_user = await get_user_by_username(session=session, username=username)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the username exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        await session.commit()
        await session.refresh(db_user)
    return db_user
