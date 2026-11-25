# Wadala Ganeshotsav v6 — Verified Devotee Onboarding & Household E2E Guide

**Baseline:** The user's uploaded `Gsb-Ganeshotsava-Billing-Software-main(3).zip` (v5 code). This release adds Alembic migration **0004_verification**, bringing the project to **27 application tables** (plus `alembic_version`).

## 1. What works in v6

- Registration requires full address: flat/house unit, street, locality, city, state and six-digit PIN. Building/society is optional. Gotra and Nakshatra are captured during signup (choose *Unknown / Not sure* where needed).
- Email and phone each require a separate expiring six-digit code; only hashed challenges are stored. Five bad guesses block that challenge. Resends are time-limited; simple database-backed per-client throttling protects signup, address lookup, verification and login.
- Unique **email and username per account**. If a registered phone is reused, explicit shared-family-phone confirmation is required; separate people still receive different Devotee IDs. Account and family identities must NEVER be auto-merged based only on a phone/address.
- An address lookup searches existing *same-PIN, same-flat* addresses and offers matches **at >=90%** before submission. No occupant, phone or family details appear in the public results. Selecting a match reuses the canonical address ID but does **not** establish kinship/residency.
- After both verification steps, log in and complete the profile. A unique Family ID is created for an address without existing linked households. If a known family or 90% similar address is found, requesting membership creates a **staff-review request** instead; no automatic family tagging.
- Admin approves/rejects family links. The unique database constraint prevents duplicate **prasad vouchers** or **pooja invitations** for the same normalized household/address, event and benefit type. Genuine household-policy exceptions require a deliberate admin process outside this prototype.
- On a captured Razorpay payment, one receipt is created and one `receipt_deliveries` record is tied to its `receipt_id`. If the verified devotee opted in, the app sends an SMS containing the receipt number and secure login path. SMS failures do **not** reverse the payment; admins can retry failed deliveries (maximum five attempts).
- A **local DEMO checkout** creates an explicitly unpaid DEMO receipt and **never sends real SMS**. Razorpay Test Mode receipts are distinguishable from live financial receipts.
- Account holders can view/print their **own** receipts after authentication; an SMS does not expose personal receipt data publicly.

## 2. Install or activate the backend

### Windows CMD (from repository root)

```cmd
backend\setup.cmd
cd backend
.venv\Scripts\activate.bat
python -m pip check
```

If setup script isn't available, use `py -3.11 -m venv backend\.venv` from the repository root, then run `backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt`.

### macOS Terminal (from repository root)

```bash
bash backend/setup.sh
cd backend
source .venv/bin/activate
python -m pip check
```

Both developers use **Python 3.11** and the same `requirements.txt` / `requirements-dev.txt`. Neither `.venv` nor `node_modules` should ever be committed.

## 3. Environment configuration

Create `backend/.env` from `backend/.env.example` if missing; preserve an existing secret-containing file. The following is for a **local-only test**, not production:

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://ganesh_dev:URL_ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
JWT_SECRET=CHOOSE_RANDOM_32_PLUS_CHARACTER_SECRET
CORS_ORIGINS=http://localhost:5173
PUBLIC_FRONTEND_URL=http://localhost:5173
RAZORPAY_MODE=test
ENABLE_DEMO_CHECKOUT=1
EMAIL_PROVIDER=console
SMS_PROVIDER=console
```

**Password containing `@`?** Encode `@` to `%40` only within the password portion of the URL. Never commit `.env`, credentials, personal data or local exports.

With `APP_ENV=development`, `console` verification writes fictional/real verification codes to the **FastAPI console** so you can test without SMS or email gateway costs. **Do not deploy console OTP mode publicly.** In a real environment use `EMAIL_PROVIDER=smtp` and `SMS_PROVIDER=twilio`, with the corresponding SMTP/Twilio settings in `.env.example` and a verified sender / applicable SMS registration, as required by your provider and region. Twilio sends and SMTP operations may incur charges.

## 4. Migrate PostgreSQL 18, verify 27 tables, seed the catalogue

From `backend/`, with venv activated:

```bash
python -m app.assert_local_target
python -m alembic upgrade head
python -m app.verify_database
python -m app.seed_sevas --original --demo
python -m pytest -q
python -m app.seed_admin --username admin
python -m uvicorn app.main:app --reload --port 8000
```

The schema verifier should report **27/27**, Alembic revision `0004_verification`. The regression suite currently has **28 passing backend tests** in the packaging environment. Seed admin once only. Idempotent seva seed does not overwrite previously modified prices. The dummy ₹101 seva is development-only.

**On your actual Windows machine** run the script and migration against the already-created local `ganeshotsav_dev`. The supplied tests ran on isolated SQLite and do not prove your PC's PostgreSQL connectivity.

Run `scripts/pgadmin_verify_v6.sql` in pgAdmin Query Tool for `ganeshotsav_dev` to inspect table creation and QA records. The new tables are `verification_challenges`, `request_throttles`, `family_link_requests`, `household_benefits`, `receipt_deliveries`.

## 5. Start React

Windows CMD:

```cmd
cd frontend
if not exist .env copy .env.example .env
npm ci
npm run build
npm run dev
```

macOS Terminal:

```bash
cd frontend
cp -n .env.example .env
npm ci
npm run build
npm run dev
```

Check `frontend/.env`: `VITE_API_URL=http://localhost:8000`. Open `http://localhost:5173` and FastAPI Swagger `http://localhost:8000/docs`.

