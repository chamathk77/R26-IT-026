"""
Worked examples for the thesis figures (Chapter 6), from the development branch history.

Run from analysis-backend/:   .venv/bin/python -m experiments.example_forecasts
"""

import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.novelty01Forecasting.forecasting import forecast_series  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    rows = list(csv.DictReader(open(os.path.join(HERE, "data", "dev_branch_monthly.csv"))))
    rows = [r for r in rows if r["partial"] != "true"]
    months = [r["month"] for r in rows]
    sales = [float(r["sales"]) for r in rows]

    # Held-out example: train on the first 24 complete months, forecast the next 5 clean months.
    train_end = months.index("2026-03")          # 2024-03 .. 2026-02 = 24 months
    clean_end = months.index("2026-08")          # 2026-07 is the last fully recorded month
    held = forecast_series(sales[:train_end], 12)
    holdout = {
        "train_months": months[:train_end],
        "train_sales": sales[:train_end],
        "test_months": months[train_end:clean_end],
        "test_actual": sales[train_end:clean_end],
        "method": held["method"],
        "params": held["params"],
        "forecast": held["points"][: clean_end - train_end],
    }

    # Stale-data case: the app's view (with Aug/Sep 2026) versus history trimmed to Jul 2026.
    as_is = forecast_series(sales, 13)
    trimmed = forecast_series(sales[:clean_end], 13)
    stale = {
        "months": months,
        "sales": sales,
        "as_is_first_month": "2026-10",
        "as_is": as_is["points"][:4],
        "as_is_backtest": as_is["backtest"],
        "trimmed_first_month": "2026-08",
        "trimmed": trimmed["points"][:4],
        "trimmed_backtest": trimmed["backtest"],
    }

    os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
    with open(os.path.join(HERE, "results", "examples.json"), "w") as f:
        json.dump({"holdout": holdout, "stale": stale}, f, indent=2)
    errs = [abs(a - p["predicted"]) / a * 100 for a, p in zip(holdout["test_actual"], holdout["forecast"])]
    inside = [p["lower"] <= a <= p["upper"] for a, p in zip(holdout["test_actual"], holdout["forecast"])]
    print("holdout", held["method"], "MAPE %.2f" % (sum(errs) / len(errs)), "inside", sum(inside), "/", len(inside))


if __name__ == "__main__":
    main()
