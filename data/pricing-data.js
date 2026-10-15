// ============================================================
// Sample Medical Book — Group Health Pricing Model
// Synthetic dataset for demonstration purposes
// All monetary values in USD (thousands) unless noted
// ============================================================

const PRICING_DATA = {
  book: {
    name: "Sample Medical Book",
    subtitle: "Group Health Pricing Model",
    underwritingYear: "UY 2024",
    effectiveDate: "01 January 2025",
    currency: "USD",
    unit: "(000s)"
  },

  // ── Portfolio Overview Metrics ─────────────────────────────
  portfolio: {
    gwp: 42500,          // Gross Written Premium ($000s)
    earnedPremium: 38200,
    incurredClaims: 27340,
    expenseRatio: 0.182,
    commissionRate: 0.08,
    profitTarget: 0.05,

    // Monthly loss ratio trend (24 months: Jan-23 → Dec-24)
    lossRatioTrend: {
      labels: [
        "Jan-23","Feb-23","Mar-23","Apr-23","May-23","Jun-23",
        "Jul-23","Aug-23","Sep-23","Oct-23","Nov-23","Dec-23",
        "Jan-24","Feb-24","Mar-24","Apr-24","May-24","Jun-24",
        "Jul-24","Aug-24","Sep-24","Oct-24","Nov-24","Dec-24"
      ],
      values: [
        0.68, 0.72, 0.70, 0.65, 0.63, 0.67,
        0.71, 0.74, 0.69, 0.66, 0.70, 0.73,
        0.72, 0.75, 0.71, 0.68, 0.66, 0.70,
        0.73, 0.76, 0.72, 0.69, 0.72, 0.74
      ],
      target: 0.65
    },

    // Portfolio composition by plan tier
    planMix: [
      { tier: "Bronze",   lives: 4200, premium: 8400,  claims: 5460,  lossRatio: 0.65 },
      { tier: "Silver",   lives: 6800, premium: 15640, claims: 11230, lossRatio: 0.718 },
      { tier: "Gold",     lives: 3100, premium: 11160, claims: 8040,  lossRatio: 0.720 },
      { tier: "Platinum", lives: 900,  premium: 5300,  claims: 4180,  lossRatio: 0.789 }
    ],

    // Loss ratio by age band
    ageBandPerformance: [
      { band: "18-29", lives: 3200, premium: 5120, claims: 2816, lr: 0.55 },
      { band: "30-39", lives: 4100, premium: 8610, claims: 5597, lr: 0.65 },
      { band: "40-49", lives: 3600, premium: 9360, claims: 6739, lr: 0.72 },
      { band: "50-59", lives: 2800, premium: 9520, claims: 7426, lr: 0.78 },
      { band: "60-64", lives: 1300, premium: 5590, claims: 4762, lr: 0.852 }
    ],

    // Pricing adequacy summary
    adequacy: {
      currentAvgRate: 2.68,      // per member per month ($000s annualized)
      indicatedRate: 2.92,
      rateChangeNeeded: 0.089,   // +8.9%
      breakEvenLR: 0.692,
      ultimateLR: 0.716
    }
  },

  // ── Pricing Engine: Tab 1 — Claims Experience ─────────────
  claimsExperience: {
    // Experience period: UY 2022-2024
    ageBands: ["18-29", "30-39", "40-49", "50-59", "60-64"],

    // Member months by age band and UY
    memberMonths: {
      "UY 2022": [34800, 44400, 38400, 28800, 13200],
      "UY 2023": [36000, 46800, 40800, 30000, 14400],
      "UY 2024": [38400, 49200, 43200, 33600, 15600]
    },

    // Incurred claims ($000s) by age band and UY
    incurredClaims: {
      "UY 2022": [2436, 5328, 6144, 7488, 4356],
      "UY 2023": [2664, 5850, 6936, 7980, 5040],
      "UY 2024": [2816, 5978, 6998, 8232, 4901]
    },

    // Claim count (frequency data)
    claimCounts: {
      "UY 2022": [1218, 2664, 3456, 4608, 3036],
      "UY 2023": [1296, 2808, 3672, 4800, 3312],
      "UY 2024": [1382, 2952, 3888, 5376, 3588]
    }
  },

  // ── Pricing Engine: Tab 2 — Trend & Development ───────────
  trendFactors: {
    // Annual claims trend (medical inflation + utilization)
    annualClaimsTrend: 0.078,    // 7.8% p.a.
    trendPeriod: 1.5,            // midpoint of experience to midpoint of rating period (years)

    // IBNR development factors by lag month
    developmentFactors: [
      { lag: "0-3 months",  completionPct: 0.72, factor: 1.389 },
      { lag: "3-6 months",  completionPct: 0.88, factor: 1.136 },
      { lag: "6-9 months",  completionPct: 0.95, factor: 1.053 },
      { lag: "9-12 months", completionPct: 0.98, factor: 1.020 },
      { lag: "12+ months",  completionPct: 1.00, factor: 1.000 }
    ],

    // Large claims threshold and adjustment
    largeClaimsThreshold: 50,    // $50k per claimant
    largeClaimsLoadPct: 0.042,   // 4.2% of total claims are pooled / reinsured

    // Credibility parameters
    credibilityZ: 0.82,          // full credibility at Z=0.82
    manualRateSource: "Industry tables (WHO actuarial benchmarks)",

    // Seasonal adjustment index (by quarter)
    seasonalIndex: [
      { quarter: "Q1", index: 1.04, note: "Flu season elevation" },
      { quarter: "Q2", index: 0.96, note: "Post-winter normalization" },
      { quarter: "Q3", index: 0.98, note: "Stable utilization" },
      { quarter: "Q4", index: 1.02, note: "Year-end elective procedures" }
    ]
  },

  // ── Pricing Engine: Tab 3 — Rate Build & Loadings ─────────
  rateBuild: {
    // Expense loadings
    loadings: [
      { item: "Administration & Operations", pct: 0.095 },
      { item: "Broker Commission",           pct: 0.080 },
      { item: "Claims Management",           pct: 0.035 },
      { item: "Reinsurance Cession",         pct: 0.045 },
      { item: "Regulatory Levy / Tax",       pct: 0.022 },
      { item: "Profit & Contingency Margin", pct: 0.050 }
    ],

    // Age relativities (18-29 = 1.00 base)
    ageRelativities: [
      { band: "18-29", relativity: 1.00 },
      { band: "30-39", relativity: 1.42 },
      { band: "40-49", relativity: 1.88 },
      { band: "50-59", relativity: 2.45 },
      { band: "60-64", relativity: 3.10 }
    ],

    // Plan tier benefit relativities (Bronze = 1.00 base)
    planRelativities: [
      { tier: "Bronze",   relativity: 1.00, deductible: 2500, coinsurance: 0.70 },
      { tier: "Silver",   relativity: 1.35, deductible: 1000, coinsurance: 0.80 },
      { tier: "Gold",     relativity: 1.72, deductible: 500,  coinsurance: 0.90 },
      { tier: "Platinum", relativity: 2.15, deductible: 0,    coinsurance: 1.00 }
    ]
  },

  // ── Pricing Engine: Tab 4 — Final Rate Card ───────────────
  // (Computed dynamically from above inputs)
  rateCard: {
    effectiveDate: "01 January 2025",
    ratingBasis: "Per Member Per Month (PMPM)",
    basePMPM: 186.40   // Base PMPM for 18-29, Bronze
  }
};
