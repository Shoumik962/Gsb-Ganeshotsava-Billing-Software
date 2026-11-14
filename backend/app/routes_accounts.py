"""Verified devotee onboarding, address review, self-managed household profile."""
import re
import os
from pathlib import Path
from sqlalchemy.engine import make_url
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .models import (Address, Devotee, DevoteeAddress, Family, FamilyAddress, FamilyMember,
                     FamilyLinkRequest, PaymentOrder, Receipt, SevaBooking, User, VerificationChallenge, utcnow)
from .identity import normalize, phone_normalize, scan_person
from .address_matching import address_matches, choose_address
from .verification import send_code, verify_code
from .security import current_user, hash_password, verify_password
from .throttle import check_limit

router=APIRouter(prefix='/api',tags=['devotee account'])

class AddressInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    unit:str=Field(min_length=1,max_length=150)
    building:str=Field(default='',max_length=150)
    street:str=Field(min_length=2,max_length=200)
    locality:str=Field(min_length=2,max_length=150)
    city:str=Field(min_length=2,max_length=100)
    state:str=Field(min_length=2,max_length=100)
    pincode:str=Field(pattern=r'^\d{6}$')

class AddressCheck(BaseModel):
    address:AddressInput

class Register(BaseModel):
    model_config=ConfigDict(extra='forbid')
    username:str=Field(min_length=3,max_length=40)
    password:str=Field(min_length=12,max_length=128)
    email:str=Field(min_length=5,max_length=254)
    full_name:str=Field(min_length=3,max_length=200)
    phone:str=Field(min_length=10,max_length=20)
    gotra:str=Field(min_length=1,max_length=100)
    nakshatra:str=Field(min_length=1,max_length=100)
    address:AddressInput
    selected_address_id:str|None=None
    confirm_new_address:bool=False
    shared_phone_confirmed:bool=False
    receipt_sms_opt_in:bool=False

class VerifyForm(BaseModel):
    username:str
    password:str
    channel:str
    code:str

class ResendForm(BaseModel):
    username:str
    password:str
    channel:str

class DevVerificationForm(BaseModel):
    username: str
    password: str


def _local_dev_verification_allowed(request: Request) -> bool:
    """Explicitly opted-in on loopback with a disposable local development database only.

    Do not expose this mode via a proxy, tunnel, or on production/test-with-real-data.
    """
    if os.getenv('APP_ENV', '').strip().lower() != 'development':
        return False
    if os.getenv('ENABLE_LOCAL_DEV_VERIFICATION', '0').strip() != '1':
        return False
    if not request.client or request.client.host not in {'127.0.0.1', '::1'}:
        return False
    # Host check also discourages use through public tunnels/reverse proxies.
    if request.url.hostname not in {'localhost', '127.0.0.1', '::1'}:
        return False
    try:
        url = make_url(os.environ['DATABASE_URL'])
        if url.drivername.startswith('postgresql'):
            return url.host in {'localhost', '127.0.0.1', '::1'} and url.database == 'ganeshotsav_dev'
        # Keep SQLite allowance scoped to the ephemeral QA fixture, never arbitrary files.
        if url.drivername == 'sqlite':
            return Path(url.database or '').name.startswith('ganesh_api_tests_')
    except (ValueError, KeyError):
        return False
    return False


@router.get('/auth/local-dev-verification')
def local_dev_verification_status(request: Request):
    """Public UI capability flag; never exposes a code, password, or account details."""
    return {'enabled': _local_dev_verification_allowed(request)}


@router.post('/auth/local-dev-verify')
def local_dev_verify(data: DevVerificationForm, request: Request, db: Session = Depends(get_db)):
    """Simulated confirmation for a developer's local, disposable account only.

    Real contact ownership is NOT proven by this path. Production always rejects it.
    """
    if not _local_dev_verification_allowed(request):
        raise HTTPException(404, 'Not available')
    check_limit(db, request, 'local_dev_verify', 12, 3600)
    user = verified_user(db, data.username, data.password)
    now = utcnow()
    for challenge in db.scalars(select(VerificationChallenge).where(
            VerificationChallenge.user_id == user.id,
            VerificationChallenge.consumed_at.is_(None))).all():
        challenge.consumed_at = now
    user.email_verified = True
    user.phone_verified = True
    db.commit()
    return {'email_verified': True, 'phone_verified': True,
            'development_only': True,
            'message': 'LOCAL QA ONLY: simulated verification; real email/SMS ownership was not established.'}


class ProfileCompletion(BaseModel):
    gotra:str=Field(min_length=1,max_length=100)
    nakshatra:str=Field(min_length=1,max_length=100)
    date_of_birth:date|None=None
    receipt_sms_opt_in:bool=False
    confirm_residence:bool=True
    request_family_link:bool=False

