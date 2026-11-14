"""Razorpay capture-verified receipts, separate LOCAL DEMO receipts and database-backed booking records."""
import hashlib
import hmac
import os
from uuid import uuid4
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from .catalog import CATALOG  # legacy receipt item name fallback only
from .database import get_db
from .models import Devotee, PaymentOrder, Receipt, SevaBooking, SevaMaster, User, utcnow, generate_wad_id
from .schemas import LookupIn, PaymentIn, VerifyPayment
from .identity import normalize, phone_normalize, scan_person
from .payment_environment import payment_configuration, payment_credentials
from .security import optional_user
from .routes_admin import settings

router=APIRouter(prefix='/api',tags=['payments & receipts'])

@router.get('/payments/config')
def public_payment_config():
    config=payment_configuration()
    config['demoCheckoutEnabled']=demo_enabled()
    return config

def demo_enabled() -> bool:
    return (os.getenv('APP_ENV','development').strip().lower()=='development' and
            os.getenv('RAZORPAY_MODE','test').strip().lower()=='test' and
            os.getenv('ENABLE_DEMO_CHECKOUT','0').strip()=='1')

def razorpay_get(payment_id:str)->dict:
    _mode,key,secret=payment_credentials()
    try:
        with httpx.Client(timeout=12) as client:
            response=client.get('https://api.razorpay.com/v1/payments/'+payment_id,auth=(key,secret))
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError,ValueError):
        raise HTTPException(502,'Payment provider verification unavailable; retry receipt verification later')

def receipt_view(order:PaymentOrder,receipt:Receipt,db:Session|None=None):
    items=(order.details or {}).get('seva_items')
    if items is None:
        items=[{'id':s,'name':CATALOG[s]['name'],'price':CATALOG[s]['price'],'timing':CATALOG[s].get('timing')}
               for s in (order.seva_ids or []) if s in CATALOG]
    mode=order.gateway_mode
    is_demo=mode=='demo'
    customer_id = None
    if db and order.devotee_id:
        devotee = db.get(Devotee, order.devotee_id)
        if devotee:
            customer_id = devotee.devotee_code
    if not customer_id:
        customer_id = (order.details or {}).get('customerId') or (order.details or {}).get('devoteeCode')
    if not customer_id:
        digits = ''.join(c for c in (order.phone or '') if c.isdigit())
        customer_id = f"WAD{digits[-7:]}" if len(digits) >= 7 else generate_wad_id()

    address = (order.details or {}).get('address', '')
    return {'id':receipt.receipt_no,'receiptNo':receipt.receipt_no,'customerId':customer_id,
            'devoteeCode':customer_id,'type':order.purpose,'address':address,
            'createdAt':receipt.issued_at.isoformat(),'devoteeName':order.name,'phone':order.phone,
            'email':order.email or '', 'gotra':(order.details or {}).get('gotra',''),
            'nakshatra':(order.details or {}).get('nakshatra',''),
            'preferredDate':(order.details or {}).get('preferredDate',''),
            'attendanceMode':(order.details or {}).get('attendanceMode','in-person'),
            'items':items if order.purpose=='seva' else None,
            'total':order.amount_paise//100,'status':'DEMO ONLY — NO PAYMENT' if is_demo else 'Confirmed',
            'isTest':mode!='live','isDemo':is_demo,'paymentEnvironment':mode,
            'paymentReference':order.gateway_payment_id or '',
            'paymentMode':('LOCAL DEMO — NOT PAID' if is_demo else
                           ('Razorpay TEST (no real money)' if mode!='live' else 'Online Payment (UPI/Card)'))}

