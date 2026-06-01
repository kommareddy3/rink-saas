import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";

// ---------------------------------------------------------------------------
// Data — all dynamic content centralised so it's easy to evolve copy.
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "Forecasting",
    tagline: "Predict future values",
    description:
      "Gradient-boosting models with engineered lag features — univariate or multivariate with predictor columns. Auto-detects cadence (daily, weekly, monthly) and produces confidence-banded forecasts.",
    href: "/analytics-workspace",
    accent: "from-blue-500/20 to-blue-500/0 text-blue-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    name: "Anomaly Detection",
    tagline: "Find unusual patterns",
    description:
      "Isolation Forest with lag-augmented features. Surfaces rows that don't fit the local context — fraud, sensor faults, surprise spikes.",
    href: "/tools/anomaly",
    accent: "from-red-500/20 to-red-500/0 text-red-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
      </svg>
    ),
  },
  {
    name: "Churn Prediction",
    tagline: "Score customer retention risk",
    description:
      "Random Forest classifier with auto label detection. Returns risk buckets, feature importance, and a ranked list of accounts to call today.",
    href: "/tools/churn",
    accent: "from-amber-500/20 to-amber-500/0 text-amber-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    name: "Customer Segmentation",
    tagline: "Cluster customers into groups",
    description:
      "K-means with auto-tuned k and PCA projection. Produces segment profiles in your original feature units so the result is immediately interpretable.",
    href: "/tools/segmentation",
    accent: "from-purple-500/20 to-purple-500/0 text-purple-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: "A/B Test Analyzer",
    tagline: "Decide if your variant really won",
    description:
      "Welch's t-test for continuous metrics, two-proportion z-test for conversion rates. Power calculations included. Sub-second results.",
    href: "/tools/abtest",
    accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: "Route Optimization (TSP)",
    tagline: "Shortest path through N stops",
    description:
      "Nearest-neighbour + 2-opt local search. Up to 200 locations per run. Open path or closed loop — for delivery routes, field service, sales territories.",
    href: "/tools/tsp",
    accent: "from-cyan-500/20 to-cyan-500/0 text-cyan-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Vehicle Routing (VRP)",
    tagline: "Multi-vehicle fleet planning",
    description:
      "Capacitated VRP via Clarke-Wright savings plus per-route 2-opt. Configure fleet size and vehicle capacity; see colour-coded routes and per-vehicle loads.",
    href: "/tools/vrp",
    accent: "from-orange-500/20 to-orange-500/0 text-orange-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
];

