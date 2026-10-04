"""
Thesis figures for Chapter 6 from results/summary.json and results/examples.json.
Needs matplotlib (not a service dependency):  pip install matplotlib
Run from analysis-backend/:   python -m experiments.make_figures
"""

import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "results")
FIG = os.path.join(RES, "figures")

# Validated categorical slots (light surface) and chart chrome.
BLUE, ORANGE, AQUA, YELLOW = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
INK, INK2, MUTED, GRID, AXIS = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7"

plt.rcParams.update({
    "font.family": "Arial", "font.size": 9, "axes.edgecolor": AXIS, "axes.labelcolor": INK2,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6, "axes.axisbelow": True,
    "lines.linewidth": 2, "lines.markersize": 5, "legend.frameon": False, "savefig.dpi": 220,
})


def lkr_m(v, _=None):
    return f"{v / 1e6:.1f}M"


def fig_history(summary):
    bands = ["3-5", "6-11", "12-17", "18-23", "24-35"]
    series = [("ladder", "Production ladder", BLUE, "o"), ("revised_ladder", "Revised ladder", ORANGE, "s"),
              ("seasonal_naive", "Seasonal naive", AQUA, "^"), ("moving_average_3", "3-month average", YELLOW, "D")]
    fig, axes = plt.subplots(1, 2, figsize=(6.3, 2.9), sharey=True)
    for ax, target, title in zip(axes, ("sales", "costs"), ("Sales", "Costs")):
        for key, label, color, marker in series:
            pts = {r["history"]: r["mape"] for r in summary["by_history"]
                   if r["scenario"] == "S1_seed" and r["target"] == target and r["method"] == key}
            xs = [i for i, b in enumerate(bands) if b in pts]
            ax.plot(xs, [pts[bands[i]] for i in xs], color=color, marker=marker, label=label,
                    markeredgecolor="white", markeredgewidth=0.8)
        ax.set_xticks(range(len(bands)), [b.replace("-", "–") for b in bands])
        ax.set_xlabel("Months of history available")
        ax.set_title(title, loc="left", fontsize=9.5, color=INK, fontweight="bold")
        ax.set_ylim(0, 18)
    axes[0].set_ylabel("MAPE, 1–3 months ahead (%)")
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="lower center", ncol=4, fontsize=8.5, bbox_to_anchor=(0.5, -0.02))
    fig.tight_layout(rect=(0, 0.08, 1, 1))
    fig.savefig(os.path.join(FIG, "fig_error_by_history.png"))
    plt.close(fig)


def fig_coverage(summary):
    fig, ax = plt.subplots(figsize=(6.3, 2.7))
    hs = [1, 3, 6, 12]
    vals = {}
    for target in ("sales", "costs"):
        pts = {r["h"]: r["coverage"] for r in summary["coverage"]
               if r["scenario"] == "S1_seed" and r["target"] == target and r["folds"] == "all"}
        vals[target] = [pts[h] for h in hs]
    for target, label, color, marker in (("sales", "Sales", BLUE, "o"), ("costs", "Costs", ORANGE, "s")):
        other = vals["costs" if target == "sales" else "sales"]
        ax.plot(range(4), vals[target], color=color, marker=marker, label=label,
                markeredgecolor="white", markeredgewidth=0.8)
        for i, y in enumerate(vals[target]):
            above = y >= other[i]
            ax.annotate(f"{y:.0f}%", (i, y), textcoords="offset points", xytext=(0, 7 if above else -13),
                        ha="center", fontsize=8, color=INK2)
    ax.axhline(95, color=INK2, linewidth=1, linestyle=(0, (4, 3)))
    ax.text(-0.25, 95.6, "nominal 95%", va="bottom", fontsize=8, color=INK2)
    ax.set_xticks(range(4), [f"{h} month{'s' if h > 1 else ''}" for h in hs])
    ax.set_xlabel("Forecast horizon")
    ax.set_ylabel("Actuals inside the range (%)")
    ax.set_ylim(70, 103)
    ax.set_xlim(-0.3, 3.7)
    ax.legend(loc="lower right", fontsize=8.5)
    fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig_coverage.png"))
    plt.close(fig)


