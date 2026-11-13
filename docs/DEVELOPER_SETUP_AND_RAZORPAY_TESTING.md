# Developer setup (Windows + macOS), PostgreSQL 18 and free Razorpay testing

This repo has independently deployable `frontend/` (React) and `backend/` (FastAPI/PostgreSQL). No Python files, dependency manifests or local virtual environments are stored under the frontend. Do **not** commit `.venv`, `.env` or `node_modules`.

## Supported developer environments

| Area | Windows developer | macOS developer |
|---|---|---|
| Python | CPython **3.11** 64-bit, `py -3.11` | CPython **3.11**, `python3.11` (Intel/Apple Silicon) |
| Python environment | `backend/.venv/Scripts/python.exe` | `backend/.venv/bin/python` |
| Dependency manifests | `backend/requirements.txt` + `backend/requirements-dev.txt` | **Same exact files** |
| Database | Existing PostgreSQL via `psycopg[binary]` | **Same driver; binary wheels** |
| Frontend | Node.js 22 LTS, `npm ci` | Node.js 22 LTS, `npm ci` |

The requirements **do not use Windows-only or macOS-only packages**. Standard `uvicorn` avoids optional `uvloop`/watcher extras; fuzzy matching uses the Python standard library; `psycopg[binary]` avoids a separate `libpq`/compiler setup on common supported machines. Different operating systems will still resolve platform-appropriate compiled wheels of dependencies such as Pydantic and Psycopg. Use the same Python minor version to minimize version-specific wheel differences.

These are **portable bounded version ranges**, not a cryptographic reproducible lock file; for strictly identical installations, create a multi-platform lock via an approved dependency-management tool in CI. `pip check` detects incompatible installed package requirements after each setup.

## A. Windows PowerShell

From the project root:

```powershell
# ONE command to create venv + install + run pip check:
powershell -ExecutionPolicy Bypass -File .\scripts\setup-backend.ps1

# Alternatively, manual step-by-step setup:
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
python -m pip check
Copy-Item .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, CORS_ORIGINS, Razorpay test values
python -m alembic upgrade head
python -m app.seed_admin --username admin
python -m uvicorn app.main:app --reload --port 8000
```

If activation is blocked by PowerShell policy, skip activation and run `\.venv\Scripts\python.exe -m ...` for each backend command. **Do not** use `pip install` from a global environment. The backend can run even when Razorpay credentials have not been configured; payment order endpoints will deliberately return HTTP 503.

Frontend in a **second** PowerShell terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

## B. macOS (zsh/Bash)

From project root:

```bash
# ONE command to create venv + install + run pip check:
bash scripts/setup-backend.sh

# Alternatively, manual setup:
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
python -m pip check
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, CORS_ORIGINS, Razorpay test values
python -m alembic upgrade head
python -m app.seed_admin --username admin
python -m uvicorn app.main:app --reload --port 8000
```

Frontend in **another** terminal:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

When the application runs: API `http://localhost:8000/docs`, React `http://localhost:5173`, payment-mode status `http://localhost:8000/api/payments/config`.

## C. Existing PostgreSQL 18 configuration

For the Windows user, reuse the already connected `ganeshotsav_dev` database owned by `ganesh_dev`. The MacBook developer should create their own separate local development database. Do not target an unrelated existing database. See `docs/POSTGRES18_E2E_LOCAL_TESTING.md` for the read-only schema doctor and fully synthetic QA workflow.

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://ganesh_dev:ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
JWT_SECRET=REPLACE_WITH_RANDOM_32_OR_MORE_CHARACTER_SECRET
CORS_ORIGINS=http://localhost:5173
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_FROM_YOUR_DASHBOARD
RAZORPAY_KEY_SECRET=YOUR_TEST_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_TEST_WEBHOOK_SECRET
```

Use a different `.env` on each computer. If DB password contains `@`, `#`, `:` or other reserved URL characters, percent-encode it in the URL. `.env.example` is deliberately blank for payment credentials; never copy test credentials into Git. To generate a random JWT secret:

