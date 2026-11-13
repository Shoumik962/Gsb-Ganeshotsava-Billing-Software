# Version 5 — Admin Portal, Devotee Signup & Complete Seva QA Checkout

**Read first:** [Windows/macOS setup, PostgreSQL 18 migration, original 27 sevas, dummy seva, account creation and local demo checkout](docs/V5_ADMIN_SEVA_USER_BOOKING_E2E.md).

This is an upgrade of v4.1 with separate frontend/backend. The admin portal manages the PostgreSQL-backed seva catalogue and selected website settings; public devotees can register, sign in and book test sevas. `0003_admin_portal` adds four tables (total 22 application tables). Import 27 original seva entries and a ₹101 QA seva using `python -m app.seed_sevas --original --demo`. Local `DEMO-RCP-` receipts show NO PAYMENT and are never official receipts. Production readiness requires OTP, rate limiting, password recovery and independent verification.

---

# Wadala Ganeshotsav — Full Stack Devotee & Family Management

**React/Vite frontend + Python FastAPI backend + PostgreSQL.** Reconstructed from the uploaded `Gsb-Ganeshotsava-Billing-Software-main(2).zip`. Includes the original temple UI, a new staff operations UI, and the identity/address/field-visit database described in the shared ER blueprint.

## Delivered architecture

```text
frontend/                      React + TypeScript + Tailwind only
  src/components/              Existing site + Staff Operations + NearbyMap
  src/hooks/useCart.tsx        Live seva catalogue and cart loaded from backend
  src/lib/api.ts               Auth-independent payments + staff request client
  src/lib/bookingStore.ts      Receipt type only; no localStorage/fake receipt
  .env.example                 VITE_API_URL setting
backend/                       Standalone FastAPI service (can be deployed separately)
  app/models.py                SQLAlchemy PostgreSQL entities
  app/routes_identity.py       Devotees, families, addresses, consent, dedup
  app/routes_sevadar.py        Location, proximity, household assignment, visits
  app/routes_payments.py       Razorpay orders, verification, webhooks, receipts
  app/sevas.json               Server-owned snapshot of original 27 sevas
  alembic/versions/            Initial versioned SQL migration
  tests/                       API/invariant tests (SQLite isolated)
architecture/                  Original ER image + implementation mapping
.github/workflows/ci.yml      GitHub Actions: backend tests + frontend build
```

**Important:** `backend/` is a separate deployable service. All React/UI assets stay in `frontend/`. Pricing and receipt issuance are server-controlled, not browser-controlled.

## Windows CMD one-command backend setup (v4.1)

The Python virtual environment is intentionally **not** included in the ZIP. Run `backend\setup.cmd` from Windows CMD, or `bash backend/setup.sh` on macOS. The script creates `backend/.venv`, installs `backend/requirements-dev.txt` (which includes `requirements.txt`), runs `pip check` and copies `.env.example` only when `.env` does not exist. See [`docs/BACKEND_VENV_WINDOWS_MAC.md`](docs/BACKEND_VENV_WINDOWS_MAC.md) for migrations, PostgreSQL 18 and launch commands.

## NEW: Shared Windows + macOS virtualenv setup and free Razorpay test receipts

- Both developers use the **same** `backend/requirements.txt` and `backend/requirements-dev.txt` (recommended Python **3.11**); there are **no Windows-only or macOS-only requirement files**. No optional Uvicorn native extras and no RapidFuzz native build dependency are needed. PostgreSQL uses `psycopg[binary]` wheels.
- Windows: `powershell -ExecutionPolicy Bypass -File .\scripts\setup-backend.ps1`
- macOS: `bash scripts/setup-backend.sh`
- Both setup scripts create their own `backend/.venv`, install dev + runtime requirements and run `pip check`. Do not commit `.venv` or `.env`.
- **Razorpay Test Mode** with a `rzp_test_...` key is a free simulation with **no real money transferred**. After an actual Razorpay sandbox capture and server verification, the UI issues a `TEST-RCP-...` receipt visibly marked **TEST / NOT VALID** on screen, in print and when shared.
- The backend rejects live keys in developer/staging mode and rejects test keys in production mode; migration `0002_payment_mode` preserves mode per payment order. See **[`docs/DEVELOPER_SETUP_AND_RAZORPAY_TESTING.md`](docs/DEVELOPER_SETUP_AND_RAZORPAY_TESTING.md)** for complete commands and test scenarios.

