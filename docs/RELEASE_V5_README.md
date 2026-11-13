# Ganeshotsav v5 handover — admin, accounts, bookings, GitHub hygiene

## Release scope

- Admin Portal: manage seva catalogue, website notices/toggles, review bookings, list accounts and (super admin only) maintain staff accounts.
- Devotee Account: signup, login and booking history, linked to the unique Devotee ID and existing family/dedup/address workflows.
- PostgreSQL: Alembic revision `0003_admin_portal`, **22 application tables** (18 existing + 4 new). Database migrations are *not* executed simply by unzipping the release.
- Sevas: original 27 definitions in `backend/app/sevas.json`; optional separately labeled local ₹101 QA seva via `python -m app.seed_sevas --original --demo`.
- Checkout: `DEMO-RCP-` marked no-payment test checkout (development only), or verified Razorpay `TEST-RCP-` using test keys. Never interpret a demo receipt as a successful donation.
- Cross-platform: backend `requirements.txt`, `requirements-dev.txt` and Windows/macOS setup scripts; frontend Node.js 22/npm and `package-lock.json`.

## Git hygiene

The included root `.gitignore` excludes `node_modules`, `.venv`, Python caches, `dist`, `.env` secrets, generated user data, local databases, exports, backups, receipts and QA output. `scripts/check_git_staged.py` checks staged filename safety, and the GitHub Actions CI uses `--tracked` to detect suspicious committed paths. **No generated user records, actual account credentials, or receipt data are part of the release ZIP.** Reproducible QA seed **code** is intentionally retained.

In the *existing local GitHub branch* (do not run `git init`), copy files from the release or merge the smaller patch, then execute:

```cmd
REM Windows CMD from repository root
git status --short
git add .gitignore backend/ frontend/ scripts/ docs/ architecture/ .github/ README.md
python scripts\check_git_staged.py
git diff --cached --name-only
```

On macOS replace the final script invocation with `python3 scripts/check_git_staged.py`; other Git commands are the same.

`.gitignore` never removes already tracked secrets: use `git rm --cached -- path/to/file` and rotate any credentials previously shared with GitHub.

## Local end-to-end verification (before GitHub push)

From `backend/`, after setting `backend/.env` to your local PostgreSQL 18 `ganeshotsav_dev` database:

```cmd
python -m alembic upgrade head
python -m app.verify_database
python -m app.seed_sevas --original --demo
python -m pytest -q
python -m uvicorn app.main:app --reload --port 8000
```

From `frontend/` (new terminal):

```cmd
npm ci
npm run build
npm run dev
```

Open `http://localhost:5173` and test admin login, new seva, user signup, demo checkout, receipt lookup, booking history, content controls and authorized staff/GPS flows. See `docs/V5_ADMIN_SEVA_USER_BOOKING_E2E.md` for the full checklist. `python -m app.postgres_v5_smoke --username admin` inserts synthetic QA data **into your local test database**, not your repository; never run it on production.

## Verification limits

The backend pytest suite passed **21/21 tests** in this build environment. `npm run build` is **not verified** because the local `node_modules` installation is incomplete (missing TypeScript type packages). PostgreSQL 18 on the user's computer and real Razorpay Test Mode require local execution and credentials. Check all of these before committing/pushing.
