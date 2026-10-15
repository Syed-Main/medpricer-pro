// ============================================================
// Insights — memo text, impact table and reconciliation panel.
// Every figure is read from Model so it cannot drift from the worksheets.
// ============================================================
const Insights = (function () {
  const pc = (v, d = 1) => (v * 100).toFixed(d) + '%';
  const sg = v => (v >= 0 ? '+' : '') + pc(v);
  const el = id => document.getElementById(id);

  function render() { renderMemo(); renderImpact(); renderChecks(); renderTargets(); }

  function renderMemo() {
    const box = el('memoDynamic'); if (!box) return;
    const m = Model.compute(), P = PRICING_DATA.portfolio, c = PRICING_DATA.claimsExperience;
    const lastUY = m.lastUY, firstUY = m.years[0];
    const freq = i => c.claimCounts[lastUY][i] / c.memberMonths[lastUY][i];
    const freq0 = i => c.claimCounts[firstUY][i] / c.memberMonths[firstUY][i];
    const seniorFreq = Math.pow((freq(3) + freq(4)) / (freq0(3) + freq0(4)), 0.5) - 1;
    const sev = (uy, k) => (c.incurredClaims[uy][3] + c.incurredClaims[uy][4]) / k / (c.claimCounts[uy][3] + c.claimCounts[uy][4]);
    const seniorSev = Math.pow(sev(lastUY, m.comp[lastUY]) / sev(firstUY, m.comp[firstUY]), 0.5) - 1;
    const plat = P.planMix[3], lrB = P.ageBandPerformance;
    const sens = Model.compute({ trend: m.st.trend + 0.01 }).overallChange - m.overallChange;
    const obs = m.observedTrend;
    box.innerHTML = `
      <p style="margin-bottom: 14px;"><strong>Context:</strong> Experience and rate-adequacy analysis of the <strong>Sample Medical Book</strong>
        (${Currency.m(P.gwp)} GWP, ${P.ageBandPerformance.reduce((a, b) => a + b.lives, 0).toLocaleString()} lives, UY 2022–2024; synthetic data).
        The reported loss ratio is <strong>${pc(m.reportedLR)}</strong>; after IBNR the UY24 <strong>ultimate loss ratio is ${pc(m.ultimateLR)}</strong> against a
        permissible ${pc(m.permLR)} (break-even ${pc(m.breakEvenLR)}). The ultimate combined ratio is <strong>${pc(m.combined)}</strong>, i.e. the book is loss-making before any trend.</p>
      <p>On the stated assumptions (trend ${pc(m.st.trend)} p.a., per-year trending to mid-2025, credibility-weighted against the prior rate basis),
        an overall rate change of <strong>${sg(m.overallChange)}</strong> is indicated, ranging from ${sg(m.rows[0].change)} (${m.rows[0].band}) to ${sg(m.rows[4].change)} (${m.rows[4].band}).
        Each ±1pt of trend moves the indication by about ±${(sens * 100).toFixed(1)}pts.</p>`;
    const issues = el('memoIssues'); if (!issues) return;
    const issue = (h, body, rec) => `<div style="border-left: 3px solid var(--accent-terracotta); padding-left: 16px;">
      <h4 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${h}</h4>
      <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;">${body}</p>
      <div style="margin-top: 8px; font-size: 0.84rem; font-weight: 600; color: var(--accent-navy);">${rec}</div></div>`;
    issues.innerHTML =
      issue('1. Age curve is flatter than claims: younger members cross-subsidise ages 50–64',
        `Loss ratios are <strong>${pc(lrB[3].claims / lrB[3].premium)}</strong> (50–59) and <strong>${pc(lrB[4].claims / lrB[4].premium)}</strong> (60–64) versus <strong>${pc(lrB[0].claims / lrB[0].premium)}</strong> at 18–29.
         Claims-implied relativities are <strong>${m.relClaims[3].toFixed(2)}x</strong> and <strong>${m.relClaims[4].toFixed(2)}x</strong>, but current premiums charge only ${m.relPrem[3].toFixed(2)}x and ${m.relPrem[4].toFixed(2)}x.
         Over UY22–24 the combined 50–64 claim frequency moved ${sg(seniorFreq)} p.a. and average severity ${sg(seniorSev)} p.a. (completion-adjusted), so the gradient is ${Math.abs(seniorSev) > Math.abs(seniorFreq) ? 'severity' : 'frequency'}-driven.`,
        `Recommendation: move the age curve towards claims-implied relativities (credibility-weighted rates are in the impact table), phased over renewals to manage lapse risk.`) +
      issue('2. Platinum tier loss ratio is the highest of the plan tiers',
        `Platinum runs at <strong>${pc(plat.claims / plat.premium)}</strong> (${Currency.k(plat.claims)} claims on ${Currency.k(plat.premium)} premium). The data supplied has no benefit-category split,
         so first-dollar utilisation cannot yet be evidenced; it is a hypothesis, not a finding.`,
        `Recommendation: request outpatient/inpatient utilisation by tier, then test an outpatient co-pay. The saving is not quantified here because no utilisation-elasticity evidence is available.`) +
      issue('3. Trend assumption is critical and must be evidenced',
        `Assumed trend is <strong>${pc(m.st.trend)} p.a.</strong>; the mix-adjusted, completion-adjusted PMPM in the UY22–24 experience implies <strong>${pc(obs)} p.a.</strong>
         (UY22–23 are synthetic back-casts, so this agreement is by construction). Each UY is trended from its own midpoint (3, 2 and 1 years to mid-2025).`,
        `Recommendation: support the trend with external medical-inflation benchmarks and network tariff changes, and track actual-vs-expected quarterly.`);
  }

  function renderImpact() {
    const tb = el('impactBody'); if (!tb) return;
    const m = Model.compute();
    tb.innerHTML = m.rows.map(r => `<tr><td><strong>${r.band}</strong></td>
      <td class="num-col">${Math.round(r.lives).toLocaleString()}</td>
      <td class="num-col" style="font-family: var(--font-mono);">${Currency.d(r.currentPMPM)}</td>
      <td class="num-col" style="font-family: var(--font-mono);">${Currency.d(r.indicated)}</td>
      <td class="num-col" style="font-family: var(--font-mono); font-weight: 600; color: ${r.change > 0.1 ? 'var(--accent-terracotta)' : 'inherit'};">${sg(r.change)}</td>
      <td class="num-col" style="font-family: var(--font-mono);">${(r.premImpact >= 0 ? '+' : '-') + Currency.k(Math.abs(r.premImpact))}</td>
      <td class="num-col" style="font-family: var(--font-mono); font-weight: 700;">${(r.netImpact >= 0 ? '+' : '-') + Currency.k(Math.abs(r.netImpact))}</td></tr>`).join('') +
      `<tr class="total-row"><td><strong>Total Book</strong></td><td class="num-col">${Math.round(m.rows.reduce((a, r) => a + r.lives, 0)).toLocaleString()}</td>
      <td class="num-col" style="font-family: var(--font-mono);">${Currency.d(m.curAvg)}</td><td class="num-col" style="font-family: var(--font-mono);">${Currency.d(m.indAvg)}</td>
      <td class="num-col" style="font-family: var(--font-mono); font-weight: 700;">${sg(m.overallChange)}</td>
      <td class="num-col" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">+${Currency.k(m.premImpact)}</td>
      <td class="num-col" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-navy); font-size: 1rem;">+${Currency.k(m.netImpact)}</td></tr>`;
    const n = el('impactNote');
    if (n) n.textContent = `Annualised on UY24 exposure, assuming 100% retention and no anti-selection (an upper bound). Net margin = premium impact × (1 − ${pc(m.varLoad)} premium-variable costs: commission, levy, reinsurance cession).`;
  }

  function renderTargets() {
    const m = Model.compute(), set = (id, t) => { const e = el(id); if (e) e.textContent = t; };
    set('tgtLR', pc(m.permLR)); set('tgtCR', pc(m.permLR + m.loadTot - m.profit)); set('tgtMargin', '+' + pc(m.profit));
  }

  function renderChecks() {
    const list = Model.checks(), ok = list.filter(c => c.ok).length;
    const badge = el('checksBadge');
    if (badge) { badge.textContent = `${ok}/${list.length} checks pass`; badge.style.color = ok === list.length ? '#2E7D32' : '#C25E2E'; }
    const box = el('checksBody'); if (!box) return;
    const f = n => Math.abs(n) < 10 && n % 1 ? n.toFixed(3) : Math.round(n).toLocaleString();
    box.innerHTML = list.map(c => `<tr><td>${c.label}</td><td class="num-col" style="font-family: var(--font-mono);">${f(c.a)}</td>
      <td class="num-col" style="font-family: var(--font-mono);">${f(c.b)}</td>
      <td class="num-col" style="font-weight: 700; color: ${c.ok ? '#2E7D32' : '#C25E2E'};">${c.ok ? '✓' : '✗'}</td></tr>`).join('');
  }

  return { render };
})();