def verified_user(db:Session,username:str,password:str)->User:
    user=db.scalar(select(User).where(User.username==username.strip().lower()))
    if not user or not user.active or user.role!='devotee' or not verify_password(password,user.password_hash):
        raise HTTPException(401,'Invalid credentials')
    return user

@router.post('/addresses/matches')
def check_address(data:AddressCheck,request:Request,db:Session=Depends(get_db)):
    check_limit(db,request,'address_lookup',40,60)
    # Only near-identical full-unit addresses are returned; no occupant/family information.
    return {'matches':address_matches(db,data.address,90),'threshold':90,
            'message':'A matching address does not prove that residents belong to the same family.'}

@router.post('/auth/register',status_code=201)
def register(data:Register,request:Request,db:Session=Depends(get_db)):
    check_limit(db,request,'signup',12,3600)
    username=data.username.strip().lower()
    email=data.email.strip().lower()
    if not re.fullmatch(r'[a-z0-9_.-]{3,40}',username):raise HTTPException(422,'Invalid username')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):raise HTTPException(422,'Valid email required')
    if db.scalar(select(User.id).where(User.username==username)):raise HTTPException(409,'Username already exists; sign in')
    if db.scalar(select(User.id).where(User.email==email)):raise HTTPException(409,'Email already registered; sign in instead')
    phone=phone_normalize(data.phone)
    previous=db.scalar(select(User.id).join(Devotee,User.devotee_id==Devotee.id).where(Devotee.phone==phone,User.role=='devotee'))
    if previous and not data.shared_phone_confirmed:
        raise HTTPException(409,'Phone is already used by an account. Sign in or explicitly confirm a shared family phone.')
    try:
        addr, reused=choose_address(db,data.address,data.selected_address_id,data.confirm_new_address)
    except ValueError as exc:
        raise HTTPException(422,str(exc))
    if addr is None:
        raise HTTPException(409,{'code':'address_match_requires_confirmation','matches':reused,
                                 'message':'Please confirm the matching full-unit address or choose a different address.'})
    parts=data.full_name.strip().split(' ',1)
    person=Devotee(first_name=parts[0],last_name=parts[1] if len(parts)>1 else '',
                   normalized_name=normalize(data.full_name),phone=phone,email=email,
                   gotra=data.gotra.strip(),nakshatra=data.nakshatra.strip())
    db.add(person);db.flush()
    matches=scan_person(db,person)
    db.add(DevoteeAddress(devotee_id=person.id,address_id=addr.id,address_type='home',is_current=True))
    user=User(username=username,email=email,full_name=data.full_name.strip(),devotee_id=person.id,
              password_hash=hash_password(data.password),role='devotee',email_verified=False,
              phone_verified=False,receipt_sms_opt_in=data.receipt_sms_opt_in)
    db.add(user);db.commit()
    # Provider failures leave an unverified account, never an automatically trusted login.
    delivery_errors=[]
    for channel in ('phone','email'):
        try:send_code(db,user,channel)
        except HTTPException as exc:delivery_errors.append(f'{channel}: {exc.detail}')
    return {'username':user.username,'devotee_code':person.devotee_code,
            'duplicate_review_required':bool(matches),'email_verified':False,'phone_verified':False,
            'address_reused':bool(reused),'verification_delivery_errors':delivery_errors,
            'message':'Account created. Enter the SMS and email codes before signing in.'}

@router.post('/auth/verify')
def verify(data:VerifyForm,request:Request,db:Session=Depends(get_db)):
    check_limit(db,request,'verify',40,60)
    user=verified_user(db,data.username,data.password)
    return verify_code(db,user,data.channel,data.code)

@router.post('/auth/resend')
def resend(data:ResendForm,request:Request,db:Session=Depends(get_db)):
    check_limit(db,request,'resend',12,3600)
    user=verified_user(db,data.username,data.password)
    return send_code(db,user,data.channel)

def own_family(db:Session,person_id:str):
    member=db.scalar(select(FamilyMember).where(FamilyMember.devotee_id==person_id,FamilyMember.end_at.is_(None)))
    return db.get(Family,member.family_id) if member else None

@router.get('/account/me')
def account(user:User=Depends(current_user),db:Session=Depends(get_db)):
    person=db.get(Devotee,user.devotee_id) if user.devotee_id else None
    family=own_family(db,person.id) if person else None
    addr=db.scalar(select(Address).join(DevoteeAddress,DevoteeAddress.address_id==Address.id).where(
        DevoteeAddress.devotee_id==person.id,DevoteeAddress.is_current.is_(True))) if person else None
    pending=db.scalar(select(FamilyLinkRequest.id).where(FamilyLinkRequest.devotee_id==person.id,FamilyLinkRequest.status=='pending')) if person else None
    return {'id':user.id,'username':user.username,'role':user.role,'full_name':user.full_name,'email':user.email,
            'email_verified':user.email_verified,'phone_verified':user.phone_verified,
            'profile_completed':bool(user.profile_completed_at),'receipt_sms_opt_in':user.receipt_sms_opt_in,
            'devotee_code':person.devotee_code if person else None,'phone':person.phone if person else None,
            'gotra':person.gotra if person else None,'nakshatra':person.nakshatra if person else None,
            'address':{'unit':addr.unit,'building':addr.building,'street':addr.street,'locality':addr.locality,
                       'city':addr.city,'state':addr.state,'pincode':addr.pincode} if addr else None,
            'family_id':family.family_code if family else None,'family_link_pending':bool(pending),
            'family_link_available':bool(person and user.profile_completed_at and not family and not pending)}