## Quick start — existing PostgreSQL (recommended)

Reuse the **existing** local PostgreSQL 18 database `ganeshotsav_dev` and its `ganesh_dev` role if you already created them. Otherwise, create a dedicated empty database and role. Do not run the migration against an unrelated existing database. Sample SQL in pgAdmin Query Tool, executed by an authorized PostgreSQL administrator:

```sql
CREATE USER ganesh_dev WITH PASSWORD 'REPLACE_WITH_STRONG_UNIQUE_PASSWORD';
CREATE DATABASE ganeshotsav_dev OWNER ganesh_dev;
```

`CREATE DATABASE` must be run outside a transaction and may require your DBA to execute it separately. Configure `backend/.env` from `backend/.env.example`, with your own password, JWT secret and frontend CORS origin. URL-encode special characters in the database password. Keep these secrets out of Git.

### Windows PowerShell — backend

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env before continuing. Use your existing PostgreSQL host/port/username/password.
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m app.seed_admin --username admin
python -m uvicorn app.main:app --reload --port 8000
```

### Linux/macOS Bash — backend

```bash
cd backend
cp .env.example .env
# Edit .env before continuing; e.g. export JWT_SECRET="$(openssl rand -hex 32)" into .env.
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m app.seed_admin --username admin
python -m uvicorn app.main:app --reload --port 8000
```

To test backend: `cd backend && python -m pytest -q` (Windows and Bash). API health: `http://localhost:8000/api/health`. Interactive OpenAPI: `http://localhost:8000/docs`.

### Windows PowerShell — frontend (second terminal)

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

### Linux/macOS Bash — frontend (second terminal)

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Visit `http://localhost:5173`. Select **Staff Operations** to authenticate as a staff user. Use **Devotees**, **Family links**, **Address master**, **Duplicate review** and **Sevadar map**. Browser geolocation requires HTTPS in production (or localhost during local testing).

## Create a sevadar login (super admin only)

Sign in as `admin` (seeded via CLI). Use the OpenAPI page `/docs` and its **Authorize** control with the bearer token from `/api/auth/login`, or the examples below.

