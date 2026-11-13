"""Admin-managed seva catalog, account registration, booking records, website settings and audit.

Revision ID: 0003_admin_portal
Revises: 0002_payment_mode
"""
from alembic import op
import sqlalchemy as sa
revision = '0003_admin_portal'
down_revision = '0002_payment_mode'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('app_users') as batch:
        batch.add_column(sa.Column('email',sa.String(254),nullable=True))
        batch.add_column(sa.Column('full_name',sa.String(200),nullable=True))
        batch.add_column(sa.Column('devotee_id',sa.String(36),nullable=True))
        batch.add_column(sa.Column('email_verified',sa.Boolean(),nullable=False,server_default=sa.false()))
        batch.create_unique_constraint('uq_app_users_email',['email'])
        batch.create_foreign_key('fk_app_users_devotee','devotees',['devotee_id'],['id'])
    with op.batch_alter_table('payment_orders') as batch:
        batch.add_column(sa.Column('user_id',sa.String(36),nullable=True))
        batch.create_foreign_key('fk_payment_order_user','app_users',['user_id'],['id'])
    op.create_table('seva_master',
        sa.Column('id',sa.String(100),primary_key=True),
        sa.Column('name',sa.String(200),nullable=False),
        sa.Column('category',sa.String(40),nullable=False),
        sa.Column('price',sa.Integer(),nullable=False),
        sa.Column('timing',sa.String(120)),
        sa.Column('note',sa.String(500)),
        sa.Column('except_ekadashi',sa.Boolean(),nullable=False,server_default=sa.false()),
        sa.Column('active',sa.Boolean(),nullable=False,server_default=sa.true()),
        sa.Column('created_by_id',sa.String(36),sa.ForeignKey('app_users.id')),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.CheckConstraint('price > 0',name='ck_seva_price_positive'))
    op.create_table('seva_bookings',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('order_id',sa.String(36),sa.ForeignKey('payment_orders.id'),unique=True,nullable=False),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('app_users.id')),
        sa.Column('devotee_id',sa.String(36),sa.ForeignKey('devotees.id')),
        sa.Column('items_snapshot',sa.JSON(),nullable=False),
        sa.Column('amount_paise',sa.Integer(),nullable=False),
        sa.Column('preferred_date',sa.String(30)),
        sa.Column('status',sa.String(30),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('confirmed_at',sa.DateTime(timezone=True)))
    op.create_table('website_settings',
        sa.Column('key',sa.String(60),primary_key=True),
        sa.Column('value',sa.JSON(),nullable=False),
        sa.Column('updated_by_id',sa.String(36),sa.ForeignKey('app_users.id')),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
    op.create_table('admin_audit',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('actor_id',sa.String(36),sa.ForeignKey('app_users.id'),nullable=False),
        sa.Column('action',sa.String(80),nullable=False),
        sa.Column('resource_type',sa.String(60),nullable=False),
        sa.Column('resource_id',sa.String(100),nullable=False),
        sa.Column('before',sa.JSON()),sa.Column('after',sa.JSON()),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))

def downgrade():
    op.drop_table('admin_audit')
    op.drop_table('website_settings')
    op.drop_table('seva_bookings')
    op.drop_table('seva_master')
    with op.batch_alter_table('payment_orders') as batch:
        batch.drop_constraint('fk_payment_order_user',type_='foreignkey')
        batch.drop_column('user_id')
    with op.batch_alter_table('app_users') as batch:
        batch.drop_constraint('fk_app_users_devotee',type_='foreignkey')
        batch.drop_constraint('uq_app_users_email',type_='unique')
        for column in ('email_verified','devotee_id','full_name','email'):
            batch.drop_column(column)
