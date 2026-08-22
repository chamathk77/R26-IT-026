from fastapi import APIRouter, HTTPException

from .schemas import SegmentsRequest, SegmentsResponse
from .segmentation import compute_customer_segments

router = APIRouter(tags=["novelty02CustomerBehavior"])


@router.post("/segments", response_model=SegmentsResponse)
def segments(payload: SegmentsRequest):
    try:
        customers = [customer.model_dump() for customer in payload.customers]
        return compute_customer_segments(customers, payload.k, payload.now)
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(error)) from error
