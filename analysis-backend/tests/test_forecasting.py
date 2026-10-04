"""Tests for Novelty 1 (sales/cost forecasting). Test IDs match Table 5.3 of the thesis."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.novelty01Forecasting.forecasting import _score_accuracy, forecast_series

# Month-of-year demand multipliers used by the seed generator (Jan..Dec).
MONTH_SEASONALITY = [0.88, 0.9, 0.97, 1.18, 1.0, 0.92, 1.02, 1.1, 0.95, 0.98, 1.05, 1.28]


def seasonal_series(months, base=2_400_000.0, growth=0.006, noise=0.04, seed=7):
    """Restaurant-like monthly sales: growth x month seasonality x noise, deterministic."""
    rng = np.random.default_rng(seed)
    return [
        base * (1 + growth) ** i * MONTH_SEASONALITY[i % 12] * rng.uniform(1 - noise, 1 + noise)
        for i in range(months)
    ]


def test_tc_p1_two_points_gives_no_forecast():
    result = forecast_series([100.0, 120.0], horizon=13)
    assert result["method"] == "insufficient_data"
    assert result["points"] == []


def test_tc_p2_three_points_uses_moving_average():
    result = forecast_series([100.0, 120.0, 110.0], horizon=13)
    assert result["method"] == "moving_average"
    assert result["points"][0]["predicted"] == pytest.approx(110.0)


@pytest.mark.parametrize("months", [4, 23])
def test_tc_p3_four_to_twenty_three_points_use_damped_holt(months):
    result = forecast_series(seasonal_series(months), horizon=13)
    assert result["method"] == "holt_linear_damped"
    assert len(result["points"]) == 13


@pytest.mark.parametrize("months", [24, 36])
def test_tc_p4_twenty_four_points_use_holt_winters(months):
    result = forecast_series(seasonal_series(months), horizon=13)
    assert result["method"] == "holt_winters_additive_damped"
    assert result["params"]["seasonLength"] == 12


def test_tc_p5_falling_series_never_forecasts_below_zero():
    falling = [1000.0 - 90.0 * i for i in range(10)]  # 1000 down to 190
    result = forecast_series(falling, horizon=13)
    for point in result["points"]:
        assert point["predicted"] >= 0
        assert point["lower"] >= 0


@pytest.mark.parametrize("months", [3, 12, 36])
def test_tc_p6_range_contains_prediction_and_widens(months):
    points = forecast_series(seasonal_series(months), horizon=13)["points"]
    upper_margins = []
    for point in points:
        assert point["lower"] <= point["predicted"] <= point["upper"]
        upper_margins.append(point["upper"] - point["predicted"])
    # margin = 1.96 x residual SD x sqrt(h): never shrinks as the horizon grows
    assert all(b >= a - 0.02 for a, b in zip(upper_margins, upper_margins[1:]))


def test_tc_p7_same_input_gives_identical_output():
    series = seasonal_series(36)
    assert forecast_series(series, horizon=13) == forecast_series(series, horizon=13)


def test_tc_p8_mape_skips_months_with_zero_actuals():
    scored = _score_accuracy([0.0, 100.0], [10.0, 110.0])
    assert scored["mape"] == pytest.approx(10.0)
    assert scored["mae"] == pytest.approx(10.0)
    assert scored["sampleSize"] == 2


def test_tc_p9_backtest_rules_at_24_and_30_months():
    assert forecast_series(seasonal_series(24), horizon=13)["backtest"] is None

    backtest = forecast_series(seasonal_series(30), horizon=13)["backtest"]
    assert backtest["holdoutMonths"] == 6
    assert backtest["method"] == "holt_winters_additive_damped"
    assert backtest["mape"] is not None


def test_tc_p10_api_validates_requests():
    client = TestClient(app)

    ok = client.post("/forecast", json={"series": seasonal_series(36), "horizon": 13, "seasonLength": 12})
    assert ok.status_code == 200
    assert ok.json()["method"] == "holt_winters_additive_damped"

    bad = client.post("/forecast", json={"series": "not a list", "horizon": 13})
    assert bad.status_code == 422
