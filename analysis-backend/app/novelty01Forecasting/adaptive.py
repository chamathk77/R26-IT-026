"""
Adaptive sales/cost/profit forecasting (Novelty 1, second version).

The first version (forecasting.py, forecast_series) picks a model from the
history length alone. Its rolling-origin evaluation showed three weaknesses
that this module addresses:

1. Model choice. A fixed ladder is not the most accurate option for every
   shop. Each candidate is re-run on the shop's own last few months and the
   one with the lowest error is used. A challenger replaces the evidence-based
   default only when it is clearly better, so a lucky streak on a handful of
   months does not swap the model.
2. Calendar effects. Months differ in length and in how many Fridays,
   Saturdays and Sundays they contain. When the shop's own weekday profile is
   supplied, the series is divided by a trading-day index before fitting and
   multiplied back afterwards. The adjustment is kept only if it lowers the
   error on the same past months by at least 3 %.
3. Prediction ranges. In-sample residuals x sqrt(h) gave ranges that were too
   narrow next month and far too wide a year out. Ranges now come from the
   model's own out-of-sample errors at each horizon.

It also forecasts profit as a range with a probability of loss (using the
correlation between sales and cost errors) and estimates the break-even sales
level from a fixed + variable cost split.

forecast_series() in forecasting.py is left unchanged: Novelty 3 reuses it and
the thesis evaluation uses it as the baseline ladder.
"""

import calendar
import math
import warnings
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
from scipy.stats import norm
from scipy.stats import t as student_t
from statsmodels.tsa.holtwinters import ExponentialSmoothing

MIN_POINTS_FOR_ANY_FORECAST = 3
SELECTION_FOLDS = 6          # most recent origins used to compare candidates
SELECTION_HORIZON = 3        # months ahead scored when comparing candidates
MIN_SELECTION_FOLDS = 3      # a candidate needs at least this many origins to be compared
CHALLENGER_MARGIN = 0.30     # a challenger must cut the default's error by 30 %
CALENDAR_MARGIN = 0.03       # the calendar adjustment must cut the error by 3 %
INTERVAL_FOLDS = 8           # most recent origins used to measure the range
INTERVAL_EXTEND = "flat"     # unmeasured horizons keep the last measured width ('sqrt' grows it)
MIN_ERRORS_PER_HORIZON = 3
AVERAGE_DAYS_PER_MONTH = 365.25 / 12
BREAK_EVEN_MIN_MONTHS = 6
BREAK_EVEN_WINDOW = 12


def _round2(value: Optional[float]) -> float:
    if value is None or not math.isfinite(value):
        return 0.0
    return round(float(value), 2)


def _clip_positive(value: float) -> float:
    return value if value > 0 else 0.0


# ---------------------------------------------------------------- candidates
def _moving_average(train, horizon, _season):
    window = train[-3:]
    level = float(np.mean(window))
    return {"forecast": [level] * horizon, "fitted": [level] * len(train),
            "params": {"window": len(window), "level": _round2(level)}}


def _seasonal_naive(train, horizon, season):
    forecast = [train[len(train) - season + (k % season)] for k in range(horizon)]
    fitted = [train[i - season] if i >= season else math.nan for i in range(len(train))]
    return {"forecast": forecast, "fitted": fitted, "params": {"seasonLength": season}}


def _exponential_smoothing(train, horizon, season, seasonal):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = ExponentialSmoothing(
            np.asarray(train, dtype=float),
            trend="add",
            damped_trend=True,
            seasonal=seasonal,
            seasonal_periods=season if seasonal else None,
        ).fit(optimized=True, use_brute=False)  # local start: faster, and no worse in our checks
    params = {
        "alpha": _round2(fit.params.get("smoothing_level", 0)),
        "beta": _round2(fit.params.get("smoothing_trend", 0)),
        "phi": _round2(fit.params.get("damping_trend", 1)),
    }
    if seasonal:
        params["gamma"] = _round2(fit.params.get("smoothing_seasonal", 0))
        params["seasonLength"] = season
    forecast = fit.forecast(horizon).tolist()
    if not all(math.isfinite(v) for v in forecast):
        raise ValueError("non-finite forecast")
    return {"forecast": forecast, "fitted": fit.fittedvalues.tolist(), "params": params}


