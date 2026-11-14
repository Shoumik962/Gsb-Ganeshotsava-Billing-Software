"""Admin-reviewed family linking and one-household-one-benefit issuance."""
import re
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .database import get_db
from .models import (Address,Family,FamilyAddress,FamilyMember,FamilyLinkRequest,HouseholdBenefit,
                     Devotee,User,ReceiptDelivery,Receipt,PaymentOrder,utcnow)
from .security import require_roles,current_user
from .receipt_notifications import deliver
from .address_matching import address_matches

router=APIRouter(prefix='/api',tags=['household fulfillment & receipt notification'])
admin=require_roles('super_admin','admin')

class FamilyDecision(BaseModel):
    approve:bool
    relationship:str=Field(default='member',min_length=2,max_length=40)

class BenefitIssue(BaseModel):
    family_id:str
    event_code:str=Field(min_length=2,max_length=80)
    benefit_type:str=Field(pattern=r'^(prasad_voucher|pooja_invitation)$')

@router.get('/admin/family-link-requests')
def requests(db:Session=Depends(get_db),user:User=Depends(admin)):
    links=db.scalars(select(FamilyLinkRequest).where(FamilyLinkRequest.status=='pending').limit(100)).all()
    return [{'id':r.id,'devotee_id':r.devotee_id,'family_id':r.family_id,'address_id':r.address_id,'status':r.status} for r in links]

@router.post('/admin/family-link-requests/{request_id}/decision')
def decision(request_id:str,data:FamilyDecision,db:Session=Depends(get_db),user:User=Depends(admin)):
    link=db.get(FamilyLinkRequest,request_id)
    if not link or link.status!='pending':raise HTTPException(404,'Pending link request not found')
    if data.approve:
        # A verified person can have one current primary family only.
        if db.scalar(select(FamilyMember.id).where(FamilyMember.devotee_id==link.devotee_id,FamilyMember.end_at.is_(None))):
            raise HTTPException(409,'Devotee already has a confirmed family; review manually')
        db.add(FamilyMember(family_id=link.family_id,devotee_id=link.devotee_id,relationship=data.relationship))
    link.status='approved' if data.approve else 'rejected'
    link.reviewed_by_id=user.id;link.reviewed_at=utcnow()
    # Other candidate links to the same household are not silently approved.
    db.commit()
    return {'id':link.id,'status':link.status}

@router.post('/admin/household-benefits',status_code=201)
def issue_benefit(data:BenefitIssue,db:Session=Depends(get_db),user:User=Depends(admin)):
    if not re.fullmatch(r'[A-Za-z0-9_-]{2,80}',data.event_code):raise HTTPException(422,'Invalid event code')
    family=db.get(Family,data.family_id)
    if not family or family.status!='active':raise HTTPException(404,'Active family required')
    link=db.scalar(select(FamilyAddress).where(FamilyAddress.family_id==family.id,FamilyAddress.current.is_(True),FamilyAddress.primary.is_(True)))
    if not link:raise HTTPException(422,'Family must have a confirmed current address')
    # Database uniqueness on address + festival/event + benefit type is the final safeguard.
    household_address=db.get(Address,link.address_id)
    close={link.address_id}|{match['address_id'] for match in address_matches(db,household_address,90)}
    # Canonical anchor means slight spelling variations of one flat share one voucher quota.
    anchor=min(close)
    row=HouseholdBenefit(address_id=anchor,family_id=family.id,event_code=data.event_code.upper(),
                         benefit_type=data.benefit_type,created_by_id=user.id)
    db.add(row)
    try:db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,'This address already received the benefit for this event')
    return {'id':row.id,'voucher_code':row.voucher_code,'family_id':family.family_code,
            'event_code':row.event_code,'benefit_type':row.benefit_type}

@router.get('/admin/household-benefits')
def list_benefits(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [{'id':x.id,'address_id':x.address_id,'event_code':x.event_code,'benefit_type':x.benefit_type,
             'voucher_code':x.voucher_code} for x in db.scalars(select(HouseholdBenefit).limit(200))]

@router.get('/admin/receipt-deliveries')
def list_deliveries(db:Session=Depends(get_db),user:User=Depends(admin)):
    return [{'id':x.id,'receipt_id':x.receipt_id,'status':x.status,'attempts':x.attempts,
             'last_error':x.error} for x in db.scalars(select(ReceiptDelivery).limit(200))]

@router.post('/admin/receipt-deliveries/{delivery_id}/retry')
def retry_delivery(delivery_id:str,db:Session=Depends(get_db),user:User=Depends(admin)):
    delivery=db.get(ReceiptDelivery,delivery_id)
    if not delivery:raise HTTPException(404,'Delivery not found')
    if delivery.status!='failed':raise HTTPException(409,'Only failed delivery records may be retried')
    if delivery.attempts>=5:raise HTTPException(429,'Maximum delivery retry attempts reached')
    deliver(db,delivery.id)
    return {'id':delivery.id,'status':delivery.status,'attempts':delivery.attempts}

@router.get('/account/receipts/{receipt_no}/delivery')
def delivery_status(receipt_no:str,db:Session=Depends(get_db),user:User=Depends(current_user)):
    row=db.execute(select(ReceiptDelivery,Receipt,PaymentOrder).join(Receipt,ReceiptDelivery.receipt_id==Receipt.id)
         .join(PaymentOrder,Receipt.order_id==PaymentOrder.id)
         .where(Receipt.receipt_no==receipt_no,PaymentOrder.user_id==user.id)).first()
    if not row:raise HTTPException(404,'Receipt delivery not found')
    return {'receipt_no':receipt_no,'status':row[0].status,'attempts':row[0].attempts}
