param(
  [string]$TaskPrefix = "KronosV4"
)

$ErrorActionPreference = "Stop"

schtasks.exe /Delete /TN "$TaskPrefix Worker API" /F
schtasks.exe /Delete /TN "$TaskPrefix Scan" /F
schtasks.exe /Delete /TN "$TaskPrefix Review" /F

Write-Host "Removed Windows Server 2008 R2 compatible scheduled tasks with prefix '$TaskPrefix'."
