"""Session score scoring detail fields

Add-only migration:
  • session_scores: add max_score (default 20), surah, teacher_comment
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "c4a8f1d92b3e"
down_revision = "b2f7a1c9d3e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "session_scores",
        sa.Column("max_score", sa.Integer(), nullable=False, server_default="20"),
    )
    op.add_column(
        "session_scores",
        sa.Column("surah", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
    )
    op.add_column(
        "session_scores",
        sa.Column("teacher_comment", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("session_scores", "teacher_comment")
    op.drop_column("session_scores", "surah")
    op.drop_column("session_scores", "max_score")
