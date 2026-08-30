"""Plan Arabic names + request plan linkage

Add-only migration:
  • plans.name_ar — Arabic display name, backfilled for the 6 seeded plans
  • requests.requested_plan_id — FK to plans, so a student's structured
    plan pick (PlanRequestModal) is traceable to a real catalog row
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8c2f4a91d6e7"
down_revision = "307c9b1e5a44"
branch_labels = None
depends_on = None


# (sessions_per_week, session_duration_minutes) -> Arabic name, matching the
# exact phrasing the site owner used when specifying these plans.
_NAME_AR_BY_SHAPE = {
    (1, 30): "حلقه واحده اسبوعيا - 30 دقيقة",
    (2, 30): "حلقتين اسبوعيا - 30 دقيقة",
    (1, 45): "حلقه واحده اسبوعيا - 45 دقيقة",
    (2, 45): "حلقتين اسبوعيا - 45 دقيقة",
    (1, 60): "حلقه واحده اسبوعيا - 60 دقيقة",
    (2, 60): "حلقتين اسبوعيا - 60 دقيقة",
}


def upgrade() -> None:
    op.add_column("plans", sa.Column("name_ar", sa.String(length=200), nullable=True))

    plans_table = sa.table(
        "plans",
        sa.column("id", sa.Uuid()),
        sa.column("sessions_per_week", sa.Integer()),
        sa.column("session_duration_minutes", sa.Integer()),
        sa.column("name_ar", sa.String()),
    )
    conn = op.get_bind()
    for (sessions, duration), name_ar in _NAME_AR_BY_SHAPE.items():
        conn.execute(
            plans_table.update()
            .where(plans_table.c.sessions_per_week == sessions)
            .where(plans_table.c.session_duration_minutes == duration)
            .values(name_ar=name_ar)
        )

    op.add_column("requests", sa.Column("requested_plan_id", sa.Uuid(), nullable=True))
    op.create_index(
        op.f("ix_requests_requested_plan_id"), "requests", ["requested_plan_id"], unique=False
    )
    op.create_foreign_key(
        "requests_requested_plan_id_fkey", "requests", "plans", ["requested_plan_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("requests_requested_plan_id_fkey", "requests", type_="foreignkey")
    op.drop_index(op.f("ix_requests_requested_plan_id"), table_name="requests")
    op.drop_column("requests", "requested_plan_id")
    op.drop_column("plans", "name_ar")
