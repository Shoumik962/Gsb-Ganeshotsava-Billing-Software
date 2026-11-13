"""Persist Razorpay live/test mode on each payment order.

Revision ID: 0002_payment_mode
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_payment_mode'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Historical orders cannot safely be reclassified as live or test.
    op.add_column('payment_orders', sa.Column('gateway_mode', sa.String(12),
                                              nullable=False, server_default='unknown'))


def downgrade():
    op.drop_column('payment_orders', 'gateway_mode')
