from fastapi import APIRouter, HTTPException

from .forecasting import forecast_series
from .schemas import ForecastRequest, ForecastResponse

router = APIRouter(tags=["novelty01Forecasting"])


@router.post("/forecast", response_model=ForecastResponse)
def forecast(payload: ForecastRequest):
    try:
        return forecast_series(payload.series, payload.horizon, payload.seasonLength)
    except Exception as error:  # noqa: BLE001 — surfaced to the caller, which falls back on any non-2xx
        raise HTTPException(status_code=500, detail=str(error)) from error
