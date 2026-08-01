"""Platform requests

Add-only migration:
  • new table: requests
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "f3b6c1a70e21"
down_revision = "d7e2a4c81f56"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("from_role", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("details", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("current_day", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("current_time", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("requested_day", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("requested_time", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("requested_plan", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column("requested_teacher", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column("admin_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_requests_id"), "requests", ["id"], unique=False)
    op.create_index(op.f("ix_requests_user_id"), "requests", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_requests_user_id"), table_name="requests")
    op.drop_index(op.f("ix_requests_id"), table_name="requests")
    op.drop_table("requests")
