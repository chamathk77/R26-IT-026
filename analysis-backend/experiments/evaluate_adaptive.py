"""
Before/after evaluation of the adaptive forecaster (app/novelty01Forecasting/adaptive.py).

Run from analysis-backend/:   .venv/bin/python -m experiments.evaluate_adaptive [--quick]

Uses the same generator, scenarios and rolling-origin design as evaluate_forecasting.py
and compares, on identical folds:
    ladder              v1 production model (forecast_series)
    revised_ladder      v1 evaluation's suggested bands (MA3 / seasonal naive / Holt-Winters)
    adaptive_plain      v2 without the trading-day adjustment
    adaptive            v2 with the trading-day adjustment (the seed's weekday profile)

--quick uses 6 different branches (seeds 5000+) for a fast check; the full run uses the
thesis seeds (1000 + replicate). Results go to results/adaptive/, leaving the v1 results
in results/ untouched.
"""

import json
import os
import sys
import time
from datetime import date
from multiprocessing import Pool

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.novelty01Forecasting.adaptive import forecast_sales_costs  # noqa: E402
from app.novelty01Forecasting.forecasting import forecast_series  # noqa: E402
from experiments.evaluate_forecasting import (  # noqa: E402
    HORIZON, MONTHS, SEASON, WEEKDAY_SEASONALITY_SUN_FIRST, generate_branch, load_devdb,
    mase_scale, revised_ladder,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "results", "adaptive")
WEEKDAY_MONDAY_FIRST = WEEKDAY_SEASONALITY_SUN_FIRST[1:] + WEEKDAY_SEASONALITY_SUN_FIRST[:1]
REPORT_H = (1, 3, 6, 12)


def month_keys(start, count):
    return [f"{start.year + (start.month - 1 + i) // 12:04d}-{(start.month - 1 + i) % 12 + 1:02d}"
            for i in range(count)]


def evaluate_branch(job):
    scenario, series_id, sales, costs, months = job
    rows, timings = [], []
    n = len(sales)
    for t in range(3, n):
        h_max = min(HORIZON, n - t)
        actual = {"sales": sales[t:t + h_max], "costs": costs[t:t + h_max]}
        scale = {"sales": mase_scale(sales[:t]), "costs": mase_scale(costs[:t])}

        outputs = {}
        for target, values in (("sales", sales), ("costs", costs)):
            v1 = forecast_series(values[:t], HORIZON, SEASON)
            outputs[("ladder", target)] = [(p["predicted"], p["lower"], p["upper"]) for p in v1["points"]]
            outputs[("revised_ladder", target)] = [(v, None, None) for v in revised_ladder(values[:t], HORIZON)]

        for method, weights in (("adaptive_plain", None), ("adaptive", WEEKDAY_MONDAY_FIRST)):
            started = time.perf_counter()
            v2 = forecast_sales_costs(sales[:t], costs[:t], HORIZON, SEASON, months[:t], weights)
            timings.append((method, t, time.perf_counter() - started))
            for target in ("sales", "costs"):
                outputs[(method, target)] = [(p["predicted"], p["lower"], p["upper"]) for p in v2[target]["points"]]
                if method == "adaptive":
                    rows.append([scenario, series_id, target, "model:" + v2[target]["method"],
                                 t, 0, v2[target]["calendarAdjusted"], None, None, None, None])
            if method == "adaptive":
                profit_actual = [s - c for s, c in zip(actual["sales"], actual["costs"])]
                for k in range(h_max):
                    p = v2["profit"]["points"][k]
                    rows.append([scenario, series_id, "profit", method, t, k + 1,
                                 profit_actual[k], p["predicted"], p["lower"], p["upper"], None])

        for (method, target), points in outputs.items():
            for k in range(h_max):
                predicted, lower, upper = points[k]
                rows.append([scenario, series_id, target, method, t, k + 1,
                             actual[target][k], predicted, lower, upper, scale[target]])
    return rows, timings


def history_band(t):
    return "3-11" if t < 12 else "12-23" if t < 24 else "24-35"


