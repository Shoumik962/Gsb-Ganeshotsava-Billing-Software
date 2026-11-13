"""Public account creation + private account history. Sign-up role cannot be chosen by caller."""
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .models import Devotee, PaymentOrder, Receipt, SevaBooking, User
from .identity import normalize, phone_normalize, scan_person
from .security import current_user, hash_password

router=APIRouter(prefix='/api',tags=['devotee account'])

class Register(BaseModel):
    model_config=ConfigDict(extra='forbid')
    username: str = Field(min_length=3,max_length=40)
    password: str = Field(min_length=12,max_length=128)
    email: str = Field(min_length=5,max_length=254)
    full_name: str = Field(min_length=3,max_length=200)
    phone: str = Field(min_length=10,max_length=20)

@router.post('/auth/register',status_code=201)
def register(data:Register,db:Session=Depends(get_db)):
    username=data.username.strip().lower()
    email=data.email.strip().lower()
    if not re.fullmatch(r'[a-z0-9_.-]{3,40}',username): raise HTTPException(422,'Username accepts letters, digits, _, - and .')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): raise HTTPException(422,'Valid email required')
    if db.scalar(select(User.id).where(User.username==username)): raise HTTPException(409,'Username already exists')
    if db.scalar(select(User.id).where(User.email==email)): raise HTTPException(409,'Email already registered')
    phone=phone_normalize(data.phone)
    parts=data.full_name.strip().split(' ',1)
    person=Devotee(first_name=parts[0],last_name=parts[1] if len(parts)>1 else '',
                   normalized_name=normalize(data.full_name),phone=phone,email=email)
    db.add(person);db.flush()
    matches=scan_person(db,person)  # Potential duplicate ONLY; no automatic person/family merge.
    user=User(username=username,email=email,full_name=data.full_name.strip(),devotee_id=person.id,
              password_hash=hash_password(data.password),role='devotee',email_verified=False)
    db.add(user);db.commit()
    return {'username':user.username,'devotee_code':person.devotee_code,'duplicate_review_required':bool(matches),
            'email_verified':False,'message':'Account created. Email verification has not been enabled for this development build.'}

@router.get('/account/me')
def account(user:User=Depends(current_user),db:Session=Depends(get_db)):
    person=db.get(Devotee,user.devotee_id) if user.devotee_id else None
    return {'id':user.id,'username':user.username,'role':user.role,'full_name':user.full_name,'email':user.email,
            'email_verified':user.email_verified,'devotee_code':person.devotee_code if person else None,'phone':person.phone if person else None}

@router.get('/account/bookings')
def my_bookings(user:User=Depends(current_user),db:Session=Depends(get_db)):
    rows=db.execute(select(SevaBooking,PaymentOrder).join(PaymentOrder,SevaBooking.order_id==PaymentOrder.id)
                    .where(SevaBooking.user_id==user.id).order_by(SevaBooking.created_at.desc()).limit(100)).all()
    return [{'id':b.id,'amount':b.amount_paise//100,'status':b.status,'items':b.items_snapshot,
             'preferred_date':b.preferred_date,'receipt_no':(db.scalar(select(Receipt).where(Receipt.order_id==order.id)) or Receipt(receipt_no='')).receipt_no,
             'created_at':b.created_at.isoformat()} for b,order in rows]
