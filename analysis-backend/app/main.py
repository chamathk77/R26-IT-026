from fastapi import FastAPI

from .novelty01Forecasting.router import router as forecasting_router
from .novelty02CustomerBehavior.router import router as customer_behavior_router
from .novelty03ProductDemand.router import router as product_demand_router

app = FastAPI(title="SmartCost analysis backend")

app.include_router(forecasting_router)
app.include_router(customer_behavior_router)
app.include_router(product_demand_router)


@app.get("/health")
def health():
    return {"status": "ok"}