**Windows PowerShell:**

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/auth/login -ContentType 'application/json' -Body '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
$headers = @{ Authorization = "Bearer $($login.access_token)" }
$body = @{ username='sevadar_wadala_1'; password='SET_A_DIFFERENT_STRONG_PASSWORD'; role='sevadar'; zone='Wadala' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/admin/users -Headers $headers -ContentType 'application/json' -Body $body
```

**Linux/macOS Bash:**

```bash
TOKEN=$(curl -sS http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
curl -sS -X POST http://localhost:8000/api/admin/users \
 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
 -d '{"username":"sevadar_wadala_1","password":"SET_A_DIFFERENT_STRONG_PASSWORD","role":"sevadar","zone":"Wadala"}'
```

**No preset admin password is included.** The CLI prompts you to choose one.

## Operational workflow (demonstrable end-to-end)

1. **Admin:** create Devotee IDs. Shared phone numbers do not cause identity merges. Potential same-person duplicates appear in **Duplicate review**.
2. **Admin:** create Family ID, attach existing devotees, then create/reuse an exact household address. The exact unit number is part of the normalized address fingerprint.
3. **Admin:** link the address to the family and (optionally) individuals; verify its latitude/longitude using documented on-site or validated-geocoder evidence. A family must separately consent to house visits, including a stored consent source and evidence reference.
4. **Admin:** review suspected same-person duplicates. Explicitly choose the surviving Devotee ID, provide written evidence and confirm. The retired ID is tombstoned; family links, addresses and payments are reassociated in a DB transaction and a merge audit recorded. A rejected/related decision is recorded without merging.
5. **Sevadar:** sign in with a sevadar role, accept GPS consent and click **Find households within 3 km**. Only verified and opted-in family homes are returned; current position is not collected on load. The UI provides an approximate household radius plot, distance-ordered list, and navigation links for actual road directions.
6. **Sevadar:** claim a household, then record visit outcome. GPS freshness expires after 15 minutes; **Stop location sharing** immediately deletes the last GPS coordinate. Schedule `python -m app.purge_gps` every 5 minutes to delete orphaned expired locations even if no further request arrives.
7. **Devotee:** the public Seva and Donation screens now create a Razorpay order and show a confirmed receipt **only** after gateway signature, payment status, currency and amount have been verified server-side. Lookup requires both full receipt number and booking phone.

### Razorpay configuration

Set these server-only environment variables in `backend/.env`:

```dotenv
APP_ENV=development
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Set the Razorpay **payment.captured** webhook to `https://YOUR_API_HOST/api/payments/webhook` and use the same webhook signing secret. Use sandbox keys for initial testing. Client-side Razorpay checkout needs Internet connectivity. **Without credentials, order requests return HTTP 503 and no fake receipt is issued. Test receipts are never valid for real donation, tax or seva collection**. No card credentials are stored by this project.

The backend maintains the authoritative 27-seva catalogue at `backend/app/sevas.json` (migrated from the original frontend list), which is exposed at `GET /api/sevas`. Frontend displays live prices from this API; backend always recalculates and validates selections. Do not let users edit that JSON without a price-change approval process.

## Database / ER correspondence

The conceptual diagram in `architecture/` is included for stakeholder discussion; table names in the actual schema differ slightly. The implemented migration has **18 application tables**, plus Alembic’s `alembic_version` table (check `app/models.py`):

- Individual identity: `devotees`; family identity: `families`, `family_members`
- Shared, exact-household address: `address_master`, `devotee_addresses`, `family_addresses`
- Dedup rules/review/merge: `dedup_rules`, `duplicate_candidates`, `duplicate_decisions`, `merge_audit`
- Staff and field GPS: `app_users`, `sevadars`, `sevadar_locations`, `visit_assignments`, `visit_logs`, `family_consent_audit`
- Payment: `payment_orders`, `receipts`

This is **household-based** visit mapping: one family/home is shown once, even if several devotees live there. A Devotee ID is not the same as a Family ID. An address is a reusable physical-location record, not proof that its residents are relatives or the same person.

## API summary

See `docs/API_AND_HANDOVER.md` for endpoints, limits, privacy controls, outstanding launch requirements, and phased work.

## Deployment and CI

- **GitHub Actions** (`.github/workflows/ci.yml`) runs FastAPI tests on Python 3.11 and the React build on Node.js 22 for pushes/PRs to all pushed branches, and can be run manually. It **does not deploy to AWS or push to a remote repository**. The frontend build is a merge gate once branch protection is enabled.
- `backend/Dockerfile` and `frontend/Dockerfile` build independent containers. The optional Nginx frontend configuration forwards `/api` to the backend Docker DNS hostname `backend`; adjust it for your AWS load balancer/CloudFront deployment.
- **PostgreSQL 18 was not available for live connection testing in the packaging environment.** Both Alembic migrations and 15 FastAPI tests were verified using temporary SQLite. Test against your own PostgreSQL staging instance before production.
- Full npm dependency installation did not complete in the packaging environment, so the Vite production build is not asserted as passed. The TS/TSX sources were syntax-parsed successfully; run `npm ci && npm run build` locally/through GitHub Actions before merging.

### PostgreSQL 18 end-to-end testing (v4)

See **[`docs/POSTGRES18_E2E_LOCAL_TESTING.md`](docs/POSTGRES18_E2E_LOCAL_TESTING.md)** for complete Windows/macOS instructions, a safe local migration setup script, read-only schema verification, a test harness that persists synthetic API calls in real local PostgreSQL 18, and pgAdmin SQL.

From project root **after setting up the backend/.env**: PowerShell: `powershell -ExecutionPolicy Bypass -File .\scripts\setup-postgres18.ps1`; macOS: `bash scripts/setup-postgres18.sh`. Both check `ganeshotsav_dev` on localhost before running Alembic.

From `backend/`: `python -m app.verify_database` reports **18/18** schema tables and revision `0002_payment_mode`, and `python -m app.postgres_smoke --username admin` creates synthetic QA-only records in your actual local PostgreSQL for pgAdmin inspection. **These scripts are not connected to your laptop remotely.** You execute them locally. The smoke test does not simulate or bypass Razorpay. The extra GitHub Actions job runs migration and API-persistence smoke tests against an ephemeral `postgres:18` service.

### Push changes to GitHub

Read **[`docs/GITHUB_BRANCH_UPDATE_V4.md`](docs/GITHUB_BRANCH_UPDATE_V4.md)** for safe updates to an existing local branch, and **[`docs/GITHUB_SETUP.md`](docs/GITHUB_SETUP.md)** for one-repository (recommended), separate repository options, HTTPS/SSH remotes, protected branches and troubleshooting. These commands are identical in PowerShell and macOS Terminal after Git is installed.

**If cloned from your GitHub repository:**

```bash
git status
git checkout -b feature/dedup-sevadar-backend
git add .
git commit -m "Build FastAPI identity dedup, sevadar GPS and Razorpay test receipts"
git push -u origin feature/dedup-sevadar-backend
```

Create a GitHub Pull Request into `main` and confirm **backend-tests** and **frontend-build** pass before merge.

**If starting from this extracted ZIP with no `.git` directory:** Create an empty GitHub repository (do not pre-add a README), then from the extracted project root:

```bash
git init
git branch -M main
git add .
git commit -m "Initialize Ganeshotsav full-stack project"
git remote add origin https://github.com/YOUR_USER_OR_ORG/YOUR_REPO.git
git push -u origin main
```

Use an SSH GitHub remote instead if your SSH key is registered. GitHub HTTPS authentication uses a token/credential helper, **not a GitHub account password**. Do not commit `.env`, `.venv` or live payment credentials. **Nothing was pushed automatically.**

## Before any public launch

This is a **functional integration baseline, not a production-certified deployment**. Complete the items in `docs/API_AND_HANDOVER.md`, especially consent evidence, Google Maps/navigation provider terms, OTP-based verified identity reuse, postal address verification, roles and least privilege, audit/event retention, OAuth/secure-cookie authentication, privacy impact assessment, secrets rotation, rate limiting, monitoring, 80G claims review, payment refund/reconciliation, and PostgreSQL staging tests.


## GitHub safety: what is and is not committed

The **root `.gitignore`** covers Windows/macOS Python virtual environments, Node `node_modules`, compiled `dist` output, `.env`/secret files, caches, local databases and dumps, logs, generated receipts, GPS/identity exports and test artifacts. Commit `frontend/package-lock.json`, both backend `requirements*.txt`, Alembic migrations, `.env.example`, GitHub Actions files, and `backend/app/sevas.json` (original 27-seva import definitions). **Do not push real devotees, QA login passwords, payment receipts or database exports.**

Before committing your **existing GitHub branch**, run `git add .gitignore backend/ frontend/ scripts/ docs/ architecture/ .github/ README.md`, inspect `git diff --cached --name-only`, then run `python scripts/check_git_staged.py`. This is a best-effort path check, not a secrets scanner. See `docs/GITIGNORE_AND_SAFE_GITHUB_PUSH.md` for fixing previously tracked secrets and for both Windows/macOS usage.