**Windows PowerShell:**

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**macOS:**

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
```

## D. Razorpay free Test Mode — real sandbox checkout (no money collected)

1. In your own **Razorpay Dashboard**, turn on **Test Mode** and generate **Test** API credentials. These are separate from Live keys. Do not put the API Secret in React or `VITE_*` variables.
2. Configure `APP_ENV=development`, `RAZORPAY_MODE=test`, `RAZORPAY_KEY_ID=rzp_test_...`, `RAZORPAY_KEY_SECRET=...` in `backend/.env` and restart FastAPI. Both developers can use distinct test databases.
3. Open `/api/payments/config`. Expected `mode: "test", configured: true, freeSimulation: true`. No key secret appears in the response.
4. Browse to the **Sevas** or **Donate** page. A visible amber banner announces **RAZORPAY TEST MODE – no money collected**. Choose a donation (example ₹101), enter a dummy name/phone, and open Checkout.
5. Use Razorpay's **test** checkout method. Depending on the enabled checkout UI, choose the test success option or use Razorpay's documented test UPI simulation identifiers (such as `success@razorpay`). **Never enter an actual UPI PIN or live card details in a test.**
6. The backend verifies Razorpay's returned checkout signature and fetches the payment from Razorpay. It creates a receipt **only if** the payment was captured, belongs to that order, and has the expected currency and amount.
7. A successful test receipt is stored in PostgreSQL as `TEST-RCP-...`. Its print and WhatsApp views clearly display **TEST RECEIPT — NOT VALID** and **NO REAL MONEY RECEIVED**. The **Print / Save PDF** button creates a browser-printable test document (not an official donation/tax receipt).
8. The receipt can be found using **Receipt Lookup** with its full `TEST-RCP-...` number and the booking phone number.

**Test payments are simulated and free of any real transfer.** This does not mean future live processing is free; real gateway fees and approved payment modes are merchant-specific. An account and test API keys are still needed to exercise Razorpay's actual sandbox checkout. No backend API invents a successful payment without a verified gateway response.

### Razorpay test checklist

| Test | Expected result |
|---|---|
| No credentials | Checkout blocked with HTTP 503; no receipt |
| `RAZORPAY_MODE=test` + `rzp_test_...` credentials | Sandbox order; no real charge |
| Wrong-key prefix (test configured with `rzp_live_...`) | Checkout blocked |
| `APP_ENV=development` + `RAZORPAY_MODE=live` | Checkout blocked; no accidental real charge |
| `APP_ENV=production` + `RAZORPAY_MODE=test` | Checkout blocked |
| User cancels or test payment fails | No receipt issued |
| Invalid HMAC signature | HTTP 400; no receipt |
| Payment pending/authorized but not captured | HTTP 409; no receipt |
| Captured payment with expected amount/currency/order | One confirmed, **TEST**-stamped receipt |
| Duplicate verification or webhook retries | Same receipt; no duplicate |
| Change backend mode after order creation | Verification blocked until original mode restored |
| Test checkout's receipt printed or shared | Watermark/notice remains visible |

### Testing webhooks

Razorpay cannot call `http://localhost:8000` directly. In Test Mode, configure an HTTPS staging endpoint or a supported public test tunnel, use the **test webhook secret** and enable `payment.captured`. Then check that repeated deliveries do not mint duplicate receipts. Browser checkout signature+capture verification works without requiring the webhook first.

### Live-mode deployment is a separate operation

Only after merchant onboarding, security testing and Trust sign-off set `APP_ENV=production`, `RAZORPAY_MODE=live`, and distinct `rzp_live_...` keys in a protected deployment secret store. Live receipts use `RCP-...`; test receipts do not turn into live receipts. Keep test/live databases or at least reporting filters separate and never include test amounts in financial reports. Do not enable live payments from a developer laptop.

## E. QA checks (free; automated; no real Razorpay network calls)

**Windows PowerShell:**

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check
```

**macOS:**

```bash
cd backend
.venv/bin/python -m pytest -q
.venv/bin/python -m pip check
```

Tests use a local temporary SQLite DB and mocked Razorpay responses. They validate our receipt logic and mode separation, **not** live Razorpay connectivity or PostgreSQL transaction concurrency. Run `python -m alembic upgrade head` against a dedicated PostgreSQL staging database and complete at least one actual Razorpay Test Mode checkout before Trust UAT. The app has neither a free real-payment bypass nor a fake official receipt generator.
