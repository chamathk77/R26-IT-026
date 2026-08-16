const SEASON_LENGTH = 12;
const MIN_POINTS_FOR_SEASONAL = 24;
const MIN_POINTS_FOR_TREND = 4;
const MIN_POINTS_FOR_ANY_FORECAST = 3;

const ALPHA_GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const BETA_GRID = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5];
const GAMMA_GRID = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5];
const PHI_GRID = [0.85, 0.9, 0.95, 0.98, 1];

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function clampPositive(value) {
  return value > 0 ? value : 0;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Mean absolute percentage error, skipping zero actuals so a single empty
 * month cannot drive the score to infinity.
 */
function meanAbsolutePercentageError(actual, predicted) {
  const usable = [];
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i] !== 0) {
      usable.push(Math.abs((actual[i] - predicted[i]) / actual[i]));
    }
  }
  if (!usable.length) return null;
  return round2(mean(usable) * 100);
}

function rootMeanSquaredError(actual, predicted) {
  if (!actual.length) return null;
  const squared = actual.map((value, i) => (value - predicted[i]) ** 2);
  return round2(Math.sqrt(mean(squared)));
}

function meanAbsoluteError(actual, predicted) {
  if (!actual.length) return null;
  return round2(mean(actual.map((value, i) => Math.abs(value - predicted[i]))));
}

function scoreAccuracy(actual, predicted) {
  return {
    mape: meanAbsolutePercentageError(actual, predicted),
    rmse: rootMeanSquaredError(actual, predicted),
    mae: meanAbsoluteError(actual, predicted),
    sampleSize: actual.length,
  };
}

/**
 * Ordinary least squares on (index, value) pairs.
 */
function fitLinearRegression(series) {
  const n = series.length;
  const indices = series.map((_, i) => i);
  const meanX = mean(indices);
  const meanY = mean(series);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (indices[i] - meanX) * (series[i] - meanY);
    denominator += (indices[i] - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  return { slope, intercept };
}

function linearRegressionForecast(series, horizon) {
  const { slope, intercept } = fitLinearRegression(series);
  const fitted = series.map((_, i) => intercept + slope * i);
  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    forecast.push(intercept + slope * (series.length - 1 + h));
  }

  return {
    method: 'linear_regression',
    params: { slope: round2(slope), intercept: round2(intercept) },
    fitted,
    forecast,
  };
}

/**
 * Simple average of the trailing window — the safest fallback when there is
 * barely any history to learn from.
 */
function movingAverageForecast(series, horizon) {
  const window = series.slice(-Math.min(3, series.length));
  const level = mean(window);
  return {
    method: 'moving_average',
    params: { window: window.length, level: round2(level) },
    fitted: series.map(() => level),
    forecast: new Array(horizon).fill(level),
  };
}

function initialSeasonalIndices(series, seasonLength) {
  const seasonCount = Math.floor(series.length / seasonLength);
  const seasonAverages = [];

  for (let s = 0; s < seasonCount; s += 1) {
    seasonAverages.push(mean(series.slice(s * seasonLength, (s + 1) * seasonLength)));
  }

  const indices = new Array(seasonLength).fill(0);
  for (let i = 0; i < seasonLength; i += 1) {
    let total = 0;
    for (let s = 0; s < seasonCount; s += 1) {
      total += series[s * seasonLength + i] - seasonAverages[s];
    }
    indices[i] = total / seasonCount;
  }

  return indices;
}

function initialTrend(series, seasonLength) {
  let total = 0;
  for (let i = 0; i < seasonLength; i += 1) {
    total += (series[seasonLength + i] - series[i]) / seasonLength;
  }
  return total / seasonLength;
}

/**
 * Additive Holt-Winters with a damped trend. Damping (phi < 1) stops the
 * linear trend from compounding unrealistically over a 12-month horizon.
 */
function holtWintersAdditive(series, options) {
  const {
    seasonLength = SEASON_LENGTH,
    alpha,
    beta,
    gamma,
    phi = 1,
    horizon = 0,
  } = options;

  const seasonal = initialSeasonalIndices(series, seasonLength);
  let level = mean(series.slice(0, seasonLength));
  let trend = initialTrend(series, seasonLength);

  const fitted = [];

  for (let t = 0; t < series.length; t += 1) {
    const seasonIndex = t % seasonLength;
    const seasonalComponent = seasonal[seasonIndex];

    fitted.push(level + phi * trend + seasonalComponent);

    const previousLevel = level;
    level = alpha * (series[t] - seasonalComponent) + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - previousLevel) + (1 - beta) * phi * trend;
    seasonal[seasonIndex] = gamma * (series[t] - level) + (1 - gamma) * seasonalComponent;
  }

  const forecast = [];
  let dampedTrendSum = 0;
  for (let h = 1; h <= horizon; h += 1) {
    dampedTrendSum += phi ** h;
    const seasonIndex = (series.length + h - 1) % seasonLength;
    forecast.push(level + dampedTrendSum * trend + seasonal[seasonIndex]);
  }

  return { fitted, forecast, finalLevel: level, finalTrend: trend };
}

/**
 * Grid search over the smoothing constants, scoring in-sample fit with RMSE.
 * The first season is excluded from scoring because those values are still
 * dominated by the initial level/trend estimates.
 */