## 6. Browser E2E sequence

1. In **Admin Portal**, sign in and confirm you can see the 27 original sevas and/or a ₹101 *TEST ONLY* seva. Create one if needed.
2. Go to **My Devotee Account → Create account**. Enter a unique email, phone and full address; choose Gotra/Nakshatra (or *Unknown / Not sure*).
3. For an address similar to one already in PostgreSQL, wait for 90% address suggestions and explicitly choose the correct unit or mark it as different. Do not automatically merge family members.
4. After signup, get separate phone/email six-digit codes from the FastAPI terminal (local console providers). Verify both. Unverified login must be rejected.
5. Sign in; complete profile and confirm residence. Record the Devotee ID and either the new Family ID or an outstanding staff-review request.
6. Create another fictional devotee at the same flat. Verify both channels and choose **request family link** after login. In **Admin Portal → Families & Vouchers**, approve it only after simulated relationship confirmation.
7. In **Families & Vouchers**, issue `prasad_voucher` for event `GANESHOTSAV-2027`; a second issue for the same flat/event/type must fail with HTTP 409. `pooja_invitation` is separately counted.
8. Open **Sevas** under the verified account and make a **DEMO checkout** (no actual money). The demo receipt appears under **My booking history** with View/Print. It must have a `receipt_deliveries` row marked `skipped`.
9. If you have Razorpay Test Mode credentials, perform a **sandbox captured transaction**. The receipt must appear only after valid server verification, be marked `TEST`, and log a receipt SMS. With `SMS_PROVIDER=console`, the notification appears in the FastAPI terminal. **A local demo receipt never triggers an SMS.**
10. Look at **Admin Portal → Receipt SMS** for the delivery state. For actual sender testing, configure a real provider; don't send QA messages to real users.

## 7. Scripted E2E (real local PostgreSQL)

From `backend/`:

```bash
python -m app.postgres_v6_smoke --username admin
```

This refuses non-local PostgreSQL/non-development environments, uses **fictional** contact data, mocks OTP delivery rather than sending SMS/email, creates 2 verified users sharing one phone, confirms family link only via admin decision, rejects duplicate vouchers, and generates one unpaid DEMO receipt. The synthetic rows remain in `ganeshotsav_dev` for inspection. Use a **dedicated development database**, not real data.

## 8. GitHub pre-push

Windows CMD:

```cmd
git status --short
git add .
python scripts\check_git_staged.py
git diff --cached --name-only
```

macOS:

```bash
git status --short
git add .
python3 scripts/check_git_staged.py
git diff --cached --name-only
```

Check no `.env`, `.venv`, `node_modules`, user exports, local DB, GPS data, test receipts or log files are staged. Commit migration **0004** and the source/tests/docs. `git push -u origin HEAD` pushes your currently checked-out branch; no new repository or branch is needed.

## 9. Production items not yet complete

The code contains working SMTP/Twilio adapters but **no real provider credentials**. Actual SMS delivery and email sending have **not been exercised** here. Before public rollout: confirm sender registration and pricing, webhook deployment, TLS, trusted proxy settings, gateway/WAF CAPTCHA and anti-abuse limits, consent and retention policies, staff identity verification/audit processes, password reset, phone/email-change recovery, delivery queue monitoring, disaster recovery, and privacy/security review. A 90% fuzzy address match is **not proof of occupancy or kinship**.

**Frontend-directory cleanup:** The old duplicate repository-root `index.html` is removed from the **full v6 ZIP** because the active Vite entry is `frontend/index.html`. If applying the smaller patch to a pre-existing Git branch, remove the obsolete root HTML with `git rm index.html` after confirming your deployment builds from `frontend/`.

**ID formats:** New Devotee IDs: `WAD-` + 16 hexadecimal characters. Receipts: `DEMO-RCP-...` (unpaid), `TEST-RCP-...` (captured sandbox), and `RCP-...` (captured live). Existing legacy IDs remain valid; no record renaming is performed by the migration.
