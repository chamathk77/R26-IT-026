function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Ordinary least squares on (index, value) pairs, used by computeSalesTrend
 * to classify the monthly sales series as increasing/decreasing/stable.
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

module.exports = { fitLinearRegression };
