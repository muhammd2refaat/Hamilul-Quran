"""Subscriptions

Add-only migration:
  • new table: subscriptions
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "a1c9e4f0b3d2"
down_revision = "f3b6c1a70e21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    subscriptionstatus = sa.Enum("ACTIVE", "PAUSED", "WITHDRAWN", name="subscriptionstatus")
    subscriptionstatus.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("plan_name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("status", subscriptionstatus, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("notes", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriptions_id"), "subscriptions", ["id"], unique=False)
    op.create_index(
        op.f("ix_subscriptions_student_id"), "subscriptions", ["student_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_subscriptions_student_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_id"), table_name="subscriptions")
    op.drop_table("subscriptions")
    sa.Enum(name="subscriptionstatus").drop(op.get_bind(), checkfirst=True)
