"""add operator profile fields

Revision ID: 203975463d66
Revises: 938688f2fc88
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "203975463d66"
down_revision: str | None = "938688f2fc88"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("workspacemember", sa.Column("work_region", sa.String(length=255), nullable=True))
    op.add_column("workspacemember", sa.Column("company", sa.String(length=255), nullable=True))
    op.add_column("workspacemember", sa.Column("cooperation_mode", sa.String(length=64), nullable=True))
    op.add_column("workspacemember", sa.Column("work_serial_number", sa.String(length=128), nullable=True))
    op.add_column("workspacemember", sa.Column("height_cm", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("workspacemember", "height_cm")
    op.drop_column("workspacemember", "work_serial_number")
    op.drop_column("workspacemember", "cooperation_mode")
    op.drop_column("workspacemember", "company")
    op.drop_column("workspacemember", "work_region")
