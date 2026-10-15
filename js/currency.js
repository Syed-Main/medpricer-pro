// ============================================================
// Currency Module — USD (model currency) <-> PKR presentation
// All source data stays in USD; only display is converted.
// ============================================================
const Currency = (function () {
  let code = 'PKR';
  let fx = 278; // indicative USD/PKR (open-market selling, mid-Oct 2026) — editable in header

  const fmt = (n, dec = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  // PKR amount from USD thousands -> "Rs 1.42bn" / "Rs 783M"
  function pkrFromK(usdK) {
    const x = usdK * fx / 1000; // PKR millions
    if (x === 0) return 'Rs 0';
    return Math.abs(x) >= 1000 ? `Rs ${(x / 1000).toFixed(2)}bn` : `Rs ${fmt(x)}M`;
  }

  // USD thousands -> "$5,120k" | "Rs 1.42bn"
  function k(usdK) { return code === 'PKR' ? pkrFromK(usdK) : `$${fmt(usdK)}k`; }
  // USD thousands -> "$8.4M"  | "Rs 2.34bn"
  function m(usdK) { return code === 'PKR' ? pkrFromK(usdK) : `$${(usdK / 1000).toFixed(1)}M`; }
  // USD (actual dollars) -> "$186.40" | "Rs 51,819"
  function d(usd, dec = 0) {
    const v = parseFloat(usd);
    return code === 'PKR' ? `Rs ${fmt(v * fx, dec)}` : `$${fmt(v, dec)}`;
  }
  // USD (actual dollars, large) -> "$5.7k" | "Rs 1,585k"
  function dk(usd) {
    return code === 'PKR' ? `Rs ${fmt(usd * fx / 1000)}k` : `$${(usd / 1000).toFixed(1)}k`;
  }

  // Static HTML figures: <span data-cur="k|m|d|label" data-v="..." [data-plus]>original text</span>
  function applyStatic() {
    document.querySelectorAll('[data-cur]').forEach(el => {
      if (!el.dataset.orig) el.dataset.orig = el.textContent;
      if (code === 'USD') { el.textContent = el.dataset.orig; return; }
      const type = el.dataset.cur;
      if (type === 'label') {
        el.textContent = el.dataset.orig
          .replace('($ in thousands)', `(PKR, converted at 1 USD = Rs ${fx})`)
          .replace('($ PMPM)', '(Rs PMPM)')
          .replace(/\(\$\)/g, '(Rs)');
        return;
      }
      const v = parseFloat(el.dataset.v);
      const body = type === 'd' ? d(Math.abs(v)) : pkrFromK(Math.abs(v));
      const sign = v < 0 ? '-' : ('plus' in el.dataset && v > 0 ? '+' : '');
      el.textContent = sign + body;
    });
  }

  function refresh() {
    if (typeof OverviewModule !== 'undefined') OverviewModule.init();
    if (typeof PricingEngine !== 'undefined') PricingEngine.renderAllSheets();
    if (typeof Insights !== 'undefined') Insights.render();
    applyStatic();
    const fxBox = document.getElementById('fxInput');
    if (fxBox) fxBox.disabled = code !== 'PKR';
  }

  function init() {
    const sel = document.getElementById('ccySelect');
    const inp = document.getElementById('fxInput');
    if (sel) { sel.value = code; sel.addEventListener('change', () => { code = sel.value; refresh(); }); }
    if (inp) {
      inp.value = fx;
      inp.addEventListener('change', () => { fx = parseFloat(inp.value) > 0 ? parseFloat(inp.value) : fx; inp.value = fx; refresh(); });
    }
    refresh();
  }

  return { init, k, m, d, dk, applyStatic, get code() { return code; }, get fx() { return fx; } };
})();