def _holt_damped(train, horizon, season):
    return _exponential_smoothing(train, horizon, season, None)


def _holt_winters_additive(train, horizon, season):
    return _exponential_smoothing(train, horizon, season, "add")


def _holt_winters_multiplicative(train, horizon, season):
    return _exponential_smoothing(train, horizon, season, "mul")


# Order matters: on a tie the earlier candidate wins (simpler first).
CANDIDATES = [
    {"method": "moving_average", "fn": _moving_average, "min_train": lambda m: 3},
    {"method": "seasonal_naive", "fn": _seasonal_naive, "min_train": lambda m: m},
    {"method": "holt_linear_damped", "fn": _holt_damped, "min_train": lambda m: 4},
    {"method": "holt_winters_additive_damped", "fn": _holt_winters_additive,
     "min_train": lambda m: 2 * m},
    {"method": "holt_winters_multiplicative_damped", "fn": _holt_winters_multiplicative,
     "min_train": lambda m: 2 * m, "positive_only": True},
]
CANDIDATES_BY_METHOD = {c["method"]: c for c in CANDIDATES}


def default_method(n: int, season: int) -> str:
    """Evidence-based fallback from the v1 evaluation's 'revised ladder' bands."""
    if n >= 2 * season:
        return "holt_winters_additive_damped"
    if n >= season:
        return "seasonal_naive"
    return "moving_average"


# ---------------------------------------------------------------- calendar index
def trading_day_index(month_keys: Sequence[str], weekday_weights: Sequence[float]) -> List[float]:
    """
    Relative selling capacity of each month: the sum of the shop's weekday
    weights (Monday first, mean 1) over the month's days, divided by an
    average month length. A 31-day month with five Saturdays scores above 1.
    """
    weights = np.asarray(weekday_weights, dtype=float)
    weights = weights / weights.mean()
    index = []
    for key in month_keys:
        year, month = (int(part) for part in key.split("-"))
        first_weekday, days = calendar.monthrange(year, month)
        total = sum(weights[(first_weekday + d) % 7] for d in range(days))
        index.append(float(total / AVERAGE_DAYS_PER_MONTH))
    return index


def _following_month_keys(last_key: str, count: int) -> List[str]:
    year, month = (int(part) for part in last_key.split("-"))
    keys = []
    for _ in range(count):
        month += 1
        if month > 12:
            year, month = year + 1, 1
        keys.append(f"{year:04d}-{month:02d}")
    return keys


