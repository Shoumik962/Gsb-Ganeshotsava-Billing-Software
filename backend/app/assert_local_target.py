"""Fail closed before applying local developer migrations to a wrong database."""
import os
from .database import engine


def main():
    url = engine.url
    if url.get_backend_name() != 'postgresql' or url.database != 'ganeshotsav_dev':
        raise SystemExit('STOP: setup helper only migrates local PostgreSQL database ganeshotsav_dev.')
    if (url.host or '').lower() not in {'127.0.0.1','localhost','::1'}:
        raise SystemExit('STOP: setup helper only targets PostgreSQL on localhost.')
    if os.getenv('APP_ENV', '').lower() not in {'development','dev','local'}:
        raise SystemExit('STOP: APP_ENV must be development, dev or local.')
    if not url.password or 'YOUR_DB_PASSWORD' in url.password or 'REPLACE_' in url.password:
        raise SystemExit('STOP: Set your actual local PostgreSQL password in backend/.env.')
    secret = os.getenv('JWT_SECRET','')
    if len(secret) < 32 or secret.startswith('REPLACE_WITH') or secret.startswith('YOUR_') or secret.startswith('CHOOSE_'):
        raise SystemExit('STOP: Replace the sample JWT_SECRET in backend/.env with a secure random secret.')
    print(f'Safe local target: {url.database} on {url.host}:{url.port or 5432}.')

if __name__ == '__main__':
    main()
