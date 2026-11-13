"""Create 3 fictional DEV-only devotee accounts; output passwords once, do not commit output."""
import argparse
import os
import secrets
from uuid import uuid4
from sqlalchemy import select
from .database import SessionLocal
from .models import User, Devotee
from .security import hash_password
from .identity import normalize

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--count',type=int,default=3)
    args=parser.parse_args()
    if os.getenv('APP_ENV','development').strip().lower()!='development':
        raise SystemExit('DEV-only fixture seed; refusing non-development environment')
    if not 1<=args.count<=20: raise SystemExit('Count must be 1..20')
    with SessionLocal() as db:
        for i in range(1,args.count+1):
            suffix=uuid4().hex[:6]
            username=f'qa_devotee_{i}_{suffix}'
            email=f'{username}@example.invalid'
            phone=f'900{str(i).zfill(7)}' # fictional fixture number
            name=f'QA Devotee {i}'
            person=Devotee(first_name='QA',last_name=f'Devotee {i}',normalized_name=normalize(name),phone=phone,email=email)
            db.add(person);db.flush()
            password='Qa!'+secrets.token_urlsafe(15)
            db.add(User(username=username,password_hash=hash_password(password),role='devotee',
                        email=email,full_name=name,devotee_id=person.id))
            print(f'{username} | {password} | {email}')
        db.commit()
    print('Fixture accounts created. Save credentials locally if needed; do not commit or screenshot them.')
if __name__=='__main__':main()
