# Analysis Backend — monthly sales & cost forecast

Python service that matches **`Train_In_Colab.ipynb`**: reads `monthly_performance.csv` (`month`, `sales`, `cost`), builds **3-month lags** + **calendar month**, trains two **`HistGradientBoostingRegressor`** models (via `Pipeline` + `StandardScaler`), and exposes **next-month** predictions over HTTP.

## Layout

| Path | Purpose |
|------|--------|
| `data/monthly_performance.csv` | Training series (YYYY-MM rows) |
| `models/business_forecaster.joblib` | Trained bundle (created on first run or via `train_model.py`) |
| `app/forecaster.py` | Train / predict logic |
| `app/main.py` | FastAPI app |

## Setup

```bash
cd Analysis_Backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Train locally (optional)

```bash
python train_model.py
```

Optional: `--csv path\to.csv` `--out path\to.joblib`  
`--no-full-refit` keeps weights fitted only on the train split (matches original Colab save).

### Run API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- `GET /health` — liveness  
- `GET /settings/margin-bands` — profit-margin % thresholds for GREEN / YELLOW / RED  
- `GET /predict/next-month` — forecast using `data/monthly_performance.csv`  
- `POST /predict/next-month` — JSON body with last months: `{"history":[{"month":"2024-10","sales":...,"cost":...}, ...]}` (≥ 3 rows)  
- `POST /train` — retrain from default CSV  
- `POST /train` with multipart file field `file` — retrain from uploaded CSV  

### Environment

| Variable | Default |
|----------|---------|
| `FORECAST_CSV` | `<repo>/Analysis_Backend/data/monthly_performance.csv` |
| `FORECAST_MODEL` | `<repo>/Analysis_Backend/models/business_forecaster.joblib` |
| `MARGIN_GREEN_MIN_PCT` | `35` — **GREEN** if predicted profit margin % ≥ this |
| `MARGIN_YELLOW_MIN_PCT` | `25` — **YELLOW** if margin % ≥ this and **&lt;** green min; **RED** if **&lt;** this |

**Defaults in plain language:** **35% or above → green** · **25% up to (but not including) 35% → yellow** · **below 25% → red** (exactly **25%** is yellow).

`MARGIN_GREEN_MIN_PCT` must be **greater than** `MARGIN_YELLOW_MIN_PCT` (both 0–100). Restart the API after changing them.

Example (stricter green band):

```bash
set MARGIN_GREEN_MIN_PCT=40
set MARGIN_YELLOW_MIN_PCT=28
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- `GET /settings/margin-bands` — returns the active thresholds (for mobile/UI parity).

## Replacing the dataset

Copy your CSV (same columns as in Downloads) into `data/monthly_performance.csv`, then call `POST /train` or run `python train_model.py`.

## Integration with the Node POS

The Express app proxies forecasts (JWT required):

- **`GET /api/forecast/next-month`** — forwards to the Python service.

Set in **`backend/.env`**: `ANALYSIS_SERVICE_URL=http://127.0.0.1:8000` (default). Start Python first: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

The Expo **Cost → Performance** tab calls the Node route (not port 8000 directly).

You can still call Python directly in dev: `http://localhost:8000/predict/next-month` (CORS is open).
