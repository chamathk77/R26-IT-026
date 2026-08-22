import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { LoginShop } from '../../../../type/auth';
import type { ProductDemandResult } from './productDemandTypes';

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

function sumHorizon(results: ProductDemandResult[], key: 'next7Days' | 'next14Days' | 'next30Days'): number {
  return results.reduce((sum, result) => sum + result.horizons[key].totalPredictedUnits, 0);
}

function buildAllProductsDemandPdfHtml({
  results,
  shop,
  generatedAt,
  lookbackDays,
}: {
  results: ProductDemandResult[];
  shop: LoginShop | null;
  generatedAt: string;
  lookbackDays: number;
}): string {
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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
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
          table { width: 100%; border-collapse: collapse; }
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
          tfoot td {
            padding: 12px 8px;
            font-weight: 700;
            border-top: 2px solid ${BRAND.border};
          }
          tfoot .total-label { font-size: 12px; color: ${BRAND.muted}; text-transform: uppercase; }
          tfoot .num-cell .num-value { font-size: 16px; }
          .footer-note {
            margin-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="eyebrow">PRODUCT DEMAND FORECAST — ALL PRODUCTS</div>
            <h1 class="shop-name">${shopName}</h1>
            ${shopAddress ? `<p class="shop-address">${shopAddress}</p>` : ''}
            <h2 class="title">${results.length} product${results.length === 1 ? '' : 's'}</h2>
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
              Use this as guidance for stock or production planning alongside your own judgement.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

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
  const html = buildAllProductsDemandPdfHtml({ results, shop, generatedAt, lookbackDays });
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Product demand forecast — all products',
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  throw new Error('Sharing is not available on this device');
}
