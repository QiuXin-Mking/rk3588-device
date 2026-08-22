import uuid
from collections.abc import AsyncGenerator
from typing import Annotated, Any

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core import context, security
from app.core.config import settings
from app.core.db import engine
from app.model import TokenPayload, User
from app.model.system.workspace import WorkspaceMember

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)
reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


AsyncSessionDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]
OptionalTokenDep = Annotated[str | None, Depends(reusable_oauth2_optional)]


async def _resolve_user_from_token(session: AsyncSession, token: str) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_result = await session.exec(select(User).where(User.id == token_data.sub))
    user = user_result.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    from app.core.context import current_user_id

    current_user_id.set(user.id)

    return user


async def get_current_user(session: AsyncSessionDep, token: TokenDep) -> User:
    return await _resolve_user_from_token(session, token)


async def get_current_user_for_file_proxy(
    session: AsyncSessionDep,
    request: Request,
    bearer_token: OptionalTokenDep,
) -> User:
    token = bearer_token or request.query_params.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return await _resolve_user_from_token(session, token)


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserForFileProxy = Annotated[User, Depends(get_current_user_for_file_proxy)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_root:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


async def get_current_workspace_member(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    x_workspace_id: Annotated[str, Header(alias="X-Workspace-Id")],
) -> "WorkspaceMember":
    from app.model.system.workspace import WorkspaceMember

    try:
        workspace_uuid = uuid.UUID(x_workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID format")

    # Use execution option to ensure we can read the WorkspaceMember before isolation rules lock us out
    statement = (
        select(WorkspaceMember)
        .where(
            WorkspaceMember.account_id == current_user.id,
            WorkspaceMember.workspace_id == workspace_uuid,
            WorkspaceMember.is_active,
        )
        .execution_options(exempt_workspace_filter=True)
    )

    result = await session.exec(statement)
    member = result.first()

    if not member:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this workspace or your account is deactivated.",
        )

    # Inject workspace_id into global context parameter used by with_loader_criteria
    context.set_workspace_id(workspace_uuid)

    return member


CurrentWorkspaceMember = Annotated[Any, Depends(get_current_workspace_member)]


class RequireWorkspacePermission:
    def __init__(self, perm_key: str):
        self.perm_key = perm_key

    async def __call__(
        self,
        session: AsyncSessionDep,
        current_user: CurrentUser,
        current_member: CurrentWorkspaceMember,
    ) -> bool:
        # 1. Global super user
        if current_user.is_root:
            return True

        # 2. Workspace admin
        from app.model.system.workspace import Workspace

        ws_result = await session.exec(
            select(Workspace).where(Workspace.id == current_member.workspace_id)
        )
        workspace = ws_result.first()
        if workspace and current_user.username == f"admin-{workspace.name}":
            return True

        # 3. Specific permission check
        from app.dao.system.menu import has_permission

        has_perm = await has_permission(
            session=session,
            user_id=current_user.id,
            workspace_id=current_member.workspace_id,
            permission_code=self.perm_key,
        )

        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail=f"Missing required permission: {self.perm_key}",
            )

        return True


require_perm = RequireWorkspacePermission


class DataScopeResolver:
    """
    Resolve the set of account_ids whose data the current user may see,
    based on department (business line) hierarchy.

    Modes:
    - "descendants": own dept + all sub-depts (default)
    - "peers": own dept + sibling depts + all sub-depts (goes up one level)

    Usage: `dependencies=[Depends(data_scope("descendants"))]`
    """

    def __init__(self, mode: str = "descendants"):
        if mode not in ("descendants", "peers"):
            raise ValueError(f"Invalid data scope mode: {mode!r}")
        self.mode = mode

    async def __call__(
        self,
        session: AsyncSessionDep,
        current_user: CurrentUser,
        current_member: CurrentWorkspaceMember,
    ) -> set[uuid.UUID] | None:
        # 1. Root user bypass
        if current_user.is_root:
            return None

        # 2. Workspace admin bypass
        from app.model.system.workspace import Workspace

        ws_result = await session.exec(
            select(Workspace).where(Workspace.id == current_member.workspace_id)
        )
        workspace = ws_result.first()
        if workspace and current_user.username == f"admin-{workspace.name}":
            return None

        # 3. No department → only own data
        if not current_member.main_dept_id:
            context.set_data_scope({current_user.id})
            return {current_user.id}

        # 4. Resolve department hierarchy via BusinessLine path
        from app.model.workspace.business_line import BusinessLine

        # 4a. Find the member's own business line
        own_bl_stmt = (
            select(BusinessLine)
            .where(BusinessLine.external_id == current_member.main_dept_id)
            .execution_options(exempt_data_scope_filter=True)
        )
        result = await session.exec(own_bl_stmt)
        own_bl = result.first()

        if not own_bl or not own_bl.path:
            context.set_data_scope({current_user.id})
            return {current_user.id}

        # 4b. Determine the search path based on mode
        search_path = own_bl.path
        if self.mode == "peers" and own_bl.parent_id:
            # Go up one level: find parent BL and use its path
            parent_bl_stmt = (
                select(BusinessLine)
                .where(BusinessLine.external_id == own_bl.parent_id)
                .execution_options(exempt_data_scope_filter=True)
            )
            parent_result = await session.exec(parent_bl_stmt)
            parent_bl = parent_result.first()
            if parent_bl and parent_bl.path:
                search_path = parent_bl.path

        # 4c. Find all business lines under the search path
        from sqlmodel import col

        descendant_stmt = (
            select(BusinessLine.external_id)
            .where(col(BusinessLine.path).startswith(search_path))
            .execution_options(exempt_data_scope_filter=True)
        )
        desc_result = await session.exec(descendant_stmt)
        dept_external_ids = set(desc_result.all())

        # Include own dept
        dept_external_ids.add(current_member.main_dept_id)

        # 4d. Find all workspace members in those departments
        member_stmt = (
            select(WorkspaceMember.account_id)
            .where(
                WorkspaceMember.workspace_id == current_member.workspace_id,
                col(WorkspaceMember.main_dept_id).in_(dept_external_ids),
                WorkspaceMember.is_active,
            )
            .execution_options(
                exempt_workspace_filter=True,
                exempt_data_scope_filter=True,
            )
        )
        member_result = await session.exec(member_stmt)
        visible_account_ids = set(member_result.all())

        # Always include self
        visible_account_ids.add(current_user.id)

        context.set_data_scope(visible_account_ids)
        return visible_account_ids


data_scope = DataScopeResolver
