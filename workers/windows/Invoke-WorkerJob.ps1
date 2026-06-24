param(
  [ValidateSet("scan", "review")]
  [string]$Job = "scan",
  [string]$EnvFile = "",
  [string]$WorkerUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $EnvFile) {
  $EnvFile = Join-Path $ScriptRoot "worker.env.ps1"
}

if (Test-Path -LiteralPath $EnvFile) {
  . $EnvFile
}

if (-not $env:WORKER_API_KEY) {
  throw "WORKER_API_KEY is required"
}

$headers = @{ Authorization = "Bearer $env:WORKER_API_KEY" }

if ($Job -eq "scan") {
  $body = @{
    symbols = @("BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT")
    timeframes = @("15m", "1h", "4h")
    market_types = @("SPOT", "FUTURES")
    limit = 400
  } | ConvertTo-Json -Depth 5

  Invoke-RestMethod -Method Post -Uri "$($WorkerUrl.TrimEnd('/'))/scan" -Headers $headers -ContentType "application/json" -Body $body
} else {
  $body = @{ window_hours = 48 } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$($WorkerUrl.TrimEnd('/'))/review" -Headers $headers -ContentType "application/json" -Body $body
}
