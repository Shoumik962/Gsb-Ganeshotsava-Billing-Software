#!/usr/bin/env bash
# macOS (Apple Silicon/Intel) or Linux. Run from repository root:
# bash scripts/setup-backend.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"
PYTHON="${PYTHON:-python3.11}"
if [[ ! -x .venv/bin/python ]]; then
  "$PYTHON" -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pip check
printf 'Backend dependencies installed and verified in %s/backend/.venv\n' "$ROOT"
printf 'Next: cp .env.example .env; configure PostgreSQL; then .venv/bin/python -m alembic upgrade head\n'
