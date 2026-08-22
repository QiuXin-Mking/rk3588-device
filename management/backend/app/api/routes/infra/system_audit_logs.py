from collections.abc import Sequence

from fastapi import APIRouter, Depends
from sqlmodel import desc, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_db
from app.model.infra.system_audit_log import (
    FieldAuditLogOut,
    SystemAuditLog,
    SystemAuditLogPublic,
)
from app.model.system.user import User

router = APIRouter(
    prefix="/audits",
    tags=["infra-audits"],
    dependencies=[Depends(get_current_user)],
)


@router.get(
    "/{entity_type}/{entity_id}",
    response_model=list[SystemAuditLogPublic],
)
async def get_audit_logs(
    entity_type: str,
    entity_id: str,
    session: AsyncSession = Depends(get_db),
) -> list[SystemAuditLogPublic]:
    """
    Retrieve all audit/history logs for a specific entity type and ID.
    This routes the query correctly through Postgres partitioning, ensuring high performance.
    """
    stmt = (
        select(SystemAuditLog, User.username.label("operator_name"))
        .outerjoin(User, SystemAuditLog.operator_id == User.id)
        .where(SystemAuditLog.entity_type == entity_type)
        .where(SystemAuditLog.entity_id == entity_id)
        .order_by(desc(SystemAuditLog.created_at))
    )
    result = await session.exec(stmt)
    return [
        SystemAuditLogPublic.model_validate(
            log,
            update={"operator_name": operator_name},
        )
        for log, operator_name in result.all()
    ]


@router.get(
    "/{entity_type}/{entity_id}/fields/{field_name}",
    response_model=list[FieldAuditLogOut],
)
async def get_field_audit_logs(
    entity_type: str,
    entity_id: str,
    field_name: str,
    session: AsyncSession = Depends(get_db),
) -> Sequence[FieldAuditLogOut]:
    """
    Retrieve audit logs for a specific field of an entity, including operator name.
    """
    stmt = (
        select(SystemAuditLog, User.username.label("operator_name"))
        .outerjoin(User, SystemAuditLog.operator_id == User.id)
        .where(SystemAuditLog.entity_type == entity_type)
        .where(SystemAuditLog.entity_id == entity_id)
        .where(SystemAuditLog.action == "UPDATE")
        .where(SystemAuditLog.diff_payload.has_key(field_name))
        .order_by(desc(SystemAuditLog.created_at))
    )
    result = await session.exec(stmt)
    rows = result.all()

    out = []
    for log, operator_name in rows:
        diff = log.diff_payload.get(field_name, {})
        out.append(
            FieldAuditLogOut(
                id=log.id,
                action=log.action,
                created_at=log.created_at,
                operator_id=log.operator_id,
                operator_name=operator_name,
                old_value=diff.get("old"),
                new_value=diff.get("new"),
            )
        )
    return out
