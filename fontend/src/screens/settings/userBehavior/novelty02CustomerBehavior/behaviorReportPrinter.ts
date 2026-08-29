import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, Share } from 'react-native';
import type { CustomerBehaviorData, CustomerSegment } from './behaviorTypes';

function formatCurrency(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-LK')}`;
}

const SEGMENT_COLORS: Record<string, string> = {
  'VIP / Loyal': '#16a34a',
  Regular: '#2563eb',
  Occasional: '#f59e0b',
  'At risk / Lapsed': '#ef4444',
};

function generateSvgDonutChart(segments: CustomerSegment[]): string {
  if (!segments.length) return '';
  const total = segments.reduce((sum, s) => sum + s.revenueSharePercent, 0) || 100;
  let cumulativeAngle = 0;
  const size = 110;
  const center = size / 2;
  const radius = center - 6;
  const innerRadius = radius * 0.52;

  const paths = segments.map((seg) => {
    const fraction = (seg.revenueSharePercent || 0.5) / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + Math.max(angle, 0.05);
    cumulativeAngle = endAngle;

    const x1 = center + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = center + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = center + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = center + radius * Math.sin(endAngle - Math.PI / 2);

    const ix1 = center + innerRadius * Math.cos(startAngle - Math.PI / 2);
    const iy1 = center + innerRadius * Math.sin(startAngle - Math.PI / 2);
    const ix2 = center + innerRadius * Math.cos(endAngle - Math.PI / 2);
    const iy2 = center + innerRadius * Math.sin(endAngle - Math.PI / 2);

    const largeArc = angle > Math.PI ? 1 : 0;
    const color = SEGMENT_COLORS[seg.label] || '#94a3b8';

    const pathData = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

    return `<path d="${pathData}" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`;
  });

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${paths.join('')}
      <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">RFM</text>
      <text x="${center}" y="${center + 9}" text-anchor="middle" font-size="7" fill="#64748b">Clusters</text>
    </svg>
  `;
}

function generateSvgSalesTrajectoryChart(trend: any): string {
  const points = trend?.points ?? [];
  if (!points.length) return '';

  const chartWidth = 500;
  const chartHeight = 150;
  const marginLeft = 46;
  const marginRight = 55;
  const marginTop = 18;
  const marginBottom = 24;

  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  const targetVal = trend.target || trend.baselineAverage || 100;
  const rawMax = Math.max(
    ...points.map((p: any) => Math.max(p.sales ?? 0, p.rollingAvg ?? 0)),
    targetVal,
    100,
  );
  const maxVal = Math.ceil(rawMax * 1.15);
  const yTicks = [
    0,
    Math.round(maxVal * 0.25),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.75),
    maxVal,
  ];

  const N = points.length;
  const step = plotWidth / Math.max(N, 1);
  const barWidth = Math.min(Math.max(step * 0.68, 12), 26);

  const targetY = marginTop + plotHeight - (targetVal / maxVal) * plotHeight;

  const lineCoords = points.map((p: any, i: number) => {
    const cx = marginLeft + i * step + step / 2;
    const cy = marginTop + plotHeight - ((p.rollingAvg ?? p.sales) / maxVal) * plotHeight;
    return { cx, cy };
  });

  const pathData =
    lineCoords.length > 1
      ? lineCoords.reduce((acc: string, curr: any, idx: number, arr: any[]) => {
          if (idx === 0) return `M ${curr.cx} ${curr.cy}`;
          const prev = arr[idx - 1];
          const cp1x = prev.cx + (curr.cx - prev.cx) / 2;
          const cp1y = prev.cy;
          const cp2x = prev.cx + (curr.cx - prev.cx) / 2;
          const cp2y = curr.cy;
          return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.cx} ${curr.cy}`;
        }, '')
      : '';

  const gridLinesSvg = yTicks.map((tick) => {
    const ty = marginTop + plotHeight - (tick / maxVal) * plotHeight;
    return `<line x1="${marginLeft}" y1="${ty}" x2="${chartWidth - marginRight}" y2="${ty}" stroke="#f1f5f9" stroke-width="0.8" stroke-dasharray="3,3" />`;
  }).join('');

  const barsSvg = points.map((p: any, i: number) => {
    const bx = marginLeft + i * step + (step - barWidth) / 2;
    const barHeight = Math.max(((p.sales ?? 0) / maxVal) * plotHeight, 4);
    const by = marginTop + plotHeight - barHeight;
    const valText = p.sales >= 1000 ? `${Math.round(p.sales / 1000)}k` : `${Math.round(p.sales)}`;
    return `
      <rect x="${bx}" y="${by}" width="${barWidth}" height="${barHeight}" rx="3" ry="3" fill="#F6E1DA" stroke="#E2A08B" stroke-width="1" />
      ${barHeight >= 16 ? `<text x="${bx + barWidth / 2}" y="${by + barHeight / 2 + 3}" font-size="7.5" font-weight="bold" fill="#4F2315" text-anchor="middle">${valText}</text>` : ''}
      <text x="${bx + barWidth / 2}" y="${marginTop + plotHeight + 13}" font-size="7.5" fill="#64748b" text-anchor="middle">${p.label}</text>
    `;
  }).join('');

  const yTicksSvg = yTicks.map((tick, tIdx) => {
    const ty = marginTop + plotHeight - (tick / maxVal) * plotHeight;
    const label = tIdx === 4 ? `Rs.${tick >= 1000 ? Math.round(tick / 1000) + 'k' : tick}` : (tick >= 1000 ? Math.round(tick / 1000) + 'k' : `${tick}`);
    return `
      <line x1="${marginLeft - 3}" y1="${ty}" x2="${marginLeft}" y2="${ty}" stroke="#cbd5e1" stroke-width="1" />
      <text x="${marginLeft - 5}" y="${ty + 3}" font-size="7" fill="#64748b" text-anchor="end">${label}</text>
    `;
  }).join('');

  const circlesSvg = lineCoords.map((pt: any) => `
    <circle cx="${pt.cx}" cy="${pt.cy}" r="3" fill="#15803D" stroke="#ffffff" stroke-width="1.5" />
  `).join('');

  return `
    <svg width="100%" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}">
      <!-- Grid -->
      ${gridLinesSvg}

      <!-- Axes -->
      <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotHeight}" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${chartWidth - marginRight}" y2="${marginTop + plotHeight}" stroke="#94a3b8" stroke-width="1.2" />

      <!-- Y Ticks -->
      ${yTicksSvg}

      <!-- Bars -->
      ${barsSvg}

      <!-- Target Line -->
      <line x1="${marginLeft}" y1="${targetY}" x2="${chartWidth - marginRight + 4}" y2="${targetY}" stroke="#90733B" stroke-width="1.5" stroke-dasharray="4,3" />
      <text x="${chartWidth - marginRight + 6}" y="${targetY + 2.5}" font-size="7.5" font-weight="bold" fill="#90733B">Target Rs.${targetVal >= 1000 ? Math.round(targetVal / 1000) + 'k' : targetVal}</text>

      <!-- Rolling Average Path -->
      ${pathData ? `<path d="${pathData}" fill="none" stroke="#15803D" stroke-width="2.2" stroke-linecap="round" />` : ''}
      ${circlesSvg}
    </svg>
  `;
}

