"""Explicit, synthetic API->PostgreSQL integration smoke test (not a payment simulator).

Run only in the local ganeshotsav_dev database after migrations/admin creation:
    python -m app.postgres_smoke --username admin
Prompts for the admin password, writes synthetic QA rows and prints their IDs.
Never run against actual devotee data or production.
"""
import argparse
import getpass
import os
import secrets
import sys
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from .database import SessionLocal, engine
from .models import Address, Devotee, DuplicateCandidate, FamilyMember, MergeAudit, VisitLog
from .verify_database import inspect_schema


def ensure_safe_database():
    db = engine.url
    if db.get_backend_name() != 'postgresql' or db.database != 'ganeshotsav_dev':
        raise RuntimeError('QA script writes records ONLY to the dedicated PostgreSQL database ganeshotsav_dev.')
    if (db.host or '').lower() not in {'localhost', '127.0.0.1', '::1'}:
        raise RuntimeError('QA script requires a local PostgreSQL connection (127.0.0.1 or localhost).')
    if os.getenv('APP_ENV', '').lower() not in {'development', 'dev', 'local'}:
        raise RuntimeError('QA script runs only when APP_ENV=development (or dev/local).')
    if os.getenv('RAZORPAY_MODE', 'test').lower() != 'test':
        raise RuntimeError('QA script refuses non-test payment mode.')
    schema = inspect_schema()
    if not schema['ready']:
        raise RuntimeError('Schema is incomplete. Run python -m alembic upgrade head and app.verify_database first.')
    return schema


def require_response(response, expected_status=200, label='API'):
    if response.status_code != expected_status:
        raise RuntimeError(f'{label}: HTTP {response.status_code}, expected {expected_status}: {response.text[:700]}')
    return response.json()


