"""Structured plan-request fields (edit support)

Revision ID: b0749bcfe152
Revises: 97f3f33f6cd5
Create Date: 2026-08-07

Adds requested_sessions_per_week / requested_duration / requested_schedule
to requests, so PlanRequestModal's picks (sessions/week, duration, day/time
slots) are stored as real structured data — same shape as
Allocation.schedule — instead of only baked into the `details` free-text
summary. This is what lets a student's edit of their own pending request
pre-fill the picker with their previous selections, rather than starting
blank or re-parsing formatted text.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b0749bcfe152"
down_revision = "97f3f33f6cd5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "requests", sa.Column("requested_sessions_per_week", sa.Integer(), nullable=True)
    )
    op.add_column(
        "requests", sa.Column("requested_duration", sa.Integer(), nullable=True)
    )
    op.add_column(
        "requests", sa.Column("requested_schedule", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("requests", "requested_schedule")
    op.drop_column("requests", "requested_duration")
    op.drop_column("requests", "requested_sessions_per_week")
