"""Guest (unauthenticated) trial requests

Revision ID: 97f3f33f6cd5
Revises: 24ccf1880bd2
Create Date: 2026-08-07

Supports the public "Free trial" form on the landing page
(components/landing/LandingPage.tsx) submitting without an account:
  • requests.user_id becomes nullable (no User row exists yet for a guest)
  • requests.guest_name / guest_email / guest_phone hold the submitted
    contact info directly, in place of resolving it from a User row
  • "GUEST" added to the requestfromrole enum

ALTER TYPE ... ADD VALUE cannot run inside the same transaction that later
uses the new value (Postgres restriction, still true in PG16) — Alembic's
autocommit_block() runs it outside the migration's normal transaction so
this is safe on its own. No other statement in this migration reads/writes
that new value, so ordering relative to the rest of the migration doesn't
matter either way.
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "97f3f33f6cd5"
down_revision = "24ccf1880bd2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE requestfromrole ADD VALUE IF NOT EXISTS 'GUEST'")

    op.alter_column(
        "requests",
        "user_id",
        existing_type=sa.Uuid(),
        nullable=True,
    )
    op.add_column(
        "requests",
        sa.Column("guest_name", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
    )
    op.add_column(
        "requests",
        sa.Column("guest_email", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    )
    op.add_column(
        "requests",
        sa.Column("guest_phone", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=True),
    )


def downgrade() -> None:
    # Postgres can't drop a single enum value (only recreate the whole type)
    # — 'GUEST' stays in requestfromrole even on downgrade. Any GUEST rows
    # would also violate user_id's restored NOT NULL below; this downgrade
    # assumes none exist (matches every other downgrade in this repo, which
    # are best-effort/dev-time, not a guaranteed safe production path).
    op.drop_column("requests", "guest_phone")
    op.drop_column("requests", "guest_email")
    op.drop_column("requests", "guest_name")
    op.alter_column(
        "requests",
        "user_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
