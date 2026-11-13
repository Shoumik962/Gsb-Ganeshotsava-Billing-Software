**New in v5:** See `../docs/V5_ADMIN_SEVA_USER_BOOKING_E2E.md` for migration `0003_admin_portal`, 27 source sevas, the QA fixture, website admin, account signup and demo checkout.

# Ganeshotsav FastAPI Backend

Independent deployable API. Set up PostgreSQL and `backend/.env` from `.env.example`; install `requirements.txt` in a virtualenv. Run `python -m alembic upgrade head`, then `python -m app.seed_admin --username admin`, then `python -m uvicorn app.main:app --reload --port 8000`.

API reference: `/docs` after starting. All app code in `app/`, Alembic migrations in `alembic/`, tests in `tests/`. `GET /api/health` checks the server process (not a DB health assertion).

Sample config values and deployment constraints are described in the repository-root README and `docs/API_AND_HANDOVER.md` in the full-stack ZIP. No passwords are shipped. Razorpay credentials are optional for running the identity/field APIs; the payment endpoint refuses transactions with HTTP 503 if not configured.

The backend is PostgreSQL-first. Local tests use SQLite; run real PostgreSQL staging tests before production.

## Cross-platform setup & test payment receipts

From the repository root, use `scripts/setup-backend.ps1` (Windows PowerShell) or `scripts/setup-backend.sh` (macOS), both installing the **same** `requirements-dev.txt` and `requirements.txt`. Python 3.11 recommended. Use your own local `.env` and PostgreSQL. See `../docs/DEVELOPER_SETUP_AND_RAZORPAY_TESTING.md` for the full commands.

Set `APP_ENV=development` and `RAZORPAY_MODE=test` with Razorpay **Test Mode** keys (`rzp_test_...`). The checkout simulates payments without real money. A captured **test** payment returns a printable `TEST-RCP-...` sample marked invalid for donation, tax or seva collection. No real-payment bypass is provided.

For GitHub setup and CI, see `../docs/GITHUB_SETUP.md` in the full-stack ZIP.
