from typing import Any

from sqlalchemy import bindparam, event
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import Session, with_loader_criteria
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core.config import settings
from app.core.context import get_workspace_id
from app.core.ego_permissions import EGO_OPERATOR_PERMISSIONS, EGO_OPERATOR_ROLE_ID
from app.model import Menu, Role, User, UserCreate, Workspace, WorkspaceMember
from app.model.common import BaseTimestampModel

engine = create_async_engine(str(settings.SQLALCHEMY_DATABASE_URI), poolclass=NullPool)


# ─── Write Hook: before_flush ─────────────────────────────────────────────────


@event.listens_for(Session, "before_flush")
def receive_before_flush(
    session: Session, _flush_context: Any, _instances: Any
) -> None:
    from app.core.context import current_user_id

    # --- 1. Workspace ID Auto-Injection ---
    workspace_id = get_workspace_id()
    if workspace_id:
        for obj in session.new:
            # Only inject if the object supports it and it's not explicitly provided
            if hasattr(obj, "workspace_id") and obj.workspace_id is None:
                obj.workspace_id = workspace_id

    # --- 2. Audit Tracking (Creator/Updater/Deleter) ---
    user_id = current_user_id.get()
    if not user_id:
        return

    for obj in session.new:
        if isinstance(obj, BaseTimestampModel):
            if hasattr(obj, "creator_id") and obj.creator_id is None:
                obj.creator_id = user_id
            if hasattr(obj, "updater_id") and obj.updater_id is None:
                obj.updater_id = user_id

    for obj in session.dirty:
        if isinstance(obj, BaseTimestampModel):
            if hasattr(obj, "updater_id"):
                obj.updater_id = user_id
            if hasattr(obj, "deleted_at") and obj.deleted_at is not None:
                if hasattr(obj, "deleter_id") and obj.deleter_id is None:
                    obj.deleter_id = user_id

    # --- 3. Differential Logging for Whitelisted Tables ---
    from sqlalchemy import inspect

    from app.model.infra.system_audit_log import SystemAuditLog

    def json_serialize(val: Any) -> Any:
        if val is None:
            return None
        if isinstance(val, (int, float, str, bool)):
            return val
        if hasattr(val, "isoformat"):
            return val.isoformat()
        return str(val)

    def extract_diff(obj: Any) -> dict[str, Any]:
        diff = {}
        insp = inspect(obj)
        for attr in insp.mapper.column_attrs:
            hist = getattr(insp.attrs, attr.key).history
            if hist.has_changes():
                old_val = json_serialize(hist.deleted[0]) if hist.deleted else None
                new_val = json_serialize(hist.added[0]) if hist.added else None
                diff[attr.key] = {"old": old_val, "new": new_val}
        return diff

    audit_logs_to_add = []

    def audit_record(obj: Any, act: str) -> None:
        table_name = getattr(obj.__table__, "name", "")
        if table_name in settings.AUDITABLE_TABLES:
            diff = {}
            if act == "UPDATE":
                diff = extract_diff(obj)
                if not diff:
                    return
            elif act == "CREATE":
                diff = {
                    col.name: {
                        "old": None,
                        "new": json_serialize(getattr(obj, col.name)),
                    }
                    for col in obj.__table__.columns
                }
            elif act == "DELETE":
                diff = {
                    col.name: {
                        "old": json_serialize(getattr(obj, col.name)),
                        "new": None,
                    }
                    for col in obj.__table__.columns
                }

            log = SystemAuditLog(
                entity_type=table_name,
                workspace_id=getattr(obj, "workspace_id", None) or workspace_id,
                operator_id=user_id,
                entity_id=str(getattr(obj, "id", "")),
                action=act,
                diff_payload=diff,
            )
            audit_logs_to_add.append(log)

    for obj in session.new:
        if not isinstance(obj, SystemAuditLog):
            audit_record(obj, "CREATE")

    for obj in session.dirty:
        if not isinstance(obj, SystemAuditLog):
            # Soft delete check
            if hasattr(obj, "deleted_at") and obj.deleted_at is not None:
                audit_record(obj, "DELETE")
            else:
                audit_record(obj, "UPDATE")

    for obj in session.deleted:
        if not isinstance(obj, SystemAuditLog):
            audit_record(obj, "DELETE")

    session.add_all(audit_logs_to_add)


# ─── Query Hook: Workspace Isolation ──────────────────────────────────────────

