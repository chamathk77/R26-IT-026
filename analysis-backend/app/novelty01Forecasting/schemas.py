from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ForecastRequest(BaseModel):
    series: List[float]
    horizon: int
    seasonLength: int = 12


class ForecastPoint(BaseModel):
    predicted: float
    lower: float
    upper: float


class AccuracyStats(BaseModel):
    mape: Optional[float] = None
    rmse: Optional[float] = None
    mae: Optional[float] = None
    sampleSize: int


class BacktestStats(AccuracyStats):
    holdoutMonths: int
    method: str


class ForecastResponse(BaseModel):
    method: str
    params: Dict[str, Any]
    points: List[ForecastPoint]
    accuracy: Optional[AccuracyStats] = None
    backtest: Optional[BacktestStats] = None
