# Backend Python virtual environment — Windows CMD / PowerShell / macOS

This release uses **Python 3.11** and contains both:
- `backend/requirements.txt`: FastAPI, SQLAlchemy, Psycopg, Alembic, authentication, etc.
- `backend/requirements-dev.txt`: includes `-r requirements.txt` and adds pytest.

`.venv/` is **not shipped** in ZIP/GitHub because Windows and macOS create incompatible virtual environments. Each developer must create their own. The setup scripts create and install it automatically; they **do not overwrite** existing `.env` or modify databases.

## Windows CMD (recommended for your laptop)

From your existing repo root:

```cmd
backend\setup.cmd
```

Or manually from `backend`:

```cmd
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m pip check
```

To activate in CMD (optional):

```cmd
.venv\Scripts\activate.bat
python --version
python -m pip list
```

## Windows PowerShell

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-backend.ps1
```

Or `cd backend` and run with no activation:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pip check
```

## macOS (Apple Silicon or Intel)

From your existing repo root:

```bash
bash backend/setup.sh
```

Or manually from `backend`:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
python -m pip check
```

## Configure local PostgreSQL 18 and run

Create `backend/.env` (setup scripts copy from `.env.example` only if absent). Update your local credentials, e.g.:

```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://ganesh_dev:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/ganeshotsav_dev
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
CORS_ORIGINS=http://localhost:5173
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

`YOUR_URL_ENCODED_PASSWORD` is a placeholder; use the password for your actual `ganesh_dev` account, percent-encoded if it has reserved URI characters. Never paste passwords into chats or commit `.env`.

**CMD (from `backend`)**:

```cmd
.venv\Scripts\python.exe -m app.assert_local_target
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m app.verify_database
.venv\Scripts\python.exe -m app.seed_admin --username admin
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**macOS (from `backend`)**:

```bash
.venv/bin/python -m app.assert_local_target
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.verify_database
.venv/bin/python -m app.seed_admin --username admin
.venv/bin/python -m pytest -q
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

`app.seed_admin` creates your initial admin user; if already seeded, don't recreate it. After `app.verify_database`, refresh **pgAdmin → Databases → ganeshotsav_dev → Schemas → public → Tables**. You should see **18 application tables**, plus `alembic_version`.

In a **second terminal**, run from `frontend`:

```sh
npm ci
npm run dev
```

Check `http://localhost:8000/docs` for FastAPI and `http://localhost:5173` for React. The pytest suite uses an isolated SQLite database; use `app.postgres_smoke --username admin` for the development PostgreSQL integration scenario after the admin has been created and API is running. It writes synthetic records to `ganeshotsav_dev` for pgAdmin inspection.

If CMD says `py` is not recognized or `No suitable Python runtime found`, install **Python 3.11** and reopen the terminal. If `pip check` fails, share the exact package conflict; avoid manually installing arbitrary versions.
