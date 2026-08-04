"""Add totp_secret and totp_enabled to users

Revision ID: e1a4b2c9d7f3
Revises: f3b6c1a70e21
Create Date: 2026-08-04

Adds two columns to the users table to support admin TOTP 2FA:
  - totp_secret  VARCHAR nullable — Fernet-encrypted base32 TOTP secret
  - totp_enabled BOOLEAN NOT NULL DEFAULT FALSE

No enum changes; no new tables.
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "e1a4b2c9d7f3"
down_revision = "b7d3f2a5c8e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("totp_secret", sqlmodel.AutoString(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