export interface ReportPrintOptions {
  includeKpis?: boolean;
  includeInsights?: boolean;
  includeHourly?: boolean;
  includeWeekendWeekday?: boolean;
  includeProducts?: boolean;
  includeUpcoming?: boolean;
  includeSegments?: boolean;
  includeTrend?: boolean;
  includeStrategies?: boolean;
}

export function generateBehaviorA4HtmlReport(
  data: CustomerBehaviorData,
  shopName = 'SmartCost Merchant',
  options?: ReportPrintOptions,
): string {
  const opt = {
    includeKpis: options?.includeKpis ?? true,
    includeInsights: options?.includeInsights ?? true,
    includeHourly: options?.includeHourly ?? true,
    includeWeekendWeekday: options?.includeWeekendWeekday ?? true,
    includeProducts: options?.includeProducts ?? true,
    includeUpcoming: options?.includeUpcoming ?? true,
    includeSegments: options?.includeSegments ?? true,
    includeTrend: options?.includeTrend ?? true,
    includeStrategies: options?.includeStrategies ?? true,
  };

  const hours = data.hourlyPattern?.hours ?? [];
  const peakHour = data.hourlyPattern?.peakHour ?? null;
  const activeHours = hours.filter((h) => h.orderCount > 0);
  const hourMax = hours.length ? Math.max(...hours.map((h) => h.avgSales), 1) : 1;
  const totalRevenue = hours.reduce((sum, h) => sum + h.totalSales, 0);
  const totalOrders = hours.reduce((sum, h) => sum + h.orderCount, 0);
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const weekendVsWeekday = data.dailyPattern?.weekendVsWeekday ?? null;
  const topProducts = data.productRankings?.topProducts ?? [];
  const slowProducts = data.productRankings?.slowProducts ?? [];
  const maxTopQty = topProducts.length ? Math.max(...topProducts.map((p) => p.qtySold)) : 1;
  const segments = data.customerSegments?.segments ?? [];

  const donutChartSvg = generateSvgDonutChart(segments);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Customer Behavior & Sales Insights Report - A4</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm 12mm 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-size: 10.5px;
            line-height: 1.35;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2.5px solid #f97316;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            color: #f97316;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .report-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin: 2px 0 0 0;
          }
          .meta-info {
            text-align: right;
            font-size: 9.5px;
            color: #64748b;
          }
          .meta-pill {
            display: inline-block;
            background: #ffedd5;
            color: #c2410c;
            padding: 2px 7px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 9px;
            margin-bottom: 2px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
          }
          .kpi-label {
            font-size: 8.5px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          .kpi-value {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .kpi-sub {
            font-size: 8.5px;
            color: #94a3b8;
            margin-top: 1px;
          }
          .section {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 3px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
          }

          /* Visual Chart Styles */
          .chart-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 8px;
          }
          .bar-chart-container {
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 70px;
            padding-top: 8px;
            border-bottom: 1px solid #cbd5e1;
          }
          .bar-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
          }
          .bar-fill {
            width: 100%;
            border-radius: 3px 3px 0 0;
            min-height: 2px;
          }
          .bar-axis-label {
            font-size: 7.5px;
            color: #64748b;
            margin-top: 3px;
            text-align: center;
          }
          .split-bar-track {
            display: flex;
            height: 14px;
            border-radius: 999px;
            overflow: hidden;
            background: #e2e8f0;
            margin: 6px 0;
          }
          .split-bar-seg {
            height: 100%;
          }
          .progress-track {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
            margin-top: 3px;
          }
          .progress-fill {
            height: 100%;
            background: #ea580c;
            border-radius: 999px;
          }

          .donut-layout {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .insight-box {
            background: #f0fdf4;
            border-left: 3px solid #16a34a;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 4px;
            font-size: 10px;
            color: #166534;
          }
          .insight-box.warning {
            background: #fffbeb;
            border-left-color: #d97706;
            color: #92400e;
          }
          .insight-box.info {
            background: #eff6ff;
            border-left-color: #2563eb;
            color: #1e40af;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 4px;
          }
          th, td {
            text-align: left;
            padding: 5px 7px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8.5px;
            letter-spacing: 0.3px;
          }
          tr:nth-child(even) {
            background: #fafafa;
          }
          .tag-peak {
            background: #fee2e2;
            color: #b91c1c;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 8.5px;
          }
          .strategy-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
          }
          .strategy-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 8px;
          }
          .strategy-title {
            font-weight: 700;
            font-size: 10px;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .strategy-desc {
            font-size: 9.5px;
            color: #475569;
            line-height: 1.3;
          }
          .footer {
            margin-top: 18px;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
            font-size: 8.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-container">
          <div>
            <h1 class="brand-title">SmartCost POS</h1>
            <div class="report-title">Customer Behavior & Sales Insights Report (with Charts)</div>
          </div>
          <div class="meta-info">
            <div class="meta-pill">A4 Visual Report</div>
            <div>Merchant: <strong>${shopName}</strong></div>
            <div>Analysis Window: <strong>Last ${data.lookbackDays} Days</strong></div>
            <div>Generated: <strong>${new Date(data.generatedAt).toLocaleString('en-LK')}</strong></div>
          </div>
        </div>

        <!-- 1. Executive KPI Metric Cards -->
        ${opt.includeKpis
      ? `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-value" style="color:#ea580c;">${formatCurrency(totalRevenue)}</div>
            <div class="kpi-sub">Last ${data.lookbackDays} days</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Transactions</div>
            <div class="kpi-value">${totalOrders.toLocaleString()} orders</div>
            <div class="kpi-sub">Completed sales</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Average Ticket (AOV)</div>
            <div class="kpi-value">${formatCurrency(aov)}</div>
            <div class="kpi-sub">Per customer order</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Customer Link Rate</div>
            <div class="kpi-value" style="color:#7c3aed;">${data.identifiedOrderSharePercent ?? 0}%</div>
            <div class="kpi-sub">Identified profiles</div>
          </div>
        </div>
        `
      : ''
    }

        <!-- 2. Key Executive Insights -->
        ${opt.includeInsights && data.insights.length
      ? `
          <div class="section">
            <div class="section-title">Key Executive Findings & Insights</div>
            ${data.insights
        .map(
          (i) => `
              <div class="insight-box ${i.tone === 'warning' || i.tone === 'negative' ? 'warning' : i.tone === 'info' ? 'info' : ''}">
                ${i.text}
              </div>
            `,
        )
        .join('')}
          </div>
        `
      : ''
    }

        <!-- 3. VISUAL CHART: Busiest Hours 24h Bar Chart -->
        ${opt.includeHourly
      ? `
        <div class="section">
          <div class="section-title">
            <span>Hourly Sales Volume Chart (24-Hour Distribution)</span>
            ${peakHour ? `<span style="color:#ea580c; font-size:9.5px;">🔥 Peak: ${peakHour.label} (+${Math.max(peakHour.upliftPercent, 0)}%)</span>` : ''}
          </div>

          <div class="chart-card">
            <div class="bar-chart-container">
              ${hours
        .map((h) => {
          const isPeak = peakHour?.hour === h.hour;
          const ratio = h.orderCount > 0 ? Math.max((h.avgSales / hourMax) * 100, 6) : 3;
          const barColor = h.orderCount === 0 ? '#e2e8f0' : isPeak ? '#ea580c' : '#3b82f6';
          return `
                    <div class="bar-col">
                      <div class="bar-fill" style="height:${ratio}%; background:${barColor};"></div>
                      ${h.hour % 3 === 0 ? `<div class="bar-axis-label">${h.hour}h</div>` : ''}
                    </div>
                  `;
        })
        .join('')}
            </div>
            <div style="display:flex; justify-content:space-between; font-size:8px; color:#64748b; margin-top:4px;">
              <span>12 AM (Midnight)</span>
              <span>6 AM</span>
              <span>12 PM (Noon)</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          ${activeHours.length
        ? `
            <table>
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Total Sales</th>
                  <th>Order Count</th>
                  <th>Avg / Order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${activeHours
          .slice(0, 6)
          .map(
            (h) => `
                  <tr>
                    <td><strong>${h.label}</strong></td>
                    <td>${formatCurrency(h.totalSales)}</td>
                    <td>${h.orderCount} orders</td>
                    <td>${formatCurrency(h.avgSales)}</td>
                    <td>${h.hour === peakHour?.hour ? '<span class="tag-peak">🔥 Peak Hour</span>' : 'Active'}</td>
                  </tr>
                `,
          )
          .join('')}
              </tbody>
            </table>
          `
        : ''
      }
        </div>
        `
      : ''
    }

        <!-- 4. VISUAL CHART: Weekend vs Weekday Proportional Split Bar -->
        ${opt.includeWeekendWeekday && weekendVsWeekday
      ? `
          <div class="section">
            <div class="section-title">Weekend vs Weekday Performance Comparison</div>
            <div class="chart-card">
              <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:700;">
                <span style="color:#475569;">Weekday: ${formatCurrency(weekendVsWeekday.weekdayAvg)}</span>
                <span style="color:#7c3aed;">Weekend: ${formatCurrency(weekendVsWeekday.weekendAvg)} (+${weekendVsWeekday.diffPercent}%)</span>
              </div>
              <div class="split-bar-track">
                <div class="split-bar-seg" style="flex:${Math.max(weekendVsWeekday.weekdayAvg, 1)}; background:#94a3b8;"></div>
                <div class="split-bar-seg" style="flex:${Math.max(weekendVsWeekday.weekendAvg, 1)}; background:#7c3aed;"></div>
              </div>
              <div style="font-size:9px; color:#64748b; text-align:center;">
                ${weekendVsWeekday.higher === 'weekend' ? 'Weekend' : 'Weekday'} sales average ${weekendVsWeekday.diffPercent}% higher.
              </div>
            </div>
          </div>
        `
      : ''
    }

        <!-- 5. VISUAL CHART: Top-Selling Products with Progress Bars -->
        ${opt.includeProducts && topProducts.length
      ? `
          <div class="section">
            <div class="section-title">Top-Selling Products Leaderboard (with Volume Progress)</div>
            <table>
              <thead>
                <tr>
                  <th style="width:30px;">#</th>
                  <th>Product Name</th>
                  <th>Units Sold</th>
                  <th style="width:140px;">Relative Volume</th>
                  <th>Est. Revenue</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                ${topProducts
        .map(
          (p, idx) => `
                  <tr>
                    <td><strong>#${idx + 1}</strong></td>
                    <td><strong>${p.productName}</strong></td>
                    <td>${p.qtySold} units</td>
                    <td>
                      <div class="progress-track">
                        <div class="progress-fill" style="width:${(p.qtySold / maxTopQty) * 100}%;"></div>
                      </div>
                    </td>
                    <td><strong>${formatCurrency(p.estimatedRevenue)}</strong></td>
                    <td>${p.orderCount}</td>
                  </tr>
                `,
        )
        .join('')}
              </tbody>
            </table>
          </div>
        `
      : ''
    }

        <!-- 6. VISUAL CHART: Customer Segmentation with SVG Donut Chart -->
        ${opt.includeSegments && segments.length
      ? `
          <div class="section">
            <div class="section-title">Customer Segmentation (RFM + k-means Clustering)</div>
            <div class="chart-card">
              <div class="donut-layout">
                <div>
                  ${donutChartSvg}
                </div>
                <div style="flex:1;">
                  <table>
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Customers</th>
                        <th>Rev. Share</th>
                        <th>Avg Spend</th>
                        <th>Recency</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${segments
        .map(
          (s) => `
                        <tr>
                          <td>
                            <span style="display:inline-block; width:8px; height:8px; border-radius:2px; background:${SEGMENT_COLORS[s.label] || '#94a3b8'}; margin-right:4px;"></span>
                            <strong>${s.label}</strong>
                          </td>
                          <td>${s.size} (${s.sharePercent}%)</td>
                          <td><strong style="color:${SEGMENT_COLORS[s.label] || '#0f172a'};">${s.revenueSharePercent}%</strong></td>
                          <td>${formatCurrency(s.avgMonetary)}</td>
                          <td>${s.avgRecencyDays}d</td>
                        </tr>
                      `,
        )
        .join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        `
      : ''
    }

        <!-- 7. VISUAL CHART: Sales Trend Trajectory Chart -->
        ${opt.includeTrend && data.salesTrend && (data.salesTrend.points ?? []).length > 0
      ? `
          <div class="section">
            <div class="section-title">
              <span>Sales Trend & Revenue Trajectory (Rolling Average + Target Line)</span>
              <span style="font-size:9.5px; color:${data.salesTrend.direction === 'increasing' ? '#16a34a' : data.salesTrend.direction === 'decreasing' ? '#dc2626' : '#2563eb'}; font-weight:bold;">
                ${data.salesTrend.direction === 'increasing' ? '↗️ +' + data.salesTrend.monthlyChangePercent + '% Monthly Growth' : data.salesTrend.direction === 'decreasing' ? '↘️ ' + data.salesTrend.monthlyChangePercent + '% Contraction' : '➡️ Stable Baseline'}
              </span>
            </div>
            <div class="chart-card">
              ${generateSvgSalesTrajectoryChart(data.salesTrend)}
              <div style="display:flex; justify-content:center; gap:16px; font-size:8.5px; margin-top:4px;">
                <span style="color:#475569;">⬛ Period Revenue</span>
                <span style="color:#10b981; font-weight:bold;">🟩 Rolling Moving Average</span>
                <span style="color:#f97316; font-weight:bold;">🟧 Target Baseline</span>
              </div>
              <div style="font-size:8px; color:#64748b; text-align:center; margin-top:3px;">
                Calculated using linear regression over ${data.salesTrend.monthsAnalyzed} periods
              </div>
            </div>
          </div>
        `
      : ''
    }

        <!-- 8. Upcoming High-Demand Selling Items (Shift Customer Demand) -->
        ${opt.includeUpcoming && (data.upcomingSellingItems ?? []).length
      ? `
          <div class="section">
            <div class="section-title">Upcoming High-Demand Items (Shift Demand Based on Customer Patterns)</div>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Demand Level</th>
                  <th>Peak Window</th>
                  <th>Expected Shift Vol.</th>
                  <th>Kitchen / Prep Advice</th>
                </tr>
              </thead>
              <tbody>
                ${(data.upcomingSellingItems ?? [])
        .map(
          (u) => `
                  <tr>
                    <td><strong>${u.productName}</strong></td>
                    <td><span style="background:#ffedd5; color:#c2410c; padding:2px 6px; border-radius:4px; font-weight:700; font-size:8.5px;">${u.demandLevel === 'very_high' ? '🔥 VERY HIGH' : u.demandLevel === 'high' ? '⚡ HIGH' : 'STEADY'}</span></td>
                    <td>${u.peakWindow}</td>
                    <td><strong>${u.expectedShiftQty}</strong></td>
                    <td style="color:#475569;">${u.prepAdvice}</td>
                  </tr>
                `,
        )
        .join('')}
              </tbody>
            </table>
          </div>
        `
      : ''
    }

        <!-- 9. Actionable AI Recommendations -->
        ${opt.includeStrategies
      ? `
        <div class="section">
          <div class="section-title">AI Actionable Strategies & Business Recommendations</div>
          <div class="strategy-grid">
            ${peakHour
        ? `
              <div class="strategy-card">
                <div class="strategy-title">⏰ Peak Hour Optimization</div>
                <div class="strategy-desc">Schedule maximum staff and prepare kitchen pre-assembly around <strong>${peakHour.label}</strong> (+${Math.max(peakHour.upliftPercent, 0)}% surge) to reduce queue wait times.</div>
              </div>
            `
        : ''
      }
            ${topProducts[0] && slowProducts[0]
        ? `
              <div class="strategy-card">
                <div class="strategy-title">🎁 Menu Bundling Strategy</div>
                <div class="strategy-desc">Bundle <strong>${topProducts[0].productName}</strong> with <strong>${slowProducts[0].productName}</strong> at a combo discount to accelerate inventory turnover.</div>
              </div>
            `
        : ''
      }
            ${segments.some((s) => s.label === 'At risk / Lapsed')
        ? `
              <div class="strategy-card">
                <div class="strategy-title">🎯 Win Back Lapsed Shoppers</div>
                <div class="strategy-desc">Reactivate ${segments.find((s) => s.label === 'At risk / Lapsed')?.size} lapsed customers with a targeted 10% re-engagement SMS coupon.</div>
              </div>
            `
        : ''
      }
            <div class="strategy-card">
              <div class="strategy-title">🌟 VIP Loyalty Engagement</div>
              <div class="strategy-desc">Provide exclusive loyalty rewards to top spending customers to protect core recurring revenue.</div>
            </div>
          </div>
        </div>
        `
      : ''
    }

        <!-- Footer -->
        <div class="footer">
          <div>Page 1 of 1 · SmartCost POS System</div>
          <div>Novelty 02: Customer Behavior & Sales Analytics Engine</div>
        </div>
      </body>
    </html>
  `;
}

/** Print all data with visual charts in standard A4 format */
export async function printCustomerBehaviorA4Report(
  data: CustomerBehaviorData,
  shopName?: string,
  options?: ReportPrintOptions,
): Promise<void> {
  try {
    const html = generateBehaviorA4HtmlReport(data, shopName, options);
    await Print.printAsync({ html });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Could not print A4 report';
    if (Platform.OS !== 'web') {
      Alert.alert('Print Error', msg);
    } else {
      console.warn('Print error:', msg);
    }
  }
}

/** Share A4 PDF with embedded visual charts */
export async function shareCustomerBehaviorPdfReport(
  data: CustomerBehaviorData,
  shopName?: string,
  options?: ReportPrintOptions,
): Promise<void> {
  try {
    const html = generateBehaviorA4HtmlReport(data, shopName, options);

    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Share Customer Behavior Report (A4 PDF)',
      });
      return;
    }

    const hours = data.hourlyPattern?.hours ?? [];
    const totalRevenue = hours.reduce((sum, h) => sum + h.totalSales, 0);
    const totalOrders = hours.reduce((sum, h) => sum + h.orderCount, 0);
    const peak = data.hourlyPattern?.peakHour?.label ?? 'N/A';
    const topProd = data.productRankings?.topProducts?.[0]?.productName ?? 'N/A';

    const summaryText = `📊 SmartCost Customer Behavior Report (A4 Visual PDF - ${data.lookbackDays} Days)\n\n` +
      `💰 Revenue: ${formatCurrency(totalRevenue)}\n` +
      `📦 Orders: ${totalOrders}\n` +
      `⏰ Peak Hour: ${peak}\n` +
      `🏆 Best Seller: ${topProd}\n\n` +
      (data.insights[0] ? `💡 Top Insight: ${data.insights[0].text}\n\n` : '') +
      `Generated by SmartCost POS System`;

    await Share.share({
      title: 'SmartCost Customer Behavior Report',
      message: summaryText,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Could not share PDF report';
    if (Platform.OS !== 'web') {
      Alert.alert('Share Error', msg);
    } else {
      console.warn('Share error:', msg);
    }
  }
}
