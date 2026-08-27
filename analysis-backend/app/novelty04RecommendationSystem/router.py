from fastapi import APIRouter, HTTPException

from .recommender import recommend
from .schemas import RecommendationsRequest, RecommendationsResponse

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
