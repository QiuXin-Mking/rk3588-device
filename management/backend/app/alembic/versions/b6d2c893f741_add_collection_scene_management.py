"""add collection scene management

Revision ID: b6d2c893f741
Revises: 71d8b2ca6f10
Create Date: 2026-08-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b6d2c893f741"
down_revision: str | None = "71d8b2ca6f10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "collection_scene",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creator_id", sa.Uuid(), nullable=True),
        sa.Column("updater_id", sa.Uuid(), nullable=True),
        sa.Column("deleter_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column(
            "description", sa.String(length=1000), nullable=False, server_default=""
        ),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="ACTIVE"
        ),
        sa.Column("sort", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspace.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "name",
        "status",
        "workspace_id",
        "creator_id",
        "updater_id",
        "deleter_id",
    ):
        op.create_index(f"ix_collection_scene_{column}", "collection_scene", [column])

    op.execute(
        """
        INSERT INTO collection_scene (
            id, name, description, status, sort, workspace_id, created_at, updated_at
        )
        SELECT gen_random_uuid(), scene_type, '从现有采集任务自动整理', 'ACTIVE',
               ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY scene_type),
               workspace_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM collection_task
        WHERE scene_type <> ''
        GROUP BY workspace_id, scene_type
        """
    )
    op.execute(
        """
        INSERT INTO menu (
            id, parent_id, name, type, path, icon, permission_code, sort,
            is_active, is_visible, is_cache, created_at, updated_at
        ) VALUES
            ('c0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000000', '场景管理', 1, 'collection-scenes', 'MapPinned', 'collection_scenes:list', 4, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000026', 'c0000000-0000-4000-8000-000000000010', '新增场景', 2, NULL, NULL, 'collection_scenes:create', 1, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000027', 'c0000000-0000-4000-8000-000000000010', '修改场景', 2, NULL, NULL, 'collection_scenes:update', 2, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000028', 'c0000000-0000-4000-8000-000000000010', '删除场景', 2, NULL, NULL, 'collection_scenes:delete', 3, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM menu WHERE id IN ('e0000000-0000-4000-8000-000000000026', 'e0000000-0000-4000-8000-000000000027', 'e0000000-0000-4000-8000-000000000028', 'c0000000-0000-4000-8000-000000000010')"
    )
    for column in (
        "deleter_id",
        "updater_id",
        "creator_id",
        "workspace_id",
        "status",
        "name",
    ):
        op.drop_index(f"ix_collection_scene_{column}", table_name="collection_scene")
    op.drop_table("collection_scene")
