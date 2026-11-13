"""Idempotently import source ZIP's 27 original sevas into PostgreSQL; optional DEV dummy.

From backend/: python -m app.seed_sevas --original --demo
No existing records are overwritten, including prices edited in admin portal.
"""
import argparse
import json
import os
from pathlib import Path
from sqlalchemy import select
from .database import SessionLocal
from .models import SevaMaster

DEMO_ID='demo-ganesh-archana-qa'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--original',action='store_true',help='Import all sevas supplied in the original source ZIP')
    parser.add_argument('--demo',action='store_true',help='Insert ₹101 explicitly marked QA seva (development only)')
    args=parser.parse_args()
    if not (args.original or args.demo): parser.error('Specify --original, --demo, or both')
    records=[]
    if args.original:
        records=json.loads((Path(__file__).parent/'sevas.json').read_text(encoding='utf-8'))
    if args.demo:
        if os.getenv('APP_ENV','development').lower()!='development':
            raise SystemExit('Refusing demo seva outside local development')
        records.append({'id':DEMO_ID,'name':'TEST ONLY - Ganesh Archana (QA)','price':101,
                        'category':'offerings','timing':'Demo only','note':'NOT a real puja or payment; QA purpose only'})
    created=0;skipped=0
    with SessionLocal() as db:
        for item in records:
            if db.get(SevaMaster,item['id']): skipped+=1;continue
            db.add(SevaMaster(id=item['id'],name=item['name'],price=item['price'],category=item['category'],
                              timing=item.get('timing'),note=item.get('note'),
                              except_ekadashi=bool(item.get('exceptEkadashi')),active=True))
            created+=1
        db.commit()
    print(f'Seva import finished: {created} new, {skipped} already present.')

if __name__=='__main__':main()
