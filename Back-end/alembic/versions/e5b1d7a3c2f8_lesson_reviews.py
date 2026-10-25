"""Lesson reviews + admin audits on teacher_reviews

Revision ID: e5b1d7a3c2f8
Revises: c4e8a1f2b9d0
Create Date: 2026-10-25

Add-only:
  • teacher_reviews.kind — student_session | admin_audit | general.
    Existing rows become admin_audit when is_admin, otherwise general.
  • teacher_reviews.allocation_id / session_date / scheduled_time — which
    lesson a review is about. allocation_id is not a foreign key, so
    deleting an allocation keeps the teacher's review history.
  • teacher_reviews.updated_at — set when a student edits their rating.
  • A partial unique index: one student review per reviewer per lesson.

kind is a plain VARCHAR, deliberately not a Postgres ENUM — see the
sa.Enum member-NAME gotcha documented in eae302777fad_session_attendance.py.
"""
from alembic import op
import sqlalchemy as sa


revision = "e5b1d7a3c2f8"
down_revision = "c4e8a1f2b9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "teacher_reviews",
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="general"),
    )
    op.add_column("teacher_reviews", sa.Column("allocation_id", sa.Uuid(), nullable=True))
    op.add_column("teacher_reviews", sa.Column("session_date", sa.Date(), nullable=True))
    op.add_column("teacher_reviews", sa.Column("scheduled_time", sa.String(length=20), nullable=True))
    op.add_column("teacher_reviews", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE teacher_reviews SET kind = 'admin_audit' WHERE is_admin")

    op.create_index(op.f("ix_teacher_reviews_kind"), "teacher_reviews", ["kind"], unique=False)
    op.create_index(
        op.f("ix_teacher_reviews_allocation_id"), "teacher_reviews", ["allocation_id"], unique=False
    )
    op.create_index(
        "uq_student_lesson_review",
        "teacher_reviews",
        ["reviewer_id", "allocation_id", "session_date", "scheduled_time"],
        unique=True,
        postgresql_where=sa.text("kind = 'student_session'"),
    )


def downgrade() -> None:
    op.drop_index("uq_student_lesson_review", table_name="teacher_reviews")
    op.drop_index(op.f("ix_teacher_reviews_allocation_id"), table_name="teacher_reviews")
    op.drop_index(op.f("ix_teacher_reviews_kind"), table_name="teacher_reviews")
    op.drop_column("teacher_reviews", "updated_at")
    op.drop_column("teacher_reviews", "scheduled_time")
    op.drop_column("teacher_reviews", "session_date")
    op.drop_column("teacher_reviews", "allocation_id")
    op.drop_column("teacher_reviews", "kind")
