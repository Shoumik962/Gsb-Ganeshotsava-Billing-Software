import os
from pathlib import Path
import tempfile
os.environ['DATABASE_URL'] = 'sqlite:///' + (Path(tempfile.gettempdir()) / f'ganesh_api_tests_{os.getpid()}.sqlite3').as_posix()
os.environ['JWT_SECRET'] = 'unit-test-secret-longer-than-32-characters'
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import User
from app.security import hash_password

@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(User(username='admin',password_hash=hash_password('TestPass123456'),role='super_admin'))
        db.commit()
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)

@pytest.fixture
def auth(client):
    token=client.post('/api/auth/login',json={'username':'admin','password':'TestPass123456'}).json()['access_token']
    return {'Authorization':f'Bearer {token}'}
