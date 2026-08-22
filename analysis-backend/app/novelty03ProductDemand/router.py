from fastapi import APIRouter, HTTPException

from ..novelty01Forecasting.forecasting import forecast_series
from .schemas import ProductDemandRequest, ProductDemandResponse

router = APIRouter(tags=["novelty03ProductDemand"])


@router.post("/product-demand", response_model=ProductDemandResponse)
def product_demand(payload: ProductDemandRequest):
    """
    Per-product unit-demand forecasting. Reuses novelty01's generic
    forecast_series() (same Holt-Winters/backtest ladder used for shop-wide
    sales/cost forecasting) rather than duplicating it — the only
    difference is granularity: daily quantities with season_length=7
    (weekly seasonality: weekday vs weekend patterns) instead of monthly
    sales with season_length=12.
    """
    try:
        results = []
        for product in payload.products:
            model = forecast_series(product.dailyQuantities, payload.horizonDays, season_length=7)

            total_units = round(sum(point["predicted"] for point in model["points"]))
            daily_points = [
                {
                    "day": index + 1,
                    "predicted": point["predicted"],
                    "lower": point["lower"],
                    "upper": point["upper"],
                }
                for index, point in enumerate(model["points"])
            ]

            results.append(
                {
                    "productId": product.productId,
                    "productName": product.productName,
                    "method": model["method"],
                    "daysOfHistory": len(product.dailyQuantities),
                    "totalPredictedUnits": total_units,
                    "dailyPoints": daily_points,
                }
            )

        return {"horizonDays": payload.horizonDays, "results": results}
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(error)) from error
