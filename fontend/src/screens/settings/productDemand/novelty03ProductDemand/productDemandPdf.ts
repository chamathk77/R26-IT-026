import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { LoginShop } from '../../../../type/auth';
import type { DemandHorizonKey, ProductDemandResult } from './productDemandTypes';

const BRAND = {
  primary: '#15803d',
  primaryDark: '#0f5c2b',
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#f8fafc',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function describeMethod(method: string): string {
  if (method.startsWith('holt_winters')) return 'Holt-Winters';
  if (method.startsWith('holt_linear')) return 'Holt linear';
  if (method === 'linear_regression') return 'Linear regression';
  if (method === 'moving_average') return 'Moving average';
  return method;
}

function sumHorizon(results: ProductDemandResult[], key: DemandHorizonKey): number {
  return results.reduce((sum, result) => sum + (result.horizons[key]?.totalPredictedUnits ?? 0), 0);
}

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: ${BRAND.ink};
    margin: 0;
    padding: 24px;
    background: #eef2f7;
  }
  .page {
    max-width: 900px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid ${BRAND.border};
  }
  .hero {
    background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%);
    color: #ffffff;
    padding: 28px;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 1.6px;
    font-weight: 700;
    color: rgba(255,255,255,0.82);
    margin-bottom: 6px;
  }
  .shop-name { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
  .shop-address { font-size: 12px; color: rgba(255,255,255,0.85); margin: 0 0 14px; }
  .title { font-size: 26px; font-weight: 700; margin: 0; }
  .generated { font-size: 12px; color: rgba(255,255,255,0.82); margin-top: 8px; }
  .body { padding: 20px 24px 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  thead th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${BRAND.muted};
    font-weight: 700;
    padding: 10px 8px;
    border-bottom: 2px solid ${BRAND.border};
  }
  thead th.num-head { text-align: center; }
  tbody td {
    padding: 10px 8px;
    border-bottom: 1px solid ${BRAND.border};
    vertical-align: top;
  }
  .product-cell { width: 34%; }
  .product-name { font-size: 13px; font-weight: 700; }
  .product-method { font-size: 11px; color: ${BRAND.muted}; margin-top: 2px; }
  .num-cell { text-align: center; width: 22%; }
  .num-value { font-size: 15px; font-weight: 700; color: ${BRAND.primary}; }
  .num-range { font-size: 10px; color: ${BRAND.muted}; margin-top: 2px; }
  .footer-note {
    margin-top: 24px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.5;
  }
`;

/** 1. Line Chart Trajectory Report */
export async function shareLineChartReport({
  results,
  selectedProduct,
  horizonDays,
  shop,
  generatedAt,
}: {
  results: ProductDemandResult[];
  selectedProduct: ProductDemandResult | null;
  horizonDays: number;
  shop: LoginShop | null;
  generatedAt: string;
}): Promise<void> {
  const shopName = escapeHtml(shop?.shopName?.trim() || 'Shop');
  const shopAddress = escapeHtml(shop?.address?.trim() || '');
  const generatedLabel = escapeHtml(new Date(generatedAt).toLocaleString('en-LK'));

  const targetList = selectedProduct ? [selectedProduct] : results.slice(0, 8);

  const detailRows = targetList.map((prod) => {
    const points = (prod.dailyPoints || []).slice(0, horizonDays);
    const dayCols = points.map(p => `
      <tr>
        <td style="font-weight:600; font-size:12px;">Day ${p.day}</td>
        <td style="text-align:center; font-weight:700; color:${BRAND.primary};">${Math.round(p.predicted)}</td>
        <td style="text-align:center; color:#22c55e;">${Math.round(p.upper)}</td>
        <td style="text-align:center; color:#ef4444;">${Math.round(p.lower)}</td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom:24px; padding:16px; background:#f8fafc; border-radius:16px; border:1px solid ${BRAND.border};">
        <h3 style="margin:0 0 4px; font-size:16px; color:${BRAND.ink};">${escapeHtml(prod.productName)}</h3>
        <p style="margin:0 0 12px; font-size:12px; color:${BRAND.muted};">Model: ${escapeHtml(describeMethod(prod.method))}</p>
        <table>
          <thead>
            <tr>
              <th>Timeline</th>
              <th class="num-head">Predicted Units</th>
              <th class="num-head">Upper Bound</th>
              <th class="num-head">Lower Bound</th>
            </tr>
          </thead>
          <tbody>
            ${dayCols}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="eyebrow">LINE CHART — DEMAND TRAJECTORY REPORT</div>
            <h1 class="shop-name">${shopName}</h1>
            ${shopAddress ? `<p class="shop-address">${shopAddress}</p>` : ''}
            <h2 class="title">${selectedProduct ? escapeHtml(selectedProduct.productName) : `${targetList.length} Top Products`} (${horizonDays}-Day Trajectory)</h2>
            <div class="generated">Generated ${generatedLabel}</div>
          </div>
          <div class="body">
            ${detailRows}
            <div class="footer-note">
              Generated by SmartCost Line Chart Trajectory Analytics.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Line Chart Demand Report',
      UTI: 'com.adobe.pdf',
    });
  }
}

