"""Session outcomes (missed / no-show tracking) + attendance consumed flag

Revision ID: c4e8a1f2b9d0
Revises: 8c2f4a91d6e7
Create Date: 2026-10-22

Add-only:
  • session_outcomes — one row per scheduled lesson occurrence once it has
    ended (both / teacher_only / student_only / missed / excused), so
    absences are recorded rather than silently absent from the log.
  • session_attendance.consumed_session — whether that Join click actually
    deducted a session, so a teacher no-show refund never credits a session
    that was never taken. Existing rows default to false (conservative: no
    retroactive refunds for clicks recorded before this column existed).

status is a plain VARCHAR, deliberately not a Postgres ENUM — see the
sa.Enum member-NAME gotcha documented in eae302777fad_session_attendance.py.
"""
from alembic import op
import sqlalchemy as sa


revision = "c4e8a1f2b9d0"
down_revision = "8c2f4a91d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "session_attendance",
        sa.Column("consumed_session", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "session_outcomes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("allocation_id", sa.Uuid(), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("scheduled_day", sa.String(length=10), nullable=False),
        sa.Column("scheduled_time", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("session_charge", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("finalized_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["allocation_id"], ["allocations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("allocation_id", "session_date", "scheduled_time", name="uq_session_outcome"),
    )
    op.create_index("ix_session_outcomes_id", "session_outcomes", ["id"])
    op.create_index("ix_session_outcomes_allocation_id", "session_outcomes", ["allocation_id"])
    op.create_index("ix_session_outcomes_session_date", "session_outcomes", ["session_date"])


def downgrade() -> None:
    op.drop_index("ix_session_outcomes_session_date", table_name="session_outcomes")
    op.drop_index("ix_session_outcomes_allocation_id", table_name="session_outcomes")
    op.drop_index("ix_session_outcomes_id", table_name="session_outcomes")
    op.drop_table("session_outcomes")
    op.drop_column("session_attendance", "consumed_session")
