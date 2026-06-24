param(
  [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
  [string]$EnvFile = "$PSScriptRoot\worker.env.ps1",
  [string]$App = "workers.api.main:app",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8000,
  [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"
Set-Location $ProjectRoot

if (Test-Path -LiteralPath $EnvFile) {
  . $EnvFile
} else {
  Write-Warning "Environment file not found: $EnvFile"
}

$venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $venvPython)) {
  $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($pyLauncher) {
    & $pyLauncher.Source -3 -m venv (Join-Path $ProjectRoot ".venv")
  } else {
    $python = Get-Command python -ErrorAction Stop
    & $python.Source -m venv (Join-Path $ProjectRoot ".venv")
  }
}

if ($InstallDependencies) {
  & $venvPython -m pip install --upgrade pip
  & $venvPython -m pip install -r (Join-Path $ProjectRoot "workers\requirements.txt")
}

$env:PYTHONPATH = $ProjectRoot
& $venvPython -m uvicorn $App --host $HostName --port $Port