def run(username, password):
    ensure_safe_database()
    # A randomized suffix avoids colliding with another developer's QA runs.
    marker = uuid4().hex[:10].upper()
    unique_phone = '9' + str(secrets.randbelow(1_000_000_000)).zfill(9)
    from .main import app
    with TestClient(app) as client:
        login = require_response(client.post('/api/auth/login', json={'username': username, 'password': password}), label='admin login')
        if login['role'] != 'super_admin':
            raise RuntimeError('QA script requires a super_admin login to create a test sevadar.')
        admin_headers = {'Authorization': 'Bearer ' + login['access_token']}

        def admin_post(path, data, status=201):
            return require_response(client.post(path, headers=admin_headers, json=data), status, path)
        def admin_get(path):
            return require_response(client.get(path, headers=admin_headers), label=path)

        parent = admin_post('/api/devotees', {'first_name': 'QAAnaya', 'last_name': marker, 'phone': unique_phone})
        sibling = admin_post('/api/devotees', {'first_name': 'QAVivek', 'last_name': marker, 'phone': unique_phone})
        clone = admin_post('/api/devotees', {'first_name': 'QAAnaya', 'last_name': marker, 'phone': unique_phone})
        if len({parent['devotee_code'], sibling['devotee_code'], clone['devotee_code']}) != 3:
            raise RuntimeError('Identity invariants failed: distinct devotees must get unique IDs.')
        if clone['potential_duplicate_count'] < 1:
            raise RuntimeError('No duplicate candidate detected for the identical QA identity.')

        family = admin_post('/api/families', {
            'name': 'SYNTHETIC QA FAMILY ' + marker, 'head_devotee_id': parent['id'],
            'contact_phone': unique_phone,
            'visit_consent': False,
        })
        admin_post(f"/api/families/{family['id']}/members", {'devotee_id': sibling['id'], 'relationship': 'sibling'})
        # Never mix these rows with real household addresses or represent them as real site verification.
        synthetic_address = {
            'unit': 'QA-' + marker, 'building': 'SYNTHETIC TEST ADDRESS - NOT A RESIDENCE',
            'street': 'Demo Only', 'locality': 'Wadala', 'city': 'Mumbai',
            'state': 'Maharashtra', 'pincode': '400031'
        }
        address = admin_post('/api/addresses', synthetic_address)
        reused = admin_post('/api/addresses', synthetic_address)
        if not reused.get('reused') or reused['id'] != address['id']:
            raise RuntimeError('Address source-of-truth reuse failed.')
        admin_post(f"/api/families/{family['id']}/addresses", {'address_id': address['id']}, 200)
        admin_post(f"/api/devotees/{parent['id']}/addresses", {'address_id': address['id']}, 200)
        admin_post('/api/families/' + family['id'] + '/visit-consent', {
            'consent': True, 'source': 'synthetic_qa_only', 'evidence_ref': 'QA_FIXTURE_' + marker
        }, 200)
        require_response(client.patch('/api/addresses/' + address['id'] + '/verify', headers=admin_headers,
                                     json={'latitude': 19.0179, 'longitude': 72.8568,
                                           'accuracy_m': 20, 'source': 'synthetic_qa_only'}), label='address verification')
        worker_password = secrets.token_urlsafe(24)
        worker_username = 'qa_sevadar_' + marker.lower()
        admin_post('/api/admin/users', {'username': worker_username, 'password': worker_password,
                                        'role': 'sevadar', 'zone': 'Wadala'})
        login_worker = require_response(client.post('/api/auth/login',json={
            'username': worker_username, 'password': worker_password}), label='sevadar login')
        worker_headers = {'Authorization': 'Bearer ' + login_worker['access_token']}
        require_response(client.post('/api/sevadars/me/location', headers=worker_headers,
                                     json={'latitude': 19.0179, 'longitude': 72.8568,
                                           'accuracy_m': 15, 'consent': True}), label='GPS sharing')
        nearby = require_response(client.get('/api/sevadars/me/nearby?radius_km=3', headers=worker_headers), label='nearby mapping')
        if not any(row['family_id'] == family['id'] for row in nearby):
            raise RuntimeError('Consented synthetic family was not returned by nearby mapping.')
        assignment = require_response(client.post('/api/sevadars/me/assignments', headers=worker_headers,
                                                  json={'family_id': family['id'], 'address_id': address['id'],
                                                        'purpose': 'Synthetic QA visit'}), 201, 'visit assignment')
        visit = require_response(client.post('/api/sevadars/me/assignments/' + assignment['id'] + '/visits',
                                             headers=worker_headers, json={'outcome': 'completed',
                                                                           'notes': 'SYNTHETIC QA ONLY'}), 201, 'visit log')
        require_response(client.delete('/api/sevadars/me/location', headers=worker_headers), label='GPS deletion')
        no_gps = client.get('/api/sevadars/me/nearby', headers=worker_headers)
        if no_gps.status_code != 409:
            raise RuntimeError('GPS privacy check failed: discovery must be denied after consent/location deletion.')

        candidates = admin_get('/api/dedup/candidates')
        pair = next((c for c in candidates if {c['devotee_a']['id'], c['devotee_b']['id']}
                     == {parent['id'], clone['id']}), None)
        if not pair:
            raise RuntimeError('Identical QA identities did not appear in the duplicate review queue.')
        decision = admin_post(f"/api/dedup/candidates/{pair['id']}/decision", {
            'decision': 'merge', 'survivor_devotee_id': parent['id'], 'confirmed_same_person': True,
            'reason': 'Confirmed same synthetic QA fixture; demonstrates controlled merging only.'
        }, 200)
        if decision['status'] != 'merged':
            raise RuntimeError('Controlled merge did not complete.')

        # Check the actual configured PostgreSQL database, not a temporary in-memory test database.
        with SessionLocal() as db:
            if db.get(Devotee, clone['id']).status != 'merged':
                raise RuntimeError('Merged status not persisted in PostgreSQL.')
            if not db.scalar(select(FamilyMember).where(FamilyMember.family_id == family['id'],
                                                         FamilyMember.devotee_id == sibling['id'])):
                raise RuntimeError('Family relationship not persisted in PostgreSQL.')
            if not db.get(Address, address['id']).verified:
                raise RuntimeError('Synthetic address verification not persisted.')
            if not db.get(VisitLog, visit['visit_id']):
                raise RuntimeError('Visit log not persisted in PostgreSQL.')
            if not db.scalar(select(MergeAudit).where(MergeAudit.absorbed_id == clone['id'])):
                raise RuntimeError('Merge audit not persisted in PostgreSQL.')

    print('PASS: Full FastAPI -> PostgreSQL synthetic integration checks completed.')
    print('The following SYNTHETIC QA records remain in your local database for pgAdmin inspection:')
    print('  Marker:               ', marker)
    print('  Parent Devotee ID:    ', parent['devotee_code'])
    print('  Second Devotee ID:    ', sibling['devotee_code'])
    print('  Merged Duplicate ID:  ', clone['devotee_code'])
    print('  Family ID:            ', family['family_code'])
    print('  Address ID:           ', address['id'])
    print('  Sevadar username:     ', worker_username)
    print('  Visit assignment ID:  ', assignment['id'])
    print('  Payment test: NOT executed. Use Razorpay Test Mode checkout in the browser with test keys.')
    print('  Privacy: GPS deleted; all consent/geo data is synthetic test-only, not a real household.')


def main():
    parser = argparse.ArgumentParser(description='Write and inspect unique synthetic API/PostgreSQL QA records')
    parser.add_argument('--username', required=True, help='Existing local super admin username')
    parser.add_argument('--password-env', help='Read password from named env var (intended for ephemeral CI only)')
    args = parser.parse_args()
    password = os.getenv(args.password_env, '') if args.password_env else getpass.getpass('Local super admin password: ')
    if not password:
        raise SystemExit('Admin password required. No data was written.')
    try:
        run(args.username, password)
    except Exception as exc:
        print(f'FAILED: {exc}', file=sys.stderr)
        print('If some steps succeeded, earlier synthetic QA rows may remain. Do NOT reset/drop your database.', file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
