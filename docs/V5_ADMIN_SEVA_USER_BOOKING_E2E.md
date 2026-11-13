# Version 5 — Admin Portal, Devotee Accounts and Seva Booking E2E

This upgrade extends **v4.1**, preserving its FastAPI/PostgreSQL identity, family, controlled deduplication, verified address and consent-based sevadar GPS modules. **Do not initialise a new Git repository or run Alembic downgrade.** Merge these files onto your existing local GitHub branch and retain your own uncommitted `.env` files.

## 1. Architecture, boundaries and status

- `frontend/` — React/Vite website, My Account registration/sign-in, Staff Operations, Admin Portal, seva cart/checkout and printable receipt view.
- `backend/` — FastAPI, SQLAlchemy, Alembic, PBKDF2 password hashing, JWT login, admin RBAC, Razorpay server-side order and capture verification.
- **PostgreSQL 18** `ganeshotsav_dev` — authoritative storage of users, devotees, sevas, bookings, addresses, families, duplicate review and receipts.
- **22 application tables** after new revision `0003_admin_portal`; previous 18 identity/payment tables are retained, not dropped.
- `seva_master` seeded from **the exact 27 seva entries in the original source ZIP**, plus optional, separate **₹101 TEST ONLY Ganesh Archana** fixture.
- Public signup assigns **devotee role only**. It creates a unique Devotee ID and does not merge profiles simply because relatives share a phone. Families continue to require governed linking.
- Admin Portal: add/edit/deactivate sevas, prices, timing and notes; edit banner/headline/phone and enable/disable booking/donations; list users; super admin can create staff and deactivate other accounts; list booking/receipt status; audit administrative changes.
- Admin-managed website settings currently control **specific** content and operational switches, not a drag-and-drop page editor. Image/library CMS, multi-factor auth, email OTP verification, password reset, throttling and production-grade application monitoring remain future work.

**Security:** The **local demo checkout** creates an explicitly invalid `DEMO-RCP-` sample without communicating with Razorpay or collecting money. It is enabled only when **all three** are true: `APP_ENV=development`, `RAZORPAY_MODE=test`, `ENABLE_DEMO_CHECKOUT=1`. `DEMO` payment orders carry `status=demo`, not `paid`. Real Razorpay **test** mode (with real test API keys) still uses capture verification and issues `TEST-RCP-`. Production requires Razorpay live credentials; `DEMO` must be disabled.

## 2. Apply your existing PostgreSQL 18 setup

Use an existing local PostgreSQL server and a dedicated `ganeshotsav_dev` database. If your password contains `@`, encode it as `%40` in `DATABASE_URL`.

Example `backend/.env` (replace placeholders; do not commit):

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://ganesh_dev:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
JWT_SECRET=REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CORS_ORIGINS=http://localhost:5173
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
ENABLE_DEMO_CHECKOUT=1
```

### Windows CMD — from the project root

```cmd
cd /d C:\Users\shanb\Gsb-Ganeshotsava-Billing-Software
backend\setup.cmd
cd backend
.venv\Scripts\activate.bat
python -m app.assert_local_target
python -m alembic upgrade head
python -m app.verify_database
python -m app.seed_sevas --original --demo
python -m app.seed_admin --username admin
python -m pytest -q
python -m uvicorn app.main:app --reload --port 8000
```

`seed_admin` **must only be run if your super admin has not yet been created**; if the admin already exists, skip that line. All seva seed records are idempotent: they are added if missing; existing admin prices/edits are not overwritten.

### macOS Terminal — from the project root

```bash
bash backend/setup.sh
cd backend
source .venv/bin/activate
python -m app.assert_local_target
python -m alembic upgrade head
python -m app.verify_database
python -m app.seed_sevas --original --demo
python -m pytest -q
python -m uvicorn app.main:app --reload --port 8000
```

The macOS developer must use their own local PostgreSQL credentials and `.env`. The one `requirements.txt` and `requirements-dev.txt` are shared between Windows and macOS. Python 3.11 is recommended.

Expected `verify_database` result: **`Application tables: 22/22`, revision `0003_admin_portal`**. Refresh pgAdmin `ganeshotsav_dev → Schemas → public → Tables`.

## 3. Start React

In **a new terminal** (keep backend running):

Windows CMD:

```cmd
cd /d C:\Users\shanb\Gsb-Ganeshotsava-Billing-Software\frontend
if not exist .env copy .env.example .env
npm ci
npm run build
npm run dev
```

macOS Terminal:

```bash
cd frontend
[ -f .env ] || cp .env.example .env
npm ci
npm run build
npm run dev
```

Ensure `frontend/.env` contains `VITE_API_URL=http://localhost:8000`. Open `http://localhost:5173`.

