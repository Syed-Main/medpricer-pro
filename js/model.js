// ============================================================
// Model — single source of truth for every derived number.
// Overview, worksheets, memo and checks all read Model.compute().
// ============================================================
const Model = (function () {
  const D = PRICING_DATA;
  const T0 = D.trendFactors;
  const sum = a => a.reduce((x, y) => x + y, 0);
  const defaults = () => ({
    trend: T0.annualClaimsTrend,
    cv: T0.severityCV,
    loadings: JSON.parse(JSON.stringify(D.rateBuild.loadings))
  });
  let S = defaults();

  const loadOf = (names) => sum(S.loadings.filter(l => names.some(n => l.item.includes(n))).map(l => l.pct));

  // Share of a UY's claims reported at the valuation date, from the lag-completion table (equal monthly weights)
  function completion(uyLabel) {
    const y = parseInt(uyLabel.slice(3), 10), v = T0.valuationDate;
    const tbl = T0.developmentFactors.map(d => d.completionPct); // 0-3, 3-6, 6-9, 9-12, 12+
    let tot = 0;
    for (let m = 1; m <= 12; m++) {
      const lag = (v.year - y) * 12 + v.month - m;            // months from end of incurral month to valuation
      tot += lag < 3 ? tbl[0] : lag < 6 ? tbl[1] : lag < 9 ? tbl[2] : lag < 12 ? tbl[3] : tbl[4];
    }
    return tot / 12;
  }

  function compute(override) {
    const st = Object.assign({}, S, override || {});
    const c = D.claimsExperience, bands = c.ageBands, years = Object.keys(c.memberMonths);
    const lastUY = years[years.length - 1];
    const loadTot = sum(st.loadings.map(l => l.pct));
    const profit = sum(st.loadings.filter(l => l.item.includes('Profit')).map(l => l.pct));
    const permLR = 1 - loadTot, breakEvenLR = 1 - (loadTot - profit);
    const varLoad = sum(st.loadings.filter(l => /Commission|Levy|Reinsurance/.test(l.item)).map(l => l.pct));
    const comp = {}; years.forEach(uy => comp[uy] = completion(uy));
    const tf = {}; years.forEach(uy => tf[uy] = Math.pow(1 + st.trend, T0.trendYears[uy]));
    const std = T0.fullCredBase * (1 + st.cv * st.cv);

    const pb = D.portfolio.ageBandPerformance;
    const rows = bands.map((band, i) => {
      let ic = 0, mm = 0, cn = 0, adj = 0;
      years.forEach(uy => {
        ic += c.incurredClaims[uy][i]; mm += c.memberMonths[uy][i]; cn += c.claimCounts[uy][i];
        adj += c.incurredClaims[uy][i] / comp[uy] * tf[uy];                // ultimate, trended to 2025 midpoint
      });
      const rawPP = ic / mm * 1000, adjPP = adj / mm * 1000;
      const mm24 = c.memberMonths[lastUY][i];
      const currentPMPM = pb[i].premium / mm24 * 1000;
      const manualPP = currentPMPM * permLR * tf[lastUY];                  // prior rate basis: priced to target, trended
      const Z = Math.min(1, Math.sqrt(cn / std));
      const blendedPP = Z * adjPP + (1 - Z) * manualPP;
      const indicated = blendedPP / (1 - loadTot);                         // average-plan PMPM
      return { band, rawPP, adjPP, factor: adjPP / rawPP, claims: cn, Z, manualPP, blendedPP, indicated,
               currentPMPM, change: indicated / currentPMPM - 1, mm24, lives: mm24 / 12,
               premImpact: (indicated - currentPMPM) * mm24 / 1000,
               netImpact: (indicated - currentPMPM) * mm24 / 1000 * (1 - varLoad),
               claimPMPM24: c.incurredClaims[lastUY][i] / mm24 * 1000 };
    });
    const mm24T = sum(rows.map(r => r.mm24));
    const curTot = sum(rows.map(r => r.currentPMPM * r.mm24)), indTot = sum(rows.map(r => r.indicated * r.mm24));
    const earned = D.portfolio.earnedPremium, reported = D.portfolio.incurredClaims;
    const ultimate = reported / comp[lastUY];
    const planRels = D.rateBuild.planRelativities;
    const lives = D.portfolio.planMix.map(p => p.lives);
    const avgPlanRel = sum(planRels.map((p, i) => p.relativity * lives[i])) / sum(lives);

    // Observed trend: mix-fixed (UY24 weights), completion-adjusted PMPM, UY22 -> UY24 CAGR
    const mixPP = uy => sum(bands.map((_, i) => c.incurredClaims[uy][i] / comp[uy] / c.memberMonths[uy][i] * c.memberMonths[lastUY][i]));
    const observedTrend = Math.pow(mixPP(lastUY) / mixPP(years[0]), 1 / (years.length - 1)) - 1;

    // Age relativities: charged (current premium) vs claims-implied (UY24 reported PMPM)
    const relPrem = rows.map(r => r.currentPMPM / rows[0].currentPMPM);
    const relClaims = rows.map(r => r.claimPMPM24 / rows[0].claimPMPM24);

    return { st, rows, bands, years, lastUY, comp, tf, std, loadTot, profit, permLR, breakEvenLR, varLoad, earned, reported, ultimate,
      reportedLR: reported / earned, ultimateLR: ultimate / earned, combined: ultimate / earned + (loadTot - profit),
      curAvg: curTot / mm24T, indAvg: indTot / mm24T, overallChange: indTot / curTot - 1,
      premImpact: sum(rows.map(r => r.premImpact)), netImpact: sum(rows.map(r => r.netImpact)),
      avgPlanRel, observedTrend, relPrem, relClaims };
  }

  // Live reconciliation checks (tolerance in $000s / ratio points)
  function checks() {
    const P = D.portfolio, c = D.claimsExperience, m = compute(), sum_ = sum;
    const last = m.lastUY, near = (a, b, t = 0.5) => Math.abs(a - b) <= t;
    const lr24 = sum_(P.lossRatioTrend.values.slice(12)) / 12;
    const list = [
      ['Age-band premium = earned premium', sum_(P.ageBandPerformance.map(x => x.premium)), P.earnedPremium],
      ['Age-band claims = incurred claims', sum_(P.ageBandPerformance.map(x => x.claims)), P.incurredClaims],
      ['Plan-tier premium = earned premium', sum_(P.planMix.map(x => x.premium)), P.earnedPremium],
      ['Plan-tier claims = incurred claims', sum_(P.planMix.map(x => x.claims)), P.incurredClaims],
      ['Lives: plan mix = age bands', sum_(P.planMix.map(x => x.lives)), sum_(P.ageBandPerformance.map(x => x.lives))],
      ['Lives = UY24 member months / 12', sum_(c.memberMonths[last]) / 12, sum_(P.ageBandPerformance.map(x => x.lives))],
      ['UY24 experience claims = overview claims', sum_(c.incurredClaims[last]), P.incurredClaims],
      ['UY24 experience claims tie band by band', sum_(c.incurredClaims[last].map((v, i) => Math.abs(v - P.ageBandPerformance[i].claims))), 0],
      ['Reported LR = 2024 monthly LR average (±0.5pt)', m.reportedLR * 100, lr24 * 100, 0.5],
      ['Plan-tier LRs = claims / premium', sum_(P.planMix.map(x => Math.abs(x.lossRatio - x.claims / x.premium))), 0, 0.001]
    ];
    return list.map(([label, a, b, t]) => ({ label, a, b, ok: near(a, b, t === undefined ? 0.5 : t) }));
  }

  return {
    compute, checks, completion,
    get state() { return S; },
    setTrend: v => { S.trend = v; }, setCV: v => { S.cv = v; },
    setLoading: (i, v) => { S.loadings[i].pct = v; },
    reset: () => { S = defaults(); }
  };
})();
