param(
  [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path,
  [string]$TaskPrefix = "KronosV4",
  [string]$WorkerUrl = "http://127.0.0.1:8000",
  [string]$PowerShellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
)

$ErrorActionPreference = "Stop"

$startScript = Join-Path $ProjectRoot "workers\windows\Start-KronosWorker.ps1"
$jobScript = Join-Path $ProjectRoot "workers\windows\Invoke-WorkerJob.ps1"

$workerCommand = "`"$PowerShellPath`" -NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -ProjectRoot `"$ProjectRoot`""
$scanCommand = "`"$PowerShellPath`" -NoProfile -ExecutionPolicy Bypass -File `"$jobScript`" -Job scan -WorkerUrl `"$WorkerUrl`""
$reviewCommand = "`"$PowerShellPath`" -NoProfile -ExecutionPolicy Bypass -File `"$jobScript`" -Job review -WorkerUrl `"$WorkerUrl`""

schtasks.exe /Create /TN "$TaskPrefix Worker API" /SC ONSTART /TR $workerCommand /RL HIGHEST /F
schtasks.exe /Create /TN "$TaskPrefix Scan" /SC MINUTE /MO 15 /TR $scanCommand /RL HIGHEST /F
schtasks.exe /Create /TN "$TaskPrefix Review" /SC HOURLY /MO 1 /TR $reviewCommand /RL HIGHEST /F

Write-Host "Installed Windows Server 2008 R2 compatible scheduled tasks with prefix '$TaskPrefix'."
