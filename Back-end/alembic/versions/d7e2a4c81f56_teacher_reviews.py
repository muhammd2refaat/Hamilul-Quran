"""Teacher reviews

Add-only migration:
  • new table: teacher_reviews
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "d7e2a4c81f56"
down_revision = "c4a8f1d92b3e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teacher_reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("teacher_id", sa.Uuid(), nullable=False),
        sa.Column("reviewer_id", sa.Uuid(), nullable=True),
        sa.Column(
            "reviewer_name",
            sqlmodel.sql.sqltypes.AutoString(length=200),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teacher_reviews_id"), "teacher_reviews", ["id"], unique=False)
    op.create_index(
        op.f("ix_teacher_reviews_teacher_id"), "teacher_reviews", ["teacher_id"], unique=False
    )
    op.create_index(
        op.f("ix_teacher_reviews_reviewer_id"), "teacher_reviews", ["reviewer_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_teacher_reviews_reviewer_id"), table_name="teacher_reviews")
    op.drop_index(op.f("ix_teacher_reviews_teacher_id"), table_name="teacher_reviews")
    op.drop_index(op.f("ix_teacher_reviews_id"), table_name="teacher_reviews")
    op.drop_table("teacher_reviews")
