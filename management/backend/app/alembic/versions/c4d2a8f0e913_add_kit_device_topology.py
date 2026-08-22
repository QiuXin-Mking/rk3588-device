"""add kit device topology

Revision ID: c4d2a8f0e913
Revises: b6d2c893f741
Create Date: 2026-08-22 17:34:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4d2a8f0e913"
down_revision: str | Sequence[str] | None = "b6d2c893f741"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "product_kit",
        sa.Column(
            "device_slots",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),
    )
    op.add_column(
        "device_binding",
        sa.Column("device_model", sa.String(length=128), nullable=False, server_default=""),
    )
    op.add_column(
        "device_binding",
        sa.Column("slot_role", sa.String(length=64), nullable=False, server_default=""),
    )
    op.create_index(
        op.f("ix_device_binding_device_model"),
        "device_binding",
        ["device_model"],
        unique=False,
    )
    op.create_index(
        op.f("ix_device_binding_slot_role"),
        "device_binding",
        ["slot_role"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_device_binding_slot_role"), table_name="device_binding")
    op.drop_index(op.f("ix_device_binding_device_model"), table_name="device_binding")
    op.drop_column("device_binding", "slot_role")
    op.drop_column("device_binding", "device_model")
    op.drop_column("product_kit", "device_slots")