# ---------------------------------------------------------------- engine
class _SeriesForecaster:
    """Fits candidates on one series, caching every (method, adjusted, origin) run."""

    def __init__(self, series, horizon, season, index_history=None, index_future=None):
        self.series = [float(v) for v in series]
        self.n = len(self.series)
        self.horizon = horizon
        self.season = season
        self.index = None
        if index_history is not None and index_future is not None:
            self.index = list(index_history) + list(index_future)
        self._cache: Dict[Any, Optional[Dict[str, Any]]] = {}

    def run(self, method, adjusted, origin, horizon=None):
        """Forecast from the first `origin` points. Returns None if the model fails."""
        horizon = horizon or self.horizon
        key = (method, adjusted, origin, horizon)
        if key in self._cache:
            return self._cache[key]

        train = self.series[:origin]
        factors_train = factors_ahead = None
        if adjusted:
            factors_train = self.index[:origin]
            factors_ahead = self.index[origin:origin + horizon]
            train = [v / f for v, f in zip(train, factors_train)]
        try:
            result = CANDIDATES_BY_METHOD[method]["fn"](train, horizon, self.season)
            if adjusted:
                result = {
                    **result,
                    "forecast": [v * f for v, f in zip(result["forecast"], factors_ahead)],
                    "fitted": [v * f for v, f in zip(result["fitted"], factors_train)],
                }
            result["forecast"] = [_clip_positive(v) for v in result["forecast"]]
        except Exception:  # noqa: BLE001 — a failed candidate is simply not used
            result = None
        self._cache[key] = result
        return result

    def eligible(self):
        positive = all(v > 0 for v in self.series)
        return [c for c in CANDIDATES
                if self.n >= c["min_train"](self.season) and (positive or not c.get("positive_only"))]

    def fold_errors(self, method, adjusted, origins, max_h):
        """{(origin, h): actual - predicted} for every origin/horizon with a known actual."""
        errors = {}
        for origin in origins:
            steps = min(max_h, self.n - origin)
            result = self.run(method, adjusted, origin, self.horizon)
            if result is None:
                return None
            for h in range(1, steps + 1):
                errors[(origin, h)] = self.series[origin + h - 1] - result["forecast"][h - 1]
        return errors

    def score(self, method, adjusted, origins):
        errors = self.fold_errors(method, adjusted, origins, SELECTION_HORIZON)
        if not errors:
            return None
        return float(np.mean(np.abs(list(errors.values()))))

    # -------------------------------------------------- step 1: choose the model
    def select(self):
        default = default_method(self.n, self.season)
        compared = sorted(
            (c for c in self.eligible() if self.n - c["min_train"](self.season) >= MIN_SELECTION_FOLDS),
            key=lambda c: c["min_train"](self.season),
        )
        while compared and self.n - compared[-1]["min_train"](self.season) < MIN_SELECTION_FOLDS:
            compared.pop()

        selection = {"strategy": "default", "defaultMethod": default, "folds": 0, "candidates": []}
        if not compared:
            return default, selection

        folds = min(SELECTION_FOLDS, self.n - max(c["min_train"](self.season) for c in compared))
        origins = list(range(self.n - folds, self.n))
        scores = {}
        for candidate in compared:
            score = self.score(candidate["method"], False, origins)
            if score is not None:
                scores[candidate["method"]] = score
        selection["folds"] = folds
        selection["candidates"] = [
            {"method": method, "mae": _round2(score)} for method, score in scores.items()
        ]

        if default not in scores:
            # The default (e.g. Holt-Winters at 24-25 months) cannot be tested yet.
            return default, selection
        if len(scores) < 2:
            return default, selection

        best = min(scores, key=lambda m: scores[m])
        selection["strategy"] = "backtest"
        if best != default and scores[best] <= (1 - CHALLENGER_MARGIN) * scores[default]:
            return best, selection
        return default, selection

    # -------------------------------------------------- step 2: calendar adjustment
    def decide_calendar(self, method):
        if self.index is None:
            return False
        min_train = CANDIDATES_BY_METHOD[method]["min_train"](self.season)
        folds = min(SELECTION_FOLDS, self.n - min_train)
        if folds < MIN_SELECTION_FOLDS:
            return False
        origins = list(range(self.n - folds, self.n))
        raw = self.score(method, False, origins)
        adjusted = self.score(method, True, origins)
        if raw is None or adjusted is None:
            return False
        return adjusted <= (1 - CALENDAR_MARGIN) * raw

    # -------------------------------------------------- step 3: range from past errors
    def horizon_sigmas(self, method, adjusted, in_sample_sigma):
        """
        Per-horizon standard deviation of out-of-sample errors on the latest
        origins, widened by the Student-t factor for small samples. Horizons
        with fewer than three errors keep the last measured width (errors of
        damped and seasonal models level off rather than grow like sqrt(h)),
        and the width never shrinks as the horizon grows.
        Falls back to in-sample residuals x sqrt(h) when nothing can be measured.
        """
        min_train = CANDIDATES_BY_METHOD[method]["min_train"](self.season)
        first_origin = max(min_train, self.n - INTERVAL_FOLDS)
        origins = list(range(first_origin, self.n))
        errors = self.fold_errors(method, adjusted, origins, self.horizon) if origins else None

        by_h: Dict[int, List[float]] = {}
        for (_origin, h), error in (errors or {}).items():
            by_h.setdefault(h, []).append(error)

        if len(by_h.get(1, [])) < MIN_ERRORS_PER_HORIZON:
            return [in_sample_sigma * math.sqrt(h) for h in range(1, self.horizon + 1)], "residual", errors

        sigmas = []
        last_h = 1
        for h in range(1, self.horizon + 1):
            errs = by_h.get(h, [])
            if len(errs) >= MIN_ERRORS_PER_HORIZON:
                rms = math.sqrt(float(np.mean(np.square(errs))))
                widen = student_t.ppf(0.975, df=len(errs)) / 1.96
                sigma = max(rms * widen, in_sample_sigma)
                last_h = h
            else:
                growth = math.sqrt(h / last_h) if INTERVAL_EXTEND == "sqrt" else 1.0
                sigma = sigmas[last_h - 1] * growth
            if sigmas:
                sigma = max(sigma, sigmas[-1])
            sigmas.append(sigma)
        return sigmas, "empirical", errors

    # -------------------------------------------------- everything
    def forecast(self):
        method, selection = self.select()
        adjusted = self.decide_calendar(method)
        final = self.run(method, adjusted, self.n, self.horizon)
        if final is None and adjusted:
            adjusted = False
            final = self.run(method, False, self.n, self.horizon)
        if final is None:
            method = "moving_average"
            final = self.run(method, False, self.n, self.horizon)

        pairs = [(a, f) for a, f in zip(self.series, final["fitted"]) if math.isfinite(f)]
        residuals = [a - f for a, f in pairs]
        in_sample_sigma = float(np.std(residuals, ddof=1)) if len(residuals) >= 3 else 0.0
        if in_sample_sigma == 0:
            # No usable residuals (e.g. seasonal naive with exactly one season):
            # use the month-to-month variation of the series itself.
            in_sample_sigma = float(np.std(np.diff(self.series), ddof=1)) if self.n >= 3 else 0.0
        sigmas, interval_method, fold_errors = self.horizon_sigmas(method, adjusted, in_sample_sigma)

        points = []
        for predicted, sigma in zip(final["forecast"], sigmas):
            margin = 1.96 * sigma
            points.append({
                "predicted": _round2(predicted),
                "lower": _round2(_clip_positive(predicted - margin)),
                "upper": _round2(predicted + margin),
                "sigma": _round2(sigma),
            })

        return {
            "method": method,
            "params": final["params"],
            "points": points,
            "accuracy": _score([a for a, _f in pairs], [_clip_positive(f) for _a, f in pairs]),
            "backtest": self._backtest(method, adjusted, fold_errors),
            "selection": selection,
            "calendarAdjusted": adjusted,
            "intervalMethod": interval_method,
            "_errors": fold_errors or {},
        }

    def _backtest(self, method, adjusted, fold_errors):
        """Rolling-origin error of the chosen model, 1-3 months ahead."""
        if not fold_errors:
            return None
        actual, predicted = [], []
        origins = set()
        for (origin, h), error in fold_errors.items():
            if h <= SELECTION_HORIZON:
                value = self.series[origin + h - 1]
                actual.append(value)
                predicted.append(value - error)
                origins.add(origin)
        if not actual:
            return None
        return {**_score(actual, predicted), "holdoutMonths": len(origins), "method": method}


