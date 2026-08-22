"""align Mango data and acceptance menu name

Revision ID: 4fd1e8a14b70
Revises: 82a8f78b0c21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4fd1e8a14b70"
down_revision: str | None = "82a8f78b0c21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE menu SET name = '数据与验收' "
            "WHERE id = 'c0000000-0000-4000-8000-000000000005'"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE menu SET name = '采集记录与质检' "
            "WHERE id = 'c0000000-0000-4000-8000-000000000005'"
        )
    )
