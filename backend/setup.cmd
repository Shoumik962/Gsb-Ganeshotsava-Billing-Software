@echo off
setlocal EnableExtensions
REM Run from CMD: backend\setup.cmd   or from the backend directory: setup.cmd
REM Creates a local, OS-specific .venv; never commit .venv or .env to GitHub.
pushd "%~dp0"
if errorlevel 1 goto fail

echo [1/5] Checking Python 3.11...
where py >nul 2>&1
if errorlevel 1 goto try_python
py -3.11 --version >nul 2>&1
if errorlevel 1 goto try_python
set "BOOTSTRAP_PY=py -3.11"
goto have_python
:try_python
python --version 2>&1 | findstr /B /C:"Python 3.11." >nul
if errorlevel 1 goto missing_python
set "BOOTSTRAP_PY=python"
:have_python

echo [2/5] Creating backend\.venv if missing...
if not exist ".venv\Scripts\python.exe" (
    %BOOTSTRAP_PY% -m venv ".venv"
    if errorlevel 1 goto fail
)
set "VENV_PY=.venv\Scripts\python.exe"

echo [3/5] Updating pip inside backend\.venv...
"%VENV_PY%" -m pip install --upgrade pip
if errorlevel 1 goto fail

echo [4/5] Installing requirements-dev.txt (includes requirements.txt)...
"%VENV_PY%" -m pip install -r requirements-dev.txt
if errorlevel 1 goto fail

echo [5/5] Checking installed dependencies...
"%VENV_PY%" -m pip check
if errorlevel 1 goto fail

if not exist ".env" (
    copy /Y ".env.example" ".env" >nul
    echo Created backend\.env from template. Update DATABASE_URL and JWT_SECRET before migrations.
) else (
    echo Keeping your existing backend\.env unchanged.
)

echo.
echo SUCCESS: Backend virtual environment and dependencies are ready.
echo For DB migrations (after configuring .env):
echo   cd backend
echo   .venv\Scripts\python.exe -m app.assert_local_target
echo   .venv\Scripts\python.exe -m alembic upgrade head
echo   .venv\Scripts\python.exe -m app.verify_database
echo   .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
popd
exit /b 0

:missing_python
echo ERROR: Python 3.11 was not found. Install Python 3.11 and retry.
:fail
echo ERROR: Backend setup did not finish. Review error text above.
popd
exit /b 1
