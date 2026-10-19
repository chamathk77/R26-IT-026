from fastapi import APIRouter, HTTPException

from .recommender import generate_temporal_bundles, recommend
from .schemas import (
    RecommendationsRequest,
    RecommendationsResponse,
    TemporalBundlesRequest,
    TemporalBundlesResponse,
)

router = APIRouter(tags=["novelty04RecommendationSystem"])


@router.post("/recommendations", response_model=RecommendationsResponse)
def recommendations(payload: RecommendationsRequest):
    """
    Mines the shop's order history with Apriori and returns the products worth
    adding to the cart the customer is about to submit. Node supplies the
    baskets, the cart and the orderable candidates; the ranking and the reason
    attached to each suggestion are decided here.
    """
    try:
        candidates = [candidate.model_dump() for candidate in payload.candidates]
        return recommend(
            payload.transactions,
            payload.cartItemIds,
            candidates,
            cart_category_ids=payload.cartCategoryIds,
            favourite_ids=payload.favouriteIds,
            limit=payload.limit,
            min_support_count=payload.minSupportCount,
            max_antecedent_size=payload.maxAntecedentSize,
            top_neighbors=payload.topNeighbors,
            max_rules=payload.maxRules,
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/temporal-bundles", response_model=TemporalBundlesResponse)
def temporal_bundles(payload: TemporalBundlesRequest):
    """
    Mines synergistic frequent itemsets partitioned by local meal-time session,
    calculates cross-category compatibility and Lift, and applies margin-aware
    discounting ensuring the bundle price is strictly LESS than the sum of
    individual item prices.
    """
    try:
        transactions = [tx.model_dump() for tx in payload.transactions]
        catalog = [item.model_dump() for item in payload.catalog]
        return generate_temporal_bundles(
            transactions=transactions,
            catalog=catalog,
            current_session=payload.currentSession,
            session_label=payload.sessionLabel,
            default_discount=payload.defaultDiscount,
            min_support_count=payload.minSupportCount,
            min_lift=payload.minLift,
            max_bundles=payload.maxBundles,
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(error)) from error

