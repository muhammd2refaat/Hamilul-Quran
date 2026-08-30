"""Plans

Add-only migration:
  • new table: plans, seeded with the 6 current Egypt-market plans
  • subscriptions gains plan_id (FK), sessions_remaining, paused_at
"""
import uuid
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "307c9b1e5a44"
down_revision = "eae302777fad"
branch_labels = None
depends_on = None


# (name, sessions_per_week, session_duration_minutes, price)
_SEED_PLANS = [
    ("1 session/week — 30 min", 1, 30, "150.00"),
    ("2 sessions/week — 30 min", 2, 30, "260.00"),
    ("1 session/week — 45 min", 1, 45, "210.00"),
    ("2 sessions/week — 45 min", 2, 45, "360.00"),
    ("1 session/week — 60 min", 1, 60, "260.00"),
    ("2 sessions/week — 60 min", 2, 60, "460.00"),
]


def upgrade() -> None:
    op.create_table(
        "plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("sessions_per_week", sa.Integer(), nullable=False),
        sa.Column("session_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="EGP"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_plans_id"), "plans", ["id"], unique=False)

    plans_table = sa.table(
        "plans",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("sessions_per_week", sa.Integer()),
        sa.column("session_duration_minutes", sa.Integer()),
        sa.column("price", sa.Numeric(10, 2)),
        sa.column("currency", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )
    now = datetime.utcnow()
    op.bulk_insert(
        plans_table,
        [
            {
                "id": uuid.uuid4(),
                "name": name,
                "sessions_per_week": sessions,
                "session_duration_minutes": duration,
                "price": price,
                "currency": "EGP",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            for name, sessions, duration, price in _SEED_PLANS
        ],
    )

    op.add_column("subscriptions", sa.Column("plan_id", sa.Uuid(), nullable=True))
    op.add_column("subscriptions", sa.Column("sessions_remaining", sa.Integer(), nullable=True))
    op.add_column("subscriptions", sa.Column("paused_at", sa.DateTime(), nullable=True))
    op.create_index(op.f("ix_subscriptions_plan_id"), "subscriptions", ["plan_id"], unique=False)
    op.create_foreign_key(
        "subscriptions_plan_id_fkey", "subscriptions", "plans", ["plan_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("subscriptions_plan_id_fkey", "subscriptions", type_="foreignkey")
    op.drop_index(op.f("ix_subscriptions_plan_id"), table_name="subscriptions")
    op.drop_column("subscriptions", "paused_at")
    op.drop_column("subscriptions", "sessions_remaining")
    op.drop_column("subscriptions", "plan_id")

    op.drop_index(op.f("ix_plans_id"), table_name="plans")
    op.drop_table("plans")