def fig_holdout(examples):
    h = examples["holdout"]
    train_m, test_m = h["train_months"][-12:], h["test_months"]
    train_y = h["train_sales"][-12:]
    x_train = list(range(len(train_m)))
    x_test = list(range(len(train_m), len(train_m) + len(test_m)))
    pred = [p["predicted"] for p in h["forecast"]]
    lo = [p["lower"] for p in h["forecast"]]
    hi = [p["upper"] for p in h["forecast"]]
    fig, ax = plt.subplots(figsize=(6.3, 2.9))
    ax.fill_between(x_test, lo, hi, color=BLUE, alpha=0.14, linewidth=0, label="95% range")
    ax.plot(x_train, train_y, color=INK2, marker="o", label="Training data (last 12 of 24 months)",
            markeredgecolor="white", markeredgewidth=0.8)
    ax.plot(x_test, pred, color=BLUE, marker="s", label="Forecast (Holt-Winters)", markeredgecolor="white", markeredgewidth=0.8)
    ax.plot(x_test, h["test_actual"], color=ORANGE, marker="D", linestyle="none", label="Actual (held out)",
            markeredgecolor="white", markeredgewidth=0.8, markersize=6)
    labels = [m[2:].replace("-", "/") for m in train_m + test_m]
    ax.set_xticks(x_train + x_test, labels, rotation=0, fontsize=7.5)
    ax.axvline(len(train_m) - 0.5, color=AXIS, linewidth=1)
    ax.yaxis.set_major_formatter(lkr_m)
    ax.set_ylabel("Monthly sales (LKR)")
    ax.set_xlabel("Month (yy/mm)")
    ax.set_ylim(1.2e6, 4.6e6)
    ax.legend(loc="upper left", ncol=2, fontsize=8)
    fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig_holdout.png"))
    plt.close(fig)


def fig_stale(examples):
    s = examples["stale"]
    months, sales = s["months"], s["sales"]
    k = months.index("2025-07")
    hist_m, hist_y = months[k:], sales[k:]
    x = list(range(len(hist_m)))
    i_aug = hist_m.index("2026-08")
    fig, ax = plt.subplots(figsize=(6.3, 2.9))
    ax.plot(x[: i_aug + 1], hist_y[: i_aug + 1], color=INK2, marker="o", label="Recorded sales",
            markeredgecolor="white", markeredgewidth=0.8)
    ax.plot(x[i_aug - 1:], hist_y[i_aug - 1:], color=INK2, linestyle=(0, (3, 2)), marker="o",
            markeredgecolor="white", markeredgewidth=0.8)
    trim_x = [i_aug + j for j in range(4)]
    ax.plot(trim_x, [p["predicted"] for p in s["trimmed"]], color=BLUE, marker="s",
            label="Forecast, history trimmed to Jul 2026", markeredgecolor="white", markeredgewidth=0.8)
    asis_x = [len(hist_m) + j for j in range(4)]
    ax.plot(asis_x, [p["predicted"] for p in s["as_is"]], color=ORANGE, marker="D",
            label="Forecast as the app shows it", markeredgecolor="white", markeredgewidth=0.8)
    ax.annotate("half-recorded month", (i_aug, hist_y[i_aug]), xytext=(i_aug - 5.2, 1.0e6), fontsize=8, color=INK2,
                arrowprops={"arrowstyle": "-", "color": MUTED, "linewidth": 0.8})
    ax.annotate("3 test orders", (i_aug + 1, hist_y[i_aug + 1]), xytext=(i_aug - 3.2, 0.35e6), fontsize=8, color=INK2,
                arrowprops={"arrowstyle": "-", "color": MUTED, "linewidth": 0.8})
    all_m = hist_m + ["2026-10", "2026-11", "2026-12", "2027-01"]
    ax.set_xticks(range(len(all_m)), [m[2:].replace("-", "/") for m in all_m], fontsize=7.5, rotation=0)
    for lbl in ax.get_xticklabels()[1::2]:
        lbl.set_visible(False)
    ax.yaxis.set_major_formatter(lkr_m)
    ax.set_ylabel("Monthly sales (LKR)")
    ax.set_xlabel("Month (yy/mm)")
    ax.set_ylim(-0.1e6, 3.9e6)
    ax.legend(loc="lower left", fontsize=8, ncol=1)
    fig.tight_layout()
    fig.savefig(os.path.join(FIG, "fig_stale.png"))
    plt.close(fig)


def main():
    os.makedirs(FIG, exist_ok=True)
    summary = json.load(open(os.path.join(RES, "summary.json")))
    examples = json.load(open(os.path.join(RES, "examples.json")))
    fig_history(summary)
    fig_coverage(summary)
    fig_holdout(examples)
    fig_stale(examples)
    print("figures ->", FIG)


if __name__ == "__main__":
    main()