def validate_and_prepare(db:Session,data:PaymentIn,user:User | None):
    if data.purpose not in {'seva','donation'}: raise HTTPException(422,'Invalid payment purpose')
    site=settings(db)
    if data.purpose=='seva' and not site['booking_enabled']: raise HTTPException(403,'Seva booking is temporarily disabled')
    if data.purpose=='donation' and not site['donations_enabled']: raise HTTPException(403,'Donations are temporarily disabled')
    if data.purpose=='seva' and (not user or user.role!='devotee'):
        raise HTTPException(401,'Sign in or create a devotee account before booking a seva')
    incoming=data.devotee if data.purpose=='seva' else data.donor
    if not incoming or not incoming.get('name') or not incoming.get('phone'):
        raise HTTPException(422,'Name and phone are required')
    phone=phone_normalize(incoming['phone'])
    name=str(incoming['name']).strip()[:200]
    if not name: raise HTTPException(422,'Name required')
    if data.purpose=='seva':
        if not data.sevaIds or len(data.sevaIds)>40 or len(set(data.sevaIds))!=len(data.sevaIds):
            raise HTTPException(422,'Select between one and 40 distinct sevas')
        chosen={x.id:x for x in db.scalars(select(SevaMaster).where(SevaMaster.id.in_(data.sevaIds),SevaMaster.active.is_(True)))}
        if len(chosen)!=len(data.sevaIds): raise HTTPException(422,'Unknown or inactive seva; refresh the catalogue')
        snapshot=[{'id':i,'name':chosen[i].name,'price':chosen[i].price,'timing':chosen[i].timing} for i in data.sevaIds]
        amount=sum(x['price'] for x in snapshot)
        details={k:str(incoming.get(k,''))[:200] for k in ('gotra','nakshatra','preferredDate','attendanceMode','address')}
        details['seva_items']=snapshot
        if data.amount!=amount: raise HTTPException(409,'Seva prices have changed; please refresh before paying')
    else:
        if data.sevaIds: raise HTTPException(422,'Donations cannot include seva items')
        snapshot=[];amount=data.amount
        details={'address':str(incoming.get('address',''))[:200]} if incoming else {}
    if not 1<=amount<=2000000: raise HTTPException(422,'Amount outside configured limits')
    order=PaymentOrder(purpose=data.purpose,user_id=user.id if user else None,name=name,phone=phone,
                       email=str(incoming.get('email','')).strip().lower()[:254] or None,
                       amount_paise=amount*100,seva_ids=list(data.sevaIds) if data.purpose=='seva' else [],details=details)
    return order,snapshot

def save_booking(db:Session,order:PaymentOrder,snapshot:list,user:User|None,status:str='awaiting_payment'):
    if order.purpose!='seva': return None
    booking=SevaBooking(order_id=order.id,user_id=user.id if user else None,
                        devotee_id=user.devotee_id if user else None,items_snapshot=snapshot,
                        amount_paise=order.amount_paise,preferred_date=(order.details or {}).get('preferredDate'),status=status)
    db.add(booking)
    return booking

def finalize_booking(db:Session,order:PaymentOrder,status='confirmed'):
    booking=db.scalar(select(SevaBooking).where(SevaBooking.order_id==order.id))
    if booking:
        booking.status=status
        booking.confirmed_at=utcnow()
        booking.devotee_id=order.devotee_id

def capture_verified_payment(db:Session,order_id:str,payment_id:str):
    order=db.scalar(select(PaymentOrder).where(PaymentOrder.gateway_order_id==order_id).with_for_update())
    if not order: raise HTTPException(404,'Order not found')
    mode,_key,_secret=payment_credentials()
    if order.gateway_mode!=mode: raise HTTPException(409,'Gateway mode changed since order creation')
    existing=db.scalar(select(Receipt).where(Receipt.order_id==order.id))
    if existing:
        if order.gateway_payment_id!=payment_id: raise HTTPException(409,'Order already paid with another payment ID')
        return receipt_view(order,existing,db=db)
    payment=razorpay_get(payment_id)
    if (payment.get('id')!=payment_id or payment.get('order_id')!=order_id or
        payment.get('status')!='captured' or payment.get('currency')!='INR' or
        int(payment.get('amount',-1))!=order.amount_paise):
        raise HTTPException(409,'Gateway has not confirmed captured payment of the expected amount')
    order.status='paid';order.gateway_payment_id=payment_id;order.paid_at=utcnow()
    linked=db.get(User,order.user_id) if order.user_id else None
    if linked and linked.devotee_id:
        order.devotee_id=linked.devotee_id
    else:
        first,*rest=order.name.strip().split(' ',1)
        person=Devotee(first_name=first,last_name=rest[0] if rest else '',normalized_name=normalize(order.name),
                       phone=order.phone,email=order.email)
        db.add(person);db.flush();scan_person(db,person);order.devotee_id=person.id
    finalize_booking(db,order)
    receipt=Receipt(order_id=order.id,receipt_no=generate_wad_id())
    db.add(receipt);db.flush()
    result=receipt_view(order,receipt,db=db)
    db.commit()
    return result

