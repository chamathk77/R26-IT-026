/**
 * Proxies the Python Analysis_Backend (FastAPI) for next-month sales/cost forecast.
 * Run: cd Analysis_Backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
 *
 * Monthly series for charts / “last month” UI is read from
 * Analysis_Backend/data/monthly_performance.csv (or MONTHLY_PERFORMANCE_CSV).
 */
const { readMonthlySeriesTail } = require('../utils/monthlyPerformanceCsv');

const DEFAULT_ANALYSIS_URL = 'http://127.0.0.1:8000';

function analysisBaseUrl() {
  const raw = process.env.ANALYSIS_SERVICE_URL || DEFAULT_ANALYSIS_URL;
  return String(raw).replace(/\/$/, '');
}

async function proxyAnalysisGet(path, res) {
  const url = `${analysisBaseUrl()}${path}`;
  const timeoutMs = Number(process.env.ANALYSIS_SERVICE_TIMEOUT_MS) || 25000;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return res.status(502).json({
        success: false,
        message: 'Analysis service returned invalid JSON',
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: body.detail || body.message || `Analysis service HTTP ${response.status}`,
        data: body,
      });
    }

    return res.status(200).json({
      success: true,
      data: body,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'Analysis service request timed out',
      });
    }
    return res.status(503).json({
      success: false,
      message: err.message || 'Cannot reach analysis service',
      hint:
        'Start Python service: cd Analysis_Backend && uvicorn app.main:app --host 0.0.0.0 --port 8000',
    });
  }
}

const getNextMonthForecast = async (_req, res) => proxyAnalysisGet('/predict/next-month', res);

const getForecastAccuracy = async (_req, res) => proxyAnalysisGet('/metrics/forecast-accuracy', res);

const getMonthlySeries = async (req, res) => {
  const raw = parseInt(String(req.query.limit ?? '20'), 10);
  const limit = Number.isNaN(raw) ? 20 : Math.min(120, Math.max(1, raw));
  try {
    const data = await readMonthlySeriesTail(limit);
    if (!data.length) {
      return res.status(503).json({
        success: false,
        message: 'No rows found in monthly performance CSV',
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        success: true,
        limit,
        count: data.length,
        data,
        source: 'csv',
      },
    });
  } catch (err) {
    const code = err && err.code;
    if (code === 'ENOENT') {
      return res.status(503).json({
        success: false,
        message:
          'Monthly performance CSV not found. Add Analysis_Backend/data/monthly_performance.csv or set MONTHLY_PERFORMANCE_CSV.',
      });
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to read monthly performance CSV',
    });
  }
};

module.exports = {
  getNextMonthForecast,
  getForecastAccuracy,
  getMonthlySeries,
};
