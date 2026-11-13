#!/usr/bin/env bash
# macOS (Apple Silicon/Intel) or Linux. Run from repository root:
# bash scripts/setup-backend.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"
PYTHON="${PYTHON:-}"
if [[ -z "$PYTHON" ]]; then
  if command -v python3.11 >/dev/null 2>&1; then
    PYTHON="python3.11"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON="python3"
  else
    echo "ERROR: python3 not found; please install Python 3.11 or later" >&2
    exit 1
  fi
fi
if [[ ! -x .venv/bin/python ]]; then
  "$PYTHON" -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pip check
printf 'Backend dependencies installed and verified in %s/backend/.venv\n' "$ROOT"
printf 'Next: cp .env.example .env; configure PostgreSQL; then .venv/bin/python -m alembic upgrade head\n'
