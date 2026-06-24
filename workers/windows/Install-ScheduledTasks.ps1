param(
  [string]$ProjectRoot = "",
  [string]$TaskPrefix = "KronosV4",
  [string]$WorkerUrl = "http://127.0.0.1:8000",
  [string]$WindowsPowerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $ScriptRoot "..\..")).Path
}

$startScript = Join-Path $ProjectRoot "workers\windows\Start-KronosWorker.ps1"
$jobScript = Join-Path $ProjectRoot "workers\windows\Invoke-WorkerJob.ps1"

$serviceAction = New-ScheduledTaskAction `
  -Execute $WindowsPowerShell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -ProjectRoot `"$ProjectRoot`""
$serviceTrigger = New-ScheduledTaskTrigger -AtStartup
$serviceSettings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "$TaskPrefix Worker API" -Action $serviceAction -Trigger $serviceTrigger -Settings $serviceSettings -Description "Runs the Kronos V4 unified FastAPI worker." -Force

$scanAction = New-ScheduledTaskAction `
  -Execute $WindowsPowerShell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$jobScript`" -Job scan -WorkerUrl `"$WorkerUrl`""
$scanTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "$TaskPrefix Scan" -Action $scanAction -Trigger $scanTrigger -Description "Runs the Kronos V4 market scan every 15 minutes." -Force

$reviewAction = New-ScheduledTaskAction `
  -Execute $WindowsPowerShell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$jobScript`" -Job review -WorkerUrl `"$WorkerUrl`""
$reviewTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(10) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName "$TaskPrefix Review" -Action $reviewAction -Trigger $reviewTrigger -Description "Runs the Kronos V4 lifecycle review hourly." -Force

Write-Host "Installed scheduled tasks with prefix '$TaskPrefix'."
