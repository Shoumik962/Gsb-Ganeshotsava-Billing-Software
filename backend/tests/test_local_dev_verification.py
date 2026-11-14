"""The simulated verification action is opt-in, isolated to loopback, and never production."""
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, VerificationChallenge
from test_verified_onboarding import data


def test_local_dev_bypass_is_explicit_and_production_safe(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.delenv('ENABLE_LOCAL_DEV_VERIFICATION', raising=False)
    # Signup creates an unverified user even when the external providers aren't configured.
    registration = client.post('/api/auth/register', json=data('dev_qatest', '9100006789'))
    assert registration.status_code == 201, registration.text
    creds = {'username': 'dev_qatest', 'password': 'SecureExamplePass123!'}
    with TestClient(app, base_url='http://localhost:8000', client=('127.0.0.1', 4444)) as local:
        assert local.get('/api/auth/local-dev-verification').json()['enabled'] is False
        assert local.post('/api/auth/local-dev-verify', json=creds).status_code == 404
        assert local.post('/api/auth/login', json=creds).status_code == 403

        monkeypatch.setenv('ENABLE_LOCAL_DEV_VERIFICATION', '1')
        assert local.get('/api/auth/local-dev-verification').json()['enabled'] is True
        assert local.post('/api/auth/local-dev-verify', json={**creds, 'password': 'invalid'}).status_code == 401
        assert local.post('/api/auth/login', json=creds).status_code == 403
        verified = local.post('/api/auth/local-dev-verify', json=creds)
        assert verified.status_code == 200, verified.text
        assert verified.json()['development_only'] is True
        assert verified.json()['phone_verified'] and verified.json()['email_verified']
        assert local.post('/api/auth/login', json=creds).status_code == 200

    with SessionLocal() as db:
        user = db.query(User).filter(User.username == creds['username']).one()
        assert user.phone_verified and user.email_verified
        assert all(c.consumed_at is not None for c in db.query(VerificationChallenge).filter(
            VerificationChallenge.user_id == user.id))

    # The same process MUST refuse the action in production, even if someone left the flag enabled.
    monkeypatch.setenv('APP_ENV', 'production')
    with TestClient(app, base_url='http://localhost:8000', client=('127.0.0.1', 4444)) as local:
        assert local.get('/api/auth/local-dev-verification').json()['enabled'] is False
        assert local.post('/api/auth/local-dev-verify', json=creds).status_code == 404


def test_local_dev_bypass_rejects_nonlocal_clients_and_database(client, monkeypatch):
    monkeypatch.setenv('APP_ENV', 'development')
    monkeypatch.setenv('ENABLE_LOCAL_DEV_VERIFICATION', '1')
    with TestClient(app, base_url='http://localhost:8000', client=('192.0.2.55', 1111)) as remote:
        assert remote.get('/api/auth/local-dev-verification').json()['enabled'] is False
    with TestClient(app, base_url='http://example.test:8000', client=('127.0.0.1', 1111)) as remote_host:
        assert remote_host.get('/api/auth/local-dev-verification').json()['enabled'] is False
    monkeypatch.setenv('DATABASE_URL', 'postgresql+psycopg://user:secret@127.0.0.1:5432/production')
    with TestClient(app, base_url='http://localhost:8000', client=('127.0.0.1', 1111)) as wrong_db:
        assert wrong_db.get('/api/auth/local-dev-verification').json()['enabled'] is False
