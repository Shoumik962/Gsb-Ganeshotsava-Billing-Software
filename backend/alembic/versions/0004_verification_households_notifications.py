"""Verified signup, family-linked addresses, household benefit uniqueness, and receipt delivery.

Revision ID: 0004_verification
Revises: 0003_admin_portal
"""
from alembic import op
import sqlalchemy as sa
revision = '0004_verification'
down_revision = '0003_admin_portal'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('app_users') as b:
        b.add_column(sa.Column('phone_verified',sa.Boolean(),nullable=False,server_default=sa.false()))
        b.add_column(sa.Column('profile_completed_at',sa.DateTime(timezone=True)))
        b.add_column(sa.Column('receipt_sms_opt_in',sa.Boolean(),nullable=False,server_default=sa.false()))
    with op.batch_alter_table('devotees') as b:
        b.add_column(sa.Column('gotra',sa.String(100)))
        b.add_column(sa.Column('nakshatra',sa.String(100)))
    op.create_table('request_throttles',
       sa.Column('id',sa.String(64),primary_key=True),
       sa.Column('action',sa.String(40),nullable=False),
       sa.Column('count',sa.Integer(),nullable=False),
       sa.Column('reset_at',sa.DateTime(timezone=True),nullable=False))
    op.create_table('verification_challenges',
       sa.Column('id',sa.String(36),primary_key=True),
       sa.Column('user_id',sa.String(36),sa.ForeignKey('app_users.id'),nullable=False),
       sa.Column('channel',sa.String(10),nullable=False),
       sa.Column('code_digest',sa.String(64),nullable=False),
       sa.Column('expires_at',sa.DateTime(timezone=True),nullable=False),
       sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
       sa.Column('attempts',sa.Integer(),nullable=False,server_default='0'),
       sa.Column('consumed_at',sa.DateTime(timezone=True)))
    op.create_index('ix_verification_challenges_user_id','verification_challenges',['user_id'])
    op.create_index('ix_verification_user_channel','verification_challenges',['user_id','channel','created_at'])
    op.create_table('family_link_requests',
       sa.Column('id',sa.String(36),primary_key=True),
       sa.Column('devotee_id',sa.String(36),sa.ForeignKey('devotees.id'),nullable=False),
       sa.Column('family_id',sa.String(36),sa.ForeignKey('families.id'),nullable=False),
       sa.Column('address_id',sa.String(36),sa.ForeignKey('address_master.id'),nullable=False),
       sa.Column('status',sa.String(20),nullable=False),
       sa.Column('reviewed_by_id',sa.String(36),sa.ForeignKey('app_users.id')),
       sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
       sa.Column('reviewed_at',sa.DateTime(timezone=True)),
       sa.UniqueConstraint('devotee_id','family_id',name='uq_family_link_request'))
    op.create_table('household_benefits',
       sa.Column('id',sa.String(36),primary_key=True),
       sa.Column('address_id',sa.String(36),sa.ForeignKey('address_master.id'),nullable=False),
       sa.Column('family_id',sa.String(36),sa.ForeignKey('families.id'),nullable=False),
       sa.Column('event_code',sa.String(80),nullable=False),
       sa.Column('benefit_type',sa.String(30),nullable=False),
       sa.Column('voucher_code',sa.String(40),nullable=False,unique=True),
       sa.Column('created_by_id',sa.String(36),sa.ForeignKey('app_users.id'),nullable=False),
       sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
       sa.UniqueConstraint('address_id','event_code','benefit_type',name='uq_household_one_benefit'))
    op.create_table('receipt_deliveries',
       sa.Column('id',sa.String(36),primary_key=True),
       sa.Column('receipt_id',sa.String(36),sa.ForeignKey('receipts.id'),nullable=False),
       sa.Column('channel',sa.String(10),nullable=False),
       sa.Column('phone',sa.String(20),nullable=False),
       sa.Column('status',sa.String(20),nullable=False),
       sa.Column('provider_ref',sa.String(150)),
       sa.Column('error',sa.String(250)),
       sa.Column('attempts',sa.Integer(),nullable=False),
       sa.Column('sent_at',sa.DateTime(timezone=True)),
       sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
       sa.UniqueConstraint('receipt_id','channel',name='uq_receipt_delivery_channel'))

def downgrade():
    op.drop_table('request_throttles')
    op.drop_table('receipt_deliveries')
    op.drop_table('household_benefits')
    op.drop_table('family_link_requests')
    op.drop_index('ix_verification_user_channel',table_name='verification_challenges')
    op.drop_index('ix_verification_challenges_user_id',table_name='verification_challenges')
    op.drop_table('verification_challenges')
    with op.batch_alter_table('devotees') as b:
        b.drop_column('nakshatra'); b.drop_column('gotra')
    with op.batch_alter_table('app_users') as b:
        b.drop_column('receipt_sms_opt_in'); b.drop_column('profile_completed_at'); b.drop_column('phone_verified')
