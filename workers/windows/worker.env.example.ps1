$env:WORKER_API_KEY = "change-me-worker-secret"
$env:KRONOS_API_KEY = "change-me-kronos-secret"
$env:KRONOS_API_URL = "http://127.0.0.1:8000"

$env:SUPABASE_URL = ""
$env:SUPABASE_SERVICE_ROLE_KEY = ""

$env:EXCHANGE = "BINANCE"
$env:BINANCE_API_BASE = "https://api.binance.com"
$env:BINANCE_FAPI_BASE = "https://fapi.binance.com"
$env:OKX_API_BASE = "https://www.okx.com"

# Keep mock for first boot. Switch to real only after model code and weights are installed.
$env:KRONOS_INFERENCE_MODE = "mock"
$env:KRONOS_MODEL_PATH = ""
$env:KRONOS_TOKENIZER_PATH = ""
$env:KRONOS_MODEL_MODULE = "model"
$env:KRONOS_DEVICE = "cpu"
$env:KRONOS_MAX_CONTEXT = "512"