def _score(actual, predicted):
    if not actual:
        return {"mape": None, "rmse": None, "mae": None, "sampleSize": 0}
    a = np.asarray(actual, dtype=float)
    p = np.asarray(predicted, dtype=float)
    nonzero = a != 0
    mape = (_round2(float(np.mean(np.abs((a[nonzero] - p[nonzero]) / a[nonzero])) * 100))
            if nonzero.any() else None)
    return {
        "mape": mape,
        "rmse": _round2(float(np.sqrt(np.mean((a - p) ** 2)))),
        "mae": _round2(float(np.mean(np.abs(a - p)))),
        "sampleSize": len(a),
    }


def forecast_series_adaptive(series, horizon, season_length=12, index_history=None, index_future=None):
    if not series or len(series) < MIN_POINTS_FOR_ANY_FORECAST:
        return {
            "method": "insufficient_data", "params": {}, "points": [], "accuracy": None,
            "backtest": None, "selection": None, "calendarAdjusted": False,
            "intervalMethod": None, "_errors": {},
        }
    return _SeriesForecaster(series, horizon, season_length, index_history, index_future).forecast()


# ---------------------------------------------------------------- profit and break-even
def _error_correlation(sales_errors, cost_errors):
    shared = [key for key in sales_errors if key in cost_errors and key[1] <= SELECTION_HORIZON]
    if len(shared) < 4:
        return 0.0
    s = np.array([sales_errors[k] for k in shared])
    c = np.array([cost_errors[k] for k in shared])
    if s.std() == 0 or c.std() == 0:
        return 0.0
    return float(np.clip(np.corrcoef(s, c)[0, 1], -0.9, 0.9))