def summarise(rows):
    scored = [r for r in rows if not str(r[3]).startswith("model:")]
    groups = {}
    for r in scored:
        groups.setdefault((r[0], r[2], r[3], r[5]), []).append(r)
        groups.setdefault((r[0], r[2], r[3], "band:" + history_band(r[4]), r[5] <= 3), []).append(r)

    accuracy, coverage, bands = [], [], []
    for key, sel in sorted(groups.items(), key=lambda kv: str(kv[0])):
        a = np.array([r[6] for r in sel], dtype=float)
        p = np.array([r[7] for r in sel], dtype=float)
        e = a - p
        nz = a != 0
        s = np.array([r[10] if r[10] is not None else np.nan for r in sel], dtype=float)
        ok = np.isfinite(s)
        stats = {
            "n": len(sel),
            "mape": float(np.mean(np.abs(e[nz] / a[nz])) * 100) if nz.any() else None,
            "mase": float(np.mean(np.abs(e[ok]) / s[ok])) if ok.any() else None,
        }
        if len(key) == 5:
            if key[4]:
                bands.append({"scenario": key[0], "target": key[1], "method": key[2],
                              "history": key[3][5:], "h_max": 3, **stats})
            continue
        if key[3] in REPORT_H:
            accuracy.append({"scenario": key[0], "target": key[1], "method": key[2], "h": key[3], **stats})
            if sel[0][8] is not None:
                lo = np.array([r[8] for r in sel], dtype=float)
                hi = np.array([r[9] for r in sel], dtype=float)
                inside = (a >= lo) & (a <= hi)
                width = (hi - lo)[nz] / np.abs(a[nz]) * 100
                coverage.append({"scenario": key[0], "target": key[1], "method": key[2], "h": key[3],
                                 "n": len(sel), "coverage": float(inside.mean() * 100),
                                 "mean_width_pct_of_actual": float(width.mean())})

    models, calendar_used = {}, {}
    for r in rows:
        if str(r[3]).startswith("model:"):
            mk = (r[0], r[2], r[3][6:])
            models[mk] = models.get(mk, 0) + 1
            ck = (r[0], r[2])
            hit, total = calendar_used.get(ck, (0, 0))
            calendar_used[ck] = (hit + int(bool(r[6])), total + 1)
    return {
        "accuracy": accuracy,
        "coverage": coverage,
        "by_history_h1_3": bands,
        "models_used": [{"scenario": k[0], "target": k[1], "model": k[2], "folds": v}
                        for k, v in sorted(models.items())],
        "calendar_adjusted_share": [{"scenario": k[0], "target": k[1], "share": v[0] / v[1] * 100}
                                    for k, v in sorted(calendar_used.items())],
    }


def main():
    quick = "--quick" in sys.argv
    replicates, seed_base = (6, 5000) if quick else (30, 1000)
    jobs = []
    for scenario, shock in (("S1_seed", 0.0), ("S2_shocks", 0.12)):
        for rep in range(replicates):
            rng = np.random.default_rng(seed_base + rep)
            start = date(2023, 1 + rep % 12, 1)
            s, c = generate_branch(rng, start=start, month_shock=shock)
            jobs.append((scenario, rep, s, c, month_keys(start, MONTHS)))

    dev = load_devdb()
    clean = dev[: [r["month"] for r in dev].index("2026-08")]
    jobs.append(("S3_devdb", 0, [float(r["sales"]) for r in clean], [float(r["costs"]) for r in clean],
                 [r["month"] for r in clean]))

    rows, timings = [], []
    with Pool() as pool:
        for job_rows, job_timings in pool.imap_unordered(evaluate_branch, jobs):
            rows.extend(job_rows)
            timings.extend(job_timings)
            print(".", end="", flush=True)
    print()

    summary = summarise(rows)
    secs = np.array([x[2] for x in timings if x[0] == "adaptive" and x[1] >= 24])
    summary["timing_adaptive_ge24_ms"] = {"median": float(np.median(secs) * 1000),
                                          "p95": float(np.percentile(secs, 95) * 1000)}
    summary["config"] = {"quick": quick, "replicates": replicates, "seed_base": seed_base,
                         "months": MONTHS, "horizon": HORIZON, "season": SEASON,
                         "weekday_profile": "seed generator (Monday first)"}
    out = OUT + ("_quick" if quick else "")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)
    print("rows", len(rows), "->", out)


if __name__ == "__main__":
    main()
