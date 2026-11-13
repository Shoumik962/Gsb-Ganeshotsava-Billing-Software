"""Exercises the same full API scenario using isolated SQLite; PostgreSQL tested separately in GH Actions."""
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Family, VisitLog, MergeAudit


def test_full_synthetic_qa_scenario(client, monkeypatch):
    from app import postgres_smoke
    # This unit integration test already uses a temporary SQLite database via conftest;
    # PostgreSQL guard is separately enforced by the CLI and PostgreSQL 18 CI service.
    monkeypatch.setattr(postgres_smoke, 'ensure_safe_database', lambda: {'ready': True})
    postgres_smoke.run('admin', 'TestPass123456')
    with SessionLocal() as db:
        assert db.scalars(select(Family).where(Family.name.like('SYNTHETIC QA FAMILY%'))).first()
        assert db.scalars(select(VisitLog)).first()
        assert db.scalars(select(MergeAudit)).first()
