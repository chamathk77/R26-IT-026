"""
Sales/cost forecasting. Mirrors the model ladder used previously by the
Node fallback (backend/src/novelty/novelty01Forecasting/forecastEngine.js),
but fits Holt-Winters/Holt-linear via statsmodels' MLE optimizer instead of
a hand-rolled grid search. Method name strings and response shape are kept
identical to that JS module so the existing Node controller and the Expo
frontend (ForecastSection.tsx's describeMethod()) need no changes.
"""

import math
from typing import Any, Dict, List, Optional

import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing

MIN_POINTS_FOR_ANY_FORECAST = 3
MIN_POINTS_FOR_TREND = 4
MIN_POINTS_FOR_SEASONAL = 24


def _round2(value: float) -> float:
    if value is None or not math.isfinite(value):
        return 0.0
    return round(float(value), 2)


def _clip_positive(value: float) -> float:
    return value if value > 0 else 0.0


def _mean(values) -> float:
    values = list(values)
    return float(np.mean(values)) if values else 0.0


def _std(values) -> float:
    values = list(values)
    if len(values) < 2:
        return 0.0
    return float(np.std(values, ddof=1))


def _score_accuracy(actual: List[float], predicted: List[float]) -> Dict[str, Any]:
    if not actual:
        return {"mape": None, "rmse": None, "mae": None, "sampleSize": 0}

    actual_arr = np.array(actual, dtype=float)
    predicted_arr = np.array(predicted, dtype=float)

    nonzero_mask = actual_arr != 0
    mape = (
        _round2(float(np.mean(np.abs((actual_arr[nonzero_mask] - predicted_arr[nonzero_mask]) / actual_arr[nonzero_mask]))) * 100)
        if nonzero_mask.any()
        else None
    )
    rmse = _round2(float(np.sqrt(np.mean((actual_arr - predicted_arr) ** 2))))
    mae = _round2(float(np.mean(np.abs(actual_arr - predicted_arr))))

    return {"mape": mape, "rmse": rmse, "mae": mae, "sampleSize": len(actual)}


def _linear_regression_forecast(series: List[float], horizon: int) -> Dict[str, Any]:
    n = len(series)
    indices = np.arange(n)
    slope, intercept = np.polyfit(indices, series, 1)
    fitted = (intercept + slope * indices).tolist()
    forecast = [intercept + slope * (n - 1 + h) for h in range(1, horizon + 1)]
    return {
        "method": "linear_regression",
        "params": {"slope": _round2(slope), "intercept": _round2(intercept)},
        "fitted": fitted,
        "forecast": forecast,
    }


def _moving_average_forecast(series: List[float], horizon: int) -> Dict[str, Any]:
    window = series[-min(3, len(series)):]
    level = _mean(window)
    return {
        "method": "moving_average",
        "params": {"window": len(window), "level": _round2(level)},
        "fitted": [level] * len(series),
        "forecast": [level] * horizon,
    }


def _holt_winters_forecast(series: List[float], horizon: int, season_length: int) -> Dict[str, Any]:
    try:
        fit = ExponentialSmoothing(
            np.array(series, dtype=float),
            trend="add",
            damped_trend=True,
            seasonal="add",
            seasonal_periods=season_length,
        ).fit(optimized=True)

        forecast = fit.forecast(horizon).tolist()
        params = fit.params
        return {
            "method": "holt_winters_additive_damped",
            "params": {
                "alpha": _round2(params.get("smoothing_level", 0)),
                "beta": _round2(params.get("smoothing_trend", 0)),
                "gamma": _round2(params.get("smoothing_seasonal", 0)),
                "phi": _round2(params.get("damping_trend", 1)),
                "seasonLength": season_length,
            },
            "fitted": fit.fittedvalues.tolist(),
            "forecast": forecast,
        }
    except Exception:
        return _holt_linear_forecast(series, horizon)


def _holt_linear_forecast(series: List[float], horizon: int) -> Dict[str, Any]:
    try:
        fit = ExponentialSmoothing(
            np.array(series, dtype=float),
            trend="add",
            damped_trend=True,
        ).fit(optimized=True)

        forecast = fit.forecast(horizon).tolist()
        params = fit.params
        return {
            "method": "holt_linear_damped",
            "params": {
                "alpha": _round2(params.get("smoothing_level", 0)),
                "beta": _round2(params.get("smoothing_trend", 0)),
                "phi": _round2(params.get("damping_trend", 1)),
            },
            "fitted": fit.fittedvalues.tolist(),
            "forecast": forecast,
        }
    except Exception:
        return _linear_regression_forecast(series, horizon)


def _select_model(series: List[float], horizon: int, season_length: int) -> Dict[str, Any]:
    n = len(series)
    # Two full cycles are needed before Holt-Winters can even attempt a
    # seasonal decomposition. MIN_POINTS_FOR_SEASONAL (24) is the special
    # case for monthly/12-month seasonality kept as the default floor; other
    # season lengths (e.g. 7 for daily/weekly series) scale from 2x instead.
    min_seasonal_points = max(MIN_POINTS_FOR_SEASONAL, 2 * season_length) if season_length == 12 else 2 * season_length
    if n >= min_seasonal_points:
        return _holt_winters_forecast(series, horizon, season_length)
    if n >= MIN_POINTS_FOR_TREND:
        return _holt_linear_forecast(series, horizon)
    return _moving_average_forecast(series, horizon)


def _backtest(series: List[float], season_length: int) -> Optional[Dict[str, Any]]:
    n = len(series)
    holdout = min(6, n // 4)
    min_seasonal_points = max(MIN_POINTS_FOR_SEASONAL, 2 * season_length) if season_length == 12 else 2 * season_length

    if n >= min_seasonal_points:
        holdout = min(holdout, n - min_seasonal_points)

    if holdout < 1 or n - holdout < MIN_POINTS_FOR_ANY_FORECAST:
        return None

    train = series[: n - holdout]
    actual = series[n - holdout :]
    model = _select_model(train, holdout, season_length)
    predicted = [_clip_positive(v) for v in model["forecast"]]

    scored = _score_accuracy(actual, predicted)
    return {**scored, "holdoutMonths": holdout, "method": model["method"]}


def forecast_series(series: List[float], horizon: int, season_length: int = 12) -> Dict[str, Any]:
    if not series or len(series) < MIN_POINTS_FOR_ANY_FORECAST:
        return {
            "method": "insufficient_data",
            "params": {},
            "points": [],
            "accuracy": None,
            "backtest": None,
        }

    model = _select_model(series, horizon, season_length)
    fitted_clipped = [_clip_positive(v) for v in model["fitted"]]
    residuals = [series[i] - model["fitted"][i] for i in range(len(series))]
    residual_spread = _std(residuals)

    points = []
    for index, raw_value in enumerate(model["forecast"]):
        predicted = _clip_positive(raw_value)
        margin = 1.96 * residual_spread * math.sqrt(index + 1)
        points.append(
            {
                "predicted": _round2(predicted),
                "lower": _round2(_clip_positive(predicted - margin)),
                "upper": _round2(predicted + margin),
            }
        )

    return {
        "method": model["method"],
        "params": model["params"],
        "points": points,
        "accuracy": _score_accuracy(series, fitted_clipped),
        "backtest": _backtest(series, season_length),
    }
