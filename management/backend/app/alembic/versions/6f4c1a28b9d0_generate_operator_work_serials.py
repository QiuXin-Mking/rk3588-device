"""generate immutable operator work serials

Revision ID: 6f4c1a28b9d0
Revises: e5a9b13c7d42
Create Date: 2026-08-22 20:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "6f4c1a28b9d0"
down_revision: str | Sequence[str] | None = "e5a9b13c7d42"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE workspacemember AS member
        SET work_serial_number = 'OP-' || LPAD(
            SPLIT_PART(account.username, '.', 3), 8, '0'
        )
        FROM "user" AS account
        WHERE member.account_id = account.id
          AND account.username ~ '^stress\\.operator\\.[0-9]+$'
        """
    )
    op.execute(
        """
        WITH existing_max AS (
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(work_serial_number FROM 4) AS BIGINT)),
                0
            ) AS value
            FROM workspacemember
            WHERE work_serial_number ~ '^OP-[0-9]+$'
        ), missing AS (
            SELECT member.id,
                   ROW_NUMBER() OVER (ORDER BY member.created_at, member.id) AS row_no
            FROM workspacemember AS member
            WHERE NULLIF(member.work_serial_number, '') IS NULL
              AND EXISTS (
                  SELECT 1
                  FROM memberrolelink AS role_link
                  WHERE role_link.member_id = member.id
                    AND role_link.role_id = 'e9000000-0000-4000-8000-000000000001'::uuid
              )
        )
        UPDATE workspacemember AS member
        SET work_serial_number = 'OP-' || LPAD(
            (existing_max.value + missing.row_no)::text, 8, '0'
        )
        FROM missing, existing_max
        WHERE member.id = missing.id
        """
    )
    op.create_index(
        "uq_workspacemember_work_serial_number",
        "workspacemember",
        ["work_serial_number"],
        unique=True,
        postgresql_where=sa.text("work_serial_number IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_workspacemember_work_serial_number", table_name="workspacemember"
    )
