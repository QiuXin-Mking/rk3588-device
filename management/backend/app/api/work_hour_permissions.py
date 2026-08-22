from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import CurrentUser, CurrentWorkspaceMember
from app.dao.system.menu import has_permission
from app.model.system.workspace import Workspace


async def can_manage_work_hour_records(
    *,
    session: AsyncSession,
    current_user: CurrentUser,
    current_member: CurrentWorkspaceMember,
) -> bool:
    if current_user.is_root:
        return True

    workspace_result = await session.exec(
        select(Workspace).where(Workspace.id == current_member.workspace_id)
    )
    workspace = workspace_result.first()
    if workspace and current_user.username == f"admin-{workspace.name}":
        return True

    return await has_permission(
        session=session,
        user_id=current_user.id,
        workspace_id=current_member.workspace_id,
        permission_code="work_hour_records:manage_all",
    )
