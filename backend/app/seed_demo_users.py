"""DEV ONLY: synthetic verified devotees with a complete fictional home address.

Do not run on production databases; these accounts bypass delivery for repeatable QA.
"""
import argparse
import os
import secrets
from uuid import uuid4
from .assert_local_target import main as ensure_local
from .database import SessionLocal
from .models import User,Devotee,Address,DevoteeAddress,Family,FamilyAddress,FamilyMember,utcnow
from .identity import normalize,address_key
from .security import hash_password

class Postal:
    unit='';building='QA Residence';street='Fictional Testing Road';locality='Wadala'
    city='Mumbai';state='Maharashtra';pincode='400037'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--count',type=int,default=3);args=parser.parse_args()
    if os.getenv('APP_ENV','development').strip().lower()!='development':
        raise SystemExit('DEV-only seed; refusing non-development mode')
    ensure_local()
    if not 1<=args.count<=20:raise SystemExit('Count must be 1..20')
    with SessionLocal() as db:
        for i in range(args.count):
            suffix=uuid4().hex[:8]
            username=f'qa_devotee_{suffix}'
            email=username+'@example.invalid'
            phone=f'900{i+1:07d}'
            password='Qa!'+secrets.token_urlsafe(15)
            postal=Postal();postal.unit='QA-FLAT-'+suffix
            addr=Address(canonical_key=address_key(postal),unit=postal.unit,building=postal.building,
                         street=postal.street,locality=postal.locality,city=postal.city,state=postal.state,pincode=postal.pincode)
            db.add(addr);db.flush()
            name=f'QA Devotee {i+1}'
            devotee=Devotee(first_name='QA',last_name=f'Devotee {i+1}',normalized_name=normalize(name),
                            phone=phone,email=email,gotra='Unknown',nakshatra='Unknown')
            db.add(devotee);db.flush()
            db.add(DevoteeAddress(devotee_id=devotee.id,address_id=addr.id))
            family=Family(name=f'QA Household {suffix}',head_devotee_id=devotee.id,contact_phone=phone)
            db.add(family);db.flush()
            db.add(FamilyAddress(family_id=family.id,address_id=addr.id))
            db.add(FamilyMember(family_id=family.id,devotee_id=devotee.id,relationship='head'))
            db.add(User(username=username,email=email,full_name=name,devotee_id=devotee.id,
                        password_hash=hash_password(password),role='devotee',email_verified=True,
                        phone_verified=True,profile_completed_at=utcnow(),receipt_sms_opt_in=False))
            print(f'{username} | {password} | {email}')
        db.commit()
    print('DEV synthetic accounts created; no real SMS/verification sent. Do not commit this output.')
if __name__=='__main__':main()