@router.post('/account/complete-profile')
def complete_profile(data:ProfileCompletion,db:Session=Depends(get_db),user:User=Depends(current_user)):
    if user.role!='devotee' or not user.devotee_id:raise HTTPException(403,'Devotee account required')
    if not (user.email_verified and user.phone_verified):raise HTTPException(403,'Verify email and phone first')
    if not data.confirm_residence:raise HTTPException(422,'Please confirm your current address')
    person=db.get(Devotee,user.devotee_id)
    link=db.scalar(select(DevoteeAddress).where(DevoteeAddress.devotee_id==person.id,DevoteeAddress.is_current.is_(True)))
    if not link:raise HTTPException(422,'A full current address is mandatory')
    person.gotra=data.gotra.strip();person.nakshatra=data.nakshatra.strip();person.date_of_birth=data.date_of_birth
    user.receipt_sms_opt_in=data.receipt_sms_opt_in
    if not user.profile_completed_at:user.profile_completed_at=utcnow()
    family=own_family(db,person.id)
    pending=False
    linked=[]
    if not family:
        # Check exact AND 90%-similar addresses; unresolved cases are never
        # auto-granted a new Family ID (or another household voucher).
        active_address=db.get(Address,link.address_id)
        near_ids={link.address_id}|{r['address_id'] for r in address_matches(db,active_address,90)}
        linked=db.scalars(select(FamilyAddress).where(FamilyAddress.address_id.in_(near_ids),FamilyAddress.current.is_(True))).all()
        if linked:
            if not data.request_family_link:
                db.commit()
                return {'profile_completed':True,'family_id':None,'family_link_pending':False,
                        'family_link_available':True,
                        'message':'Similar occupied address found. Choose to request review of family membership.'}
            for household in linked:
                exists=db.scalar(select(FamilyLinkRequest).where(FamilyLinkRequest.devotee_id==person.id,
                                                                  FamilyLinkRequest.family_id==household.family_id))
                if not exists:db.add(FamilyLinkRequest(devotee_id=person.id,family_id=household.family_id,address_id=link.address_id))
            pending=True
        else:
            family=Family(name=f'{person.last_name or person.first_name} Household',head_devotee_id=person.id,contact_phone=person.phone)
            db.add(family);db.flush()
            db.add(FamilyAddress(family_id=family.id,address_id=link.address_id,primary=True,current=True))
            db.add(FamilyMember(family_id=family.id,devotee_id=person.id,relationship='head',is_primary_contact=True))
    db.commit()
    return {'profile_completed':True,'family_id':family.family_code if family else None,
            'family_link_pending':pending,'family_link_available':False,'message':('Your household link requires staff approval.' if pending else 'Profile completed.')}

@router.get('/account/bookings')
def my_bookings(user:User=Depends(current_user),db:Session=Depends(get_db)):
    rows=db.execute(select(SevaBooking,PaymentOrder).join(PaymentOrder,SevaBooking.order_id==PaymentOrder.id)
                    .where(SevaBooking.user_id==user.id).order_by(SevaBooking.created_at.desc()).limit(100)).all()
    return [{'id':b.id,'amount':b.amount_paise//100,'status':b.status,'items':b.items_snapshot,
             'preferred_date':b.preferred_date,'receipt_no':(db.scalar(select(Receipt).where(Receipt.order_id==order.id)) or Receipt(receipt_no='')).receipt_no,
             'created_at':b.created_at.isoformat()} for b,order in rows]


@router.get('/account/receipts/{receipt_no}')
def private_receipt(receipt_no:str,user:User=Depends(current_user),db:Session=Depends(get_db)):
    """Private receipt document data, accessible only by the owning account."""
    from .routes_payments import receipt_view
    row=db.execute(select(Receipt,PaymentOrder).join(PaymentOrder,Receipt.order_id==PaymentOrder.id)
        .where(Receipt.receipt_no==receipt_no.strip().upper(),PaymentOrder.user_id==user.id)).first()
    if not row:raise HTTPException(404,'Receipt not found in your account')
    receipt,order=row
    return receipt_view(order,receipt,db=db)
