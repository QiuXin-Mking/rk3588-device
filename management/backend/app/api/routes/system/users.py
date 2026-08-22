import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query

from app import dao
from app.api.deps import (
    AsyncSessionDep,
    CurrentUser,
    get_current_active_superuser,
)
from app.core.exceptions import BusinessException
from app.core.security import verify_password
from app.model import (
    GenericPage,
    Message,
    UpdatePassword,
    UserCreate,
    UserListFilter,
    UserPublic,
    UserRegister,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["system-users"])


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=GenericPage[UserPublic],
)
async def read_users(
    session: AsyncSessionDep,
    filters: UserListFilter = Query(),
) -> Any:
    """
    Retrieve users.
    """

    count, users = await dao.get_users(session=session, filters=filters)
    return GenericPage(data=users, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
async def create_user(*, session: AsyncSessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = await dao.get_user_by_username(session=session, username=user_in.username)
    if user:
        raise BusinessException(
            code=400,
            msg="The user with this username already exists in the system.",
        )

    user = await dao.create_user(session=session, user_create=user_in)
    return user


@router.put("/me", response_model=UserPublic)
async def update_user_me(
    *, session: AsyncSessionDep, user_in: UserUpdate, current_user: CurrentUser
) -> Any:
    """
    Update own user using PUT semantics.
    """

    if user_in.username:
        existing_user = await dao.get_user_by_username(
            session=session, username=user_in.username
        )
        if existing_user and existing_user.id != current_user.id:
            raise BusinessException(
                code=409, msg="User with this username already exists"
            )
    current_user = await dao.update_user(
        session=session, db_user=current_user, user_in=user_in
    )
    return current_user


@router.patch("/me/password", response_model=Message)
async def update_password_me(
    *, session: AsyncSessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    verified, _ = verify_password(body.current_password, current_user.hashed_password)
    if not verified:
        raise BusinessException(code=400, msg="Incorrect password")
    if body.current_password == body.new_password:
        raise BusinessException(
            code=400, msg="New password cannot be the same as the current one"
        )
    await dao.update_user_password(
        session=session,
        db_user=current_user,
        password=body.new_password,
    )
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
async def delete_user_me(session: AsyncSessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.is_root:
        raise BusinessException(
            msg="Super users are not allowed to delete themselves", code=403
        )
    await dao.delete_user(session=session, db_user=current_user)
    return Message(message="User deleted successfully")


@router.post(
    "/signup",
    response_model=UserPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
async def register_user(session: AsyncSessionDep, user_in: UserRegister) -> Any:
    """
    Create a new user account. Restricted to superusers only.
    """
    user = await dao.get_user_by_username(session=session, username=user_in.username)
    if user:
        raise BusinessException(
            code=400,
            msg="The user with this username already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = await dao.create_user(session=session, user_create=user_create)
    return user


@router.get("/{user_id}", response_model=UserPublic)
async def read_user(
    user_id: uuid.UUID, session: AsyncSessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = await dao.get_user_by_id(session=session, user_id=user_id)
    if user == current_user:
        return user
    if not current_user.is_root:
        raise BusinessException(msg="The user doesn't have enough privileges", code=403)
    if user is None:
        raise BusinessException(code=404, msg="User not found")
    return user


@router.put(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
async def update_user(
    *,
    session: AsyncSessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user using PUT semantics.
    """

    db_user = await dao.get_user_by_id(session=session, user_id=user_id)
    if not db_user:
        raise BusinessException(
            code=404,
            msg="The user with this id does not exist in the system",
        )
    if user_in.username:
        existing_user = await dao.get_user_by_username(
            session=session, username=user_in.username
        )
        if existing_user and existing_user.id != user_id:
            raise BusinessException(
                code=409, msg="User with this username already exists"
            )

    db_user = await dao.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
async def delete_user(
    session: AsyncSessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user.
    """
    user = await dao.get_user_by_id(session=session, user_id=user_id)
    if not user:
        raise BusinessException(code=404, msg="User not found")
    if user == current_user:
        raise BusinessException(
            msg="Super users are not allowed to delete themselves", code=403
        )

    await dao.delete_user(session=session, db_user=user)
    return Message(message="User deleted successfully")
