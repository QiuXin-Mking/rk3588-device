import contextvars
import uuid

# Store current user ID globally per request context
current_user_id: contextvars.ContextVar[uuid.UUID | None] = contextvars.ContextVar(
    "current_user_id", default=None
)

current_workspace_id: contextvars.ContextVar[uuid.UUID | None] = contextvars.ContextVar(
    "current_workspace_id", default=None
)

# Data scope: set of account_ids whose created data the current user may see.
# None = no filtering (default); set(...) = restrict to these creator_ids.
data_scope_creator_ids: contextvars.ContextVar[set[uuid.UUID] | None] = (
    contextvars.ContextVar("data_scope_creator_ids", default=None)
)


def get_user_id() -> uuid.UUID | None:
    return current_user_id.get()


def set_user_id(user_id: uuid.UUID) -> None:
    current_user_id.set(user_id)


def reset_user_id() -> None:
    current_user_id.set(None)


def get_workspace_id() -> uuid.UUID | None:
    return current_workspace_id.get()


def set_workspace_id(workspace_id: uuid.UUID) -> None:
    current_workspace_id.set(workspace_id)


def reset_workspace_id() -> None:
    current_workspace_id.set(None)


def get_data_scope() -> set[uuid.UUID] | None:
    return data_scope_creator_ids.get()


def set_data_scope(creator_ids: set[uuid.UUID]) -> None:
    data_scope_creator_ids.set(creator_ids)


def reset_data_scope() -> None:
    data_scope_creator_ids.set(None)
