#!/usr/bin/env bash
# Run: bash backend/setup.sh  (from repository root)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
PYTHON_BIN="${PYTHON:-python3.11}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "ERROR: $PYTHON_BIN not found; install Python 3.11 or export PYTHON=/path/to/python3.11" >&2
  exit 1
fi
if [[ ! -x .venv/bin/python ]]; then
  "$PYTHON_BIN" -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pip check
if [[ ! -e .env ]]; then
  cp .env.example .env
  echo 'Created backend/.env. Set DATABASE_URL and JWT_SECRET before migrations.'
else
  echo 'Keeping existing backend/.env unchanged.'
fi
cat <<'EOF'
SUCCESS: Backend virtual environment and dependencies are ready.
After configuring backend/.env, from backend/ run:
  .venv/bin/python -m app.assert_local_target
  .venv/bin/python -m alembic upgrade head
  .venv/bin/python -m app.verify_database
  .venv/bin/python -m uvicorn app.main:app --reload --port 8000
EOF
