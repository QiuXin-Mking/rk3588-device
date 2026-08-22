import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query

from app import dao
from app.api.deps import (
    AsyncSessionDep,
    get_current_workspace_member,
    require_perm,
)
from app.api.name_resolver import resolve_names
from app.core.exceptions import BusinessException
from app.model.common import GenericPage, Message
from app.model.workspace.business_line import (
    BusinessLineCreate,
    BusinessLineListFilter,
    BusinessLinePublic,
    BusinessLineTreeNode,
    BusinessLineUpdate,
)

router = APIRouter(
    prefix="/business-lines",
    tags=["workspace-business-lines"],
    dependencies=[Depends(get_current_workspace_member)],
)


@router.get(
    "/",
    response_model=GenericPage[BusinessLinePublic],
    dependencies=[Depends(require_perm("business_lines:list"))],
)
async def read_business_lines(
    session: AsyncSessionDep,
    filters: BusinessLineListFilter = Query(),
) -> Any:
    """
    Get a paginated flat list of business lines.
    Supports filtering by name and status.
    """
    count, business_lines = await dao.get_business_lines(
        session=session,
        filters=filters,
    )
    public_items = await resolve_names(session, business_lines, BusinessLinePublic)
    return GenericPage(data=public_items, count=count)


@router.get(
    "/tree",
    response_model=list[BusinessLineTreeNode],
    dependencies=[Depends(require_perm("business_lines:tree"))],
)
async def read_business_lines_tree(
    session: AsyncSessionDep,
    filters: BusinessLineListFilter = Query(),
) -> Any:
    """
    Get completely unpaginated business line tree.
    """
    tree = await dao.get_business_lines_tree(
        session=session,
        filters=filters,
    )
    return tree


@router.post(
    "/",
    response_model=BusinessLinePublic,
    dependencies=[
        Depends(require_perm("business_lines:create")),
    ],
)
async def create_business_line(
    session: AsyncSessionDep,
    business_line_in: BusinessLineCreate,
) -> Any:
    """Create new business line. Superuser only since it is usually synced."""
    business_line = await dao.create_business_line(
        session=session, business_line_create=business_line_in
    )
    public_items = await resolve_names(session, [business_line], BusinessLinePublic)
    return public_items[0]


@router.put(
    "/{business_line_id}",
    response_model=BusinessLinePublic,
    dependencies=[
        Depends(require_perm("business_lines:update")),
    ],
)
async def update_business_line(
    session: AsyncSessionDep,
    business_line_id: uuid.UUID,
    business_line_in: BusinessLineUpdate,
) -> Any:
    """Update a business line. Superuser only."""
    db_business_line = await dao.get_business_line_by_id(
        session=session, business_line_id=business_line_id
    )
    if not db_business_line:
        raise BusinessException(msg="Business Line not found", code=404)

    business_line = await dao.update_business_line(
        session=session,
        db_business_line=db_business_line,
        business_line_in=business_line_in,
    )
    public_items = await resolve_names(session, [business_line], BusinessLinePublic)
    return public_items[0]


@router.delete(
    "/{business_line_id}",
    response_model=Message,
    dependencies=[
        Depends(require_perm("business_lines:delete")),
    ],
)
async def delete_business_line(
    session: AsyncSessionDep,
    business_line_id: uuid.UUID,
) -> Any:
    """Delete a business line. Rejects if children exist."""
    db_business_line = await dao.get_business_line_by_id(
        session=session, business_line_id=business_line_id
    )
    if not db_business_line:
        raise BusinessException(msg="Business Line not found", code=404)

    await dao.delete_business_line(session=session, db_business_line=db_business_line)
    return Message(message="Business Line deleted")
