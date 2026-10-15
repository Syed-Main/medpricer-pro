// ============================================================
// Sample Medical Book — Group Health Pricing Model
// Main Application Controller
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize modules
  if (typeof OverviewModule !== 'undefined') {
    OverviewModule.init();
  }
  if (typeof PricingEngine !== 'undefined') {
    PricingEngine.init();
  }

  if (typeof Currency !== 'undefined') Currency.init();
  if (typeof Insights !== 'undefined') Insights.render();
  setupTopLevelTabs();
  setupSidebarNav();
  setupHeaderActions();
});

// Top-level tab switching (Overview, Engine, Insights)
function setupTopLevelTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const moduleViews = document.querySelectorAll('.module-view');
  const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');

  function switchTab(targetId) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    sidebarLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.tab === targetId);
    });

    moduleViews.forEach(view => {
      view.classList.toggle('active', view.id === targetId);
    });

    // Re-render chart if switching to overview
    if (targetId === 'module-overview' && typeof OverviewModule !== 'undefined') {
      OverviewModule.init();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) switchTab(target);
    });
  });

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.tab;
      if (target) switchTab(target);
    });
  });

  // Breadcrumb back button
  const backBtn = document.getElementById('resetToOverviewBtn');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('module-overview');
    });
  }
}

function setupSidebarNav() {
  // Future enhancements
}

function setupHeaderActions() {
  const resetBtn = document.getElementById('resetGlobalBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Model.reset();
      PricingEngine.syncInputs();
      PricingEngine.renderAllSheets();
      OverviewModule.init();
      Insights.render();
      alert('Trend, credibility CV and loadings reset to base assumptions.');
    });
  }

  const exportBtn = document.getElementById('exportGlobalBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.print();
    });
  }
}
