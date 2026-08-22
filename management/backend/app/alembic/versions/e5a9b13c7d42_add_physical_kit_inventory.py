"""add physical kit inventory

Revision ID: e5a9b13c7d42
Revises: c4d2a8f0e913
Create Date: 2026-08-22 19:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5a9b13c7d42"
down_revision: str | Sequence[str] | None = "c4d2a8f0e913"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "physical_kit",
        sa.Column("serial_number", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column("terminal_serial", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("bound_username", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="READY"),
        sa.Column("location", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("remark", sa.String(length=1000), nullable=False, server_default=""),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("creator_id", sa.Uuid(), nullable=True),
        sa.Column("updater_id", sa.Uuid(), nullable=True),
        sa.Column("deleter_id", sa.Uuid(), nullable=True),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["template_id"], ["product_kit.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspace.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "serial_number",
        "name",
        "template_id",
        "terminal_serial",
        "bound_username",
        "status",
        "creator_id",
        "updater_id",
        "deleter_id",
        "workspace_id",
    ):
        op.create_index(
            op.f(f"ix_physical_kit_{column}"),
            "physical_kit",
            [column],
            unique=False,
        )

    op.add_column(
        "device_binding", sa.Column("physical_kit_id", sa.Uuid(), nullable=True)
    )
    op.create_foreign_key(
        "fk_device_binding_physical_kit_id",
        "device_binding",
        "physical_kit",
        ["physical_kit_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_device_binding_physical_kit_id"),
        "device_binding",
        ["physical_kit_id"],
        unique=False,
    )
    op.execute("UPDATE device_binding SET status = 'UNKNOWN'")
    op.drop_index(op.f("ix_device_binding_bound_username"), table_name="device_binding")
    op.drop_constraint("device_binding_kit_id_fkey", "device_binding", type_="foreignkey")
    op.drop_column("device_binding", "bound_username")
    op.drop_column("device_binding", "kit_id")

    op.execute(
        """
        INSERT INTO menu (
            id, parent_id, name, type, path, icon, permission_code, sort,
            is_active, is_visible, is_cache, created_at, updated_at
        ) VALUES
            ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000000', '实体套件', 1, 'physical-kits', 'Boxes', 'physical_kits:list', 3, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000029', 'c0000000-0000-4000-8000-000000000011', '新增实体套件', 2, NULL, NULL, 'physical_kits:create', 1, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000030', 'c0000000-0000-4000-8000-000000000011', '修改实体套件', 2, NULL, NULL, 'physical_kits:update', 2, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('e0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-000000000011', '删除实体套件', 2, NULL, NULL, 'physical_kits:delete', 3, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
            parent_id = EXCLUDED.parent_id, name = EXCLUDED.name,
            path = EXCLUDED.path, icon = EXCLUDED.icon,
            permission_code = EXCLUDED.permission_code, sort = EXCLUDED.sort,
            updated_at = CURRENT_TIMESTAMP
        """
    )
    op.execute(
        """
        UPDATE menu SET name = '产品套件模板', sort = 2
        WHERE id = 'c0000000-0000-4000-8000-000000000002';
        UPDATE menu SET name = '实体设备', sort = 4
        WHERE id = 'c0000000-0000-4000-8000-000000000003';
        UPDATE menu SET sort = 5 WHERE id = 'c0000000-0000-4000-8000-000000000009';
        UPDATE menu SET sort = sort + 1
        WHERE parent_id = 'c0000000-0000-4000-8000-000000000000'
          AND id IN (
            'c0000000-0000-4000-8000-000000000004',
            'c0000000-0000-4000-8000-000000000005',
            'c0000000-0000-4000-8000-000000000006',
            'c0000000-0000-4000-8000-000000000007',
            'c0000000-0000-4000-8000-000000000008'
          );
        INSERT INTO workspacemenulink (workspace_id, menu_id)
        SELECT id, 'c0000000-0000-4000-8000-000000000011'::uuid
        FROM workspace
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.add_column(
        "device_binding",
        sa.Column("kit_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "device_binding_kit_id_fkey",
        "device_binding",
        "product_kit",
        ["kit_id"],
        ["id"],
    )
    op.add_column(
        "device_binding",
        sa.Column("bound_username", sa.String(length=128), nullable=False, server_default=""),
    )
    op.create_index(
        op.f("ix_device_binding_bound_username"),
        "device_binding",
        ["bound_username"],
        unique=False,
    )
    op.drop_index(op.f("ix_device_binding_physical_kit_id"), table_name="device_binding")
    op.drop_constraint(
        "fk_device_binding_physical_kit_id", "device_binding", type_="foreignkey"
    )
    op.drop_column("device_binding", "physical_kit_id")

    op.execute(
        "DELETE FROM menu WHERE id IN ("
        "'e0000000-0000-4000-8000-000000000029',"
        "'e0000000-0000-4000-8000-000000000030',"
        "'e0000000-0000-4000-8000-000000000031',"
        "'c0000000-0000-4000-8000-000000000011')"
    )
    op.drop_table("physical_kit")
