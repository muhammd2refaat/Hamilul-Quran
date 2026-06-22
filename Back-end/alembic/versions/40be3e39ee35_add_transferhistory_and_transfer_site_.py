"""Add TransferHistory table for state change audit log."""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '40be3e39ee35'
down_revision = '431c39943fb5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL to reference the existing transferstatus enum
    op.execute("""
        CREATE TABLE IF NOT EXISTS transfer_history (
            id UUID NOT NULL,
            transfer_id UUID NOT NULL,
            from_status transferstatus,
            to_status transferstatus NOT NULL,
            changed_by_id UUID NOT NULL,
            note TEXT,
            changed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
            PRIMARY KEY (id),
            CONSTRAINT fk_th_transfer FOREIGN KEY (transfer_id)
                REFERENCES transfer_requests(id),
            CONSTRAINT fk_th_user FOREIGN KEY (changed_by_id)
                REFERENCES users(id)
        )
    """)
    op.create_index('ix_transfer_history_id', 'transfer_history', ['id'])
    op.create_index('ix_transfer_history_transfer_id', 'transfer_history', ['transfer_id'])
    op.create_index('ix_transfer_history_to_status', 'transfer_history', ['to_status'])
    op.create_index('ix_transfer_history_changed_by_id', 'transfer_history', ['changed_by_id'])


def downgrade() -> None:
    op.drop_index('ix_transfer_history_changed_by_id', table_name='transfer_history')
    op.drop_index('ix_transfer_history_to_status', table_name='transfer_history')
    op.drop_index('ix_transfer_history_transfer_id', table_name='transfer_history')
    op.drop_index('ix_transfer_history_id', table_name='transfer_history')
    op.drop_table('transfer_history')
