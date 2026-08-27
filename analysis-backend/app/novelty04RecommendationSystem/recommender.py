"""
Market-basket recommendation model.

Mines the shop's completed orders with Apriori (frequent itemsets ->
association rules with support/confidence/lift), adds item-item collaborative
filtering (cosine similarity over the sparse basket x item matrix) and a
popularity/category-attach prior, then ranks the products a customer could add
to the cart they are about to submit.

Mirrors the division of labour used by the other novelties: Node aggregates the
baskets out of Mongo and joins product names/prices back on afterwards, while
every part of the algorithm - mining, scoring, ranking and the choice of reason
shown to the customer - lives here.
"""

from itertools import combinations
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity

MIN_TRANSACTIONS_FOR_MODEL = 10
# Cosine similarity is O(items^2); cap the matrix so a huge catalog cannot stall a request.
MAX_CF_ITEMS = 2000
MAX_CATEGORY_TOP_PRODUCTS = 5

REASON_FREQUENTLY_BOUGHT_TOGETHER = "frequently_bought_together"
REASON_SIMILAR_TASTE = "similar_taste"
REASON_POPULAR_IN_CATEGORY = "popular_in_category"
REASON_POPULAR_OVERALL = "popular_overall"
REASON_PERSONAL_FAVOURITE = "personal_favourite"

# Every component below is squashed into [0, 1] BEFORE these weights are applied.
# Without that squash lift (unbounded, routinely 3-10) would swamp cosine and
# attach-rate (both <= 1) and the customer would only ever see one kind of reason.
WEIGHT_FREQUENTLY_BOUGHT_TOGETHER = 1.00
WEIGHT_PERSONAL_FAVOURITE = 0.85
WEIGHT_SIMILAR_TASTE = 0.70
WEIGHT_POPULAR_IN_CATEGORY = 0.60
WEIGHT_POPULAR_OVERALL = 0.35


def _round6(value: float) -> float:
    return round(float(value), 6)


def _normalize_baskets(transactions: Sequence[Sequence[str]]) -> List[Set[str]]:
    """A basket is an ITEMSET: quantities and repeats do not affect support."""
    baskets = []
    for transaction in transactions or []:
        items = {str(item) for item in transaction if item}
        if items:
            baskets.append(items)
    return baskets


def _count_itemsets(baskets: List[Set[str]], itemsets: List[frozenset]) -> Dict[frozenset, int]:
    counts = {itemset: 0 for itemset in itemsets}
    for basket in baskets:
        for itemset in itemsets:
            if itemset <= basket:
                counts[itemset] += 1
    return counts


def _apriori(
    baskets: List[Set[str]], min_support_count: int, max_size: int
) -> Dict[frozenset, int]:
    """
    Classic Apriori. Level k is built only from level k-1 survivors, and a
    candidate is discarded unless every one of its (k-1)-subsets is frequent
    (downward closure) - that pruning is what keeps this cheap enough to run
    inside a request.
    """
    frequent: Dict[frozenset, int] = {}

    singles: Dict[str, int] = {}
    for basket in baskets:
        for item in basket:
            singles[item] = singles.get(item, 0) + 1

    current_level = [
        frozenset([item]) for item, count in singles.items() if count >= min_support_count
    ]
    for itemset in current_level:
        frequent[itemset] = singles[next(iter(itemset))]

    k = 2
    while current_level and k <= max_size:
        previous = set(current_level)
        candidates = set()
        for left, right in combinations(sorted(current_level, key=sorted), 2):
            union = left | right
            if len(union) != k:
                continue
            # Downward closure: prune before we pay for a pass over the baskets.
            if all(frozenset(subset) in previous for subset in combinations(union, k - 1)):
                candidates.add(union)

        if not candidates:
            break

        counts = _count_itemsets(baskets, list(candidates))
        current_level = [
            itemset for itemset, count in counts.items() if count >= min_support_count
        ]
        for itemset in current_level:
            frequent[itemset] = counts[itemset]
        k += 1

    return frequent