const USE_CASES = [
  {
    industry: "E-commerce & SaaS",
    headline: "Keep customers, grow revenue",
    blurb: "Score churn risk, segment cohorts, and prove which experiments actually moved the needle.",
    tools: ["Churn Prediction", "Customer Segmentation", "A/B Test Analyzer"],
    gradient: "from-blue-500/20 to-purple-500/10",
    border: "border-blue-500/30",
  },
  {
    industry: "Logistics & field ops",
    headline: "Move things efficiently",
    blurb: "Plan delivery routes, balance multi-vehicle fleets, and forecast demand into your dispatch system.",
    tools: ["Route Optimization", "Vehicle Routing", "Forecasting"],
    gradient: "from-cyan-500/20 to-emerald-500/10",
    border: "border-cyan-500/30",
  },
  {
    industry: "Finance & operations",
    headline: "Catch what shouldn't be there",
    blurb: "Detect outliers in transaction streams, monitor KPI drift, and forecast cash flow with confidence bands.",
    tools: ["Anomaly Detection", "Forecasting"],
    gradient: "from-amber-500/20 to-red-500/10",
    border: "border-amber-500/30",
  },
  {
    industry: "Marketing & growth",
    headline: "Spend on what works",
    blurb: "Segment your audience, run rigorous experiments, and forecast which channels will pay back.",
    tools: ["Customer Segmentation", "A/B Test Analyzer", "Forecasting"],
    gradient: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/30",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Upload your data",
    body: "Drop a CSV or paste a table. Up to 10 MB. Date columns, numeric features, and category labels are detected automatically.",
  },
  {
    n: "02",
    title: "Configure (or don't)",
    body: "Smart defaults get you a result in one click. Override column choices, horizons, or hyperparameters from the same panel when you want.",
  },
  {
    n: "03",
    title: "Read the result",
    body: "Charts, metrics, and per-row scores arrive in seconds. Every output is downloadable. Every method is documented.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "No data scientist required",
    body: "Auto-detection of date columns, numeric features, label columns, and cadence. Sensible defaults wherever a knob exists.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Encrypted and private by default",
    body: "Every upload is encrypted at rest (Fernet / AES-128 + HMAC) before it touches disk, and travels only over TLS. Per-user storage isolated by UUID, scanned on upload, and auto-deleted on sign-out or after 4 hours idle. SSO + passkeys supported.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v3m0-3h.01M5 11V7a7 7 0 0114 0v4M5 11h14M5 11H3m16 0h2" />
      </svg>
    ),
  },
  {
    title: "Explainable, not magic",
    body: "Every output shows the methodology, validation metrics, and a docs link explaining the algorithm. No black box.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Built for sharing",
    body: "Public, versioned documentation. A friendly AI assistant inside the app. Predictable REST API for embedding RINK in your stack.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

const FAQ = [
  {
    q: "Do I need machine-learning experience to use RINK?",
    a: "No. Every tool auto-detects what it needs from your CSV and has sensible defaults. Override anything you want from the controls panel; the docs walk through the algorithm if you're curious.",
  },
  {
    q: "What file sizes and formats do you support?",
    a: "CSV files up to 10 MB. UTF-8 encoding recommended. Each tool's guide spells out exact column requirements, but most tools also auto-detect on the way in.",
  },
  {
    q: "How is my data secured?",
    a: "Every CSV is encrypted at rest (Fernet / AES-128 + HMAC) before it's written to disk, and encrypted in transit over TLS. Uploads are scanned and rejected if they aren't real CSVs. Storage is isolated per user (scoped to your Supabase UUID) and auto-deleted on sign-out or after 4 hours of inactivity. Auth supports SSO and passkeys. We never sell your data or train shared models on it — see the Security page for the full breakdown.",
  },
  {
    q: "Can I integrate RINK into my own app?",
    a: "Yes — every tool is exposed as a REST endpoint at api.rinkglobal.com. Authenticate with a Supabase JWT and you can call /api/forecast, /api/churn, /api/anomaly, etc. directly. Full API reference is in the docs.",
  },
  {
    q: "What does it cost?",
    a: "Free during beta — sign up and start. Once we launch general availability, we'll offer a free tier with the same tools and capped daily usage, plus paid tiers for higher limits and team features.",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Home() {
  const { user, displayName } = useAuth();

  return (
    <div className="text-white">
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-10 pt-20 pb-24">
        {/* gradient orbs */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300 font-semibold mb-5 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Analytics Platform · Beta
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block">Your data has answers.</span>
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              RINK gets them out.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Forecasting, anomaly detection, customer segmentation, churn
            scoring, A/B analysis, and route optimization — seven production-grade
            tools in one workspace. No data-science team required.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              to={user ? "/analytics-workspace" : "/auth?mode=register"}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all"
            >
              {user ? "Open your workspace" : "Start free"}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#tools"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              See all 7 tools
            </a>
          </div>

          {/* Security trust line */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Encrypted at rest &amp; in transit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Auto-deleted on sign-out
            </span>
            <a href="/security" className="inline-flex items-center gap-1.5 text-blue-300 hover:text-blue-200 transition">
              How we protect your data
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>

          {user && (
            <p className="mt-6 text-sm text-blue-300/80">
              Welcome back, {displayName}.
            </p>
          )}

          {/* stats bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
            {[
              { v: "7", l: "tools live" },
              { v: "10 MB", l: "max CSV size" },
              { v: "< 1 s", l: "typical run time" },
              { v: "REST", l: "API for every tool" },
            ].map((s) => (
              <div
                key={s.l}
                className="px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur"
              >
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{s.v}</div>
                <div className="text-[11px] uppercase tracking-widest text-gray-400 mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== TOOLS ============== */}
      <section id="tools" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              The toolkit
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">
              One workspace, every analytics workflow you actually need.
            </h2>
            <p className="text-gray-400 mt-4 text-lg">
              Each tool runs on production-grade algorithms with sensible
              defaults — no notebooks, no infrastructure, no MLOps team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((t) => (
              <Link
                to={t.href}
                key={t.name}
                className="group relative overflow-hidden p-6 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-40 ${t.accent}`} />
                <div className="relative">
                  <div className={`w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 ${t.accent.split(" ").pop()}`}>
                    {t.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{t.name}</h3>
                  <p className="text-sm text-blue-300/80 mt-0.5">{t.tagline}</p>
                  <p className="text-sm text-gray-400 mt-3 leading-relaxed">{t.description}</p>
                  <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-white group-hover:translate-x-0.5 transition-transform">
                    Open tool
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section id="how" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              How it works
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">From CSV to insight in three steps.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative p-7 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur">
                <div className="absolute -top-3 left-7 text-xs font-bold tracking-widest px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  STEP {s.n}
                </div>
                <h3 className="text-xl font-semibold text-white mt-3">{s.title}</h3>
                <p className="text-gray-400 mt-3 leading-relaxed">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <svg className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== USE CASES ============== */}
      <section id="use-cases" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24 bg-gradient-to-b from-transparent via-black/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              Use cases
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Wherever your data lives, RINK has a workflow.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {USE_CASES.map((uc) => (
              <div
                key={uc.industry}
                className={`p-7 rounded-2xl bg-gradient-to-br ${uc.gradient} border ${uc.border} backdrop-blur`}
              >
                <div className="text-xs uppercase tracking-widest text-white/70 font-semibold">
                  {uc.industry}
                </div>
                <h3 className="text-2xl font-bold text-white mt-2">{uc.headline}</h3>
                <p className="text-gray-200 mt-3 leading-relaxed">{uc.blurb}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {uc.tools.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 text-xs rounded-md bg-white/10 border border-white/15 text-white"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== WHY RINK ============== */}
      <section id="about" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              Why RINK
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Built like infrastructure, used like a notebook.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.title}
                className="flex gap-4 p-6 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur"
              >
                <div className="flex-none w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-blue-300">
                  {d.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{d.title}</h3>
                  <p className="text-gray-400 mt-1.5 leading-relaxed">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              Frequently asked
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Things people ask us first.</h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur open:bg-white/[0.06]"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <span className="text-base font-semibold text-white">{item.q}</span>
                  <span className="flex-none mt-1 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-open:rotate-45 transition-transform">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </summary>
                <p className="text-gray-300 mt-4 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="https://docs.rinkglobal.com/faq"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200"
            >
              Browse the full FAQ in the docs
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-24">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur p-10 sm:p-14 text-center">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

          <div className="relative">
            <img src={logo} alt="RINK" className="h-12 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Stop chasing data scientists.<br />
              Start shipping decisions.
            </h2>
            <p className="text-gray-300 mt-5 text-lg max-w-2xl mx-auto">
              Open a workspace, upload your data, and see results in under a
              minute. Free during beta.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
              <Link
                to={user ? "/analytics-workspace" : "/auth?mode=register"}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-blue-500/30 transition"
              >
                {user ? "Open workspace" : "Get started for free"}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                Talk to the team
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              No credit card. No data-science prerequisites. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