/** 2. Bar Chart Horizon Comparison Report */
export async function shareBarChartReport({
  results,
  selectedHorizon,
  shop,
  generatedAt,
}: {
  results: ProductDemandResult[];
  selectedHorizon: DemandHorizonKey;
  shop: LoginShop | null;
  generatedAt: string;
}): Promise<void> {
  const shopName = escapeHtml(shop?.shopName?.trim() || 'Shop');
  const shopAddress = escapeHtml(shop?.address?.trim() || '');
  const generatedLabel = escapeHtml(new Date(generatedAt).toLocaleString('en-LK'));

  const horizonLabel = selectedHorizon === 'next7Days' ? '7-Day' : selectedHorizon === 'next14Days' ? '14-Day' : '30-Day';

  const rows = results
    .map(
      (r) => `
        <tr>
          <td class="product-cell">
            <div class="product-name">${escapeHtml(r.productName)}</div>
            <div class="product-method">${escapeHtml(describeMethod(r.method))}</div>
          </td>
          <td class="num-cell">
            <div class="num-value">${r.horizons[selectedHorizon]?.totalPredictedUnits ?? 0} units</div>
            <div class="num-range">Range: ${r.horizons[selectedHorizon]?.lowerUnits ?? 0} – ${r.horizons[selectedHorizon]?.upperUnits ?? 0}</div>
          </td>
        </tr>
      `,
    )
    .join('');

  const total = sumHorizon(results, selectedHorizon);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="eyebrow">BAR CHART — HORIZON DEMAND COMPARISON</div>
            <h1 class="shop-name">${shopName}</h1>
            ${shopAddress ? `<p class="shop-address">${shopAddress}</p>` : ''}
            <h2 class="title">${horizonLabel} Horizon Comparison</h2>
            <div class="generated">Generated ${generatedLabel}</div>
          </div>
          <div class="body">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="num-head">Predicted Demand (${horizonLabel})</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
              <tfoot>
                <tr>
                  <td style="font-weight:700;">TOTAL FORECASTED DEMAND</td>
                  <td class="num-cell"><div class="num-value" style="font-size:18px;">${total} units</div></td>
                </tr>
              </tfoot>
            </table>
            <div class="footer-note">Generated by SmartCost Bar Chart Horizon Analytics.</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${horizonLabel} Bar Chart Demand Report`,
      UTI: 'com.adobe.pdf',
    });
  }
}

/** 3. Share / Pie Chart Distribution Report */
export async function sharePieChartReport({
  results,
  selectedHorizon,
  shop,
  generatedAt,
}: {
  results: ProductDemandResult[];
  selectedHorizon: DemandHorizonKey;
  shop: LoginShop | null;
  generatedAt: string;
}): Promise<void> {
  const shopName = escapeHtml(shop?.shopName?.trim() || 'Shop');
  const shopAddress = escapeHtml(shop?.address?.trim() || '');
  const generatedLabel = escapeHtml(new Date(generatedAt).toLocaleString('en-LK'));

  const horizonLabel = selectedHorizon === 'next7Days' ? '7-Day' : selectedHorizon === 'next14Days' ? '14-Day' : '30-Day';
  const total = sumHorizon(results, selectedHorizon) || 1;

  const rows = results
    .map((r) => {
      const units = r.horizons[selectedHorizon]?.totalPredictedUnits ?? 0;
      const sharePct = ((units / total) * 100).toFixed(1);
      return `
        <tr>
          <td class="product-cell">
            <div class="product-name">${escapeHtml(r.productName)}</div>
          </td>
          <td class="num-cell">
            <div class="num-value">${units} units</div>
          </td>
          <td class="num-cell">
            <div class="num-value" style="color:#9333ea;">${sharePct}%</div>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="eyebrow">SHARE CHART — MARKET SHARE DEMAND REPORT</div>
            <h1 class="shop-name">${shopName}</h1>
            ${shopAddress ? `<p class="shop-address">${shopAddress}</p>` : ''}
            <h2 class="title">${horizonLabel} Market Share Breakdown</h2>
            <div class="generated">Generated ${generatedLabel}</div>
          </div>
          <div class="body">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="num-head">Predicted Units</th>
                  <th class="num-head">Store Demand Share</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <div class="footer-note">Generated by SmartCost Market Share Demand Analytics.</div>
          </div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${horizonLabel} Market Share Report`,
      UTI: 'com.adobe.pdf',
    });
  }
}

/** 4. Full All Products / Cards View Report */
export async function shareAllProductsDemandReport({
  results,
  shop,
  generatedAt,
  lookbackDays,
}: {
  results: ProductDemandResult[];
  shop: LoginShop | null;
  generatedAt: string;
  lookbackDays: number;
}): Promise<void> {
  const shopName = escapeHtml(shop?.shopName?.trim() || 'Shop');
  const shopAddress = escapeHtml(shop?.address?.trim() || '');
  const generatedLabel = escapeHtml(new Date(generatedAt).toLocaleString('en-LK'));

  const rows = results
    .map(
      (result) => `
        <tr>
          <td class="product-cell">
            <div class="product-name">${escapeHtml(result.productName)}</div>
            <div class="product-method">${escapeHtml(describeMethod(result.method))}</div>
          </td>
          <td class="num-cell">
            <div class="num-value">${result.horizons.next7Days.totalPredictedUnits}</div>
            <div class="num-range">${result.horizons.next7Days.lowerUnits}–${result.horizons.next7Days.upperUnits}</div>
          </td>
          <td class="num-cell">
            <div class="num-value">${result.horizons.next14Days.totalPredictedUnits}</div>
            <div class="num-range">${result.horizons.next14Days.lowerUnits}–${result.horizons.next14Days.upperUnits}</div>
          </td>
          <td class="num-cell">
            <div class="num-value">${result.horizons.next30Days.totalPredictedUnits}</div>
            <div class="num-range">${result.horizons.next30Days.lowerUnits}–${result.horizons.next30Days.upperUnits}</div>
          </td>
        </tr>
      `,
    )
    .join('');

  const total7 = sumHorizon(results, 'next7Days');
  const total14 = sumHorizon(results, 'next14Days');
  const total30 = sumHorizon(results, 'next30Days');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="eyebrow">PRODUCT DEMAND FORECAST — ALL PRODUCTS REPORT</div>
            <h1 class="shop-name">${shopName}</h1>
            ${shopAddress ? `<p class="shop-address">${shopAddress}</p>` : ''}
            <h2 class="title">${results.length} Product${results.length === 1 ? '' : 's'}</h2>
            <div class="generated">
              Generated ${generatedLabel} · based on up to ${lookbackDays} days of sales history
            </div>
          </div>

          <div class="body">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="num-head">Next 7 days</th>
                  <th class="num-head">Next 14 days</th>
                  <th class="num-head">Next 30 days</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
              <tfoot>
                <tr>
                  <td class="total-label">Total across all products</td>
                  <td class="num-cell"><div class="num-value">${total7}</div></td>
                  <td class="num-cell"><div class="num-value">${total14}</div></td>
                  <td class="num-cell"><div class="num-value">${total30}</div></td>
                </tr>
              </tfoot>
            </table>

            <div class="footer-note">
              Generated by SmartCost's product demand forecast (Python / statsmodels Holt-Winters).
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Product demand forecast — all products',
      UTI: 'com.adobe.pdf',
    });
  }
}
