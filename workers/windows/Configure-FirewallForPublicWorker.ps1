param(
  [switch]$AllowHttpForCertificate,
  [string]$RulePrefix = "KronosV4 Public Worker"
)

$ErrorActionPreference = "Stop"

New-NetFirewallRule `
  -DisplayName "$RulePrefix HTTPS" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 443 `
  -Profile Any `
  -ErrorAction SilentlyContinue | Out-Null

if ($AllowHttpForCertificate) {
  New-NetFirewallRule `
    -DisplayName "$RulePrefix HTTP Certificate Challenge" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 80 `
    -Profile Any `
    -ErrorAction SilentlyContinue | Out-Null
}

Write-Host "Firewall rules checked. Keep the worker API bound behind the reverse proxy and do not expose port 8000 publicly."
