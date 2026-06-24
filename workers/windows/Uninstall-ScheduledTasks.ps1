param(
  [string]$TaskPrefix = "KronosV4"
)

$ErrorActionPreference = "Stop"

Get-ScheduledTask | Where-Object { $_.TaskName -like "$TaskPrefix*" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false
}

Write-Host "Removed scheduled tasks with prefix '$TaskPrefix'."