# A module-level bindparam whose value is resolved at query-execution time via callable_.
# This separates the SQL template (cached once) from the actual value (fresh each time).
#   - Old: closure value gets baked into the compiled SQL → all workspaces share the same cached UUID → SECURITY BUG
#   - New: template has :workspace_filter_id placeholder → value read from ContextVar at execution time → correct isolation
_workspace_id_param: Any = bindparam("workspace_filter_id", callable_=get_workspace_id)


@event.listens_for(Session, "do_orm_execute")
def _add_workspace_filter(execute_state: Any) -> None:
    """
    Injects `workspace_id == current_workspace_id` into all SELECT queries targeting
    models that have a `workspace_id` field.
    Bypass with `.execution_options(exempt_workspace_filter=True)`.
    """
    if execute_state.is_column_load or execute_state.is_relationship_load:
        return
    if execute_state.execution_options.get("exempt_workspace_filter", False):
        return
    if not get_workspace_id():
        return

    from sqlalchemy.sql.expression import true

    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            SQLModel,
            lambda cls: (
                cls.workspace_id == _workspace_id_param
                if hasattr(cls, "workspace_id")
                else true()
            ),
            include_aliases=True,
            track_closure_variables=False,
        )
    )


# ─── Query Hook: Soft Delete Filter ──────────────────────────────────────────


@event.listens_for(Session, "do_orm_execute")
def _add_soft_delete_filter(execute_state: Any) -> None:
    """
    Injects `deleted_at IS NULL` into all SELECT queries targeting
    models that have a `deleted_at` field.
    Bypass with `.execution_options(exempt_delete_filter=True)`.
    """
    if execute_state.is_column_load or execute_state.is_relationship_load:
        return
    if execute_state.execution_options.get("exempt_delete_filter", False):
        return

    from sqlalchemy.sql.expression import true

    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            SQLModel,
            lambda cls: (
                cls.deleted_at.is_(None) if hasattr(cls, "deleted_at") else true()
            ),
            include_aliases=True,
            track_closure_variables=False,
        )
    )


# ─── Query Hook: Data Scope (Department-based Isolation) ─────────────────────

# Module-level expanding bindparam whose value is resolved per-execution via callable_.
# This mirrors the workspace filter pattern: SQL template is compiled once, value is fresh each time.


def _get_data_scope_list() -> list:
    from app.core.context import get_data_scope

    ids = get_data_scope()
    return list(ids) if ids else []


_data_scope_ids_param: Any = bindparam(
    "data_scope_ids", callable_=_get_data_scope_list, expanding=True
)


def _data_scope_criterion(cls: Any) -> Any:
    """with_loader_criteria callback: returns filter expression for data-scoped models."""
    from sqlalchemy import or_
    from sqlalchemy.sql.expression import true

    if not getattr(cls, "__data_scoped__", False):
        return true()

    fields = getattr(cls, "__data_scope_fields__", ["creator_id"])
    conditions = []
    for field_name in fields:
        col_attr = getattr(cls, field_name, None)
        if col_attr is not None:
            conditions.append(col_attr.in_(_data_scope_ids_param))

    if not conditions:
        return true()
    return or_(*conditions) if len(conditions) > 1 else conditions[0]


@event.listens_for(Session, "do_orm_execute")
def _add_data_scope_filter(execute_state: Any) -> None:
    """
    Injects `field IN (visible_account_ids)` into SELECT queries targeting
    models that opt in with `__data_scoped__ = True`.

    Uses with_loader_criteria (same as workspace/soft-delete hooks) so it
    automatically penetrates subqueries, count queries, and aliased entities.

    Supports multiple fields via `__data_scope_fields__` (default: ["creator_id"]).
    When multiple fields are specified, records matching ANY field are visible (OR logic).

    Activate by calling `context.set_data_scope(ids)` (via data_scope() dep).
    Bypass with `.execution_options(exempt_data_scope_filter=True)`.
    """
    if execute_state.is_column_load or execute_state.is_relationship_load:
        return
    if execute_state.execution_options.get("exempt_data_scope_filter", False):
        return

    from app.core.context import get_data_scope

    scope_ids = get_data_scope()
    if scope_ids is None:
        return

    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            SQLModel,
            _data_scope_criterion,
            include_aliases=True,
            track_closure_variables=False,
        )
    )


# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


