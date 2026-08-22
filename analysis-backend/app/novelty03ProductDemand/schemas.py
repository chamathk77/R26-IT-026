from typing import List, Optional

from pydantic import BaseModel


class ProductSeries(BaseModel):
    productId: Optional[str] = None
    productName: str
    dailyQuantities: List[float]


class ProductDemandRequest(BaseModel):
    products: List[ProductSeries]
    horizonDays: int = 7


class DemandDayPoint(BaseModel):
    day: int
    predicted: float
    lower: float
    upper: float


class ProductDemandResult(BaseModel):
    productId: Optional[str] = None
    productName: str
    method: str
    daysOfHistory: int
    totalPredictedUnits: int
    dailyPoints: List[DemandDayPoint]


class ProductDemandResponse(BaseModel):
    horizonDays: int
    results: List[ProductDemandResult]