@router.post('/payments/orders',status_code=201)
def create_order(data:PaymentIn,db:Session=Depends(get_db),user:User|None=Depends(optional_user)):
    mode,key,secret=payment_credentials()
    order,snapshot=validate_and_prepare(db,data,user)
    order.gateway_mode=mode
    db.add(order);db.flush()
    save_booking(db,order,snapshot,user)
    try:
        with httpx.Client(timeout=12) as client:
            response=client.post('https://api.razorpay.com/v1/orders',auth=(key,secret),
                json={'amount':order.amount_paise,'currency':'INR','receipt':order.id,'payment_capture':1})
            response.raise_for_status();gateway=response.json()
        order.gateway_order_id=gateway['id']
        db.commit()
    except (httpx.HTTPError,ValueError,KeyError):
        db.rollback()
        raise HTTPException(502,'Payment provider order creation failed; no receipt issued')
    return {'order_id':order.id,'razorpay_order_id':order.gateway_order_id,'key_id':key,
            'amount_paise':order.amount_paise,'currency':'INR','name':order.name,'phone':order.phone,
            'email':order.email,'paymentMode':mode}

@router.post('/payments/demo-checkout',status_code=201)
def demo_checkout(data:PaymentIn,db:Session=Depends(get_db),user:User|None=Depends(optional_user)):
    """No Razorpay call, no captured payment; NEVER a confirmed financial receipt."""
    if not demo_enabled(): raise HTTPException(404,'Local demo checkout is disabled')
    order,snapshot=validate_and_prepare(db,data,user)
    order.gateway_mode='demo';order.status='demo'
    db.add(order);db.flush()
    if user and user.devotee_id:
        order.devotee_id=user.devotee_id
    else:
        first,*rest=order.name.strip().split(' ',1)
        person=Devotee(first_name=first,last_name=rest[0] if rest else '',normalized_name=normalize(order.name),
                       phone=order.phone,email=order.email)
        db.add(person);db.flush();order.devotee_id=person.id
    save_booking(db,order,snapshot,user,status='demo')
    receipt=Receipt(order_id=order.id,receipt_no=generate_wad_id())
    db.add(receipt);db.flush()
    result=receipt_view(order,receipt,db=db)
    db.commit()
    return {'ok':True,'receipt':result}

@router.post('/payments/verify')
def verify_payment(data:VerifyPayment,db:Session=Depends(get_db)):
    mode,key,secret=payment_credentials()
    order=db.get(PaymentOrder,data.order_id)
    if not order or order.gateway_order_id!=data.razorpay_order_id: raise HTTPException(404,'Order not found')
    if order.gateway_mode!=mode: raise HTTPException(409,'Payment mode changed since order creation')
    digest=hmac.new(secret.encode(),f'{data.razorpay_order_id}|{data.razorpay_payment_id}'.encode(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest,data.razorpay_signature): raise HTTPException(400,'Invalid payment signature')
    return {'ok':True,'receipt':capture_verified_payment(db,data.razorpay_order_id,data.razorpay_payment_id)}

@router.post('/payments/webhook')
async def webhook(request:Request,x_razorpay_signature:str=Header(default=''),db:Session=Depends(get_db)):
    secret=os.getenv('RAZORPAY_WEBHOOK_SECRET','')
    if not secret: raise HTTPException(503,'Webhook not configured')
    raw=await request.body()
    digest=hmac.new(secret.encode(),raw,hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest,x_razorpay_signature): raise HTTPException(401,'Invalid webhook signature')
    import json
    try: event=json.loads(raw)
    except ValueError: raise HTTPException(400,'Invalid webhook body')
    if event.get('event')=='payment.captured':
        payment=event.get('payload',{}).get('payment',{}).get('entity',{})
        if payment.get('id') and payment.get('order_id'):
            capture_verified_payment(db,payment['order_id'],payment['id'])
    return {'ok':True}

@router.post('/receipts/lookup')
def lookup(data:LookupIn,db:Session=Depends(get_db)):
    if len(data.receipt_no.strip())<8: raise HTTPException(422,'Enter full receipt number')
    normalized=phone_normalize(data.phone)
    result=db.execute(select(Receipt,PaymentOrder).join(PaymentOrder,PaymentOrder.id==Receipt.order_id)
                      .where(Receipt.receipt_no==data.receipt_no.strip().upper(),PaymentOrder.phone==normalized)).first()
    if not result: raise HTTPException(404,'No matching receipt')
    return receipt_view(*reversed(result),db=db)
