"""Receipts

Add-only migration:
  • new table: receipts
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "b7d3f2a5c8e1"
down_revision = "a1c9e4f0b3d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "receipts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("file_path", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column(
            "original_filename", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False
        ),
        sa.Column("content_type", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("amount", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_receipts_id"), "receipts", ["id"], unique=False)
    op.create_index(op.f("ix_receipts_student_id"), "receipts", ["student_id"], unique=False)
    op.create_index(op.f("ix_receipts_expires_at"), "receipts", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_receipts_expires_at"), table_name="receipts")
    op.drop_index(op.f("ix_receipts_student_id"), table_name="receipts")
    op.drop_index(op.f("ix_receipts_id"), table_name="receipts")
    op.drop_table("receipts")
