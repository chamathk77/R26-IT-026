from typing import List, Optional

from pydantic import BaseModel


class CustomerIn(BaseModel):
    mobileNumber: str
    name: Optional[str] = None
    totalSales: float = 0
    totalOrders: int = 0
    lastUpdate: str


class SegmentsRequest(BaseModel):
    customers: List[CustomerIn]
    k: int = 4
    now: Optional[str] = None


class Segment(BaseModel):
    key: str
    label: str
    size: int
    sharePercent: float
    revenueSharePercent: float
    avgRecencyDays: int
    avgFrequency: float
    avgMonetary: float


class SegmentsResponse(BaseModel):
    segmentationReady: bool
    method: Optional[str] = None
    customersAnalyzed: int
    minimumRequired: Optional[int] = None
    segments: List[Segment]
