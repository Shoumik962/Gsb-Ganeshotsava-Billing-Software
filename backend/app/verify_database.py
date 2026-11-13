"""Read-only PostgreSQL migration/schema check for the Ganeshotsav application.

From backend/: python -m app.verify_database
Does not create, change, or delete a table or any records.
"""
import argparse
import json
import sys

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from . import models  # noqa: F401 -- register model metadata
from .database import Base, engine

EXPECTED_REVISION = '0003_admin_portal'
EXPECTED_TABLE_COUNT = 22


def inspect_schema():
    url = engine.url
    if url.get_backend_name() != 'postgresql':
        raise RuntimeError('DATABASE_URL must point to PostgreSQL; refusing to report SQLite as a PostgreSQL test.')
    expected = {name: set(table.columns.keys()) for name, table in Base.metadata.tables.items()}
    if len(expected) != EXPECTED_TABLE_COUNT:
        raise RuntimeError(f'Model registry changed: expected {EXPECTED_TABLE_COUNT} tables, found {len(expected)}. Rebaseline the verifier.')
    with engine.connect() as conn:
        version = str(conn.execute(text('SELECT version()')).scalar_one())
        inspector = inspect(conn)
        existing = set(inspector.get_table_names(schema='public'))
        missing = sorted(set(expected) - existing)
        missing_columns = {}
        missing_foreign_keys = {}
        for name in sorted(set(expected) & existing):
            found = {column['name'] for column in inspector.get_columns(name, schema='public')}
            diff = sorted(expected[name] - found)
            if diff:
                missing_columns[name] = diff
            # Ensure declared FK references are actually present on the DB tables.
            expected_fks = {tuple(fk.parent.name for fk in constraint.elements)
                            for constraint in Base.metadata.tables[name].foreign_key_constraints}
            found_fks = {tuple(fk.get('constrained_columns') or ())
                         for fk in inspector.get_foreign_keys(name, schema='public')}
            diff_fk = sorted(expected_fks - found_fks)
            if diff_fk:
                missing_foreign_keys[name] = [list(columns) for columns in diff_fk]
        revision = None
        if 'alembic_version' in existing:
            rows = conn.execute(text('SELECT version_num FROM alembic_version')).scalars().all()
            revision = ','.join(rows)
        result = {
            'database': url.database,
            'host': url.host,
            'port': url.port or 5432,
            'server_version': version.split(' on ')[0],
            'alembic_revision': revision,
            'expected_revision': EXPECTED_REVISION,
            'expected_application_tables': EXPECTED_TABLE_COUNT,
            'present_application_tables': len(set(expected) & existing),
            'missing_tables': missing,
            'missing_columns': missing_columns,
            'missing_foreign_keys': missing_foreign_keys,
            'tables': sorted(expected),
        }
        result['ready'] = (
            not missing and not missing_columns and not missing_foreign_keys
            and revision == EXPECTED_REVISION
        )
        return result


def main():
    parser = argparse.ArgumentParser(description='Verify all 22 PostgreSQL application tables and Alembic revision; read-only')
    parser.add_argument('--json', action='store_true', help='Machine-readable result')
    args = parser.parse_args()
    try:
        result = inspect_schema()
    except (SQLAlchemyError, RuntimeError) as exc:
        print(f'FAILED: Cannot verify PostgreSQL: {exc}', file=sys.stderr)
        print('Check PostgreSQL service, DATABASE_URL, account privileges and .env; then run alembic upgrade head.', file=sys.stderr)
        raise SystemExit(1)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Connected to {result['server_version']} | {result['database']} on {result['host']}:{result['port']}")
        print(f"Alembic: {result['alembic_revision']} (expected {result['expected_revision']})")
        print(f"Application tables: {result['present_application_tables']}/{result['expected_application_tables']}")
        for name in result['tables']:
            print(f"  {'MISSING' if name in result['missing_tables'] else 'OK':7} {name}")
        if result['missing_columns']:
            print('Missing columns:', result['missing_columns'])
        if result['missing_foreign_keys']:
            print('Missing foreign keys:', result['missing_foreign_keys'])
        print('PASS: All expected application tables/columns/foreign keys exist.' if result['ready'] else
              'FAIL: Database is not up to date. Run: python -m alembic upgrade head')
    raise SystemExit(0 if result['ready'] else 1)


if __name__ == '__main__':
    main()
