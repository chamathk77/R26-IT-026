from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import DATA_CSV, MODEL_PATH, get_margin_thresholds
from app.forecaster import (
    ensure_model,
    forecast_accuracy_response,
    margin_thresholds_public,
    predict_next_from_history,
    predict_next_month_from_csv,
    train_and_save,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Analysis Backend", version="1.0.0", description="Next-month sales & cost forecasts")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryRow(BaseModel):
    month: str = Field(..., description="YYYY-MM")
    sales: float
    cost: float


class PredictFromHistoryBody(BaseModel):
    history: list[HistoryRow] = Field(..., min_length=3)


def _paths_ready():
    if not DATA_CSV.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Data CSV missing: {DATA_CSV}. Set FORECAST_CSV or add monthly_performance.csv under data/.",
        )


@app.on_event("startup")
def startup() -> None:
    try:
        get_margin_thresholds()
    except ValueError as e:
        logger.error("Invalid margin threshold env: %s", e)
        raise
    try:
        _paths_ready()
        ensure_model(DATA_CSV, MODEL_PATH)
        logger.info("Model ready at %s", MODEL_PATH)
    except FileNotFoundError as e:
        logger.warning("Startup: %s — train via POST /train or add CSV/model", e)
    except Exception as e:
        logger.exception("Startup model init failed: %s", e)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "analysis-backend"}


@app.get("/settings/margin-bands")
def margin_bands() -> dict[str, Any]:
    """Active GREEN/YELLOW profit-margin thresholds (env MARGIN_* or defaults)."""
    bands = margin_thresholds_public()
    return {
        **bands,
        "description": "GREEN when margin % ≥ greenMinPercent (default 35). "
        "YELLOW when margin % ≥ yellowMinPercent (default 25) and below green. "
        "RED when margin % < yellowMinPercent (default 25). "
        "marginPercent = (predictedSales - predictedCost) / predictedSales * 100.",
    }


@app.get("/metrics/forecast-accuracy")
def forecast_accuracy() -> dict[str, Any]:
    """Hold-out MAE / MAPE from the last training run (stored in the model bundle)."""
    _paths_ready()
    if not MODEL_PATH.is_file():
        ensure_model(DATA_CSV, MODEL_PATH)
    return forecast_accuracy_response(MODEL_PATH)


@app.get("/predict/next-month")
def predict_next_month() -> dict[str, Any]:
    _paths_ready()
    if not MODEL_PATH.is_file():
        ensure_model(DATA_CSV, MODEL_PATH)
    return predict_next_month_from_csv(DATA_CSV, MODEL_PATH)


@app.post("/predict/next-month")
def predict_next_month_with_history(body: PredictFromHistoryBody) -> dict[str, Any]:
    if not MODEL_PATH.is_file():
        _paths_ready()
        ensure_model(DATA_CSV, MODEL_PATH)
    hist = [r.model_dump() for r in body.history]
    return predict_next_from_history(hist, MODEL_PATH)


@app.post("/train")
async def train(file: UploadFile | None = File(None)) -> dict[str, Any]:
    """
    Retrain from uploaded CSV (month,sales,cost) or from default data/monthly_performance.csv.
    """
    if file is not None:
        text = (await file.read()).decode("utf-8")
        tmp = MODEL_PATH.parent / "_upload_training.csv"
        tmp.write_text(text, encoding="utf-8")
        try:
            result = train_and_save(tmp, MODEL_PATH)
        finally:
            tmp.unlink(missing_ok=True)
    else:
        _paths_ready()
        result = train_and_save(DATA_CSV, MODEL_PATH)
    return {"success": True, **result}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
