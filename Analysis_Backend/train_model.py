#!/usr/bin/env python3
"""Train forecaster and write models/business_forecaster.joblib (Colab-compatible bundle)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app.config import DATA_CSV, MODEL_PATH  # noqa: E402
from app.forecaster import train_and_save  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--csv", type=Path, default=DATA_CSV)
    p.add_argument("--out", type=Path, default=MODEL_PATH)
    p.add_argument("--no-full-refit", action="store_true", help="Keep models fitted on train split only (Colab default).")
    args = p.parse_args()

    out = train_and_save(args.csv, args.out, refit_on_all=not args.no_full_refit)
    print(__import__("json").dumps(out, indent=2))


if __name__ == "__main__":
    main()