def _build_rules(
    frequent: Dict[frozenset, int],
    transaction_count: int,
    max_antecedent_size: int,
    max_rules: int,
) -> List[Dict[str, Any]]:
    """
    Rules are restricted to a single-item consequent because the consequent is
    what we recommend. lift <= 1 means the antecedent makes the consequent no
    more likely than chance, so those rules are dropped rather than ranked low.
    """
    rules = []
    for itemset, itemset_count in frequent.items():
        if len(itemset) < 2:
            continue

        for consequent in itemset:
            antecedent = itemset - {consequent}
            if not 1 <= len(antecedent) <= max_antecedent_size:
                continue

            antecedent_count = frequent.get(frozenset(antecedent), 0)
            consequent_count = frequent.get(frozenset([consequent]), 0)
            if antecedent_count <= 0 or consequent_count <= 0:
                continue

            confidence = itemset_count / antecedent_count
            consequent_support = consequent_count / transaction_count
            if consequent_support <= 0:
                continue

            lift = confidence / consequent_support
            if lift <= 1.0:
                continue

            rules.append(
                {
                    "antecedent": sorted(antecedent),
                    "consequent": consequent,
                    "support": _round6(itemset_count / transaction_count),
                    "confidence": _round6(confidence),
                    "lift": _round6(lift),
                    "count": itemset_count,
                }
            )

    rules.sort(key=lambda rule: (-rule["lift"], -rule["confidence"], -rule["support"]))
    return rules[:max_rules]


def _build_similarity(
    baskets: List[Set[str]], popularity: Dict[str, int], top_neighbors: int
) -> Dict[str, List[Tuple[str, float]]]:
    """Item-item cosine similarity between item COLUMNS of the binary basket matrix."""
    items = sorted(popularity, key=lambda item: (-popularity[item], item))[:MAX_CF_ITEMS]
    if len(items) < 2:
        return {}

    index_by_item = {item: index for index, item in enumerate(items)}

    rows, cols = [], []
    for row, basket in enumerate(baskets):
        for item in basket:
            column = index_by_item.get(item)
            if column is not None:
                rows.append(row)
                cols.append(column)

    if not rows:
        return {}

    matrix = csr_matrix(
        (np.ones(len(rows), dtype=float), (rows, cols)),
        shape=(len(baskets), len(items)),
    )

    # .T => similarity between items, not between baskets.
    similarity_matrix = cosine_similarity(matrix.T, dense_output=True)
    np.fill_diagonal(similarity_matrix, 0.0)

    neighbours: Dict[str, List[Tuple[str, float]]] = {}
    for index, item in enumerate(items):
        row = similarity_matrix[index]
        if not row.any():
            continue
        best = np.argsort(row)[::-1][:top_neighbors]
        pairs = [(items[j], _round6(row[j])) for j in best if row[j] > 0]
        if pairs:
            neighbours[item] = pairs

    return neighbours


def _build_category_attach(
    baskets: List[Set[str]],
    candidates_by_id: Dict[str, Dict[str, Any]],
    popularity_score: Dict[str, float],
    transaction_count: int,
) -> List[Dict[str, Any]]:
    """How often a category shows up in an order at all - the 'add a dessert' signal."""
    products_by_category: Dict[Tuple[Optional[str], str], Set[str]] = {}
    for candidate in candidates_by_id.values():
        key = (candidate.get("categoryId"), candidate.get("categoryName") or "Other")
        products_by_category.setdefault(key, set()).add(candidate["productId"])

    attach = []
    for (category_id, category_name), product_ids in products_by_category.items():
        hits = sum(1 for basket in baskets if basket & product_ids)
        if hits == 0:
            continue

        ranked = sorted(
            product_ids, key=lambda item: (-popularity_score.get(item, 0.0), item)
        )
        attach.append(
            {
                "categoryId": category_id,
                "categoryName": category_name,
                "attachRate": _round6(hits / transaction_count),
                "topProductIds": ranked[:MAX_CATEGORY_TOP_PRODUCTS],
            }
        )

    attach.sort(key=lambda entry: -entry["attachRate"])
    return attach


