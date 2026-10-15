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
    const m = Model.compute(), p = PRICING_DATA.portfolio, pct = v => (v * 100).toFixed(1) + '%';
    const set = (id, t, col) => { const e = document.getElementById(id); if (!e) return; e.textContent = t; if (col) e.style.color = col; };
    set('metricGWP', Currency.m(p.gwp));
    set('metricEarnedPrem', Currency.m(p.earnedPremium));
    set('metricLossRatio', pct(m.ultimateLR), m.ultimateLR > m.permLR ? '#C25E2E' : '#2E7D32');
    set('metricLRSub', `Reported ${pct(m.reportedLR)} + IBNR · permissible ${pct(m.permLR)}`);
    set('metricCombinedRatio', pct(m.combined), m.combined > 1 ? '#C25E2E' : '#2E7D32');
    set('metricCRSub', `Ultimate LR + ${pct(m.loadTot - m.profit)} loadings (ex-profit)`);
  }

  function renderLossRatioChart() {
    const ctx = document.getElementById('lrTrendChart');
    if (!ctx) return;
    if (lrChart) lrChart.destroy();

    const trend = PRICING_DATA.portfolio.lossRatioTrend;
    const permLR = Model.compute().permLR;
    const targetLine = trend.labels.map(() => permLR);

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
            label: `Permissible LR (${(permLR * 100).toFixed(1)}%)`,
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
          <td class="num-col" style="font-family: var(--font-mono);">${Currency.m(p.premium)}</td>
          <td class="num-col" style="font-family: var(--font-mono);">${Currency.m(p.claims)}</td>
          <td class="num-col" style="font-family: var(--font-mono); color: ${lrColor}; font-weight: 600;">${(p.lossRatio * 100).toFixed(1)}%</td>
          <td class="num-col">${((p.premium / totalPrem) * 100).toFixed(0)}%</td>
        </tr>`;
    });

    html += `
      <tr class="total-row">
        <td>Total Portfolio</td>
        <td class="num-col">${totalLives.toLocaleString()}</td>
        <td class="num-col" style="font-family: var(--font-mono);">${Currency.m(totalPrem)}</td>
        <td class="num-col" style="font-family: var(--font-mono);">${Currency.m(totalClaims)}</td>
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
          <td class="num-col" style="font-family: var(--font-mono);">${Currency.k(b.premium)}</td>
          <td class="num-col" style="font-family: var(--font-mono);">${Currency.k(b.claims)}</td>
          <td class="num-col" style="font-family: var(--font-mono); color: ${lrColor}; font-weight: 600;">${(b.lr * 100).toFixed(1)}%</td>
          <td class="num-col" style="font-family: var(--font-mono);">${Currency.d(pmpm)}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
  }

  function renderAdequacySummary() {
    const m = Model.compute(), el = document.getElementById('adequacySummary');
    if (!el) return;
    const pc = v => `${(v * 100).toFixed(1)}%`;
    el.innerHTML = `
      <div class="chip-list">
        <div class="chip-list-item"><span>Current Average Rate (PMPM)</span><span>${Currency.d(m.curAvg)} / month</span></div>
        <div class="chip-list-item"><span>Indicated Rate (PMPM)</span><span style="color: var(--accent-terracotta); font-weight: 700;">${Currency.d(m.indAvg)} / month</span></div>
        <div class="chip-list-item"><span>Rate Increase Indicated</span><span style="color: var(--accent-terracotta); font-weight: 700;">${m.overallChange >= 0 ? '+' : ''}${pc(m.overallChange)}</span></div>
        <div class="chip-list-item"><span>Break-Even LR (no profit)</span><span>${pc(m.breakEvenLR)}</span></div>
        <div class="chip-list-item"><span>Permissible LR (incl. profit)</span><span>${pc(m.permLR)}</span></div>
        <div class="chip-list-item"><span>Ultimate Loss Ratio (UY24)</span><span style="color: ${m.ultimateLR > m.breakEvenLR ? '#C25E2E' : '#2E7D32'}; font-weight: 600;">${pc(m.ultimateLR)}</span></div>
      </div>`;
  }

  return { init };
})();
