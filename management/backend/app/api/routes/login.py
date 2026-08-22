from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from app import dao
from app.api.deps import AsyncSessionDep, CurrentUser
from app.core import security
from app.core.config import settings
from app.core.security import generate_password_reset_token, verify_password_reset_token
from app.model import Message, NewPassword, Token, UserPublic

router = APIRouter(tags=["login"])


@router.post("/login/access-token")
async def login_access_token(
    session: AsyncSessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await dao.authenticate(
        session=session, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/login/test-token", response_model=UserPublic)
async def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{username}")
async def recover_password(username: str, session: AsyncSessionDep) -> Message:
    """
    Password Recovery — generates a reset token.
    Token delivery (email / SMS) is handled externally.
    """
    user = await dao.get_user_by_username(session=session, username=username)

    # Always return the same response to prevent username enumeration attacks
    if user:
        generate_password_reset_token(username=username)

    return Message(
        message="If that username is registered, we sent a password recovery link"
    )


@router.post("/reset-password/")
async def reset_password(session: AsyncSessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    username = verify_password_reset_token(token=body.token)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = await dao.get_user_by_username(session=session, username=username)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    await dao.update_user_password(session=session, db_user=user, password=body.new_password)
    return Message(message="Password updated successfully")
