# Local PostgreSQL 18 / pgAdmin / React / FastAPI — complete test guide (v4)

**Applies to an already-cloned GitHub project and a PostgreSQL 18 server that is already connected in pgAdmin.** Do not run `git init` or recreate the database. This guide uses the dedicated database `ganeshotsav_dev` with user `ganesh_dev`, as created in the earlier setup. If your role name or port is different, change only those values in your private `.env`. Neither pgAdmin nor this ZIP has access to the database on your laptop; migrations must run **on that laptop**.

## 1. What v4 updates

* One React `frontend/` and one Python `backend/`; no frontend source at repository root.
* `backend/.env.example` defaults to `127.0.0.1:5432/ganeshotsav_dev`; the password and JWT secret must be provided by each developer.
* Alembic migration `0001_initial` creates all **18 application tables**; migration `0002_payment_mode` adds the `payment_orders.gateway_mode` column. `alembic_version` is the additional bookkeeping table, so **19 user-visible tables** under `public` is expected when there are no unrelated tables.
* `python -m app.verify_database` checks the 18 table names, every model column, declared foreign keys and current Alembic revision on the actual PostgreSQL connection. This script is **read-only**.
* `python -m app.postgres_smoke --username admin` exercises FastAPI endpoints and verifies committed data in PostgreSQL, using synthetic **QA-only** people, a fictional house, consent evidence labelled as synthetic, simulated GPS, duplicate review, family mapping and visit log. It does not use fake card payments or issue receipts.
* `.github/workflows/ci.yml` includes a PostgreSQL 18 service job that runs migration + the same actual-DB smoke test in ephemeral CI.

## 2. Windows developer (PowerShell) — from your existing GitHub project root

Create the backend environment and install dependencies once (Python 3.11):

```powershell
py -3.11 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
backend/.venv/Scripts/python.exe -m pip check
```

If an existing `.venv` already works, skip the first command. Then create `backend/.env` **only if missing**:

```powershell
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
notepad backend/.env
```

Change the following lines to your own **local** credentials. Do not put quotes around values unless required by the dotenv parser; URL-encode special characters in your password.

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://ganesh_dev:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
JWT_SECRET=YOUR_RANDOM_SECRET_LONGER_THAN_32_CHARACTERS
CORS_ORIGINS=http://localhost:5173
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Generate a local JWT secret if needed:

```powershell
backend/.venv/Scripts/python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Now migrate and verify **from the `backend` directory** (Alembic config lives there):

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.assert_local_target
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m app.verify_database
```

Expected: `0002_payment_mode`, 18/18 application tables. It is safe to repeat `alembic upgrade head`; don't run `alembic downgrade` or `Base.metadata.drop_all()` against your dev database. For a one-command setup from the **project root** use `powershell -ExecutionPolicy Bypass -File .\scripts\setup-postgres18.ps1`; this setup helper will **not overwrite `.env`** or migrate any database other than `ganeshotsav_dev` on localhost.

Create the local super admin **once** (skip if it already exists):

```powershell
.\.venv\Scripts\python.exe -m app.seed_admin --username admin
```

The command prompts for a new password of at least 12 characters. Then run your app:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

In a **second PowerShell terminal**, from repo root:

```powershell
cd frontend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run build
npm run dev
```

Open `http://localhost:5173`, Swagger at `http://localhost:8000/docs`, and health at `http://localhost:8000/api/health`. `frontend/.env` should include `VITE_API_URL=http://localhost:8000`. To run unit tests **without touching PostgreSQL**:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

**Test actual PostgreSQL persistence:** In another terminal, with backend configured and the super admin seeded:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.postgres_smoke --username admin
```

This prompts for the admin password. You can run it with the API server running or stopped; it calls FastAPI in-process, but **commits to your actual local PostgreSQL**. It creates synthetic rows that remain to inspect in pgAdmin. Do not use this command on a database containing real private data; use a dedicated development/test DB.

## 3. macOS developer — from existing cloned project root

PostgreSQL 18 can be local (e.g. Homebrew) with the same schema. Each developer needs their own `.env` for their local DB. Python 3.11 and Node.js 22 are recommended:

```bash
python3.11 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
backend/.venv/bin/python -m pip check
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
# Edit the credentials and JWT_SECRET in backend/.env
cd backend
.venv/bin/python -m app.assert_local_target
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.verify_database
.venv/bin/python -m app.seed_admin --username admin  # only once
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

In a **second terminal**:

```bash
cd frontend
if [ ! -f .env ]; then cp .env.example .env; fi
npm ci
npm run build
npm run dev
```

In another terminal under `backend/`:

