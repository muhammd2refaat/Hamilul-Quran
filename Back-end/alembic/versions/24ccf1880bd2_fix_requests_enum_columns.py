"""Fix requests table columns to use the native enum types

Revision ID: 24ccf1880bd2
Revises: e1a4b2c9d7f3
Create Date: 2026-08-05

The "requests" table on production ended up with from_role/type/status as
plain VARCHAR(20) columns, while app.features.requests.models.PlatformRequest
declares them as bare Python Enum fields — which SQLModel maps to native
Postgres ENUM columns (requestfromrole/requesttype/requeststatus). Migration
f3b6c1a70e21 ("Platform requests") already creates the table that way, but
those enum types were never actually present in the live database (a prior
manual/out-of-band table creation apparently predated it), so every INSERT
into requests has been failing with:
  asyncpg.exceptions.UndefinedObjectError: type "requestfromrole" does not exist

This migration creates the three missing enum types and converts the
existing VARCHAR columns to them in place. Values already stored (there are
none in production at the time of writing) are the enum MEMBER NAMES
(e.g. "PENDING", not "pending") — see the SQLAlchemy Enum migration note in
f3b6c1a70e21 — so the USING casts below are direct label casts, no rewriting.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "24ccf1880bd2"
down_revision = "e1a4b2c9d7f3"
branch_labels = None
depends_on = None


_REQUEST_FROM_ROLE = sa.Enum("STUDENT", "TEACHER", "GUARDIAN", name="requestfromrole")
_REQUEST_TYPE = sa.Enum(
    "RESCHEDULE", "NEW_ENROLLMENT", "CHANGE_TEACHER", "PAUSE", "OTHER", name="requesttype"
)
_REQUEST_STATUS = sa.Enum("PENDING", "IN_REVIEW", "APPROVED", "REJECTED", name="requeststatus")


def upgrade() -> None:
    bind = op.get_bind()
    _REQUEST_FROM_ROLE.create(bind, checkfirst=True)
    _REQUEST_TYPE.create(bind, checkfirst=True)
    _REQUEST_STATUS.create(bind, checkfirst=True)

    op.alter_column(
        "requests",
        "from_role",
        existing_type=sa.String(length=20),
        type_=_REQUEST_FROM_ROLE,
        existing_nullable=False,
        postgresql_using="from_role::requestfromrole",
    )
    op.alter_column(
        "requests",
        "type",
        existing_type=sa.String(length=20),
        type_=_REQUEST_TYPE,
        existing_nullable=False,
        postgresql_using="type::requesttype",
    )
    op.alter_column(
        "requests",
        "status",
        existing_type=sa.String(length=20),
        type_=_REQUEST_STATUS,
        existing_nullable=False,
        postgresql_using="status::requeststatus",
    )


def downgrade() -> None:
    op.alter_column(
        "requests",
        "status",
        existing_type=_REQUEST_STATUS,
        type_=sa.String(length=20),
        existing_nullable=False,
        postgresql_using="status::text",
    )
    op.alter_column(
        "requests",
        "type",
        existing_type=_REQUEST_TYPE,
        type_=sa.String(length=20),
        existing_nullable=False,
        postgresql_using="type::text",
    )
    op.alter_column(
        "requests",
        "from_role",
        existing_type=_REQUEST_FROM_ROLE,
        type_=sa.String(length=20),
        existing_nullable=False,
        postgresql_using="from_role::text",
    )

    bind = op.get_bind()
    _REQUEST_STATUS.drop(bind, checkfirst=True)
    _REQUEST_TYPE.drop(bind, checkfirst=True)
    _REQUEST_FROM_ROLE.drop(bind, checkfirst=True)