def profit_points(sales_points, cost_points, correlation):
    points = []
    for s, c in zip(sales_points, cost_points):
        predicted = s["predicted"] - c["predicted"]
        variance = s["sigma"] ** 2 + c["sigma"] ** 2 - 2 * correlation * s["sigma"] * c["sigma"]
        sigma = math.sqrt(max(variance, 0.0))
        loss = float(norm.cdf(-predicted / sigma)) if sigma > 0 else float(predicted < 0)
        points.append({
            "predicted": _round2(predicted),
            "lower": _round2(predicted - 1.96 * sigma),
            "upper": _round2(predicted + 1.96 * sigma),
            "sigma": _round2(sigma),
            "lossProbability": round(loss, 4),
        })
    return points


def break_even(sales, costs):
    """
    Fits monthly costs = fixed + variable_rate x sales on the latest months
    and returns the sales level at which profit is zero: fixed / (1 - rate).
    Returns a reason instead when the split is not credible.
    """
    window = min(BREAK_EVEN_WINDOW, len(sales))
    if window < BREAK_EVEN_MIN_MONTHS:
        return {"available": False, "reason": "not_enough_history", "months": window}

    x = np.asarray(sales[-window:], dtype=float)
    y = np.asarray(costs[-window:], dtype=float)
    if np.std(x) == 0:
        return {"available": False, "reason": "sales_do_not_vary", "months": window}

    rate, fixed = np.polyfit(x, y, 1)
    fitted = fixed + rate * x
    ss_res = float(np.sum((y - fitted) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

    if not (0 <= rate < 0.95) or fixed <= 0:
        return {"available": False, "reason": "no_clear_cost_split", "months": window,
                "variableCostRate": _round2(rate), "fixedCosts": _round2(fixed)}

    return {
        "available": True,
        "months": window,
        "fixedCosts": _round2(fixed),
        "variableCostRate": round(float(rate), 4),
        "contributionMargin": round(float(1 - rate), 4),
        "breakEvenSales": _round2(fixed / (1 - rate)),
        "r2": round(float(r2), 4),
    }


def forecast_sales_costs(sales, costs, horizon, season_length=12, months=None, weekday_weights=None):
    index_history = index_future = None
    if months and weekday_weights and len(months) == len(sales) and sum(weekday_weights) > 0:
        index_history = trading_day_index(months, weekday_weights)
        index_future = trading_day_index(_following_month_keys(months[-1], horizon), weekday_weights)

    sales_model = forecast_series_adaptive(sales, horizon, season_length, index_history, index_future)
    cost_model = forecast_series_adaptive(costs, horizon, season_length, index_history, index_future)
    sales_errors = sales_model.pop("_errors")
    cost_errors = cost_model.pop("_errors")

    correlation = _error_correlation(sales_errors, cost_errors)
    return {
        "sales": sales_model,
        "costs": cost_model,
        "profit": {
            "points": profit_points(sales_model["points"], cost_model["points"], correlation),
            "errorCorrelation": round(correlation, 4),
        },
        "breakEven": break_even(sales, costs),
        "calendar": {
            "weekdayWeights": [round(float(w), 4) for w in weekday_weights] if index_history else None,
            "futureIndex": [round(v, 4) for v in index_future] if index_future else None,
        },
    }
