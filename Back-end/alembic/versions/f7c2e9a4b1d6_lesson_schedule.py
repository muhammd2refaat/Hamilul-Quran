"""Lesson schedule bounded by the subscription + lasting lesson history

Revision ID: f7c2e9a4b1d6
Revises: e5b1d7a3c2f8
Create Date: 2026-10-26

  • allocations.scheduled_until — last date lessons are scheduled for (the
    student's final paid lesson). Null = open-ended, as before.
  • session_outcomes.teacher_id / student_id — backfilled from the
    allocation, so monthly history survives an allocation being deleted or
    its teacher changed.
  • session_outcomes.allocation_id loses its foreign key for the same
    reason (the column and index stay).

Statuses "confirmed" / "not_scheduled" need no schema change (VARCHAR).
"""
from alembic import op
import sqlalchemy as sa


revision = "f7c2e9a4b1d6"
down_revision = "e5b1d7a3c2f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("allocations", sa.Column("scheduled_until", sa.Date(), nullable=True))

    op.add_column("session_outcomes", sa.Column("teacher_id", sa.Uuid(), nullable=True))
    op.add_column("session_outcomes", sa.Column("student_id", sa.Uuid(), nullable=True))
    op.execute(
        "UPDATE session_outcomes o SET teacher_id = a.teacher_id, student_id = a.student_id "
        "FROM allocations a WHERE a.id = o.allocation_id"
    )
    op.create_index("ix_session_outcomes_teacher_id", "session_outcomes", ["teacher_id"])
    op.create_index("ix_session_outcomes_student_id", "session_outcomes", ["student_id"])
    op.drop_constraint("session_outcomes_allocation_id_fkey", "session_outcomes", type_="foreignkey")


def downgrade() -> None:
    # Outcomes of allocations deleted since the upgrade would break the FK.
    op.execute("DELETE FROM session_outcomes o WHERE NOT EXISTS (SELECT 1 FROM allocations a WHERE a.id = o.allocation_id)")
    op.create_foreign_key(
        "session_outcomes_allocation_id_fkey", "session_outcomes", "allocations", ["allocation_id"], ["id"]
    )
    op.drop_index("ix_session_outcomes_student_id", table_name="session_outcomes")
    op.drop_index("ix_session_outcomes_teacher_id", table_name="session_outcomes")
    op.drop_column("session_outcomes", "student_id")
    op.drop_column("session_outcomes", "teacher_id")
    op.drop_column("allocations", "scheduled_until")