function optimizeHoltWinters(series, seasonLength, horizon) {
  let best = null;

  for (const alpha of ALPHA_GRID) {
    for (const beta of BETA_GRID) {
      for (const gamma of GAMMA_GRID) {
        for (const phi of PHI_GRID) {
          const result = holtWintersAdditive(series, {
            seasonLength,
            alpha,
            beta,
            gamma,
            phi,
            horizon,
          });

          const actual = series.slice(seasonLength);
          const predicted = result.fitted.slice(seasonLength);
          const rmse = rootMeanSquaredError(actual, predicted);

          if (rmse !== null && (best === null || rmse < best.rmse)) {
            best = { rmse, alpha, beta, gamma, phi, result };
          }
        }
      }
    }
  }

  return best;
}

function holtWintersForecast(series, horizon, seasonLength = SEASON_LENGTH) {
  const best = optimizeHoltWinters(series, seasonLength, horizon);

  if (!best) {
    return linearRegressionForecast(series, horizon);
  }

  return {
    method: 'holt_winters_additive_damped',
    params: {
      alpha: best.alpha,
      beta: best.beta,
      gamma: best.gamma,
      phi: best.phi,
      seasonLength,
    },
    fitted: best.result.fitted,
    forecast: best.result.forecast,
  };
}

/**
 * Holt's linear trend (no seasonal component) for when there is more than a
 * few points but less than two full seasons.
 */
function holtLinearForecast(series, horizon) {
  let best = null;

  for (const alpha of ALPHA_GRID) {
    for (const beta of BETA_GRID) {
      for (const phi of PHI_GRID) {
        let level = series[0];
        let trend = series[1] - series[0];
        const fitted = [];

        for (let t = 0; t < series.length; t += 1) {
          fitted.push(level + phi * trend);
          const previousLevel = level;
          level = alpha * series[t] + (1 - alpha) * (level + phi * trend);
          trend = beta * (level - previousLevel) + (1 - beta) * phi * trend;
        }

        const rmse = rootMeanSquaredError(series.slice(1), fitted.slice(1));
        if (rmse !== null && (best === null || rmse < best.rmse)) {
          const forecast = [];
          let dampedTrendSum = 0;
          for (let h = 1; h <= horizon; h += 1) {
            dampedTrendSum += phi ** h;
            forecast.push(level + dampedTrendSum * trend);
          }
          best = { rmse, alpha, beta, phi, fitted, forecast };
        }
      }
    }
  }

  if (!best) {
    return linearRegressionForecast(series, horizon);
  }

  return {
    method: 'holt_linear_damped',
    params: { alpha: best.alpha, beta: best.beta, phi: best.phi },
    fitted: best.fitted,
    forecast: best.forecast,
  };
}

function selectModel(series, horizon, seasonLength) {
  if (series.length >= MIN_POINTS_FOR_SEASONAL) {
    return holtWintersForecast(series, horizon, seasonLength);
  }
  if (series.length >= MIN_POINTS_FOR_TREND) {
    return holtLinearForecast(series, horizon);
  }
  return movingAverageForecast(series, horizon);
}

/**
 * Refit on a training slice and score against a held-out tail, which is a
 * far more honest accuracy estimate than in-sample fit.
 *
 * When the full series can support the seasonal model, the holdout is capped
 * so the training slice keeps at least two seasons. Otherwise the backtest
 * would silently score a simpler model than the one actually used.
 */
function backtest(series, seasonLength) {
  let holdout = Math.min(6, Math.floor(series.length / 4));

  if (series.length >= MIN_POINTS_FOR_SEASONAL) {
    holdout = Math.min(holdout, series.length - MIN_POINTS_FOR_SEASONAL);
  }

  if (holdout < 1 || series.length - holdout < MIN_POINTS_FOR_ANY_FORECAST) {
    return null;
  }

  const train = series.slice(0, series.length - holdout);
  const actual = series.slice(series.length - holdout);
  const model = selectModel(train, holdout, seasonLength);
  const predicted = model.forecast.map(clampPositive);

  return {
    ...scoreAccuracy(actual, predicted),
    holdoutMonths: holdout,
    method: model.method,
  };
}

/**
 * Produces a horizon-length forecast with prediction intervals derived from
 * the spread of in-sample residuals, widened by sqrt(h) as uncertainty
 * compounds further into the future.
 */
function forecastSeries(series, horizon, options = {}) {
  const seasonLength = options.seasonLength ?? SEASON_LENGTH;

  if (!Array.isArray(series) || series.length < MIN_POINTS_FOR_ANY_FORECAST) {
    return {
      method: 'insufficient_data',
      params: {},
      points: [],
      accuracy: null,
      backtest: null,
      fitted: [],
    };
  }

  const model = selectModel(series, horizon, seasonLength);
  const residuals = series.map((value, i) => value - model.fitted[i]);
  const residualSpread = standardDeviation(residuals);

  const points = model.forecast.map((value, index) => {
    const predicted = clampPositive(value);
    const margin = 1.96 * residualSpread * Math.sqrt(index + 1);
    return {
      predicted: round2(predicted),
      lower: round2(clampPositive(predicted - margin)),
      upper: round2(predicted + margin),
    };
  });

  return {
    method: model.method,
    params: model.params,
    points,
    accuracy: scoreAccuracy(series, model.fitted.map(clampPositive)),
    backtest: backtest(series, seasonLength),
    fitted: model.fitted.map((value) => round2(clampPositive(value))),
  };
}

module.exports = {
  forecastSeries,
  backtest,
  scoreAccuracy,
  holtWintersForecast,
  holtLinearForecast,
  linearRegressionForecast,
  movingAverageForecast,
  fitLinearRegression,
  SEASON_LENGTH,
  MIN_POINTS_FOR_SEASONAL,
  MIN_POINTS_FOR_ANY_FORECAST,
};
