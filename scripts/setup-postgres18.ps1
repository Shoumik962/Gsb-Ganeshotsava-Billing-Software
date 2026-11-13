# Run from the project root in PowerShell (after your existing PostgreSQL 18 server/db are set up).
# Does not create/delete database or overwrite a local .env.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$python = Join-Path $backend '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
  Write-Host 'No virtual environment found. Creating Python 3.11 venv...'
  py -3.11 -m venv (Join-Path $backend '.venv')
}
& $python -m pip install -r (Join-Path $backend 'requirements-dev.txt')
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
& $python -m pip check
if ($LASTEXITCODE -ne 0) { throw 'Incompatible package dependency found.' }
$dotenv = Join-Path $backend '.env'
if (-not (Test-Path $dotenv)) {
  Copy-Item (Join-Path $backend '.env.example') $dotenv
  Write-Host 'Created backend/.env. EDIT it with your local ganesh_dev database password and JWT secret.'
  Write-Host 'After editing run this script again. No migrations were executed.'
  exit 0
}
Push-Location $backend
try {
  & $python -m app.assert_local_target
  if ($LASTEXITCODE -ne 0) { throw 'Unsafe migration target; inspect backend/.env before proceeding.' }
  Write-Host 'Applying versioned Alembic migrations to local ganeshotsav_dev...'
  & $python -m alembic upgrade head
  if ($LASTEXITCODE -ne 0) { throw 'Alembic migration failed. Check DATABASE_URL and DB grants.' }
  & $python -m app.verify_database
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL schema verification failed.' }
  Write-Host 'Database ready. Run: cd backend; .\.venv\Scripts\python.exe -m app.seed_admin --username admin'
  Write-Host 'And: .\.venv\Scripts\python.exe -m app.postgres_smoke --username admin'
} finally {
  Pop-Location
}
