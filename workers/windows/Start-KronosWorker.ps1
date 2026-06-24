param(
  [string]$ProjectRoot = "",
  [string]$EnvFile = "",
  [string]$App = "workers.api.main:app",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8000,
  [switch]$InstallDependencies
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $ScriptRoot "..\..")).Path
}
if (-not $EnvFile) {
  $EnvFile = Join-Path $ScriptRoot "worker.env.ps1"
}

Set-Location $ProjectRoot

function Get-CommandExecutablePath {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Command
  )

  foreach ($propertyName in @("Source", "Path", "Definition")) {
    $value = $Command.$propertyName
    if ($value) {
      return $value
    }
  }

  throw "Unable to resolve executable path for command: $($Command.Name)"
}

if (Test-Path -LiteralPath $EnvFile) {
  . $EnvFile
} else {
  Write-Warning "Environment file not found: $EnvFile"
}

$venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $venvPython)) {
  $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($pyLauncher) {
    $pyPath = Get-CommandExecutablePath $pyLauncher
    & $pyPath -3 -m venv (Join-Path $ProjectRoot ".venv")
  } else {
    $python = Get-Command python -ErrorAction Stop
    $pythonPath = Get-CommandExecutablePath $python
    & $pythonPath -m venv (Join-Path $ProjectRoot ".venv")
  }
}

& $venvPython -m pip --version | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $venvPython -m ensurepip --upgrade
}

if ($InstallDependencies) {
  & $venvPython -m pip install --upgrade pip
  & $venvPython -m pip install -r (Join-Path $ProjectRoot "workers\requirements.txt")
}

$env:PYTHONPATH = $ProjectRoot
& $venvPython -m uvicorn $App --host $HostName --port $Port
