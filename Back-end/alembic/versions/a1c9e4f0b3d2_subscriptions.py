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
    # sa.Enum with asyncpg has a known issue where _on_table_create still fires
    # even with create_type=False, causing DuplicateObjectError.
    # Solution: bypass SQLAlchemy's type system entirely and use raw SQL.

    op.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE subscriptionstatus AS ENUM ('ACTIVE', 'PAUSED', 'WITHDRAWN');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))

    op.execute(sa.text("""
        CREATE TABLE subscriptions (
            id          UUID        NOT NULL,
            student_id  UUID        NOT NULL,
            plan_name   VARCHAR(255) NOT NULL,
            status      subscriptionstatus NOT NULL,
            start_date  DATE        NOT NULL,
            notes       TEXT,
            created_at  TIMESTAMP   NOT NULL,
            updated_at  TIMESTAMP   NOT NULL,
            CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
            CONSTRAINT subscriptions_student_id_fkey
                FOREIGN KEY (student_id) REFERENCES users(id)
        )
    """))

    op.create_index(op.f("ix_subscriptions_id"), "subscriptions", ["id"], unique=False)
    op.create_index(
        op.f("ix_subscriptions_student_id"), "subscriptions", ["student_id"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_subscriptions_student_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_id"), table_name="subscriptions")
    op.drop_table("subscriptions")
    op.execute(sa.text("DROP TYPE IF EXISTS subscriptionstatus"))
