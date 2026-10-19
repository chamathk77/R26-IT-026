from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


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


# ---------------------------------------------------------------- v2: POST /forecast/sales-cost
class SalesCostRequest(BaseModel):
    sales: List[float]
    costs: List[float]
    horizon: int = Field(13, ge=1, le=36)
    seasonLength: int = Field(12, ge=2, le=24)
    # YYYY-MM of each history point; needed for the trading-day adjustment.
    months: Optional[List[str]] = None
    # The shop's average sales per weekday relative to an average day, Monday first.
    weekdayWeights: Optional[List[float]] = Field(None, min_length=7, max_length=7)

    @model_validator(mode="after")
    def check_lengths(self):
        if len(self.sales) != len(self.costs):
            raise ValueError("sales and costs must have the same length")
        if self.months is not None and len(self.months) != len(self.sales):
            raise ValueError("months must have one entry per history point")
        return self


class RangePoint(ForecastPoint):
    sigma: float


class ProfitPoint(RangePoint):
    lossProbability: float


class SelectionCandidate(BaseModel):
    method: str
    mae: float


class SelectionInfo(BaseModel):
    strategy: str
    defaultMethod: str
    folds: int
    candidates: List[SelectionCandidate]


class AdaptiveSeriesForecast(BaseModel):
    method: str
    params: Dict[str, Any]
    points: List[RangePoint]
    accuracy: Optional[AccuracyStats] = None
    backtest: Optional[BacktestStats] = None
    selection: Optional[SelectionInfo] = None
    calendarAdjusted: bool
    intervalMethod: Optional[str] = None


class ProfitForecast(BaseModel):
    points: List[ProfitPoint]
    errorCorrelation: float


class CalendarInfo(BaseModel):
    weekdayWeights: Optional[List[float]] = None
    futureIndex: Optional[List[float]] = None


class SalesCostResponse(BaseModel):
    sales: AdaptiveSeriesForecast
    costs: AdaptiveSeriesForecast
    profit: ProfitForecast
    breakEven: Dict[str, Any]
    calendar: CalendarInfo
