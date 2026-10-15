// ============================================================
// Portfolio Overview Module
// Sample Medical Book — Group Health Pricing Model
// ============================================================

const OverviewModule = (function () {
  let lrChart = null;
  let mixChart = null;

  function init() {
    renderMetrics();
    renderLossRatioChart();
    renderPlanMixTable();
    renderAgeBandTable();
    renderAdequacySummary();
  }

  function renderMetrics() {
    const p = PRICING_DATA.portfolio;
    const lr = (p.incurredClaims / p.earnedPremium * 100).toFixed(1);
    const cr = ((p.incurredClaims / p.earnedPremium) + p.expenseRatio + p.commissionRate) * 100;

    document.getElementById('metricGWP').textContent = `$${(p.gwp / 1000).toFixed(1)}M`;
    document.getElementById('metricEarnedPrem').textContent = `$${(p.earnedPremium / 1000).toFixed(1)}M`;
    document.getElementById('metricLossRatio').textContent = `${lr}%`;
    document.getElementById('metricLossRatio').style.color = parseFloat(lr) > 70 ? '#C25E2E' : '#2E7D32';
    document.getElementById('metricCombinedRatio').textContent = `${cr.toFixed(1)}%`;
    document.getElementById('metricCombinedRatio').style.color = cr > 100 ? '#C25E2E' : '#2E7D32';
  }

  function renderLossRatioChart() {
    const ctx = document.getElementById('lrTrendChart');
    if (!ctx) return;
    if (lrChart) lrChart.destroy();

    const trend = PRICING_DATA.portfolio.lossRatioTrend;
    const targetLine = trend.labels.map(() => trend.target);

    lrChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: 'Monthly Loss Ratio',
            data: trend.values.map(v => v * 100),
            borderColor: '#141413',
            backgroundColor: 'rgba(20, 20, 19, 0.05)',
            borderWidth: 2,
            pointRadius: 2.5,
            pointBackgroundColor: '#141413',
            tension: 0.2,
            fill: true
          },
          {
            label: 'Target Loss Ratio (65%)',
            data: targetLine.map(v => v * 100),
            borderColor: '#C25E2E',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#56554F', font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          tooltip: {
            backgroundColor: '#FFFFFF',
            titleColor: '#141413',
            bodyColor: '#56554F',
            borderColor: '#ECE7DE',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#F2EFEB' },
            ticks: { color: '#87857E', font: { family: 'Plus Jakarta Sans', size: 10 }, maxRotation: 45 }
          },
          y: {
            min: 55,
            max: 85,
            grid: { color: '#F2EFEB' },
            ticks: { color: '#87857E', font: { family: 'JetBrains Mono', size: 11 }, callback: v => `${v}%` }
          }
        }
      }
    });
  }

  function renderPlanMixTable() {
    const tbody = document.getElementById('planMixBody');
    if (!tbody) return;

    const plans = PRICING_DATA.portfolio.planMix;
    const totalLives = plans.reduce((a, p) => a + p.lives, 0);
    const totalPrem = plans.reduce((a, p) => a + p.premium, 0);
    const totalClaims = plans.reduce((a, p) => a + p.claims, 0);

    let html = '';
    plans.forEach(p => {
      const lrColor = p.lossRatio > 0.72 ? 'var(--accent-terracotta)' : p.lossRatio > 0.65 ? '#A06020' : 'var(--accent-green)';
      html += `
        <tr>
          <td><strong>${p.tier}</strong></td>
          <td class="num-col">${p.lives.toLocaleString()}</td>
          <td class="num-col" style="font-family: var(--font-mono);">$${(p.premium / 1000).toFixed(1)}M</td>
          <td class="num-col" style="font-family: var(--font-mono);">$${(p.claims / 1000).toFixed(1)}M</td>
          <td class="num-col" style="font-family: var(--font-mono); color: ${lrColor}; font-weight: 600;">${(p.lossRatio * 100).toFixed(1)}%</td>
          <td class="num-col">${((p.premium / totalPrem) * 100).toFixed(0)}%</td>
        </tr>`;
    });

    html += `
      <tr class="total-row">
        <td>Total Portfolio</td>
        <td class="num-col">${totalLives.toLocaleString()}</td>
        <td class="num-col" style="font-family: var(--font-mono);">$${(totalPrem / 1000).toFixed(1)}M</td>
        <td class="num-col" style="font-family: var(--font-mono);">$${(totalClaims / 1000).toFixed(1)}M</td>
        <td class="num-col" style="font-family: var(--font-mono); font-weight: 700;">${(totalClaims / totalPrem * 100).toFixed(1)}%</td>
        <td class="num-col">100%</td>
      </tr>`;

    tbody.innerHTML = html;
  }

  function renderAgeBandTable() {
    const tbody = document.getElementById('ageBandBody');
    if (!tbody) return;

    const bands = PRICING_DATA.portfolio.ageBandPerformance;
    let html = '';
    bands.forEach(b => {
      const lrColor = b.lr > 0.78 ? 'var(--accent-terracotta)' : b.lr > 0.68 ? '#A06020' : 'var(--accent-green)';
      const pmpm = ((b.claims / b.lives) / 12 * 1000).toFixed(0); // claims per member per month in actual $

      html += `
        <tr>
          <td><strong>${b.band}</strong></td>
          <td class="num-col">${b.lives.toLocaleString()}</td>
          <td class="num-col" style="font-family: var(--font-mono);">$${(b.premium).toLocaleString()}k</td>
          <td class="num-col" style="font-family: var(--font-mono);">$${(b.claims).toLocaleString()}k</td>
          <td class="num-col" style="font-family: var(--font-mono); color: ${lrColor}; font-weight: 600;">${(b.lr * 100).toFixed(1)}%</td>
          <td class="num-col" style="font-family: var(--font-mono);">$${pmpm}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
  }

  function renderAdequacySummary() {
    const a = PRICING_DATA.portfolio.adequacy;
    const el = document.getElementById('adequacySummary');
    if (!el) return;

    el.innerHTML = `
      <div class="chip-list">
        <div class="chip-list-item"><span>Current Average Rate (PMPM)</span><span>$${(a.currentAvgRate * 1000 / 12).toFixed(0)} / month</span></div>
        <div class="chip-list-item"><span>Indicated Rate (PMPM)</span><span style="color: var(--accent-terracotta); font-weight: 700;">$${(a.indicatedRate * 1000 / 12).toFixed(0)} / month</span></div>
        <div class="chip-list-item"><span>Rate Increase Needed</span><span style="color: var(--accent-terracotta); font-weight: 700;">+${(a.rateChangeNeeded * 100).toFixed(1)}%</span></div>
        <div class="chip-list-item"><span>Break-Even Loss Ratio</span><span>${(a.breakEvenLR * 100).toFixed(1)}%</span></div>
        <div class="chip-list-item"><span>Ultimate Loss Ratio (UY24)</span><span style="color: ${a.ultimateLR > a.breakEvenLR ? '#C25E2E' : '#2E7D32'}; font-weight: 600;">${(a.ultimateLR * 100).toFixed(1)}%</span></div>
      </div>`;
  }

  return { init };
})();
