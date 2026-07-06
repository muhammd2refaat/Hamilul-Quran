"""Google OAuth linkage + teacher profiles/ijazas + google credentials

Add-only migration:
  • users: nullable password_hash, add auth_provider / google_id / age
  • new tables: teacher_profiles, ijazas, google_credentials

Chained off the initial baseline. The live dev DB was built via
SQLModel.create_all (not Alembic), so to adopt migrations run:
    alembic stamp 0af01f5224fd   # baseline (users) already exists
    alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "b2f7a1c9d3e4"
down_revision = "0af01f5224fd"
branch_labels = None
depends_on = None


# create_type=False: we create/drop the enum types explicitly below so that
# add_column / create_table don't also emit a (duplicate) CREATE TYPE.
authprovider = postgresql.ENUM(
    "LOCAL", "GOOGLE", name="authprovider", create_type=False
)
ijazatype = postgresql.ENUM(
    "HIFZ", "TILAWAH", "HAFS_AN_ASIM", "TEN_QIRAAT", "OTHER",
    name="ijazatype", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    authprovider.create(bind, checkfirst=True)
    ijazatype.create(bind, checkfirst=True)

    # ─── users: OAuth linkage ────────────────────────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "auth_provider", authprovider, nullable=False, server_default="LOCAL"
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "google_id",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=True,
        ),
    )
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sqlmodel.sql.sqltypes.AutoString(length=255),
        nullable=True,
    )
    op.create_index(
        op.f("ix_users_google_id"), "users", ["google_id"], unique=True
    )

    # ─── teacher_profiles ────────────────────────────────────────────────────
    op.create_table(
        "teacher_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("worked_online_before", sa.Boolean(), nullable=False),
        sa.Column("juz_memorized", sa.Integer(), nullable=True),
        sa.Column(
            "certificate_path",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_teacher_profiles_id"), "teacher_profiles", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_teacher_profiles_user_id"),
        "teacher_profiles",
        ["user_id"],
        unique=True,
    )

    # ─── ijazas ──────────────────────────────────────────────────────────────
    op.create_table(
        "ijazas",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("teacher_profile_id", sa.Uuid(), nullable=False),
        sa.Column("ijaza_type", ijazatype, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["teacher_profile_id"], ["teacher_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ijazas_id"), "ijazas", ["id"], unique=False)
    op.create_index(
        op.f("ix_ijazas_teacher_profile_id"),
        "ijazas",
        ["teacher_profile_id"],
        unique=False,
    )

    # ─── google_credentials ──────────────────────────────────────────────────
    op.create_table(
        "google_credentials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "google_sub", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False
        ),
        sa.Column(
            "refresh_token",
            sqlmodel.sql.sqltypes.AutoString(length=1000),
            nullable=True,
        ),
        sa.Column(
            "access_token",
            sqlmodel.sql.sqltypes.AutoString(length=2000),
            nullable=True,
        ),
        sa.Column("token_expiry", sa.DateTime(), nullable=True),
        sa.Column(
            "scopes", sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_google_credentials_id"), "google_credentials", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_google_credentials_user_id"),
        "google_credentials",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_google_credentials_google_sub"),
        "google_credentials",
        ["google_sub"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_google_credentials_google_sub"), table_name="google_credentials")
    op.drop_index(op.f("ix_google_credentials_user_id"), table_name="google_credentials")
    op.drop_index(op.f("ix_google_credentials_id"), table_name="google_credentials")
    op.drop_table("google_credentials")

    op.drop_index(op.f("ix_ijazas_teacher_profile_id"), table_name="ijazas")
    op.drop_index(op.f("ix_ijazas_id"), table_name="ijazas")
    op.drop_table("ijazas")

    op.drop_index(op.f("ix_teacher_profiles_user_id"), table_name="teacher_profiles")
    op.drop_index(op.f("ix_teacher_profiles_id"), table_name="teacher_profiles")
    op.drop_table("teacher_profiles")

    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sqlmodel.sql.sqltypes.AutoString(length=255),
        nullable=False,
    )
    op.drop_column("users", "age")
    op.drop_column("users", "google_id")
    op.drop_column("users", "auth_provider")

    bind = op.get_bind()
    ijazatype.drop(bind, checkfirst=True)
    authprovider.drop(bind, checkfirst=True)
