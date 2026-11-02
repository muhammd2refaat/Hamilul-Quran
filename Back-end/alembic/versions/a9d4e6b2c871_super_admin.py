"""Super Admin role, temporary passwords, session revocation, admin audit log

Revision ID: a9d4e6b2c871
Revises: f7c2e9a4b1d6
Create Date: 2026-11-02

  • users.is_super_admin — set for the ADMIN_EMAIL account, whose codes and
    temporary passwords go to SUPER_ADMIN_RECOVERY_EMAIL (users.recovery_email).
  • users.must_change_password / temp_password_expires_at — every other
    existing admin must pick a new password at their next login.
  • users.sessions_valid_after — tokens issued earlier are rejected.
  • admin_audit_log — who added / changed / deleted / reset which admin.
"""
from alembic import op
import sqlalchemy as sa

from app.config.settings import settings


revision = "a9d4e6b2c871"
down_revision = "f7c2e9a4b1d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_super_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("recovery_email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("temp_password_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("sessions_valid_after", sa.DateTime(), nullable=True))

    op.create_table(
        "admin_audit_log",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("actor_email", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=True),
        sa.Column("target_email", sa.String(length=255), nullable=True),
        sa.Column("details", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_log_actor_id", "admin_audit_log", ["actor_id"])
    op.create_index("ix_admin_audit_log_target_id", "admin_audit_log", ["target_id"])
    op.create_index("ix_admin_audit_log_created_at", "admin_audit_log", ["created_at"])

    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE users SET is_super_admin = true, recovery_email = NULLIF(:recovery, '') "
            "WHERE role = 'ADMIN' AND lower(email) = lower(:email)"
        ),
        {"email": settings.admin_email, "recovery": settings.super_admin_recovery_email},
    )
    conn.execute(sa.text(
        "UPDATE users SET must_change_password = true WHERE role = 'ADMIN' AND NOT is_super_admin"
    ))


def downgrade() -> None:
    op.drop_index("ix_admin_audit_log_created_at", table_name="admin_audit_log")
    op.drop_index("ix_admin_audit_log_target_id", table_name="admin_audit_log")
    op.drop_index("ix_admin_audit_log_actor_id", table_name="admin_audit_log")
    op.drop_table("admin_audit_log")
    op.drop_column("users", "sessions_valid_after")
    op.drop_column("users", "temp_password_expires_at")
    op.drop_column("users", "must_change_password")
    op.drop_column("users", "recovery_email")
    op.drop_column("users", "is_super_admin")
