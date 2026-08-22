"""
Generic UUID → employee_name resolver for Public schemas.

Usage:
    1. Declare __name_resolve__ on your Public schema:

        class FooPublic(FooBase, BaseTimestampModel):
            __name_resolve__: ClassVar[dict[str, str]] = {
                "owner_id": "owner_name",          # single UUID field
                "receivers": "receivers_name",      # comma-separated UUIDs
            }
            creator_name: str | None = None         # auto-detected
            updater_name: str | None = None         # auto-detected
            owner_name: str | None = None
            receivers_name: str | None = None

    2. Call in the route:
        items = await resolve_names(session, db_items, FooPublic)
"""

import uuid
from typing import Any, TypeVar

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.model.system.workspace import WorkspaceMember

T = TypeVar("T")


async def resolve_names(
    session: AsyncSession,
    items: list[Any],
    public_model: type[T],
) -> list[T]:
    """Batch-resolve UUID fields to employee names.

    Automatically handles:
    - creator_id → creator_name  (if creator_name field exists on public_model)
    - updater_id → updater_name  (if updater_name field exists on public_model)

    Additionally resolves fields declared in ``__name_resolve__``
    on *public_model*.  Values may be single UUIDs or comma-separated UUIDs.

    Returns a list of *public_model* instances with name fields populated.
    """
    if not items:
        return []

    # ── 1. Determine which fields need resolution ──────────────────────
    field_mapping: dict[str, str] = {}

    # Auto-detect audit fields
    model_fields = public_model.model_fields  # type: ignore[attr-defined]
    if "creator_name" in model_fields:
        field_mapping["creator_id"] = "creator_name"
    if "updater_name" in model_fields:
        field_mapping["updater_id"] = "updater_name"

    # Merge declared business fields
    declared = getattr(public_model, "__name_resolve__", None)
    if declared:
        field_mapping.update(declared)

    if not field_mapping:
        # Nothing to resolve – just convert and return
        return [public_model.model_validate(item) for item in items]  # type: ignore[attr-defined]

    # ── 2. Collect all UUIDs across all items ──────────────────────────
    all_ids: set[uuid.UUID] = set()

    for item in items:
        for source_field in field_mapping:
            val = getattr(item, source_field, None)
            if not val:
                continue
            _collect_uuids(val, all_ids)

    # ── 3. Batch query WorkspaceMember ─────────────────────────────────
    name_map: dict[str, str] = {}
    if all_ids:
        stmt = select(
            WorkspaceMember.account_id,
            WorkspaceMember.employee_name,
        ).where(WorkspaceMember.account_id.in_(list(all_ids)))  # type: ignore[union-attr]
        results = await session.exec(stmt)
        for row in results.all():
            name_map[str(row[0])] = row[1] or ""

    # ── 4. Build Public models with names attached ─────────────────────
    public_items: list[T] = []
    for item in items:
        public_item = public_model.model_validate(item)  # type: ignore[attr-defined]
        for source_field, target_field in field_mapping.items():
            val = getattr(item, source_field, None)
            resolved = _resolve(val, name_map)
            if resolved is not None:
                setattr(public_item, target_field, resolved)
        public_items.append(public_item)

    return public_items


# ── Private helpers ────────────────────────────────────────────────────────────


def _collect_uuids(val: Any, out: set[uuid.UUID]) -> None:
    """Parse a single UUID or comma-separated UUIDs into *out*."""
    if isinstance(val, uuid.UUID):
        out.add(val)
        return
    for part in str(val).split(","):
        part = part.strip()
        if part:
            try:
                out.add(uuid.UUID(part))
            except ValueError:
                pass


def _resolve(val: Any, name_map: dict[str, str]) -> str | None:
    """Resolve a single or comma-separated UUID value to names."""
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return name_map.get(str(val))
    parts = str(val).split(",")
    names = []
    for part in parts:
        part = part.strip()
        name = name_map.get(part)
        if name:
            names.append(name)
    return ",".join(names) if names else None