def _empty_stats() -> Dict[str, Any]:
    return {
        "transactionCount": 0,
        "itemCount": 0,
        "ruleCount": 0,
        "pairCount": 0,
        "avgBasketSize": 0.0,
        "coverage": 0.0,
    }


def recommend(
    transactions: Sequence[Sequence[str]],
    cart_item_ids: Sequence[str],
    candidates: Sequence[Dict[str, Any]],
    cart_category_ids: Sequence[str] = (),
    favourite_ids: Sequence[str] = (),
    limit: int = 10,
    min_support_count: int = 3,
    max_antecedent_size: int = 2,
    top_neighbors: int = 8,
    max_rules: int = 200,
) -> Dict[str, Any]:
    baskets = _normalize_baskets(transactions)
    transaction_count = len(baskets)

    candidates_by_id = {
        str(candidate["productId"]): {
            "productId": str(candidate["productId"]),
            "categoryId": candidate.get("categoryId"),
            "categoryName": candidate.get("categoryName") or "",
        }
        for candidate in candidates or []
        if candidate.get("productId")
    }

    if transaction_count < MIN_TRANSACTIONS_FOR_MODEL:
        return {
            "method": None,
            "modelReady": False,
            "minimumRequired": MIN_TRANSACTIONS_FOR_MODEL,
            "stats": _empty_stats() | {"transactionCount": transaction_count},
            "recommendations": [],
            "rules": [],
            "categoryAttach": [],
        }

    cart = {str(item) for item in cart_item_ids or []}
    favourites = {str(item) for item in favourite_ids or []}

    frequent = _apriori(baskets, max(1, min_support_count), max_antecedent_size + 1)
    rules = _build_rules(frequent, transaction_count, max_antecedent_size, max_rules)

    popularity_count = {
        next(iter(itemset)): count for itemset, count in frequent.items() if len(itemset) == 1
    }
    popularity_score = {
        item: count / transaction_count for item, count in popularity_count.items()
    }

    similarity = _build_similarity(baskets, popularity_count, top_neighbors)
    category_attach = _build_category_attach(
        baskets, candidates_by_id, popularity_score, transaction_count
    )

    # The caller tells us which categories the cart already covers, because cart items
    # are deliberately absent from `candidates`. The two fallbacks below only add to it.
    covered_category_ids = {str(category) for category in cart_category_ids or []}
    covered_category_ids.update(
        candidates_by_id[item]["categoryId"] for item in cart if item in candidates_by_id
    )
    for entry in category_attach:
        if cart & set(entry["topProductIds"]):
            covered_category_ids.add(entry["categoryId"])

    # Best rule per candidate: the strongest single rule, never a sum, so a candidate
    # matched by many weak rules cannot outrank one matched by a genuinely strong rule.
    best_rule: Dict[str, Dict[str, Any]] = {}
    for rule in rules:
        consequent = rule["consequent"]
        if consequent in cart or consequent not in candidates_by_id:
            continue
        if not set(rule["antecedent"]) <= cart:
            continue

        strength = 0.5 * (rule["lift"] / (1.0 + rule["lift"])) + 0.5 * rule["confidence"]
        current = best_rule.get(consequent)
        if current is None or strength > current["strength"]:
            best_rule[consequent] = {"rule": rule, "strength": strength}

    best_similarity: Dict[str, Tuple[str, float]] = {}
    for cart_item in cart:
        for neighbour, score in similarity.get(cart_item, []):
            if neighbour in cart or neighbour not in candidates_by_id:
                continue
            current = best_similarity.get(neighbour)
            if current is None or score > current[1]:
                best_similarity[neighbour] = (cart_item, score)

    attach_by_category = {entry["categoryId"]: entry for entry in category_attach}

    scored = []
    for product_id, candidate in candidates_by_id.items():
        if product_id in cart:
            continue

        components = []

        rule_hit = best_rule.get(product_id)
        if rule_hit:
            components.append(
                (
                    WEIGHT_FREQUENTLY_BOUGHT_TOGETHER * rule_hit["strength"],
                    REASON_FREQUENTLY_BOUGHT_TOGETHER,
                )
            )

        if product_id in favourites:
            components.append((WEIGHT_PERSONAL_FAVOURITE * 1.0, REASON_PERSONAL_FAVOURITE))

        similarity_hit = best_similarity.get(product_id)
        if similarity_hit:
            components.append(
                (WEIGHT_SIMILAR_TASTE * similarity_hit[1], REASON_SIMILAR_TASTE)
            )

        category_id = candidate.get("categoryId")
        attach_entry = attach_by_category.get(category_id)
        attach_rate = None
        # Only pitch a category the basket is missing - that is what makes this the
        # "you have no dessert yet" slot rather than more of what they already picked.
        if attach_entry and category_id not in covered_category_ids:
            if product_id in attach_entry["topProductIds"]:
                attach_rate = attach_entry["attachRate"]
                components.append(
                    (WEIGHT_POPULAR_IN_CATEGORY * attach_rate, REASON_POPULAR_IN_CATEGORY)
                )

        popularity = popularity_score.get(product_id, 0.0)
        if popularity > 0:
            components.append((WEIGHT_POPULAR_OVERALL * popularity, REASON_POPULAR_OVERALL))

        if not components:
            continue

        total = sum(weighted for weighted, _ in components)
        primary_reason = max(components, key=lambda component: component[0])[1]

        scored.append(
            {
                "productId": product_id,
                "score": _round6(total),
                "reasonCode": primary_reason,
                "support": rule_hit["rule"]["support"] if rule_hit else None,
                "confidence": rule_hit["rule"]["confidence"] if rule_hit else None,
                "lift": rule_hit["rule"]["lift"] if rule_hit else None,
                "similarity": similarity_hit[1] if similarity_hit else None,
                "popularity": _round6(popularity) if popularity > 0 else None,
                "attachRate": attach_rate,
                "withProductId": (
                    rule_hit["rule"]["antecedent"][0]
                    if rule_hit
                    else (similarity_hit[0] if similarity_hit else None)
                ),
            }
        )

    scored.sort(key=lambda entry: (-entry["score"], entry["productId"]))
    recommendations = _apply_diversity(scored, limit)

    item_count = len(popularity_count)
    covered_items = {rule["consequent"] for rule in rules} | set(similarity)
    pair_count = sum(1 for itemset in frequent if len(itemset) == 2)

    return {
        "method": "apriori_rules+item_cf+popularity",
        "modelReady": True,
        "minimumRequired": None,
        "stats": {
            "transactionCount": transaction_count,
            "itemCount": item_count,
            "ruleCount": len(rules),
            "pairCount": pair_count,
            "avgBasketSize": _round6(
                sum(len(basket) for basket in baskets) / transaction_count
            ),
            "coverage": _round6(len(covered_items) / item_count) if item_count else 0.0,
        },
        "recommendations": recommendations,
        "rules": rules,
        "categoryAttach": category_attach,
    }


def _apply_diversity(scored: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    """
    Keep the ranking, but guarantee the last slot goes to a different kind of reason
    when one exists - otherwise a strong rule set fills the whole list with
    'frequently bought together' and the dessert/favourite suggestions never show.
    """
    if limit <= 1 or len(scored) <= limit:
        return scored[:limit]

    chosen = scored[:limit]
    if len({entry["reasonCode"] for entry in chosen}) > 1:
        return chosen

    dominant = chosen[0]["reasonCode"]
    alternative = next(
        (entry for entry in scored[limit:] if entry["reasonCode"] != dominant), None
    )
    if alternative is None:
        return chosen

    return chosen[:-1] + [alternative]