```bash
.venv/bin/python -m pytest -q
.venv/bin/python -m app.postgres_smoke --username admin
```

From repo root, the one-command equivalent for migrations is `bash scripts/setup-postgres18.sh` after reviewing `.env`.

## 4. Verify the tables and test records in pgAdmin 4

1. Connect to your existing local PostgreSQL 18 server.
2. Expand **Servers → [your server] → Databases → ganeshotsav_dev → Schemas → public → Tables**.
3. Right-click **Tables → Refresh** after running Alembic.
4. Open **Query Tool** in `ganeshotsav_dev` and run `scripts/pgadmin_verify_postgres18.sql` (read-only).
5. Confirm `alembic_version.version_num = 0002_payment_mode`, 18 application tables, `payment_orders.gateway_mode`, and synthetic `QA...` rows after smoke.

The 18 application tables are:

| Purpose | Tables |
|---|---|
| Staff | `app_users` |
| Individual identity | `devotees` |
| Family | `families`, `family_members`, `family_consent_audit` |
| Address source of truth | `address_master`, `devotee_addresses`, `family_addresses` |
| Controlled deduplication | `dedup_rules`, `duplicate_candidates`, `duplicate_decisions`, `merge_audit` |
| Sevadar GPS and visits | `sevadars`, `sevadar_locations`, `visit_assignments`, `visit_logs` |
| Razorpay test orders and verified receipts | `payment_orders`, `receipts` |

## 5. Browser-to-PostgreSQL UAT: perform these steps in the UI

1. On **Staff Operations**, sign in with admin credentials. Register two different devotees who share a phone: they must keep **different** `DEV-...` IDs. Register the same name and phone again: confirm it appears under **Duplicate Review**; do not auto-merge family members.
2. Create a family with a `FAM-...` ID, link both confirmed relatives and create an address with the exact flat/unit number. Re-enter that address; the **existing** Address ID should be reused. A different flat in the same building must **not** reuse it.
3. Link the family to its home address. For real visits, acquire and record **actual consent** and use **verified location evidence**. Synthetic test consent/coordinates must never be treated as genuine.
4. Log in as an active sevadar, explicitly consent to GPS sharing, allow browser geolocation, use the nearby-household view and save a visit assignment/outcome. The search uses a straight-line radius; it does not itself calculate a drivable road route. The browser navigation link can open an external mapping app.
5. Open the Donation page. With Razorpay **Test Mode keys only**, simulate a payment through Razorpay's official test checkout; confirm that captured test payments create `TEST-RCP-...` in `receipts` and `payment_orders`, and a failed/pending/cancelled payment creates **no** receipt. Without sandbox credentials, checkout intentionally returns HTTP 503; there is no local bypass to fabricate a receipt. Webhook delivery from Razorpay to localhost needs a public HTTPS test endpoint or tunnel; browser-based payment verification can be tested locally.
6. Inspect those same records in pgAdmin, then run `python -m app.verify_database` again to confirm migrations remain up to date.

## 6. Troubleshooting

| Error | Check |
|---|---|
| Connection refused / timeout | PostgreSQL 18 service is running; port 5432 is listening; `.env` host is 127.0.0.1 |
| `password authentication failed` | Username/password from `ganesh_dev`, and percent-encode reserved password characters in URL |
| `permission denied for schema public` | Database owner/CREATE privileges of `ganesh_dev`; use authorized pgAdmin admin to grant correct rights rather than running as `postgres` for the app |
| `relation ... does not exist` | API points at the **same** database as Alembic; rerun `python -m alembic upgrade head` |
| `ModuleNotFoundError` | Run from `backend/` with `.venv` Python, and install `requirements-dev.txt` |
| `No module named psycopg` | Dependencies were not installed in the venv; `python -m pip install -r requirements-dev.txt` |
| CORS / failed-to-fetch | Backend on port 8000 and `CORS_ORIGINS=http://localhost:5173`; frontend `VITE_API_URL=http://localhost:8000` |
| Backend HTTP 503 when paying | Expected until genuine Razorpay Test Mode API keys are provided |
| Nearby returns no households | Explicit GPS sharing, accuracy <= 100 m, verified house coordinates, consent and zone match; current GPS within selected radius |
| Same address yields different IDs | Compare unit/flat number, building/street/locality, city/state/pincode; exact canonical key is intentionally conservative |
| `alembic revision not found` | Ensure your existing working branch contains both migration files and not an unrelated migration history |

**Privacy / scope:** Never publish actual devotee addresses, GPS, PANs, gateway keys or customer data to GitHub. QA rows use synthetic names, addresses and coordinates, and are only intended for the dedicated local development database. No real payment is possible in the QA smoke routine.
