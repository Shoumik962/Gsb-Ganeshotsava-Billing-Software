# v6.2 Local demo checkout with production payment separation

## Problem fixed

The v6/v6.1 seva review page disabled **Generate DEMO booking** unless the visitor had signed in. The API shared the real-payment login/verified-contact/profile gate with DEMO checkout. This made free end-to-end local QA unnecessarily dependent on OTP setup and user profiles.

## New behavior

**LOCAL DEMO** (only when deliberately enabled): no signup, token, OTP, completed profile, external payment keys or SMS required. On the Sevas page select a seva, continue to checkout, optionally use **Fill fictional QA details**, review, then click **Generate unpaid DEMO booking + receipt**. The API creates a `payment_orders` row (`status=demo`, `gateway_mode=demo`), a `seva_bookings` row (`status=demo`), a unique `DEMO-RCP-...` receipt and a skipped SMS record. For a guest demo no `devotees` or family record is inserted. This avoids polluting the identity/family master with synthetic users. The receipt is always visibly marked unpaid and invalid for benefits or 80G purposes. The test booking remains in the DB for pgAdmin review.

**REAL RAZORPAY TEST AND LIVE**: unchanged separate route `/api/payments/orders`, requiring a signed-in verified devotee and completed profile for seva bookings. The server recalculates the total from active `seva_master` prices. Razorpay order is created server-side, checkout signature verified server-side, payment fetched and confirmed `captured` with matching order ID/currency/amount before a TEST or official receipt is issued. Webhook signatures are checked using the raw request bytes. The demo route does not call Razorpay or issue real receipts.

Demo is **not** a substitute for testing the full account verification, household family-linking, or live payment flows. Use those flows separately once their respective providers are configured.

## Enable on Windows (CMD)

Use a disposable local PostgreSQL 18 database named `ganeshotsav_dev`; do **not** enable this if real devotee information is in that database.

In `backend/.env` set (preserve your existing database password and JWT secret):

```dotenv
APP_ENV=development
RAZORPAY_MODE=test
ENABLE_DEMO_CHECKOUT=1
DATABASE_URL=postgresql+psycopg://ganesh_dev:URL_ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
CORS_ORIGINS=http://localhost:5173
EMAIL_PROVIDER=console
SMS_PROVIDER=console
```

`ENABLE_LOCAL_DEV_VERIFICATION=1` is **not needed** for DEMO checkout. Do not bind the development backend to a network-accessible interface. This feature has explicit loopback client and request hostname checks and requires a local development DB named `ganeshotsav_dev` (isolated SQLite allowed only for automated tests).

Two terminals, from the project root:

```cmd
cd backend
.venv\Scripts\activate.bat
python -m alembic upgrade head
python -m app.verify_database
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```cmd
cd frontend
npm ci
npm run build
npm run dev -- --host 127.0.0.1
```

Open `http://localhost:5173`. Ensure `frontend/.env` has `VITE_API_URL=http://localhost:8000` (if running the frontend bound at 127.0.0.1 rather than localhost, use `http://127.0.0.1:5173` and add it to backend CORS_ORIGINS). API status `http://localhost:8000/api/payments/config` must report `demoCheckoutEnabled: true`. After applying the patch, hard-refresh the browser (`Ctrl+Shift+R`).

### macOS / Linux

```bash
cd backend
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m alembic upgrade head
python -m app.verify_database
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run build
npm run dev -- --host 127.0.0.1
```

## Verify in pgAdmin

Run in `ganeshotsav_dev` after a guest demo:

```sql
SELECT po.id, po.status, po.gateway_mode,
       sb.status AS booking_status, r.receipt_no,
       po.amount_paise / 100.0 AS catalogue_amount_rupees,
       rd.status AS receipt_sms_status
FROM payment_orders po
JOIN seva_bookings sb ON sb.order_id = po.id
JOIN receipts r ON r.order_id = po.id
LEFT JOIN receipt_deliveries rd ON rd.receipt_id = r.id
WHERE po.gateway_mode = 'demo'
ORDER BY po.created_at DESC LIMIT 10;
```

Expected: `demo / demo / demo / DEMO-RCP... / skipped` and no `paid` status. An anonymous demo has no `user_id` or `devotee_id`, by design. Use Find Receipt with DEMO-RCP ID and the QA phone entered during checkout. Do not attempt to use a demo receipt as a real voucher.

## Production safeguards and release checks

- Keep `APP_ENV=production`, `RAZORPAY_MODE=live` and `ENABLE_DEMO_CHECKOUT=0` in production. Ensure no dev-verification flags enabled.
- No OTP or profile gate is removed from the **real** Razorpay route.
- Deploy with HTTPS, protect API keys and webhook secrets in a secret manager, verify webhook signatures over raw bytes, process duplicate/out-of-order events idempotently, and add operations visibility for failed webhooks and receipts.
- Before go-live: test Razorpay real-mode/production credentials in a controlled environment, settlement reconciliation, refund handling, chargebacks, duplicate callbacks, rate limiting, user/role authorization, receipt template and live notifications.
- Existing database migrations are unchanged in v6.2; run `alembic upgrade head` for older deployments, but no new migration is required for the v6.1 to v6.2 patch.
- `node_modules`, `.venv`, `.env`, build outputs, and test databases stay excluded by root `.gitignore`. The patch includes only changed source/tests/docs/example configuration.

Official payment integration references:
- https://razorpay.com/docs/server-integration/python/test-app/
- https://razorpay.com/security/checklist/
