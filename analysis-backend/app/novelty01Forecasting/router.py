from fastapi import APIRouter, HTTPException

from .adaptive import forecast_sales_costs
from .forecasting import forecast_series
from .schemas import ForecastRequest, ForecastResponse, SalesCostRequest, SalesCostResponse

router = APIRouter(tags=["novelty01Forecasting"])


@router.post("/forecast", response_model=ForecastResponse)
def forecast(payload: ForecastRequest):
    try:
        return forecast_series(payload.series, payload.horizon, payload.seasonLength)
    except Exception as error:  # noqa: BLE001 — surfaced to the caller, which falls back on any non-2xx
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/forecast/sales-cost", response_model=SalesCostResponse)
def forecast_sales_and_costs(payload: SalesCostRequest):
    try:
        return forecast_sales_costs(
            payload.sales,
            payload.costs,
            payload.horizon,
            payload.seasonLength,
            months=payload.months,
            weekday_weights=payload.weekdayWeights,
        )
    except Exception as error:  # noqa: BLE001 — surfaced to the caller as a 500
        raise HTTPException(status_code=500, detail=str(error)) from error
