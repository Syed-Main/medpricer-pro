// ============================================================
// Pricing Engine Module (Excel-like 4-Tab Workbook)
// Sample Medical Book — Group Health Pricing Model
// Tabs: Claims Experience → Trend Factors → Rate Build → Rate Card
// ============================================================

const PricingEngine = (function () {
  let activeSheet = 'claims-exp';

  function init() {
    setupSheetTabs();
    renderAllSheets();
  }

  function setupSheetTabs() {
    document.querySelectorAll('.ws-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target.dataset.sheet;
        if (!target) return;
        document.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.ws-sheet').forEach(s => s.classList.remove('active'));
        const sheetEl = document.getElementById(target);
        if (sheetEl) sheetEl.classList.add('active');
        activeSheet = target;
      });
    });
  }

  function renderAllSheets() {
    renderClaimsExperience();
    renderTrendFactors();
    renderRateBuild();
    renderRateCard();
  }

  // ── Sheet 1: Claims Experience ────────────────────────────
  function renderClaimsExperience() {
    const tbody = document.getElementById('claimsExpBody');
    if (!tbody) return;

    const data = PRICING_DATA.claimsExperience;
    const years = Object.keys(data.memberMonths);
    const bands = data.ageBands;

    let html = '';

    // For each UY, show member months, incurred claims, frequency, severity, pure premium
    years.forEach(uy => {
      html += `<tr class="subtotal-row"><td class="row-header" colspan="7" style="font-weight: 700; color: var(--accent-navy);">${uy}</td></tr>`;

      bands.forEach((band, idx) => {
        const mm = data.memberMonths[uy][idx];
        const ic = data.incurredClaims[uy][idx];
        const cc = data.claimCounts[uy][idx];
        const freq = (cc / mm * 1000).toFixed(1);     // claims per 1000 member-months
        const severity = cc > 0 ? (ic / cc * 1000).toFixed(0) : 0;  // avg cost per claim in $
        const purePremium = (ic / mm * 1000).toFixed(2); // PMPM in $

        html += `
          <tr>
            <td class="label-cell">${band}</td>
            <td class="num-col">${mm.toLocaleString()}</td>
            <td class="num-col">${Currency.k(ic)}</td>
            <td class="num-col">${cc.toLocaleString()}</td>
            <td class="num-col">${freq}</td>
            <td class="num-col">${Currency.d(severity)}</td>
            <td class="num-col formula-cell">${Currency.d(purePremium, 2)}</td>
          </tr>`;
      });

      // UY totals
      const totalMM = data.memberMonths[uy].reduce((a, b) => a + b, 0);
      const totalIC = data.incurredClaims[uy].reduce((a, b) => a + b, 0);
      const totalCC = data.claimCounts[uy].reduce((a, b) => a + b, 0);
      const totalFreq = (totalCC / totalMM * 1000).toFixed(1);
      const totalSev = totalCC > 0 ? (totalIC / totalCC * 1000).toFixed(0) : 0;
      const totalPP = (totalIC / totalMM * 1000).toFixed(2);

      html += `
        <tr class="subtotal-row">
          <td class="row-header" style="font-weight: 700;">Total ${uy}</td>
          <td class="num-col" style="font-weight: 700;">${totalMM.toLocaleString()}</td>
          <td class="num-col" style="font-weight: 700;">${Currency.k(totalIC)}</td>
          <td class="num-col" style="font-weight: 700;">${totalCC.toLocaleString()}</td>
          <td class="num-col" style="font-weight: 700;">${totalFreq}</td>
          <td class="num-col" style="font-weight: 700;">${Currency.d(totalSev)}</td>
          <td class="num-col formula-cell" style="font-weight: 700;">${Currency.d(totalPP, 2)}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
  }

  // ── Sheet 2: Trend & Development Factors ─────────────────
  function renderTrendFactors() {
    const m = Model.compute(), T = PRICING_DATA.trendFactors;
    const devBody = document.getElementById('devFactorsBody');
    if (devBody) devBody.innerHTML = T.developmentFactors.map(d => `
      <tr><td class="label-cell">${d.lag}</td><td class="num-col">${(d.completionPct * 100).toFixed(0)}%</td>
      <td class="num-col formula-cell">${d.factor.toFixed(3)}</td></tr>`).join('');
    const seasonBody = document.getElementById('seasonalBody');
    if (seasonBody) seasonBody.innerHTML = T.seasonalIndex.map(x => `
      <tr><td class="label-cell">${x.quarter}</td><td class="num-col formula-cell">${x.index.toFixed(2)}</td><td>${x.note}</td></tr>`).join('');

    const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    set('trendFactorComputed', m.years.map(uy => `${uy.replace('UY 20', 'UY')} ${m.tf[uy].toFixed(3)}x`).join(' · '));
    const obs = m.observedTrend * 100, asm = m.st.trend * 100;
    set('observedTrend', `${obs.toFixed(1)}% p.a.`);
    set('observedTrendNote', Math.abs(obs - asm) <= 1.5
      ? `Within ${Math.abs(obs - asm).toFixed(1)}pt of the ${asm.toFixed(1)}% assumption`
      : `⚠ ${Math.abs(obs - asm).toFixed(1)}pt away from the ${asm.toFixed(1)}% assumption — justify or revisit`);
    const o = document.getElementById('observedTrendNote'); if (o) o.style.color = Math.abs(obs - asm) <= 1.5 ? '' : '#C25E2E';
    set('credStd', `Full-credibility standard: ${Math.round(m.std).toLocaleString()} claims (1,082 × (1+CV²))`);
    const c24 = m.comp[m.lastUY];
    set('devAppliedNote', `IBNR: UY24 is ${(c24 * 100).toFixed(1)}% complete at the 31 Mar 2025 valuation (monthly lags mapped to the table above), a ${(1 / c24).toFixed(3)}x gross-up; UY22–23 treated as complete.`);
  }

  // ── Sheet 3: Rate Build (all values from Model) ──────────
  function renderRateBuild() {
    const m = Model.compute(), pc = v => (v * 100).toFixed(0) + '%';
    const tbody = document.getElementById('rateBuildBody');
    if (tbody) {
      let html = m.rows.map(r => `
        <tr><td class="label-cell">${r.band}</td>
          <td class="num-col">${Currency.d(r.rawPP, 2)}</td>
          <td class="num-col formula-cell">${r.factor.toFixed(3)}x</td>
          <td class="num-col">${Currency.d(r.adjPP, 2)}</td>
          <td class="num-col">${pc(r.Z)}</td>
          <td class="num-col formula-cell">${Currency.d(r.blendedPP, 2)}</td>
          <td class="num-col">${(m.loadTot * 100).toFixed(1)}%</td>
          <td class="num-col formula-cell" style="font-weight: 700; color: var(--accent-navy);">${Currency.d(r.indicated, 2)}</td></tr>`).join('');
      html += `<tr class="total-row"><td class="row-header">Weighted Average (UY24 mix)</td>
        <td class="num-col" colspan="6" style="text-align:right; color: var(--text-muted);">Current avg ${Currency.d(m.curAvg, 2)} → rate change ${(m.overallChange >= 0 ? '+' : '') + (m.overallChange * 100).toFixed(1)}%</td>
        <td class="num-col formula-cell" style="font-weight: 700; color: var(--accent-navy);">${Currency.d(m.indAvg, 2)}</td></tr>`;
      tbody.innerHTML = html;
    }
    const lb = document.getElementById('loadingsBody');
    if (lb) {
      let html = m.st.loadings.map((l, i) => `
        <tr><td class="label-cell">${l.item}</td><td class="num-col">
          <input type="number" value="${(l.pct * 100).toFixed(1)}" step="0.5" min="0" max="30" onchange="PricingEngine.updateLoading(${i}, this.value)" />%</td></tr>`).join('');
      html += `<tr class="total-row"><td class="row-header">Total Expense & Profit Load</td><td class="num-col" style="font-weight: 700;">${(m.loadTot * 100).toFixed(1)}%</td></tr>
        <tr><td class="row-header">Permissible LR (incl. profit)</td><td class="num-col formula-cell" style="font-weight: 700;">${(m.permLR * 100).toFixed(1)}%</td></tr>
        <tr><td class="row-header">Break-even LR (ex-profit)</td><td class="num-col formula-cell" style="font-weight: 700;">${(m.breakEvenLR * 100).toFixed(1)}%</td></tr>`;
      lb.innerHTML = html;
    }
  }

  // ── Sheet 4: Final Rate Card ─────────────────────────────
  function renderRateCard() {
    const tbody = document.getElementById('rateCardBody');
    if (!tbody) return;
    const m = Model.compute(), planRel = PRICING_DATA.rateBuild.planRelativities;
    tbody.innerHTML = m.rows.map(r => {
      const bronzeBase = r.indicated / m.avgPlanRel;   // experience is an all-plan average, so rebase to Bronze
      return `<tr><td class="row-header">${r.band}</td>` +
        planRel.map(p => `<td class="num-col highlight" style="font-family: var(--font-mono);">${Currency.d(bronzeBase * p.relativity)}</td>`).join('') +
        `<td class="num-col" style="font-family: var(--font-mono); color: var(--text-muted);">${Currency.dk(bronzeBase * planRel[2].relativity * 12)}</td></tr>`;
    }).join('');
    const note = document.getElementById('rateCardNote');
    if (note) note.textContent = `Indicated all-plan PMPM ÷ ${m.avgPlanRel.toFixed(3)} (lives-weighted plan relativity) = Bronze base, then × plan relativity.`;
  }

  // ── Public methods ───────────────────────────────────────
  function rerender() { renderRateBuild(); renderRateCard(); renderTrendFactors(); if (typeof OverviewModule !== 'undefined') OverviewModule.init(); if (typeof Insights !== 'undefined') Insights.render(); }
  function updateLoading(i, v) { Model.setLoading(i, (parseFloat(v) || 0) / 100); rerender(); }
  function updateTrend(v) { Model.setTrend((parseFloat(v) || 0) / 100); rerender(); }
  function updateCV(v) { Model.setCV(Math.max(0, parseFloat(v) || 0)); rerender(); }
  function syncInputs() {
    const t = document.getElementById('trendRateInput'), c = document.getElementById('cvInput');
    if (t) t.value = (Model.state.trend * 100).toFixed(1);
    if (c) c.value = Model.state.cv;
  }

  return { init, renderAllSheets, updateLoading, updateTrend, updateCV, syncInputs };
})();
