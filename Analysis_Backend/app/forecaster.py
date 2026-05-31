"""
Training and prediction logic aligned with Train_In_Colab.ipynb:
- monthly CSV: month, sales, cost
- 3-month lags + calendar month (month_index)
- HistGradientBoostingRegressor in a Pipeline with StandardScaler
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import get_margin_thresholds

LAGS = 3

FEATURE_NAMES: tuple[str, ...] = (
    *[f"sales_lag{i}" for i in range(1, LAGS + 1)],
    *[f"cost_lag{i}" for i in range(1, LAGS + 1)],
    "month_index",
)


def load_and_build_frame(csv_path: Path | str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    if not {"month", "sales", "cost"}.issubset(df.columns):
        raise ValueError("CSV must have columns: month, sales, cost")

    df = df.copy()
    df["period"] = pd.to_datetime(df["month"].astype(str) + "-01")
    df = df.sort_values("period").reset_index(drop=True)
    df["sales"] = df["sales"].astype(float)
    df["cost"] = df["cost"].astype(float)

    for i in range(1, LAGS + 1):
        df[f"sales_lag{i}"] = df["sales"].shift(i)
        df[f"cost_lag{i}"] = df["cost"].shift(i)

    df["month_index"] = df["period"].dt.month.astype(int)

    return df.dropna().reset_index(drop=True)


def make_regressor() -> Pipeline:
    return Pipeline(
        [
            ("scale", StandardScaler()),
            (
                "model",
                HistGradientBoostingRegressor(
                    max_iter=300,
                    learning_rate=0.08,
                    max_depth=6,
                    random_state=42,
                ),
            ),
        ]
    )


def margin_status(margin_pct: float, green_min: float, yellow_min: float) -> tuple[str, str, str]:
    """GREEN >= green_min; YELLOW in [yellow_min, green_min); RED < yellow_min."""
    if margin_pct >= green_min:
        return "GREEN", "#15803d", "#dcfce7"
    if margin_pct >= yellow_min:
        return "YELLOW", "#a16207", "#fef9c3"
    return "RED", "#b91c1c", "#fee2e2"


def margin_thresholds_public() -> dict[str, float]:
    g, y = get_margin_thresholds()
    return {"greenMinPercent": g, "yellowMinPercent": y}


def _mape_percent(y_true: np.ndarray | pd.Series, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = np.abs(y_true) > 1e-9
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)


def accuracy_payload_from_bundle(bundle: dict[str, Any]) -> dict[str, Any] | None:
    """Hold-out metrics saved at training time (before full-data refit)."""
    raw = bundle.get("metrics")
    if not isinstance(raw, dict) or "sales_mae" not in raw:
        return None
    out: dict[str, Any] = {
        "holdoutMonths": raw.get("holdout_months"),
        "salesMae": raw.get("sales_mae"),
        "costMae": raw.get("cost_mae"),
        "note": "MAE / MAPE on a hold-out window from the latest training run (same split as training).",
    }
    if raw.get("sales_mape_percent") is not None:
        out["salesMapePercent"] = raw["sales_mape_percent"]
    if raw.get("cost_mape_percent") is not None:
        out["costMapePercent"] = raw["cost_mape_percent"]
    return out


def forecast_accuracy_response(model_path: Path | str) -> dict[str, Any]:
    bundle = _load_bundle(model_path)
    acc = accuracy_payload_from_bundle(bundle)
    if acc is None:
        return {
            "success": True,
            "accuracy": None,
            "message": "No hold-out metrics in this model file. Run POST /train to retrain and store accuracy.",
        }
    return {"success": True, "accuracy": acc}


def train_and_save(
    csv_path: Path | str,
    model_out: Path | str,
    *,
    refit_on_all: bool = True,
) -> dict[str, Any]:
    """
    Train sales & cost models. Matches Colab holdout evaluation, then refits on
    full supervised frame by default (better for deployment forecasts).
    """
    csv_path = Path(csv_path)
    model_out = Path(model_out)

    df_sup = load_and_build_frame(csv_path)
    if len(df_sup) < 24:
        raise ValueError("Need at least ~24 rows after lag drop; CSV too short.")

    holdout = max(12, min(24, len(df_sup) // 5))
    train_df = df_sup.iloc[:-holdout]
    test_df = df_sup.iloc[-holdout:]

    X_train = train_df[list(FEATURE_NAMES)]
    sales_model = make_regressor()
    cost_model = make_regressor()
    sales_model.fit(X_train, train_df["sales"])
    cost_model.fit(X_train, train_df["cost"])

    metrics: dict[str, Any] = {"holdout_months": int(len(test_df))}
    if len(test_df) > 0:
        X_test = test_df[list(FEATURE_NAMES)]
        pred_s = sales_model.predict(X_test)
        pred_c = cost_model.predict(X_test)
        metrics["sales_mae"] = float(mean_absolute_error(test_df["sales"], pred_s))
        metrics["cost_mae"] = float(mean_absolute_error(test_df["cost"], pred_c))
        metrics["sales_mape_percent"] = round(_mape_percent(test_df["sales"].values, pred_s), 2)
        metrics["cost_mape_percent"] = round(_mape_percent(test_df["cost"].values, pred_c), 2)

    if refit_on_all:
        X_all = df_sup[list(FEATURE_NAMES)]
        sales_model.fit(X_all, df_sup["sales"])
        cost_model.fit(X_all, df_sup["cost"])

    bundle = {
        "sales_model": sales_model,
        "cost_model": cost_model,
        "feature_names": list(FEATURE_NAMES),
        "lags": LAGS,
        "trained_on_rows": int(len(df_sup)),
        "metrics": metrics,
    }

    model_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, model_out)

    return {"metrics": metrics, "model_path": str(model_out), "rows_used": len(df_sup)}


def _last_month_actuals(last_sales: float, last_cost: float) -> dict[str, Any]:
    profit = last_sales - last_cost
    margin = round((profit / last_sales) * 100 if last_sales else 0.0, 2)
    return {
        "lastMonthSales": round(float(last_sales), 2),
        "lastMonthCost": round(float(last_cost), 2),
        "lastMonthProfit": round(float(profit), 2),
        "lastMonthMarginPercent": margin,
    }


def _load_bundle(model_path: Path | str) -> dict[str, Any]:
    path = Path(model_path)
    if not path.is_file():
        raise FileNotFoundError(f"Model not found: {path}")
    return joblib.load(path)


def predict_next_month_from_csv(csv_path: Path | str, model_path: Path | str) -> dict[str, Any]:
    bundle = _load_bundle(model_path)
    sales_model = bundle["sales_model"]
    cost_model = bundle["cost_model"]
    features = bundle.get("feature_names", list(FEATURE_NAMES))

    raw = pd.read_csv(csv_path)
    raw["period"] = pd.to_datetime(raw["month"].astype(str) + "-01")
    raw = raw.sort_values("period").reset_index(drop=True)
    if len(raw) < LAGS:
        raise ValueError(f"Need at least {LAGS} historical months in CSV.")

    sales_arr = raw["sales"].astype(float).values
    cost_arr = raw["cost"].astype(float).values
    next_period = raw["period"].iloc[-1] + pd.DateOffset(months=1)

    row = {
        **{f"sales_lag{k}": float(sales_arr[-k]) for k in range(1, LAGS + 1)},
        **{f"cost_lag{k}": float(cost_arr[-k]) for k in range(1, LAGS + 1)},
        "month_index": int(next_period.month),
    }
    X_future = pd.DataFrame([row])[features]

    pred_sales = float(sales_model.predict(X_future)[0])
    pred_cost = float(cost_model.predict(X_future)[0])
    profit = pred_sales - pred_cost
    margin = round((profit / pred_sales) * 100 if pred_sales else 0.0, 2)
    green_min, yellow_min = get_margin_thresholds()
    status, _, _ = margin_status(margin, green_min, yellow_min)

    last_actuals = _last_month_actuals(float(sales_arr[-1]), float(cost_arr[-1]))

    out: dict[str, Any] = {
        "targetMonth": next_period.strftime("%Y-%m"),
        "predictedSales": round(pred_sales, 2),
        "predictedCost": round(pred_cost, 2),
        "predictedProfit": round(profit, 2),
        "marginPercent": margin,
        "status": status,
        "marginBands": {"greenMinPercent": green_min, "yellowMinPercent": yellow_min},
        "lastHistoryMonth": raw["month"].iloc[-1],
        **last_actuals,
    }
    acc = accuracy_payload_from_bundle(bundle)
    if acc is not None:
        out["accuracy"] = acc
    return out


def predict_next_from_history(
    history: list[dict[str, Any]],
    model_path: Path | str,
) -> dict[str, Any]:
    """history: list of {month: 'YYYY-MM', sales: number, cost: number}, oldest first."""
    if len(history) < LAGS:
        raise ValueError(f"Provide at least {LAGS} months of history.")

    bundle = _load_bundle(model_path)
    sales_model = bundle["sales_model"]
    cost_model = bundle["cost_model"]
    features = bundle.get("feature_names", list(FEATURE_NAMES))

    df = pd.DataFrame(history)
    if not {"month", "sales", "cost"}.issubset(df.columns):
        raise ValueError("Each history row needs month, sales, cost")

    df = df.copy()
    df["period"] = pd.to_datetime(df["month"].astype(str) + "-01")
    df = df.sort_values("period").reset_index(drop=True)
    sales_arr = df["sales"].astype(float).values
    cost_arr = df["cost"].astype(float).values
    next_period = df["period"].iloc[-1] + pd.DateOffset(months=1)

    row = {
        **{f"sales_lag{k}": float(sales_arr[-k]) for k in range(1, LAGS + 1)},
        **{f"cost_lag{k}": float(cost_arr[-k]) for k in range(1, LAGS + 1)},
        "month_index": int(next_period.month),
    }
    X_future = pd.DataFrame([row])[features]

    pred_sales = float(sales_model.predict(X_future)[0])
    pred_cost = float(cost_model.predict(X_future)[0])
    profit = pred_sales - pred_cost
    margin = round((profit / pred_sales) * 100 if pred_sales else 0.0, 2)
    green_min, yellow_min = get_margin_thresholds()
    status, _, _ = margin_status(margin, green_min, yellow_min)

    last_actuals = _last_month_actuals(float(sales_arr[-1]), float(cost_arr[-1]))

    out = {
        "targetMonth": next_period.strftime("%Y-%m"),
        "predictedSales": round(pred_sales, 2),
        "predictedCost": round(pred_cost, 2),
        "predictedProfit": round(profit, 2),
        "marginPercent": margin,
        "status": status,
        "marginBands": {"greenMinPercent": green_min, "yellowMinPercent": yellow_min},
        "lastHistoryMonth": str(df["month"].iloc[-1]),
        **last_actuals,
    }
    acc = accuracy_payload_from_bundle(bundle)
    if acc is not None:
        out["accuracy"] = acc
    return out


def ensure_model(csv_path: Path, model_path: Path) -> None:
    if not model_path.is_file():
        train_and_save(csv_path, model_path)
