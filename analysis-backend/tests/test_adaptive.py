"""Tests for the adaptive Novelty 1 forecaster (app/novelty01Forecasting/adaptive.py)."""

import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.novelty01Forecasting.adaptive import (
    break_even,
    forecast_sales_costs,
    forecast_series_adaptive,
    profit_points,
    trading_day_index,
)

MONTH_SEASONALITY = [0.88, 0.9, 0.97, 1.18, 1.0, 0.92, 1.02, 1.1, 0.95, 0.98, 1.05, 1.28]


def seasonal_series(months, base=2_400_000.0, growth=0.006, noise=0.04, seed=7):
    rng = np.random.default_rng(seed)
    return [
        base * (1 + growth) ** i * MONTH_SEASONALITY[i % 12] * rng.uniform(1 - noise, 1 + noise)
        for i in range(months)
    ]


def month_keys(count, start_year=2023, start_month=1):
    return [f"{start_year + (start_month - 1 + i) // 12}-{(start_month - 1 + i) % 12 + 1:02d}"
            for i in range(count)]


@pytest.mark.parametrize("months, method", [
    (2, "insufficient_data"),
    (3, "moving_average"),
    (12, "seasonal_naive"),
    (24, "holt_winters_additive_damped"),
])
def test_tc_p11_default_model_when_history_is_too_short_to_compare(months, method):
    result = forecast_series_adaptive(seasonal_series(months), horizon=13)
    assert result["method"] == method
    if months >= 3:
        assert result["selection"]["strategy"] == "default"
        assert len(result["points"]) == 13


def test_tc_p12_backtest_replaces_the_default_only_when_clearly_better():
    # A clean upward trend: seasonal naive (the 12-23 month default) lags a year behind.
    trend = [1000.0 + 40.0 * i for i in range(18)]
    result = forecast_series_adaptive(trend, horizon=13)
    assert result["selection"]["strategy"] == "backtest"
    assert result["selection"]["defaultMethod"] == "seasonal_naive"
    assert result["method"] == "holt_linear_damped"

    seasonal = forecast_series_adaptive(seasonal_series(36), horizon=13)
    assert seasonal["method"].startswith("holt_winters")
    assert seasonal["backtest"]["holdoutMonths"] >= 3


def test_tc_p13_trading_day_index_and_adjustment():
    weights = [0.8, 0.8, 0.9, 1.0, 1.2, 1.5, 0.8]  # Monday first
    index = trading_day_index(["2026-02", "2026-03", "2026-05"], weights)
    assert index[0] < index[1]  # 28-day February sells less than 31-day March
    # Same length, but May 2026 has five Fridays and Saturdays, March 2026 has four.
    assert index[2] > index[1]

    keys = month_keys(30)
    capacity = trading_day_index(keys, weights)
    sales = [1_000_000.0 * (1.004 ** i) * c for i, c in enumerate(capacity)]
    costs = [400_000.0 + 0.3 * s for s in sales]

    adjusted = forecast_sales_costs(sales, costs, 13, months=keys, weekday_weights=weights)
    assert adjusted["sales"]["calendarAdjusted"] is True
    plain = forecast_sales_costs(sales, costs, 13)
    assert plain["sales"]["calendarAdjusted"] is False
    assert adjusted["sales"]["backtest"]["mae"] < plain["sales"]["backtest"]["mae"]


@pytest.mark.parametrize("months, interval_method", [(3, "residual"), (12, "residual"), (36, "empirical")])
def test_tc_p14_ranges_contain_the_forecast_and_never_narrow(months, interval_method):
    result = forecast_series_adaptive(seasonal_series(months), horizon=13)
    assert result["intervalMethod"] == interval_method
    sigmas = [p["sigma"] for p in result["points"]]
    assert sigmas[0] > 0
    assert all(b >= a for a, b in zip(sigmas, sigmas[1:]))
    for point in result["points"]:
        assert 0 <= point["lower"] <= point["predicted"] <= point["upper"]


def test_tc_p15_profit_range_and_loss_probability():
    sales = [{"predicted": 100.0, "sigma": 10.0}]
    costs = [{"predicted": 100.0, "sigma": 10.0}]

    independent = profit_points(sales, costs, 0.0)[0]
    assert independent["predicted"] == 0
    assert independent["sigma"] == pytest.approx(math.sqrt(200), abs=0.01)
    assert independent["lossProbability"] == pytest.approx(0.5)

    correlated = profit_points(sales, costs, 0.5)[0]
    assert correlated["sigma"] == pytest.approx(10.0, abs=0.01)

    safe = profit_points([{"predicted": 200.0, "sigma": 10.0}], costs, 0.0)[0]
    assert safe["lossProbability"] < 0.001


def test_tc_p16_break_even_from_fixed_and_variable_costs():
    sales = [800.0, 950.0, 1200.0, 700.0, 1000.0, 1100.0, 900.0, 1300.0]
    costs = [300.0 + 0.3 * s for s in sales]
    result = break_even(sales, costs)
    assert result["available"] is True
    assert result["fixedCosts"] == pytest.approx(300.0)
    assert result["variableCostRate"] == pytest.approx(0.3)
    assert result["breakEvenSales"] == pytest.approx(300 / 0.7, abs=0.01)

    assert break_even(sales[:5], costs[:5]) == {"available": False, "reason": "not_enough_history", "months": 5}
    falling = [1000.0 - 0.5 * s for s in sales]  # costs fall as sales rise: no credible split
    assert break_even(sales, falling)["available"] is False


def test_tc_p17_same_input_gives_identical_output():
    sales, keys = seasonal_series(30), month_keys(30)
    costs = [0.5 * s + 300_000 for s in sales]
    weights = [0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 0.9]
    first = forecast_sales_costs(sales, costs, 13, months=keys, weekday_weights=weights)
    assert first == forecast_sales_costs(sales, costs, 13, months=keys, weekday_weights=weights)


def test_tc_p18_sales_cost_api_validates_requests():
    client = TestClient(app)
    sales = seasonal_series(30)
    costs = [0.5 * s + 300_000 for s in sales]

    ok = client.post("/forecast/sales-cost", json={
        "sales": sales, "costs": costs, "horizon": 13, "months": month_keys(30),
        "weekdayWeights": [0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 0.9],
    })
    assert ok.status_code == 200
    body = ok.json()
    assert len(body["sales"]["points"]) == 13
    assert len(body["profit"]["points"]) == 13
    assert body["breakEven"]["available"] is True

    mismatched = client.post("/forecast/sales-cost", json={"sales": sales, "costs": costs[:-1]})
    assert mismatched.status_code == 422
    short_weights = client.post("/forecast/sales-cost", json={
        "sales": sales, "costs": costs, "weekdayWeights": [1, 1, 1]})
    assert short_weights.status_code == 422
