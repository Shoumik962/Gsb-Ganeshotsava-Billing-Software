"""Governed administrative APIs. No public write access to website, seva or users."""
from __future__ import annotations
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .database import get_db
from .models import AdminAudit, PaymentOrder, Receipt, SevaBooking, SevaMaster, User, WebsiteSetting, utcnow
from .security import require_roles

router = APIRouter(prefix='/api', tags=['admin portal & seva management'])
admin = require_roles('super_admin','admin')

DEFAULT_SITE = {
    'announcement': 'Welcome to Wadala Ganeshotsav',
    'hero_title': 'Shree Ganeshotsav Seva & Donations',
    'booking_enabled': True,
    'donations_enabled': True,
    'contact_phone': '',
}

class SevaCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str | None = Field(default=None, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$', max_length=100)
    name: str = Field(min_length=3,max_length=200)
    price: int = Field(ge=1,le=2000000)
    category: str = Field(default='offerings',pattern=r'^(major|pooja-naivedya|offerings)$')
    timing: str | None = Field(default=None,max_length=120)
    note: str | None = Field(default=None,max_length=500)
    exceptEkadashi: bool = False
    active: bool = True

class SevaPatch(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str | None = Field(default=None,min_length=3,max_length=200)
    price: int | None = Field(default=None,ge=1,le=2000000)
    category: str | None = Field(default=None,pattern=r'^(major|pooja-naivedya|offerings)$')
    timing: str | None = Field(default=None,max_length=120)
    note: str | None = Field(default=None,max_length=500)
    exceptEkadashi: bool | None = None
    active: bool | None = None

class SiteUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    announcement: str | None = Field(default=None,max_length=250)
    hero_title: str | None = Field(default=None,max_length=150)
    booking_enabled: bool | None = None
    donations_enabled: bool | None = None
    contact_phone: str | None = Field(default=None,max_length=30)

class ToggleUser(BaseModel):
    active: bool

def serialize_seva(s: SevaMaster) -> dict:
    return {'id':s.id,'name':s.name,'price':s.price,'category':s.category,'timing':s.timing,
            'note':s.note,'exceptEkadashi':s.except_ekadashi,'active':s.active}

def settings(db: Session) -> dict:
    values=dict(DEFAULT_SITE)
    for record in db.scalars(select(WebsiteSetting)):
        if record.key in values:
            values[record.key]=record.value.get('value',values[record.key])
    return values

def audit(db: Session, user: User, action: str, kind: str, key: str, before=None, after=None):
    db.add(AdminAudit(actor_id=user.id,action=action,resource_type=kind,resource_id=key,before=before,after=after))

@router.get('/site/settings')
def public_settings(db:Session=Depends(get_db)):
    return settings(db)

@router.patch('/admin/site/settings')
def change_site(payload:SiteUpdate, db:Session=Depends(get_db), user:User=Depends(admin)):
    values=payload.model_dump(exclude_unset=True)
    for key,value in values.items():
        if value is None: raise HTTPException(422,f'{key} cannot be null')
        old=db.get(WebsiteSetting,key)
        prev=old.value if old else None
        if old: old.value={'value':value};old.updated_by_id=user.id;old.updated_at=utcnow()
        else: db.add(WebsiteSetting(key=key,value={'value':value},updated_by_id=user.id))
        audit(db,user,'site_settings.update','site_settings',key,prev,{'value':value})
    db.commit()
    return settings(db)

@router.get('/sevas')
def catalog(db:Session=Depends(get_db)):
    return [serialize_seva(s) for s in db.scalars(select(SevaMaster).where(SevaMaster.active.is_(True)).order_by(SevaMaster.category,SevaMaster.name))]

@router.get('/admin/sevas')
def all_sevas(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [serialize_seva(s) for s in db.scalars(select(SevaMaster).order_by(SevaMaster.created_at.desc()))]

@router.post('/admin/sevas',status_code=201)
def add_seva(payload:SevaCreate,db:Session=Depends(get_db),user:User=Depends(admin)):
    slug=payload.id or re.sub(r'[^a-z0-9]+','-',payload.name.lower().strip()).strip('-')[:100]
    if not slug: raise HTTPException(422,'Seva ID is required')
    if db.get(SevaMaster,slug): raise HTTPException(409,'Seva ID already exists; edit it instead')
    record=SevaMaster(id=slug,name=payload.name.strip(),category=payload.category,price=payload.price,
                      timing=payload.timing,note=payload.note,except_ekadashi=payload.exceptEkadashi,
                      active=payload.active,created_by_id=user.id)
    db.add(record); db.flush()
    audit(db,user,'seva.create','seva_master',record.id,after=serialize_seva(record))
    db.commit()
    return serialize_seva(record)

@router.patch('/admin/sevas/{seva_id}')
def update_seva(seva_id:str,payload:SevaPatch,db:Session=Depends(get_db),user:User=Depends(admin)):
    record=db.get(SevaMaster,seva_id)
    if not record: raise HTTPException(404,'Seva not found')
    before=serialize_seva(record)
    mapping={'name':'name','price':'price','category':'category','timing':'timing','note':'note',
             'exceptEkadashi':'except_ekadashi','active':'active'}
    for key,value in payload.model_dump(exclude_unset=True).items():
        if value is None and key in ('name','price','category','exceptEkadashi','active'):
            raise HTTPException(422,f'{key} cannot be null')
        setattr(record,mapping[key],value.strip() if key=='name' else value)
    record.updated_at=utcnow()
    audit(db,user,'seva.update','seva_master',seva_id,before,serialize_seva(record))
    db.commit()
    return serialize_seva(record)

@router.get('/admin/users')
def list_users(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [{'id':u.id,'username':u.username,'role':u.role,'email':u.email,'full_name':u.full_name,
             'active':u.active,'email_verified':u.email_verified,'devotee_id':u.devotee_id}
            for u in db.scalars(select(User).order_by(User.created_at.desc()).limit(500))]

@router.patch('/admin/users/{user_id}/status')
def toggle_user(user_id:str,payload:ToggleUser,db:Session=Depends(get_db),user:User=Depends(require_roles('super_admin'))):
    target=db.get(User,user_id)
    if not target: raise HTTPException(404,'User not found')
    if target.id==user.id or target.role=='super_admin': raise HTTPException(403,'Cannot alter super admin accounts')
    previous={'active':target.active};target.active=payload.active
    audit(db,user,'user.status','app_users',user_id,previous,{'active':target.active})
    db.commit()
    return {'id':target.id,'active':target.active}

@router.get('/admin/bookings')
def bookings(db:Session=Depends(get_db),user:User=Depends(admin)):
    result=[]
    for booking,order in db.execute(select(SevaBooking,PaymentOrder).join(PaymentOrder,PaymentOrder.id==SevaBooking.order_id)
                                    .order_by(SevaBooking.created_at.desc()).limit(150)):
        receipt=db.scalar(select(Receipt).where(Receipt.order_id==order.id))
        result.append({'id':booking.id,'order_id':order.id,'name':order.name,'phone':order.phone,
                       'items':booking.items_snapshot,'amount':booking.amount_paise//100,'status':booking.status,
                       'gateway_mode':order.gateway_mode,'receipt_no':receipt.receipt_no if receipt else None,
                       'created_at':booking.created_at.isoformat()})
    return result

@router.get('/admin/dashboard')
def dashboard(db:Session=Depends(get_db),user:User=Depends(admin)):
    def count(cls): return db.scalar(select(func.count()).select_from(cls)) or 0
    return {'registered_users':count(User),'active_sevas':db.scalar(select(func.count()).select_from(SevaMaster).where(SevaMaster.active.is_(True))) or 0,
            'total_bookings':count(SevaBooking),'demo_bookings':db.scalar(select(func.count()).select_from(SevaBooking).where(SevaBooking.status=='demo')) or 0,
            'verified_receipts':db.scalar(select(func.count()).select_from(PaymentOrder).where(PaymentOrder.status=='paid')) or 0}

@router.get('/admin/audit')
def audit_history(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [{'id':a.id,'actor_id':a.actor_id,'action':a.action,'resource_type':a.resource_type,
             'resource_id':a.resource_id,'created_at':a.created_at.isoformat()}
            for a in db.scalars(select(AdminAudit).order_by(AdminAudit.created_at.desc()).limit(200))]
