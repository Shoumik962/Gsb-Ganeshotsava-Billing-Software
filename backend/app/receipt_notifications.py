"""Receipt-ID-linked SMS notifications, with durable status and safe retries."""
import logging
import os
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Receipt, ReceiptDelivery, PaymentOrder, User, utcnow
from .verification import send_sms

logger=logging.getLogger(__name__)

def create_delivery(db:Session,order:PaymentOrder,receipt:Receipt):
    owner=db.get(User,order.user_id) if order.user_id else None
    consent=bool(owner and owner.role=='devotee' and owner.phone_verified and owner.receipt_sms_opt_in)
    status='queued' if consent and order.gateway_mode!='demo' else 'skipped'
    existing=db.scalar(select(ReceiptDelivery).where(ReceiptDelivery.receipt_id==receipt.id,ReceiptDelivery.channel=='sms'))
    if existing:return existing
    record=ReceiptDelivery(receipt_id=receipt.id,phone=order.phone,channel='sms',status=status)
    db.add(record);db.flush()
    return record

def deliver(db:Session,delivery_id:str):
    delivery=db.get(ReceiptDelivery,delivery_id)
    if not delivery or delivery.status in {'sent','skipped'}:return delivery
    receipt=db.get(Receipt,delivery.receipt_id)
    order=db.get(PaymentOrder,receipt.order_id)
    if order.gateway_mode=='demo' or order.status!='paid':
        delivery.status='skipped';db.commit();return delivery
    environment='TEST receipt' if order.gateway_mode!='live' else 'Receipt'
    portal=os.getenv('PUBLIC_FRONTEND_URL','http://localhost:5173').rstrip('/')
    # Never send personal receipt contents or a public authentication-free receipt link.
    message=(f'Wadala Ganeshotsav {environment} ID: {receipt.receipt_no}. '
             f'Log in at {portal}/#account to view your booking. Do not share your account credentials.')
    delivery.attempts+=1
    try:
        provider_ref=send_sms(delivery.phone,message)
        delivery.provider_ref=provider_ref;delivery.status='sent';delivery.error=None;delivery.sent_at=utcnow()
    except Exception as exc:
        delivery.status='failed';delivery.error=f'{type(exc).__name__}: SMS delivery unavailable'[:250]
        logger.warning('Receipt SMS delivery failed: %s',type(exc).__name__)
    db.commit()
    return delivery
