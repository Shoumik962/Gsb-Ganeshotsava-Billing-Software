#!/usr/bin/env bash
# Run from repo root, macOS/Linux. Does not overwrite .env or delete data.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
PY="$BACKEND/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  echo 'No virtual environment found. Creating Python venv...'
  PYTHON_CMD="python3.11"
  command -v python3.11 >/dev/null 2>&1 || PYTHON_CMD="python3"
  "$PYTHON_CMD" -m venv "$BACKEND/.venv"
fi
"$PY" -m pip install -r "$BACKEND/requirements-dev.txt"
"$PY" -m pip check
if [[ ! -f "$BACKEND/.env" ]]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo 'Created backend/.env. Edit DATABASE_URL and JWT_SECRET, then run this script again.'
  exit 0
fi
(
  cd "$BACKEND"
  "$PY" -m app.assert_local_target
  "$PY" -m alembic upgrade head
  "$PY" -m app.verify_database
)
echo 'Database ready. Seed admin (once): cd backend && .venv/bin/python -m app.seed_admin --username admin'
echo 'Synthetic PostgreSQL API smoke: cd backend && .venv/bin/python -m app.postgres_smoke --username admin'
