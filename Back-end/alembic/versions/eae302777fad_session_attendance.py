"""Session attendance (Join-button click tracking)

Revision ID: eae302777fad
Revises: b0749bcfe152
Create Date: 2026-08-07

Add-only migration: new table session_attendance, recording each time a
student/teacher clicks "Join" for a specific weekly-schedule occurrence.
One row per (allocation, user, session_date) — see
app.features.sessions.models.SessionAttendance for the full rationale.

Native Postgres ENUM: sa.Enum(SomeStrEnum) persists the Python enum MEMBER
NAME (e.g. "STUDENT"), not its .value ("student") — see the note already
left in f3b6c1a70e21_platform_requests.py for the story behind this gotcha.

Don't pre-create the enum type with an explicit .create(bind, checkfirst=True)
call the way 24ccf1880bd2 does — that migration needed it because it was
converting an *existing* VARCHAR column via ALTER COLUMN, which doesn't
auto-create the target type. op.create_table() with an Enum-typed column
already creates the Postgres type itself as part of the CREATE TABLE DDL;
calling .create() first makes it try to create the same type twice in one
transaction (DuplicateObjectError, reproduced live 2026-08-07 — matches
f3b6c1a70e21's own original create_table, which correctly didn't pre-create
either).
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "eae302777fad"
down_revision = "b0749bcfe152"
branch_labels = None
depends_on = None


_ATTENDEE_ROLE = sa.Enum("STUDENT", "TEACHER", name="attendeerole")


def upgrade() -> None:
    op.create_table(
        "session_attendance",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("allocation_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", _ATTENDEE_ROLE, nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("scheduled_day", sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Column("scheduled_time", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["allocation_id"], ["allocations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "allocation_id", "user_id", "session_date", name="uq_attendance_slot"
        ),
    )
    op.create_index(
        op.f("ix_session_attendance_id"), "session_attendance", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_session_attendance_allocation_id"),
        "session_attendance",
        ["allocation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_session_attendance_user_id"), "session_attendance", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_session_attendance_user_id"), table_name="session_attendance")
    op.drop_index(op.f("ix_session_attendance_allocation_id"), table_name="session_attendance")
    op.drop_index(op.f("ix_session_attendance_id"), table_name="session_attendance")
    op.drop_table("session_attendance")
    _ATTENDEE_ROLE.drop(op.get_bind(), checkfirst=True)
