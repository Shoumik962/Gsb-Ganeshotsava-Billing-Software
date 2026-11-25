# Ganeshotsav v6.1 — Unblock local QA signup and login

This patch adds a **development-only simulated verification** button. Production remains strict: new users must verify ownership of their phone and email using real OTPs.

## Windows CMD (your computer)

1. Keep your existing `backend/.env` and PostgreSQL 18 database (`ganeshotsav_dev`). Do **not** overwrite your `.env` with `.env.example`.
2. Add/change the following configuration in `backend/.env`:

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://ganesh_dev:YOUR_ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
EMAIL_PROVIDER=console
SMS_PROVIDER=console
ENABLE_LOCAL_DEV_VERIFICATION=1
```

3. From the repository root, run:

```cmd
cd backend
.venv\Scripts\activate.bat
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. In a **second** terminal:

```cmd
cd frontend
npm ci
npm run build
npm run dev
```

5. Go to `http://localhost:5173`, open **Account**.
   - **Existing unverified QA account:** select **Sign in**, enter original username and password, then select **Simulate contact verification + sign in (local only)**.
   - **New QA account:** sign up as usual, then use **Simulate verification and sign in** on the verify page.
   - Complete profile, then test the dummy seva booking and demo receipt.

**No migrations are necessary for this patch**. User verification booleans already exist from v6.

## macOS Terminal (other developer)

```bash
cd backend
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another Terminal window from the repository root:

```bash
cd frontend
npm ci
npm run build
npm run dev
```

## Guardrails

- The backend checks **all** of the following: `APP_ENV=development`, explicit opt-in (`ENABLE_LOCAL_DEV_VERIFICATION=1`), connection from loopback, browser host `localhost`/`127.0.0.1`, and database URL pointing to the **local** PostgreSQL database named `ganeshotsav_dev`.
- Invalid login credentials are rejected; no hard-coded test password is introduced.
- The test action does **not** prove email or phone ownership. It records simulated verification flags in the **local database** so your development workflow can proceed.
- Existing challenge codes are invalidated after simulated verification.
- This capability must stay **off** with real devotees and never be deployed through public tunnels or to production. Remove it from deployed configuration (`ENABLE_LOCAL_DEV_VERIFICATION=0`). Never promote development user rows to production as if verified.
- Before GitHub push, keep `.env` ignored. Source code and the safe `.env.example` (with flag off) can be committed.
- Existing console OTP verification continues to work if you prefer to test it; codes print in the FastAPI terminal when the provider is `console`.
