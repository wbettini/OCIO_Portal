<#
.SYNOPSIS
    Starts the OCIO Portal backend (FastAPI/uvicorn) and frontend (Vite) together.
.DESCRIPTION
    Verifies the Python venv and Node dependencies are present, copies .env.example
    to .env if missing, then runs `npm run dev` (backend on :8000, frontend on :5173).
.PARAMETER HideDemoLabels
    Suppresses the "Local Prototype Mode" / "Demonstration Data" pills and banners
    in the frontend UI (sets VITE_HIDE_DEMO_LABELS=true for the Vite dev server).
#>

param(
    [switch]$HideDemoLabels
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "Python venv not found at .venv\. Run: py -3.11-64 -m venv .venv; .venv\Scripts\python.exe -m pip install -e `"./backend[dev]`""
}

if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Host "Installing root npm dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path (Join-Path $PSScriptRoot "frontend\node_modules"))) {
    Write-Host "Installing frontend npm dependencies..." -ForegroundColor Yellow
    npm install --prefix frontend
}

$envFile = Join-Path $PSScriptRoot ".env"
$envExample = Join-Path $PSScriptRoot ".env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item $envExample $envFile
}

if ($HideDemoLabels) {
    $env:VITE_HIDE_DEMO_LABELS = "true"
    Write-Host "Demo/local pills and banners will be hidden." -ForegroundColor Yellow
}

Write-Host "Starting backend (http://localhost:8000) and frontend (http://localhost:5173)..." -ForegroundColor Cyan
npm run dev
