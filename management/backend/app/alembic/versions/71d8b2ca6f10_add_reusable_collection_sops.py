"""add reusable collection SOP resources

Revision ID: 71d8b2ca6f10
Revises: 4fd1e8a14b70
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "71d8b2ca6f10"
down_revision: str | None = "4fd1e8a14b70"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "collection_sop",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creator_id", sa.Uuid(), nullable=True),
        sa.Column("updater_id", sa.Uuid(), nullable=True),
        sa.Column("deleter_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspace.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collection_sop_name", "collection_sop", ["name"])
    op.create_index("ix_collection_sop_workspace_id", "collection_sop", ["workspace_id"])
    op.create_index("ix_collection_sop_creator_id", "collection_sop", ["creator_id"])
    op.create_index("ix_collection_sop_updater_id", "collection_sop", ["updater_id"])
    op.create_index("ix_collection_sop_deleter_id", "collection_sop", ["deleter_id"])

    op.add_column("collection_task", sa.Column("sop_id", sa.Uuid(), nullable=True))
    op.execute(
        """
        INSERT INTO collection_sop (id, name, content, workspace_id, created_at, updated_at)
        SELECT gen_random_uuid(), '历史任务 SOP', '请在管理后台维护该 SOP 的详细内容。', workspace_id,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM collection_task
        GROUP BY workspace_id
        """
    )
    op.execute(
        """
        UPDATE collection_task AS task
        SET sop_id = sop.id
        FROM collection_sop AS sop
        WHERE sop.workspace_id = task.workspace_id AND sop.name = '历史任务 SOP'
        """
    )
    op.alter_column("collection_task", "sop_id", nullable=False)
    op.create_foreign_key(
        "fk_collection_task_sop_id", "collection_task", "collection_sop", ["sop_id"], ["id"]
    )
    op.create_index("ix_collection_task_sop_id", "collection_task", ["sop_id"])

    op.drop_column("collection_task", "sop")
    op.drop_column("collection_task", "gps")
    op.drop_column("collection_task", "nearby_location")
    op.drop_column("collection_task", "location_alert")
    op.drop_column("collection_task", "specification")
    op.drop_column("product_kit", "sop_content")
    op.execute("UPDATE collection_task SET location = '' WHERE status = 'PENDING'")

    op.execute(
        """
        INSERT INTO menu (
            id, parent_id, name, type, path, icon, permission_code, sort,
            is_active, is_visible, is_cache, created_at, updated_at
        ) VALUES
            ('c0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000000', 'SOP 管理', 1, 'collection-sops', 'FileText', 'collection_sops:list', 3, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-000000000009', '新增 SOP', 2, NULL, NULL, 'collection_sops:create', 1, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000024', 'c0000000-0000-4000-8000-000000000009', '修改 SOP', 2, NULL, NULL, 'collection_sops:update', 2, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000025', 'c0000000-0000-4000-8000-000000000009', '删除 SOP', 2, NULL, NULL, 'collection_sops:delete', 3, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
        """
    )
    op.execute("UPDATE menu SET sort = sort + 1 WHERE parent_id = 'c0000000-0000-4000-8000-000000000000' AND sort >= 3 AND id <> 'c0000000-0000-4000-8000-000000000009'")


def downgrade() -> None:
    op.add_column("product_kit", sa.Column("sop_content", sa.String(length=8000), nullable=False, server_default=""))
    op.add_column("collection_task", sa.Column("sop", sa.String(length=8000), nullable=False, server_default=""))
    op.add_column("collection_task", sa.Column("gps", sa.String(length=128), nullable=False, server_default=""))
    op.add_column("collection_task", sa.Column("nearby_location", sa.String(length=256), nullable=False, server_default=""))
    op.add_column("collection_task", sa.Column("location_alert", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("collection_task", sa.Column("specification", sa.String(length=1000), nullable=False, server_default=""))
    op.execute(
        """
        UPDATE collection_task AS task
        SET sop = sop.content
        FROM collection_sop AS sop
        WHERE sop.id = task.sop_id
        """
    )
    op.drop_index("ix_collection_task_sop_id", table_name="collection_task")
    op.drop_constraint("fk_collection_task_sop_id", "collection_task", type_="foreignkey")
    op.drop_column("collection_task", "sop_id")

    op.execute("DELETE FROM menu WHERE id IN ('e0000000-0000-4000-8000-000000000023', 'e0000000-0000-4000-8000-000000000024', 'e0000000-0000-4000-8000-000000000025', 'c0000000-0000-4000-8000-000000000009')")
    op.execute("UPDATE menu SET sort = sort - 1 WHERE parent_id = 'c0000000-0000-4000-8000-000000000000' AND sort >= 4")

    op.drop_index("ix_collection_sop_deleter_id", table_name="collection_sop")
    op.drop_index("ix_collection_sop_updater_id", table_name="collection_sop")
    op.drop_index("ix_collection_sop_creator_id", table_name="collection_sop")
    op.drop_index("ix_collection_sop_workspace_id", table_name="collection_sop")
    op.drop_index("ix_collection_sop_name", table_name="collection_sop")
    op.drop_table("collection_sop")
