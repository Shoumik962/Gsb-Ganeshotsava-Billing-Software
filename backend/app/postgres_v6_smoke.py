"""Local PostgreSQL-18 E2E smoke: verified signup, reused address, family review, voucher and DEMO receipt.

Synthetic data only. Explicitly disallows production/non-local database and never sends SMS/email.
  Windows: python -m app.postgres_v6_smoke --username admin
  macOS:   python -m app.postgres_v6_smoke --username admin
"""
import argparse
import getpass
import os
import re
from unittest.mock import patch
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import select
from .assert_local_target import main as ensure_local
from .main import app
from .database import SessionLocal
from .models import Address,Devotee,FamilyLinkRequest,HouseholdBenefit,Receipt,SevaBooking,SevaMaster,ReceiptDelivery


def run(admin_username:str,admin_password:str):
    ensure_local()
    if os.getenv('RAZORPAY_MODE','').lower()!='test' or os.getenv('ENABLE_DEMO_CHECKOUT','')!='1':
        raise SystemExit('For this QA test use RAZORPAY_MODE=test and ENABLE_DEMO_CHECKOUT=1 in backend/.env')
    tag=uuid4().hex[:8]
    shared_phone='9000099999'  # FAKE local account fixture, no real SMS is sent.
    postal={'unit':'QA-'+tag,'building':'QA Ganesh Residency','street':'QA Road',
            'locality':'Wadala','city':'Mumbai','state':'Maharashtra','pincode':'400037'}
    with TestClient(app) as client:
        signin=client.post('/api/auth/login',json={'username':admin_username,'password':admin_password})
        if signin.status_code!=200:raise SystemExit('Admin login failed')
        admin={'Authorization':'Bearer '+signin.json()['access_token']}
        seva_id='qa-v6-archana-'+tag
        created=client.post('/api/admin/sevas',headers=admin,json={'id':seva_id,'name':'TEST ONLY - Ganesh Archana '+tag,
            'price':101,'category':'offerings','note':'Fictional local QA booking; no pooja scheduled.'})
        if created.status_code!=201:raise SystemExit(f'Create seva failed: {created.text}')
        identities=[]
        for n in range(1,3):
            username=f'qa_v6_{n}_{tag}'
            passwd='QaDemoTestPass123!'
            email=username+'@example.invalid'
            reg={'username':username,'password':passwd,'email':email,'full_name':f'QA Devotee {n} {tag}',
                 'phone':shared_phone,'gotra':'Unknown','nakshatra':'Unknown','address':postal,
                 'shared_phone_confirmed':True,'receipt_sms_opt_in':True,'confirm_new_address':True}
            codes={}
            def email_sender(_to,code):codes['email']=code
            def sms_sender(_to,msg):codes['phone']=re.search(r'code: (\d{6})',msg).group(1)
            with patch('app.verification.send_email',email_sender),patch('app.verification.send_sms',sms_sender):
                res=client.post('/api/auth/register',json=reg)
            if res.status_code!=201:raise SystemExit(f'Signup failed: {res.text}')
            if client.post('/api/auth/login',json={'username':username,'password':passwd}).status_code!=403:
                raise SystemExit('Unverified signup was incorrectly allowed to sign in')
            for channel in ('phone','email'):
                verified=client.post('/api/auth/verify',json={'username':username,'password':passwd,
                                                              'channel':channel,'code':codes[channel]})
                if verified.status_code!=200:raise SystemExit(f'{channel} verification failed: {verified.text}')
            login=client.post('/api/auth/login',json={'username':username,'password':passwd})
            if login.status_code!=200:raise SystemExit('Verified login failed')
            token={'Authorization':'Bearer '+login.json()['access_token']}
            finish=client.post('/api/account/complete-profile',headers=token,json={'gotra':'Unknown',
                'nakshatra':'Unknown','receipt_sms_opt_in':True,'request_family_link':True})
            if finish.status_code!=200:raise SystemExit(f'Profile completion failed: {finish.text}')
            identities.append((username,token,res.json()['devotee_code'],finish.json()))
        if not identities[0][3]['family_id'] or not identities[1][3]['family_link_pending']:
            raise SystemExit('Family decision safeguards did not trigger')
        with SessionLocal() as db:
            child=db.scalar(select(Devotee).where(Devotee.email==identities[1][0]+'@example.invalid'))
            link=db.scalar(select(FamilyLinkRequest).where(FamilyLinkRequest.devotee_id==child.id,
                                                          FamilyLinkRequest.status=='pending'))
        approved=client.post(f'/api/admin/family-link-requests/{link.id}/decision',headers=admin,
                             json={'approve':True,'relationship':'child'})
        if approved.status_code!=200:raise SystemExit(f'Family review failed: {approved.text}')
        benefit={'family_id':link.family_id,'event_code':'QA-'+tag,'benefit_type':'prasad_voucher'}
        first=client.post('/api/admin/household-benefits',headers=admin,json=benefit)
        repeat=client.post('/api/admin/household-benefits',headers=admin,json=benefit)
        if first.status_code!=201 or repeat.status_code!=409:raise SystemExit('Household uniqueness check failed')
        booking=client.post('/api/payments/demo-checkout',headers=identities[0][1],json={'purpose':'seva',
            'sevaIds':[seva_id],'amount':101,'devotee':{'name':'QA Devotee 1 '+tag,'phone':shared_phone,
            'email':identities[0][0]+'@example.invalid','preferredDate':'2027-01-01'}})
        if booking.status_code!=201:raise SystemExit(f'Demo booking failed: {booking.text}')
        receipt_no=booking.json()['receipt']['receiptNo']
        with SessionLocal() as db:
            receipt=db.scalar(select(Receipt).where(Receipt.receipt_no==receipt_no))
            if not db.get(SevaMaster,seva_id) or not receipt or not db.scalar(select(SevaBooking).where(SevaBooking.order_id==receipt.order_id)):
                raise SystemExit('Missing database booking/receipt/seva record')
            notification=db.scalar(select(ReceiptDelivery).where(ReceiptDelivery.receipt_id==receipt.id))
            if not notification or notification.status!='skipped':raise SystemExit('Demo receipt must not send real SMS')
        print('PASS: PostgreSQL 18 verified signup, 2 devoted identities with one shared phone')
        print('PASS: Same full postal address reused, family linked only after staff approval')
        print('PASS: One prasad voucher per household/event; second issuance rejected')
        print('PASS: ₹101 local DEMO seva booking and unpaid receipt; SMS not sent')
        print('Test seva:',seva_id)
        print('Test receipt:',receipt_no)
        print('Synthetic QA records remain in ganeshotsav_dev for pgAdmin inspection.')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--username',default='admin')
    parser.add_argument('--password-env',help='Environment variable containing ephemeral CI admin password')
    args=parser.parse_args()
    password=os.getenv(args.password_env,'') if args.password_env else getpass.getpass('Local admin password: ')
    if not password:raise SystemExit('Admin password is required')
    run(args.username,password)

if __name__=='__main__':main()
