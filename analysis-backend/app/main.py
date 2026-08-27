from fastapi import FastAPI

from .novelty01Forecasting.router import router as forecasting_router
from .novelty02CustomerBehavior.router import router as customer_behavior_router
from .novelty03ProductDemand.router import router as product_demand_router
from .novelty04RecommendationSystem.router import router as recommendation_router

app = FastAPI(title="SmartCost analysis backend")

app.include_router(forecasting_router)
app.include_router(customer_behavior_router)
app.include_router(product_demand_router)
app.include_router(recommendation_router)


@app.get("/health")
def health():
    return {"status": "ok"}