async def init_db(session: AsyncSession) -> None:
    # 1. Create System Root User (admin)
    result = await session.exec(
        select(User).where(User.username == settings.FIRST_SUPERUSER)
    )
    user = result.first()
    if not user:
        user_in = UserCreate(
            username=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_root=True,
            is_active=True,
        )
        user = await dao.create_user(session=session, user_create=user_in)

    user_id = user.id

    # 2. Create the default collection workspace using a stable UUID.
    ws_result = await session.exec(
        select(Workspace).where(Workspace.id == settings.DEFAULT_WORKSPACE_ID)
    )
    workspace = ws_result.first()
    if not workspace:
        workspace = Workspace(
            id=settings.DEFAULT_WORKSPACE_ID,
            name=settings.DEFAULT_WORKSPACE_NAME,
            description="Ego 采集管理默认工作区",
        )
        session.add(workspace)
        await session.commit()
        await session.refresh(workspace)

    workspace_id = workspace.id

    # 3. Create the workspace administrator.
    workspace_admin_username = f"admin-{settings.DEFAULT_WORKSPACE_NAME}"
    workspace_admin_result = await session.exec(
        select(User).where(User.username == workspace_admin_username)
    )
    workspace_admin = workspace_admin_result.first()
    if not workspace_admin:
        workspace_admin_in = UserCreate(
            username=workspace_admin_username,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_root=False,
            is_active=True,
        )
        workspace_admin = await dao.create_user(
            session=session, user_create=workspace_admin_in
        )

    workspace_admin_id = workspace_admin.id

    # 4. Join System Root AND Workspace Root to the Default Workspace
    for target_user_id, job_number, emp_name in [
        (user_id, "ROOT-01", "系统造物主"),
        (workspace_admin_id, "ROOT-02", "Ego 工作区管理员"),
    ]:
        member_result = await session.exec(
            select(WorkspaceMember).where(
                WorkspaceMember.account_id == target_user_id,
                WorkspaceMember.workspace_id == workspace_id,
            )
        )
        member = member_result.first()
        if not member:
            member = WorkspaceMember(
                account_id=target_user_id,
                workspace_id=workspace_id,
                employee_name=emp_name,
                job_number=job_number,
                is_active=True,
            )
            session.add(member)
            await session.commit()

    # 5. Initialize Menus from RAW SQL Hook
    await _execute_init_sql(session, "scripts/init_menus.sql")
    await _execute_init_sql(session, "scripts/setup_ego_menus.sql")

    # 6. Bind initialized menus to the default workspace.
    # Workspace admins only see menus linked to their workspace.
    import sqlalchemy

    await session.execute(
        sqlalchemy.text(
            """
            INSERT INTO workspacemenulink (workspace_id, menu_id)
            SELECT :workspace_id, id FROM menu
            ON CONFLICT DO NOTHING
            """
        ),
        {"workspace_id": str(workspace_id)},
    )
    await session.commit()

    # 7. Create the standard operator role and attach only operator-safe permissions.
    role_result = await session.exec(
        select(Role).where(
            Role.id == EGO_OPERATOR_ROLE_ID,
            Role.workspace_id == workspace_id,
        )
    )
    operator_role = role_result.first()
    if operator_role is None:
        operator_role = Role(
            id=EGO_OPERATOR_ROLE_ID,
            workspace_id=workspace_id,
            role_name="Ego 采集员",
            sort=10,
            is_active=True,
            remark="标准终端采集角色；不包含后台配置、质检和删除权限",
        )
        session.add(operator_role)
        await session.commit()

    permission_result = await session.exec(
        select(Menu.id).where(Menu.permission_code.in_(EGO_OPERATOR_PERMISSIONS))  # type: ignore[union-attr]
    )
    await dao.set_role_menus(
        session=session,
        role_id=EGO_OPERATOR_ROLE_ID,
        menu_ids=list(permission_result.all()),
    )


async def _execute_init_sql(session: AsyncSession, menu_sql_path: str) -> None:
    import os

    import sqlalchemy

    if not os.path.exists(menu_sql_path):
        return
    with open(menu_sql_path, encoding="utf-8") as f:
        sql_statements = f.read()
    if not sql_statements.strip():
        return
    try:
        await session.execute(sqlalchemy.text(sql_statements))
        await session.commit()
    except Exception as e:
        import logging

        logging.getLogger(__name__).error(
            f"Failed to execute {menu_sql_path}: {e}"
        )
        raise
