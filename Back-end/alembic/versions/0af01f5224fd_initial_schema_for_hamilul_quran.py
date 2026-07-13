"""Initial schema for Hamilul-Quran.

Reconciled 2026-07-07 to match the actual dev DB schema (which was built via
SQLModel.create_all, not by running this migration — it had only ever been
`alembic stamp`'d, never `upgrade`'d, so editing it here is safe for every
environment that adopted migrations the documented way).

Original drift: this file only created `users`, with 8 gamification columns
(points, articles_viewed, ...) inherited from the scaffold project that were
never part of the real User model, plus password_hash NOT NULL. Fixed to
create `users` (without the gamification columns, nullable password_hash)
plus the four tables that existed in the live DB but were never captured by
any Alembic migration: allocations, complaints, session_scores,
teacher_history.
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0af01f5224fd'
down_revision = None
branch_labels = None
depends_on = None


# create_type=False: created explicitly in upgrade() so create_table doesn't
# also emit a duplicate CREATE TYPE.
complaintfrom = postgresql.ENUM("STUDENT", "TEACHER", name="complaintfrom", create_type=False)
complaintcategory = postgresql.ENUM(
    "LATE_SESSION", "NO_FEEDBACK", "CURRICULUM", "BEHAVIOUR", "TECHNICAL", "OTHER",
    name="complaintcategory", create_type=False,
)
complaintstatus = postgresql.ENUM(
    "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED", name="complaintstatus", create_type=False,
)


def upgrade() -> None:
    # ─── users ───────────────────────────────────────────────────────────────
    op.create_table('users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('username', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('first_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('last_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('phone_number', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('role', sa.Enum('ADMIN', 'TEACHER', 'STUDENT', name='userrole'), nullable=False),
    sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', name='userstatus'), nullable=False),
    sa.Column('country', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.Column('city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.Column('gender', sa.Enum('MALE', 'FEMALE', name='gender'), nullable=True),
    sa.Column('date_of_birth', sa.Date(), nullable=True),
    sa.Column('teacher_id', sa.Uuid(), nullable=True),
    sa.Column('joined_date', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_teacher_id'), 'users', ['teacher_id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # ─── allocations ─────────────────────────────────────────────────────────
    op.create_table('allocations',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('teacher_id', sa.Uuid(), nullable=False),
    sa.Column('student_id', sa.Uuid(), nullable=False),
    sa.Column('sessions_per_week', sa.Integer(), nullable=False),
    sa.Column('duration', sa.Integer(), nullable=False),
    sa.Column('schedule', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_allocations_id'), 'allocations', ['id'], unique=False)
    op.create_index(op.f('ix_allocations_teacher_id'), 'allocations', ['teacher_id'], unique=False)
    op.create_index(op.f('ix_allocations_student_id'), 'allocations', ['student_id'], unique=False)

    # ─── complaints ──────────────────────────────────────────────────────────
    bind = op.get_bind()
    complaintfrom.create(bind, checkfirst=True)
    complaintcategory.create(bind, checkfirst=True)
    complaintstatus.create(bind, checkfirst=True)

    op.create_table('complaints',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('about_id', sa.Uuid(), nullable=True),
    sa.Column('complaint_from', complaintfrom, nullable=False),
    sa.Column('category', complaintcategory, nullable=False),
    sa.Column('subject', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('admin_note', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('status', complaintstatus, nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('resolved_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['about_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_complaints_id'), 'complaints', ['id'], unique=False)
    op.create_index(op.f('ix_complaints_user_id'), 'complaints', ['user_id'], unique=False)
    op.create_index(op.f('ix_complaints_about_id'), 'complaints', ['about_id'], unique=False)

    # ─── session_scores ──────────────────────────────────────────────────────
    op.create_table('session_scores',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('student_id', sa.Uuid(), nullable=False),
    sa.Column('teacher_id', sa.Uuid(), nullable=False),
    sa.Column('date', sa.DateTime(), nullable=False),
    sa.Column('score', sa.Integer(), nullable=False),
    sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('recitation_type', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_session_scores_id'), 'session_scores', ['id'], unique=False)
    op.create_index(op.f('ix_session_scores_student_id'), 'session_scores', ['student_id'], unique=False)
    op.create_index(op.f('ix_session_scores_teacher_id'), 'session_scores', ['teacher_id'], unique=False)

    # ─── teacher_history ─────────────────────────────────────────────────────
    op.create_table('teacher_history',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('student_id', sa.Uuid(), nullable=False),
    sa.Column('teacher_id', sa.Uuid(), nullable=False),
    sa.Column('assigned_at', sa.DateTime(), nullable=False),
    sa.Column('unassigned_at', sa.DateTime(), nullable=True),
    sa.Column('reason', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_teacher_history_id'), 'teacher_history', ['id'], unique=False)
    op.create_index(op.f('ix_teacher_history_student_id'), 'teacher_history', ['student_id'], unique=False)
    op.create_index(op.f('ix_teacher_history_teacher_id'), 'teacher_history', ['teacher_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_teacher_history_teacher_id'), table_name='teacher_history')
    op.drop_index(op.f('ix_teacher_history_student_id'), table_name='teacher_history')
    op.drop_index(op.f('ix_teacher_history_id'), table_name='teacher_history')
    op.drop_table('teacher_history')

    op.drop_index(op.f('ix_session_scores_teacher_id'), table_name='session_scores')
    op.drop_index(op.f('ix_session_scores_student_id'), table_name='session_scores')
    op.drop_index(op.f('ix_session_scores_id'), table_name='session_scores')
    op.drop_table('session_scores')

    op.drop_index(op.f('ix_complaints_about_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_user_id'), table_name='complaints')
    op.drop_index(op.f('ix_complaints_id'), table_name='complaints')
    op.drop_table('complaints')

    bind = op.get_bind()
    complaintstatus.drop(bind, checkfirst=True)
    complaintcategory.drop(bind, checkfirst=True)
    complaintfrom.drop(bind, checkfirst=True)

    op.drop_index(op.f('ix_allocations_student_id'), table_name='allocations')
    op.drop_index(op.f('ix_allocations_teacher_id'), table_name='allocations')
    op.drop_index(op.f('ix_allocations_id'), table_name='allocations')
    op.drop_table('allocations')

    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_teacher_id'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
