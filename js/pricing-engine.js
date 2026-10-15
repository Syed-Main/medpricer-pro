// ============================================================
// Pricing Engine Module (Excel-like 4-Tab Workbook)
// Sample Medical Book — Group Health Pricing Model
// Tabs: Claims Experience → Trend Factors → Rate Build → Rate Card
// ============================================================

const PricingEngine = (function () {
  let activeSheet = 'claims-exp';

  // Editable state (cloned from PRICING_DATA for live recalculation)
  let trendRate = PRICING_DATA.trendFactors.annualClaimsTrend;
  let trendPeriod = PRICING_DATA.trendFactors.trendPeriod;
  let credibility = PRICING_DATA.trendFactors.credibilityZ;
  let loadings = JSON.parse(JSON.stringify(PRICING_DATA.rateBuild.loadings));

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
            <td class="num-col">$${ic.toLocaleString()}k</td>
            <td class="num-col">${cc.toLocaleString()}</td>
            <td class="num-col">${freq}</td>
            <td class="num-col">$${severity}</td>
            <td class="num-col formula-cell">$${purePremium}</td>
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
          <td class="num-col" style="font-weight: 700;">$${totalIC.toLocaleString()}k</td>
          <td class="num-col" style="font-weight: 700;">${totalCC.toLocaleString()}</td>
          <td class="num-col" style="font-weight: 700;">${totalFreq}</td>
          <td class="num-col" style="font-weight: 700;">$${totalSev}</td>
          <td class="num-col formula-cell" style="font-weight: 700;">$${totalPP}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
  }

  // ── Sheet 2: Trend & Development Factors ──────────────────
  function renderTrendFactors() {
    // Development factors table
    const devBody = document.getElementById('devFactorsBody');
    if (devBody) {
      let html = '';
      PRICING_DATA.trendFactors.developmentFactors.forEach(d => {
        html += `
          <tr>
            <td class="label-cell">${d.lag}</td>
            <td class="num-col">${(d.completionPct * 100).toFixed(0)}%</td>
            <td class="num-col formula-cell">${d.factor.toFixed(3)}</td>
          </tr>`;
      });
      devBody.innerHTML = html;
    }

    // Seasonal index table
    const seasonBody = document.getElementById('seasonalBody');
    if (seasonBody) {
      let html = '';
      PRICING_DATA.trendFactors.seasonalIndex.forEach(s => {
        html += `
          <tr>
            <td class="label-cell">${s.quarter}</td>
            <td class="num-col formula-cell">${s.index.toFixed(2)}</td>
            <td>${s.note}</td>
          </tr>`;
      });
      seasonBody.innerHTML = html;
    }

    // Update trend inspector values
    const trendEl = document.getElementById('trendRateDisplay');
    if (trendEl) trendEl.textContent = `${(trendRate * 100).toFixed(1)}% p.a.`;

    const trendFactorEl = document.getElementById('trendFactorComputed');
    if (trendFactorEl) {
      const tf = Math.pow(1 + trendRate, trendPeriod);
      trendFactorEl.textContent = `${tf.toFixed(3)}x (over ${trendPeriod} years)`;
    }
  }

  // ── Sheet 3: Rate Build (with loadings inline) ────────────
  function renderRateBuild() {
    // Step 1: Compute blended experience pure premium (latest 3 UYs, weighted)
    const data = PRICING_DATA.claimsExperience;
    const bands = data.ageBands;
    const years = Object.keys(data.memberMonths);

    // Weighted average pure premium by age band across all UYs
    const purePremByBand = bands.map((_, idx) => {
      let totalIC = 0, totalMM = 0;
      years.forEach(uy => {
        totalIC += data.incurredClaims[uy][idx];
        totalMM += data.memberMonths[uy][idx];
      });
      return totalIC / totalMM * 1000; // PMPM in $
    });

    // Step 2: Apply trend factor
    const trendFactor = Math.pow(1 + trendRate, trendPeriod);
    const trendedPP = purePremByBand.map(pp => pp * trendFactor);

    // Step 3: Credibility blend (experience vs manual)
    // Manual rates = experience rates * 1.05 (slight industry adjustment)
    const manualPP = trendedPP.map(pp => pp * 1.05);
    const blendedPP = trendedPP.map((exp, i) => credibility * exp + (1 - credibility) * manualPP[i]);

    // Step 4: Expense and profit loading
    const totalLoadingPct = loadings.reduce((acc, l) => acc + l.pct, 0);
    const loadedPP = blendedPP.map(pp => pp / (1 - totalLoadingPct));

    // Render rate build table
    const tbody = document.getElementById('rateBuildBody');
    if (tbody) {
      let html = '';
      bands.forEach((band, idx) => {
        html += `
          <tr>
            <td class="label-cell">${band}</td>
            <td class="num-col">$${purePremByBand[idx].toFixed(2)}</td>
            <td class="num-col formula-cell">${trendFactor.toFixed(3)}x</td>
            <td class="num-col">$${trendedPP[idx].toFixed(2)}</td>
            <td class="num-col">${(credibility * 100).toFixed(0)}%</td>
            <td class="num-col formula-cell">$${blendedPP[idx].toFixed(2)}</td>
            <td class="num-col">${(totalLoadingPct * 100).toFixed(1)}%</td>
            <td class="num-col formula-cell" style="font-weight: 700; color: var(--accent-navy);">$${loadedPP[idx].toFixed(2)}</td>
          </tr>`;
      });

      // Total weighted row
      let totalRawPP = 0, totalLoaded = 0, totalMM = 0;
      bands.forEach((_, idx) => {
        let mm = 0;
        years.forEach(uy => { mm += data.memberMonths[uy][idx]; });
        totalRawPP += purePremByBand[idx] * mm;
        totalLoaded += loadedPP[idx] * mm;
        totalMM += mm;
      });
      html += `
        <tr class="total-row">
          <td class="row-header">Weighted Average</td>
          <td class="num-col">$${(totalRawPP / totalMM).toFixed(2)}</td>
          <td class="num-col">${trendFactor.toFixed(3)}x</td>
          <td class="num-col">$${(totalRawPP / totalMM * trendFactor).toFixed(2)}</td>
          <td class="num-col">${(credibility * 100).toFixed(0)}%</td>
          <td class="num-col">—</td>
          <td class="num-col">${(totalLoadingPct * 100).toFixed(1)}%</td>
          <td class="num-col formula-cell" style="font-weight: 700; color: var(--accent-navy);">$${(totalLoaded / totalMM).toFixed(2)}</td>
        </tr>`;

      tbody.innerHTML = html;
    }

    // Render loadings breakdown
    const loadingsBody = document.getElementById('loadingsBody');
    if (loadingsBody) {
      let html = '';
      loadings.forEach((l, idx) => {
        html += `
          <tr>
            <td class="label-cell">${l.item}</td>
            <td class="num-col">
              <input type="number" value="${(l.pct * 100).toFixed(1)}" step="0.5" min="0" max="30"
                     onchange="PricingEngine.updateLoading(${idx}, this.value)" />%
            </td>
          </tr>`;
      });
      html += `
        <tr class="total-row">
          <td class="row-header">Total Expense & Profit Load</td>
          <td class="num-col" style="font-weight: 700;">${(totalLoadingPct * 100).toFixed(1)}%</td>
        </tr>
        <tr>
          <td class="row-header">Permissible Loss Ratio</td>
          <td class="num-col formula-cell" style="font-weight: 700;">${((1 - totalLoadingPct) * 100).toFixed(1)}%</td>
        </tr>`;

      loadingsBody.innerHTML = html;
    }
  }

  // ── Sheet 4: Final Rate Card ──────────────────────────────
  function renderRateCard() {
    const tbody = document.getElementById('rateCardBody');
    if (!tbody) return;

    // Recompute loaded PMPM per age band
    const data = PRICING_DATA.claimsExperience;
    const bands = data.ageBands;
    const years = Object.keys(data.memberMonths);

    const purePremByBand = bands.map((_, idx) => {
      let totalIC = 0, totalMM = 0;
      years.forEach(uy => {
        totalIC += data.incurredClaims[uy][idx];
        totalMM += data.memberMonths[uy][idx];
      });
      return totalIC / totalMM * 1000;
    });

    const trendFactor = Math.pow(1 + trendRate, trendPeriod);
    const trendedPP = purePremByBand.map(pp => pp * trendFactor);
    const manualPP = trendedPP.map(pp => pp * 1.05);
    const blendedPP = trendedPP.map((exp, i) => credibility * exp + (1 - credibility) * manualPP[i]);
    const totalLoadingPct = loadings.reduce((acc, l) => acc + l.pct, 0);
    const loadedPP = blendedPP.map(pp => pp / (1 - totalLoadingPct));

    const planRel = PRICING_DATA.rateBuild.planRelativities;

    let html = '';
    bands.forEach((band, idx) => {
      html += `<tr><td class="row-header">${band}</td>`;
      planRel.forEach(plan => {
        const rate = loadedPP[idx] * plan.relativity;
        html += `<td class="num-col highlight" style="font-family: var(--font-mono);">$${rate.toFixed(0)}</td>`;
      });
      // Annual equivalent for Gold (representative)
      const annualGold = loadedPP[idx] * planRel[2].relativity * 12;
      html += `<td class="num-col" style="font-family: var(--font-mono); color: var(--text-muted);">$${(annualGold / 1000).toFixed(1)}k</td>`;
      html += `</tr>`;
    });

    tbody.innerHTML = html;
  }

  // ── Public methods for inline editable loadings ───────────
  function updateLoading(index, value) {
    loadings[index].pct = parseFloat(value) / 100 || 0;
    renderRateBuild();
    renderRateCard();
  }

  function updateTrend(value) {
    trendRate = parseFloat(value) / 100 || 0;
    renderRateBuild();
    renderRateCard();
    renderTrendFactors();
  }

  function updateCredibility(value) {
    credibility = parseFloat(value) / 100 || 0;
    renderRateBuild();
    renderRateCard();
  }

  return {
    init,
    renderAllSheets,
    updateLoading,
    updateTrend,
    updateCredibility
  };
})();
