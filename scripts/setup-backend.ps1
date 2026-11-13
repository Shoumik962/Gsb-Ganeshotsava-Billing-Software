# Windows PowerShell. Run from any directory:
# powershell -ExecutionPolicy Bypass -File .\scripts\setup-backend.ps1
# Requires Python 3.11 (recommended) installed from python.org.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
Set-Location $Backend
if (-not (Test-Path '.venv\Scripts\python.exe')) {
    py -3.11 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.11 virtual environment creation failed. Install Python 3.11.' }
}
$Py = Join-Path $Backend '.venv\Scripts\python.exe'
& $Py -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'pip upgrade failed' }
& $Py -m pip install -r requirements-dev.txt
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
& $Py -m pip check
if ($LASTEXITCODE -ne 0) { throw 'Dependency conflict detected' }
Write-Host "Backend dependencies installed and verified in $Backend\.venv"
Write-Host 'Next: Copy .env.example .env, configure PostgreSQL, then: .\.venv\Scripts\python.exe -m alembic upgrade head'
