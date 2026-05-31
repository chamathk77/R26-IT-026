import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_CSV = Path(os.environ.get("FORECAST_CSV", BASE_DIR / "data" / "monthly_performance.csv"))
MODEL_PATH = Path(os.environ.get("FORECAST_MODEL", BASE_DIR / "models" / "business_forecaster.joblib"))


def get_margin_thresholds() -> tuple[float, float]:
    """
    Profit margin % traffic lights (defaults: 35 / 25).

    With defaults:
    - GREEN: margin % ≥ 35
    - YELLOW: margin % ≥ 25 and < 35
    - RED: margin % < 25

    Override with MARGIN_GREEN_MIN_PCT and MARGIN_YELLOW_MIN_PCT (must satisfy green > yellow).
    """
    green = float(os.environ.get("MARGIN_GREEN_MIN_PCT", "35"))
    yellow = float(os.environ.get("MARGIN_YELLOW_MIN_PCT", "25"))

    if green <= yellow:
        raise ValueError(
            "MARGIN_GREEN_MIN_PCT must be greater than MARGIN_YELLOW_MIN_PCT "
            f"(got green={green}, yellow={yellow})."
        )
    if yellow < 0 or green > 100:
        raise ValueError("Margin thresholds must be within 0–100 (%).")

    return green, yellow
