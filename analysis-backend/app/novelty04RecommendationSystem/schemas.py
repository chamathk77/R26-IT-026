from typing import List, Optional

from pydantic import BaseModel


class CandidateIn(BaseModel):
    productId: str
    categoryId: Optional[str] = None
    categoryName: str = ""


class RecommendationsRequest(BaseModel):
    # Each basket is a list of productIds from one completed order.
    transactions: List[List[str]]
    # What the customer has already put in the cart right now.
    cartItemIds: List[str] = []
    # Orderable, in-stock products the caller is willing to have recommended.
    candidates: List[CandidateIn] = []
    # Categories already represented in the cart. Sent separately because the caller
    # strips cart items out of `candidates`, which would otherwise leave us blind to
    # what the customer has already chosen and we would pitch them more of the same.
    cartCategoryIds: List[str] = []
    # Products this customer's phone has bought before (personalisation), may be empty.
    favouriteIds: List[str] = []
    # 10 rather than a handful: with a flat score curve the 7th-10th candidates are
    # near-indistinguishable from the 6th, so capping lower just hides equivalent options.
    limit: int = 10
    minSupportCount: int = 3
    maxAntecedentSize: int = 2
    topNeighbors: int = 8
    maxRules: int = 200


class Recommendation(BaseModel):
    productId: str
    score: float
    reasonCode: str
    support: Optional[float] = None
    confidence: Optional[float] = None
    lift: Optional[float] = None
    similarity: Optional[float] = None
    popularity: Optional[float] = None
    attachRate: Optional[float] = None
    withProductId: Optional[str] = None


class Rule(BaseModel):
    antecedent: List[str]
    consequent: str
    support: float
    confidence: float
    lift: float
    count: int


class CategoryAttach(BaseModel):
    categoryId: Optional[str] = None
    categoryName: str
    attachRate: float
    topProductIds: List[str]


class RecommendationsStats(BaseModel):
    transactionCount: int
    itemCount: int
    ruleCount: int
    pairCount: int
    avgBasketSize: float
    coverage: float


class RecommendationsResponse(BaseModel):
    method: Optional[str] = None
    modelReady: bool
    minimumRequired: Optional[int] = None
    stats: RecommendationsStats
    recommendations: List[Recommendation]
    rules: List[Rule]
    categoryAttach: List[CategoryAttach]


# ---------------------------------------------------------------------------
# Temporal Context-Aware Dynamic Bundle Recommendation Schemas
# ---------------------------------------------------------------------------

class TimedTransaction(BaseModel):
    items: List[str]
    session: str  # 'BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'LATE_NIGHT'


class BundleProductIn(BaseModel):
    productId: str
    productName: str
    categoryId: Optional[str] = None
    categoryName: str = ""
    amount: float
    cost: Optional[float] = None
    image: Optional[str] = ""


class TemporalBundlesRequest(BaseModel):
    transactions: List[TimedTransaction]
    catalog: List[BundleProductIn]
    currentSession: str = "LUNCH"
    sessionLabel: str = "Lunch Combo"
    defaultDiscount: float = 0.10
    minSupportCount: int = 2
    minLift: float = 1.15
    maxBundles: int = 6


class BundleProductRef(BaseModel):
    productId: str
    productName: str
    categoryName: str = ""
    amount: float
    cost: Optional[float] = None
    image: Optional[str] = ""


class SmartBundleItem(BaseModel):
    bundleId: str
    bundleName: str
    session: str
    sessionLabel: str
    productIds: List[str]
    items: List[BundleProductRef]
    regularPrice: float
    bundlePrice: float
    savingAmount: float
    discountPercent: int
    support: float
    lift: float
    coPurchaseCount: int
    isCrossCategory: bool
    reason: str


class TemporalBundlesResponse(BaseModel):
    session: str
    sessionLabel: str
    bundlesCount: int
    bundles: List[SmartBundleItem]

