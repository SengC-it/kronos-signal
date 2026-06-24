param(
  [switch]$AllowHttpForCertificate,
  [switch]$TemporaryAllowWorkerPort
)

$ErrorActionPreference = "Stop"

netsh advfirewall firewall add rule name="KronosV4 HTTPS" dir=in action=allow protocol=TCP localport=443

if ($AllowHttpForCertificate) {
  netsh advfirewall firewall add rule name="KronosV4 HTTP Certificate Challenge" dir=in action=allow protocol=TCP localport=80
}

if ($TemporaryAllowWorkerPort) {
  netsh advfirewall firewall add rule name="KronosV4 Worker Temporary HTTP 8000" dir=in action=allow protocol=TCP localport=8000
  Write-Warning "Port 8000 is open. Use this only for temporary smoke testing without TLS."
}

Write-Host "Firewall rules checked for Windows Server 2008 R2."
