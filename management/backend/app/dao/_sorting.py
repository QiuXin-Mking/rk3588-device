from __future__ import annotations

from typing import Any

from sqlmodel import SQLModel


def apply_list_sort(
    statement: Any,
    model: type[SQLModel],
    *,
    sort_by: str | None,
    sort_order: str | None,
    default_sort_by: str = "created_at",
) -> Any:
    table = getattr(model, "__table__", None)
    if table is None:
        return statement

    sort_key = sort_by or default_sort_by
    sort_column = table.c.get(sort_key)
    if sort_column is None:
        sort_key = default_sort_by
        sort_column = table.c.get(sort_key)
    if sort_column is None:
        return statement

    descending = (sort_order or "desc").lower() != "asc"
    statement = statement.order_by(
        sort_column.desc() if descending else sort_column.asc()
    )

    id_column = table.c.get("id")
    if id_column is not None and sort_key != "id":
        statement = statement.order_by(
            id_column.desc() if descending else id_column.asc()
        )

    return statement
