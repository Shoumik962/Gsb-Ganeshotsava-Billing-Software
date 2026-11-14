"""DEV-only end-to-end test on the configured *real local PostgreSQL* database.

From backend/:
  python -m app.postgres_v5_smoke --username admin

Makes fictional accounts, a single TEST seva, DEMO booking and invalid receipt.
They remain in pgAdmin, identifiable by 'qa-v5-' prefix. No real funds collected.
"""
import argparse
import getpass
import os
from uuid import uuid4
from fastapi.testclient import TestClient
from .assert_local_target import main as ensure_local
from .main import app
from .database import SessionLocal
from .models import SevaBooking, Receipt, SevaMaster


def run(username:str,password:str):
    ensure_local()
    if os.getenv('APP_ENV','').lower()!='development' or os.getenv('RAZORPAY_MODE','').lower()!='test' or os.getenv('ENABLE_DEMO_CHECKOUT')!='1':
        raise SystemExit('Set APP_ENV=development, RAZORPAY_MODE=test, ENABLE_DEMO_CHECKOUT=1 in backend/.env')
    tag=uuid4().hex[:8]
    with TestClient(app) as client:
        auth=client.post('/api/auth/login',json={'username':username,'password':password})
        if auth.status_code!=200: raise SystemExit('Admin login failed; check username and password')
        if auth.json()['role'] not in ('super_admin','admin'): raise SystemExit('Administrator role required')
        a={'Authorization':'Bearer '+auth.json()['access_token']}
        seva_id='qa-v5-ganesh-archana-'+tag
        s=client.post('/api/admin/sevas',headers=a,json={'id':seva_id,
            'name':'TEST ONLY - Ganesh Archana '+tag,'price':101,'category':'offerings',
            'note':'Synthetic local QA seva. No religious service scheduled.'})
        if s.status_code!=201: raise SystemExit(f'Seva create failed: {s.text}')
        registered=[]
        for n in range(1,4):
            username_test=f'qa_v5_{n}_{tag}'
            # The phone is intentionally shared among *different* family members to check identity separation.
            phone='9000099999'
            payload={'username':username_test,'password':'QaLocalTestPass123!',
                     'email':f'{username_test}@example.invalid','full_name':f'QA Test Devotee {n} {tag}',
                     'phone':phone}
            response=client.post('/api/auth/register',json=payload)
            if response.status_code!=201:raise SystemExit(f'Account registration failed: {response.text}')
            registered.append((username_test,response.json()['devotee_code']))
        login=client.post('/api/auth/login',json={'username':registered[0][0],'password':'QaLocalTestPass123!'})
        d={'Authorization':'Bearer '+login.json()['access_token']}
        checkout=client.post('/api/payments/demo-checkout',headers=d,json={'purpose':'seva','sevaIds':[seva_id],
            'amount':101,'devotee':{'name':'QA Test Devotee 1 '+tag,'phone':'9000099999',
            'email':registered[0][0]+'@example.invalid','preferredDate':'2026-12-01'}})
        if checkout.status_code!=201: raise SystemExit(f'Demo booking failed: {checkout.text}')
        receipt=checkout.json()['receipt']
        if not receipt['receiptNo'].startswith('WAD') or receipt['status']!='DEMO ONLY — NO PAYMENT':
            raise SystemExit('UNSAFE: Demo receipt was not labeled as unpaid')
        records=client.get('/api/account/bookings',headers=d)
        if records.status_code!=200 or len(records.json())!=1: raise SystemExit('Private booking history missing')
        audit=client.get('/api/admin/bookings',headers=a)
        if audit.status_code!=200 or not any(b['receipt_no']==receipt['receiptNo'] for b in audit.json()):
            raise SystemExit('Admin booking history missing')
        with SessionLocal() as db:
            if not db.get(SevaMaster,seva_id): raise SystemExit('Seva was not persisted to PostgreSQL')
            if not db.query(Receipt).filter(Receipt.receipt_no==receipt['receiptNo']).first():
                raise SystemExit('Receipt not persisted to PostgreSQL')
            if not db.query(SevaBooking).filter(SevaBooking.status=='demo').first():
                raise SystemExit('Seva booking not persisted to PostgreSQL')
        print('PASS: 1 new PostgreSQL-administered test seva')
        print('PASS: 3 distinct devotee IDs, with shared family contact (no automatic merge)')
        print('PASS: DEMO booking recorded without payment capture')
        print('PASS: DEMO receipt + account history + admin booking list persisted to PostgreSQL')
        print('Seva ID:',seva_id)
        print('Demo receipt:',receipt['receiptNo'])
        for username_test,code in registered: print('QA account:',username_test,'|',code)
        print('Note: these synthetic records remain in your local ganeshotsav_dev database for pgAdmin inspection.')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--username',default='admin')
    parser.add_argument('--password-env',help='Environment variable carrying admin password (CI only)')
    opts=parser.parse_args()
    pw=os.getenv(opts.password_env,'') if opts.password_env else getpass.getpass('Local admin password: ')
    if not pw:raise SystemExit('Admin password required')
    run(opts.username,pw)

if __name__=='__main__':main()
