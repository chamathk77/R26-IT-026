"""
RFM (Recency/Frequency/Monetary) customer segmentation via k-means.
Mirrors the shape/labeling of the previous Node fallback
(backend/src/novelty/novelty02CustomerBehavior/behaviorEngine.js
computeCustomerSegments), but clusters with scikit-learn's KMeans on
standardized features instead of a hand-rolled implementation.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

MIN_CUSTOMERS_FOR_SEGMENTS = 12
SEGMENT_LABELS = ["VIP / Loyal", "Regular", "Occasional", "At risk / Lapsed"]
RANDOM_STATE = 42


def _round2(value: float) -> float:
    return round(float(value), 2)


def _slugify(label: str) -> str:
    return re.sub(r"[^a-z]+", "_", label.lower()).strip("_")


def _parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def compute_customer_segments(
    customers: List[Dict[str, Any]], k: int = 4, now: Optional[str] = None
) -> Dict[str, Any]:
    now_dt = _parse_datetime(now) if now else datetime.now(timezone.utc)

    with_orders = [c for c in customers if (c.get("totalOrders") or 0) > 0]

    if len(with_orders) < MIN_CUSTOMERS_FOR_SEGMENTS:
        return {
            "segmentationReady": False,
            "method": None,
            "customersAnalyzed": len(with_orders),
            "minimumRequired": MIN_CUSTOMERS_FOR_SEGMENTS,
            "segments": [],
        }

    points = []
    for customer in with_orders:
        last_update = _parse_datetime(customer["lastUpdate"])
        recency_days = max(0, (now_dt - last_update).days)
        points.append(
            {
                "mobileNumber": customer["mobileNumber"],
                "recencyDays": recency_days,
                "frequency": customer.get("totalOrders") or 0,
                "monetary": customer.get("totalSales") or 0,
            }
        )

    features = np.array(
        [[p["recencyDays"], p["frequency"], p["monetary"]] for p in points], dtype=float
    )
    standardized = StandardScaler().fit_transform(features)

    cluster_count = min(k, len(points))
    labels = KMeans(n_clusters=cluster_count, n_init=10, random_state=RANDOM_STATE).fit_predict(
        standardized
    )

    ranked = []
    for cluster_id in range(cluster_count):
        member_indices = [i for i, label in enumerate(labels) if label == cluster_id]
        if not member_indices:
            continue

        members = [points[i] for i in member_indices]
        # loyalty score: higher monetary/frequency and lower recency (more recent) rank higher
        loyalty_score = float(
            np.mean(
                [
                    standardized[i, 2] + standardized[i, 1] - standardized[i, 0]
                    for i in member_indices
                ]
            )
        )

        ranked.append(
            {
                "loyaltyScore": loyalty_score,
                "size": len(members),
                "avgRecencyDays": round(float(np.mean([m["recencyDays"] for m in members]))),
                "avgFrequency": _round2(float(np.mean([m["frequency"] for m in members]))),
                "avgMonetary": _round2(float(np.mean([m["monetary"] for m in members]))),
                "totalMonetary": sum(m["monetary"] for m in members),
            }
        )

    ranked.sort(key=lambda cluster: cluster["loyaltyScore"], reverse=True)

    total_monetary = sum(p["monetary"] for p in points) or 1

    segments = []
    for rank, cluster in enumerate(ranked):
        label = SEGMENT_LABELS[rank] if rank < len(SEGMENT_LABELS) else f"Segment {rank + 1}"
        segments.append(
            {
                "key": _slugify(label),
                "label": label,
                "size": cluster["size"],
                "sharePercent": _round2(cluster["size"] / len(points) * 100),
                "revenueSharePercent": _round2(cluster["totalMonetary"] / total_monetary * 100),
                "avgRecencyDays": cluster["avgRecencyDays"],
                "avgFrequency": cluster["avgFrequency"],
                "avgMonetary": cluster["avgMonetary"],
            }
        )

    return {
        "segmentationReady": True,
        "method": "rfm_kmeans",
        "customersAnalyzed": len(with_orders),
        "minimumRequired": None,
        "segments": segments,
    }
