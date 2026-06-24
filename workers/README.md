# Kronos V4 Worker Services

These services run outside Vercel because Kronos inference, scan loops, and backtests are not suitable for Vercel Serverless limits.

## Services

- `workers.kronos_service.main:app`: Kronos prediction contract with mock fallback.
- `workers.scanner_worker.main:app`: Binance scan and signal generation contract.
- `workers.backtest_worker.main:app`: ordinary and walk-forward backtest contract.
- `workers.review_worker.main:app`: lifecycle review and performance refresh contract.

## Run Locally

```bash
pip install -r workers/requirements.txt
uvicorn workers.kronos_service.main:app --reload --port 8101
uvicorn workers.scanner_worker.main:app --reload --port 8102
uvicorn workers.backtest_worker.main:app --reload --port 8103
uvicorn workers.review_worker.main:app --reload --port 8104
```

## Required Environment

```text
WORKER_API_KEY=
KRONOS_API_KEY=
KRONOS_INFERENCE_MODE=mock
KRONOS_MODEL_PATH=
KRONOS_TOKENIZER_PATH=
KRONOS_MODEL_MODULE=model
KRONOS_DEVICE=cpu
KRONOS_MAX_CONTEXT=512
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EXCHANGE=BINANCE
KRONOS_API_URL=
BINANCE_API_BASE=https://api.binance.com
BINANCE_FAPI_BASE=https://fapi.binance.com
OKX_API_BASE=https://www.okx.com
```

The Vercel app calls worker endpoints with `Authorization: Bearer ${WORKER_API_KEY}`.

## Old Windows Server Deployment

The `workers/windows` scripts run the unified FastAPI worker and schedule periodic jobs through Windows Task Scheduler. This is intended for an older Windows host where Docker may not be available.

1. Install Python 3.10+ and make sure `py` or `python` is available in PowerShell.
2. Copy `workers/windows/worker.env.example.ps1` to `workers/windows/worker.env.ps1`.
3. Fill in `WORKER_API_KEY`, `KRONOS_API_KEY`, Supabase credentials, and Binance bases.
4. First boot in mock mode:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Start-KronosWorker.ps1 -InstallDependencies
```

5. Verify health:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health
```

6. Install scheduled tasks from an elevated PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Install-ScheduledTasks.ps1
```

This creates:

- `KronosV4 Worker API`: starts the unified API on server startup.
- `KronosV4 Scan`: calls `/scan` every 15 minutes.
- `KronosV4 Review`: calls `/review` hourly.

To remove the tasks:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Uninstall-ScheduledTasks.ps1
```

### Public HTTPS Endpoint For Vercel

Use a domain and HTTPS reverse proxy instead of exposing FastAPI directly.

Recommended shape:

```text
Vercel -> https://worker.example.com -> Caddy/IIS reverse proxy -> 127.0.0.1:8000
```

1. Create an `A` record for `worker.example.com` pointing to the Windows server public IP.
2. Install Caddy, IIS ARR, or another HTTPS reverse proxy. `workers/windows/Caddyfile.example` is the simplest config.
3. Keep `Start-KronosWorker.ps1` bound to `127.0.0.1:8000`.
4. Open only `443`, plus `80` if your certificate tool needs HTTP validation:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Configure-FirewallForPublicWorker.ps1 -AllowHttpForCertificate
```

5. Set Vercel production env vars:

```text
WORKER_API_URL=https://worker.example.com
KRONOS_API_URL=https://worker.example.com
WORKER_API_KEY=<same value as worker.env.ps1>
KRONOS_API_KEY=<same value as worker.env.ps1>
```

6. Test from outside the server:

```powershell
Invoke-RestMethod -Uri https://worker.example.com/health
```

Do not create an inbound firewall allow rule for port `8000`.

### Windows Server 2008 R2 Notes

Windows Server 2008 R2 is old enough that modern Python, Torch, Caddy, and PowerShell modules may not run cleanly. Use these compatibility rules:

- Install the latest Python version that still runs on Windows 7 / Server 2008 R2, commonly Python 3.8.x 64-bit.
- Use the `*-2008R2.ps1` scripts because Server 2008 R2 does not include the newer `ScheduledTasks` PowerShell module.
- Expect real Kronos/Torch inference to be difficult on this OS. Use mock mode first, then test Torch/Kronos separately.
- If you only have a public IP, use `http://PUBLIC_IP:8000` only for temporary smoke testing.
- Install Python 3.8-compatible worker dependencies from `workers/requirements-win2008.txt`.

Install 2008 R2 scheduled tasks from an elevated PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Install-ScheduledTasks-2008R2.ps1
```

Temporary public-IP smoke test without HTTPS:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Configure-FirewallForPublicWorker-2008R2.ps1 -TemporaryAllowWorkerPort
powershell -ExecutionPolicy Bypass -File .\workers\windows\Start-KronosWorker.ps1 -HostName 0.0.0.0 -Port 8000
```

Then set Vercel temporarily to:

```text
WORKER_API_URL=http://PUBLIC_IP:8000
KRONOS_API_URL=http://PUBLIC_IP:8000
```

Close port `8000` after smoke testing or move to a domain/HTTPS proxy.

If `pip install -r workers/requirements.txt` fails on `uvicorn==0.34.0`, use the Windows Server 2008 R2 dependency set:

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\workers\requirements-win2008.txt
```

If you only have a public IP and no domain, the simplest path is `http://PUBLIC_IP:8000`, but that sends worker authorization headers without TLS and is not recommended for production. A self-signed HTTPS certificate on an IP address will usually fail from Vercel because the certificate is not trusted. For production, use either a domain with a normal certificate or a publicly trusted IP-address certificate and automated renewal.

### Switching Market Data To OKX

Set the worker environment to:

```powershell
$env:EXCHANGE = "OKX"
$env:OKX_API_BASE = "https://www.okx.com"
```

The scanner converts default symbols like `BTCUSDT` to OKX spot instruments like `BTC-USDT` and futures/perpetual requests to `BTC-USDT-SWAP`. OKX candle limits are capped to 300 per request.

### Real Kronos Mode

Keep `KRONOS_INFERENCE_MODE=mock` until the server has the upstream Kronos code, Python dependencies, and model/tokenizer weights installed. Then set:

```powershell
$env:KRONOS_INFERENCE_MODE = "real"
$env:KRONOS_MODEL_PATH = "C:\models\Kronos-small"
$env:KRONOS_TOKENIZER_PATH = "C:\models\Kronos-Tokenizer"
$env:KRONOS_MODEL_MODULE = "model"
$env:KRONOS_DEVICE = "cpu"
```

Use `cuda` only on a server with a compatible NVIDIA driver, CUDA runtime, and Torch build. In real mode `/health` loads the model and reports a clear configuration/import error if the runtime is incomplete.
