"""add Mango prototype task and record fields

Revision ID: 82a8f78b0c21
Revises: 203975463d66
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "82a8f78b0c21"
down_revision: str | None = "203975463d66"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("collection_task", sa.Column("subtask_name", sa.String(length=128), nullable=False, server_default=""))
    op.add_column("collection_task", sa.Column("nearby_location", sa.String(length=256), nullable=False, server_default=""))
    op.add_column("collection_task", sa.Column("location_alert", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("collection_task", sa.Column("object_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("collection_task", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_collection_task_subtask_name", "collection_task", ["subtask_name"])

    op.add_column("collection_record", sa.Column("project_name", sa.String(length=128), nullable=False, server_default=""))
    op.add_column("collection_record", sa.Column("subtask_name", sa.String(length=128), nullable=False, server_default=""))
    op.add_column("collection_record", sa.Column("kit_name", sa.String(length=128), nullable=False, server_default=""))
    op.add_column("collection_record", sa.Column("capture_location", sa.String(length=256), nullable=False, server_default=""))
    op.add_column("collection_record", sa.Column("data_status", sa.String(length=32), nullable=False, server_default="ON_DISK"))
    op.create_index("ix_collection_record_project_name", "collection_record", ["project_name"])
    op.create_index("ix_collection_record_subtask_name", "collection_record", ["subtask_name"])
    op.create_index("ix_collection_record_kit_name", "collection_record", ["kit_name"])
    op.create_index("ix_collection_record_data_status", "collection_record", ["data_status"])


def downgrade() -> None:
    op.drop_index("ix_collection_record_data_status", table_name="collection_record")
    op.drop_index("ix_collection_record_kit_name", table_name="collection_record")
    op.drop_index("ix_collection_record_subtask_name", table_name="collection_record")
    op.drop_index("ix_collection_record_project_name", table_name="collection_record")
    op.drop_column("collection_record", "data_status")
    op.drop_column("collection_record", "capture_location")
    op.drop_column("collection_record", "kit_name")
    op.drop_column("collection_record", "subtask_name")
    op.drop_column("collection_record", "project_name")

    op.drop_index("ix_collection_task_subtask_name", table_name="collection_task")
    op.drop_column("collection_task", "published_at")
    op.drop_column("collection_task", "object_count")
    op.drop_column("collection_task", "location_alert")
    op.drop_column("collection_task", "nearby_location")
    op.drop_column("collection_task", "subtask_name")