## 4. Manual E2E checklist (recommended before GitHub push)

1. Open **Admin Portal**. Sign in using the existing super admin. Verify dashboard, 27 imported source sevas and separate TEST ₹101 seva.
2. **Create a custom seva**, e.g. `TEST ONLY Ganesh Archana - manual QA`, price `₹101`, category `offerings`. Verify it appears under **Sevas**; no frontend code edit necessary. Update the amount to `₹151`, refresh Sevas, confirm the revised amount. For stable QA amounts, keep seed fixture `demo-ganesh-archana-qa` at ₹101.
3. In **My Account**, register fictional QA devotee #1; verify the assigned `DEV-...` ID in the profile and `devotees` + `app_users` in pgAdmin. Repeat for two additional fictional QA accounts. Using a shared phone does **not** unify two different people. Staff Operations can review suspected duplicates separately.
4. Sign in as QA devotee #1, add **TEST ONLY Ganesh Archana (QA)** to the cart, enter beneficiary details, review ₹101, choose **Generate DEMO booking + receipt**. Receipt must start `DEMO-RCP-` and show **NO PAYMENT / NOT VALID**.
5. Open **My Account** and confirm the booking is shown. Open **Admin Portal → Bookings & Receipts** and confirm the same receipt is shown with `gateway_mode=demo`, `status=demo`.
6. Open **Receipt Lookup** and supply the full receipt number and matching phone to see the historical receipt. A different phone must fail.
7. Edit the TEST seva price in Admin Portal. The **historical receipt must retain its original price** and amount due to immutable booking snapshots.
8. Edit **Website Controls** to change the announcement/headline; navigate home to see the updated text. Disable bookings, try checkout, confirm the backend rejects it; re-enable bookings afterward.
9. In **Staff Operations**, test family links, shared addresses, duplicate review, GPS verification/consented nearby households and visit assignment (existing v4.1 features; keep test coordinates synthetic).
10. Optionally configure `rzp_test_...` credentials and use actual Razorpay **Test Mode** for a separate simulated captured-payment receipt `TEST-RCP-...` (never `DEMO-RCP-...`). Do **not** test live payment credentials or claim a payment has cleared without provider verification.

### Add three fictional DEV-only test accounts via CLI (optional)

From `backend` with `.venv` active:

```cmd
python -m app.seed_demo_users --count 3
```

The CLI displays generated passwords **once**. Keep them off GitHub. Do not use the same credentials for real users. You can instead register the three users manually in **My Account**.

### Automated E2E against real local PostgreSQL (not SQLite)

```cmd
python -m app.postgres_v5_smoke --username admin
```

This calls the FastAPI application, creates one synthetic seva, **three fictional devotee accounts**, a local DEMO booking and a DEMO receipt **in your existing `ganeshotsav_dev` database**, then verifies persistence. It prompts for the admin password. The synthetic records remain available in pgAdmin; do not run against real devotee data or production.

Existing family/GPS/duplicate workflow test:

```cmd
python -m app.postgres_smoke --username admin
```

## 5. Inspect pgAdmin

Open `scripts/pgadmin_verify_v5.sql` in pgAdmin's Query Tool on **ganeshotsav_dev**. The expected counts are 22 application tables and one `alembic_version` table. New tables:

- `seva_master` — current seva catalogue, prices and active status
- `seva_bookings` — historical item snapshots and booking status
- `website_settings` — trusted editable website settings
- `admin_audit` — administrative change history

Extended existing tables: `app_users` gains email, full name, linked Devotee ID and email verification flag; `payment_orders` gains the booking user ID.

## 6. Validate and push your **existing** GitHub branch

```bash
git branch --show-current
git diff --check
git status
git add backend/ frontend/ .github/ scripts/ docs/ README.md
git diff --cached --name-only
# Confirm no .env, .venv, node_modules, local DB or test credentials are staged.
git commit -m "Add admin-managed sevas, devotee accounts and demo booking receipts"
git push origin HEAD
```

The repository's GitHub Actions workflow runs backend pytest, frontend production build and PostgreSQL 18 migration + synthetic E2E. The local install environment cannot guarantee external npm registry connectivity. **Do not push until `npm ci && npm run build` succeeds locally and the app passes manual browser QA.**

## Remaining production hardening

- Email/phone OTP and verified account ownership, reset-password flows and signup/login rate limiting.
- A broader CMS (pages, images, events, galleries, web publishing approvals).
- Payment refunds/reconciliation operations, failure handling, compliance and Trust approval of invoices/tax wording.
- Live address geocoding/route-optimization provider, household privacy and consent reviews.
- Independent PostgreSQL 18 full migration + browser acceptance tests, backup/restore and security review on the intended hosting environment.
