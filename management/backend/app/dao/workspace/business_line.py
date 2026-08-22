import uuid

from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.exceptions import BusinessException
from app.model.common import get_datetime_utc
from app.model.workspace.business_line import (
    BusinessLine,
    BusinessLineCreate,
    BusinessLineListFilter,
    BusinessLineTreeNode,
    BusinessLineUpdate,
)


async def create_business_line(
    *, session: AsyncSession, business_line_create: BusinessLineCreate
) -> BusinessLine:
    db_obj = BusinessLine.model_validate(business_line_create)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


async def get_business_line_by_id(
    *, session: AsyncSession, business_line_id: uuid.UUID
) -> BusinessLine | None:
    statement = select(BusinessLine).where(BusinessLine.id == business_line_id)
    result = await session.exec(statement)
    return result.first()


async def get_business_line_ids_with_descendants(
    *, session: AsyncSession, business_line_ids: list[uuid.UUID]
) -> list[uuid.UUID]:
    selected_ids = set(business_line_ids)
    if not selected_ids:
        return []

    result = await session.exec(select(BusinessLine))
    business_lines = result.all()

    children_by_parent: dict[tuple[uuid.UUID | None, str], list[BusinessLine]] = {}
    selected_lines: list[BusinessLine] = []
    for business_line in business_lines:
        if business_line.id in selected_ids:
            selected_lines.append(business_line)
        if business_line.parent_id:
            parent_key = (business_line.workspace_id, business_line.parent_id)
            children_by_parent.setdefault(parent_key, []).append(business_line)

    pending = selected_lines
    visited_node_keys: set[tuple[uuid.UUID | None, str]] = set()
    while pending:
        business_line = pending.pop()
        node_key = (
            business_line.workspace_id,
            business_line.external_id or str(business_line.id),
        )
        if node_key in visited_node_keys:
            continue
        visited_node_keys.add(node_key)

        for child in children_by_parent.get(node_key, []):
            if child.id not in selected_ids:
                selected_ids.add(child.id)
            pending.append(child)

    return list(selected_ids)


async def update_business_line(
    *,
    session: AsyncSession,
    db_business_line: BusinessLine,
    business_line_in: BusinessLineUpdate,
) -> BusinessLine:
    update_data = business_line_in.model_dump(exclude_unset=True)
    db_business_line.sqlmodel_update(update_data)
    session.add(db_business_line)
    await session.commit()
    await session.refresh(db_business_line)
    return db_business_line


async def delete_business_line(
    *, session: AsyncSession, db_business_line: BusinessLine
) -> None:
    # Check if it has children via external_id -> parent_id mapping
    if db_business_line.external_id:
        statement = select(BusinessLine).where(
            BusinessLine.parent_id == db_business_line.external_id,
        )
        children = await session.exec(statement)
        if children.first():
            raise BusinessException("请先删除或迁移子业务线", 400)

    db_business_line.deleted_at = get_datetime_utc()
    session.add(db_business_line)
    await session.commit()


async def get_business_lines(
    *,
    session: AsyncSession,
    filters: BusinessLineListFilter,
) -> tuple[int, list[BusinessLine]]:
    from sqlmodel import func

    count_statement = select(func.count(BusinessLine.id))  # ty: ignore
    statement = select(BusinessLine)

    if filters.name:
        count_statement = count_statement.where(
            col(BusinessLine.name).contains(filters.name)
        )
        statement = statement.where(col(BusinessLine.name).contains(filters.name))
    if filters.status is not None:
        count_statement = count_statement.where(BusinessLine.status == filters.status)
        statement = statement.where(BusinessLine.status == filters.status)

    result_count = await session.exec(count_statement)
    count = result_count.one_or_none() or 0

    statement = statement.order_by(col(BusinessLine.created_at).desc())
    statement = statement.offset(filters.skip).limit(filters.limit)
    result = await session.exec(statement)
    return count, list(result.all())


async def get_business_lines_tree(
    *,
    session: AsyncSession,
    filters: BusinessLineListFilter,
) -> list[BusinessLineTreeNode]:
    statement = select(BusinessLine)
    if filters.status is not None:
        statement = statement.where(BusinessLine.status == filters.status)

    # Note: trees are generally unpaginated since slicing branches breaks the tree structure
    result = await session.exec(statement)
    items = result.all()

    # Convert all items to tree nodes
    node_map: dict[str, BusinessLineTreeNode] = {
        item.external_id: BusinessLineTreeNode.model_validate(item)
        for item in items
        if item.external_id
    }

    # Map those without external_id (or as fallback) by their internal uuid just in case
    # someone uses internal ID as parent_id natively, although spec says use external_id.
    for item in items:
        if not item.external_id:
            node_map[str(item.id)] = BusinessLineTreeNode.model_validate(item)

    roots: list[BusinessLineTreeNode] = []

    for item in items:
        node_id = item.external_id or str(item.id)
        node = node_map[node_id]

        if item.parent_id and item.parent_id in node_map:
            parent = node_map[item.parent_id]
            parent.children.append(node)
        else:
            roots.append(node)

    return roots
