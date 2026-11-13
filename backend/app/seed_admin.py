"""Run: python -m app.seed_admin --username admin (prompts for password)."""
import argparse
import getpass
import os
from sqlalchemy import select
from .database import SessionLocal
from .models import User
from .security import hash_password

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--username',required=True)
    parser.add_argument('--password-env', help='Read password from this environment variable (ephemeral CI only)')
    opts=parser.parse_args()
    password=(os.getenv(opts.password_env,'') if opts.password_env else
              getpass.getpass('New super admin password (min 12 characters): '))
    if len(password)<12: raise SystemExit('Password too short')
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.username==opts.username.lower())):
            raise SystemExit('User already exists; no overwrite permitted')
        db.add(User(username=opts.username.lower(),password_hash=hash_password(password),role='super_admin'))
        db.commit()
        print('Super admin created')
if __name__=='__main__': main()
