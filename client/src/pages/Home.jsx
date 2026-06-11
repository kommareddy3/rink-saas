import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";
import { ANALYTICS } from "../links";

// ---------------------------------------------------------------------------
// Plan A — "Corporate Trust" light palette, adapted for founder-stage RINK.
// Honesty over fake numbers: real signals (the live SaaS, US office,
// founder's direct email, founding-client offer) replace the things we
// don't have yet (client logos, association badges, body-count stats).
// ---------------------------------------------------------------------------

// Hero photo — Unsplash CDN (stable URLs). Swap with your own when ready.
const HERO_IMG = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80";

const SERVICES = [
  {
    name: "IT Staff Augmentation",
    tagline: "C2C and W2 talent",
    description: "Pre-vetted cloud, DevOps, security, data, and full-stack consultants — MSA-friendly paperwork.",
    accent: "amber",
  },
  {
    name: "Data Analytics & AI",
    tagline: "Backed by our own SaaS",
    description: "Data engineering, MLOps, dashboards, forecasting. Optionally delivered on RINK Data Analytics.",
    accent: "purple",
    href: ANALYTICS.home,
    external: true,
    badge: "Product",
  },
  {
    name: "Web & E-Commerce Development",
    tagline: "Storefronts · checkout · admin",
    description: "Custom websites and online stores — product catalog, cart, secure payments, and an owner dashboard. Recently shipped a full grocery e-commerce build.",
    accent: "teal",
    href: "/#selected-work",
    badge: "New",
  },
  {
    name: "Cloud Migrations",
    tagline: "AWS · Azure · GCP",
    description: "Landing-zone design, migration waves, and post-migration optimisation — with cost guard-rails baked in.",
    accent: "blue",
  },
  {
    name: "IT Infrastructure",
    tagline: "Networks · hybrid · virtualisation",
    description: "Datacenter modernisation, SD-WAN, VMware/Hyper-V, storage refresh, end-user computing.",
    accent: "cyan",
  },
  {
    name: "Cybersecurity",
    tagline: "Zero-trust · IAM · 24×7 SOC",
    description: "Threat detection, identity & access, SOC2 / HIPAA readiness, incident-response retainers.",
    accent: "red",
  },
  {
    name: "Managed Services",
    tagline: "24×7 ops & support",
    description: "Monitoring, patching, backup, DR, ITSM, FinOps, and tiered helpdesk. Outcome-based SLAs.",
    accent: "emerald",
  },
];

const ACCENT = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  purple: "bg-purple-50 text-purple-700 ring-purple-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
};


// ---------------------------------------------------------------------------
// Interactive tabbed Explorer (Plan A version — light)
// ---------------------------------------------------------------------------

const EXPLORER_TABS = [
  { id: "staffing", label: "Staff augmentation", intro: "Senior C2C consultants or W2 placements — vetted, code-reviewed, and reference-checked.", points: ["Shortlists within 48 hours for common stacks", "Right-to-represent stays clean — vendor-neutral by policy", "C2C through your LLC OR W2 on our payroll", "US, Canada, and offshore delivery options"], cta: { to: "/contact?reason=sales", label: "Send a JD" } },
  { id: "data", label: "Data analytics & AI", intro: "Data engineering, MLOps, and our own SaaS — RINK Data Analytics — for short time-to-value.", points: ["Snowflake / Databricks / Postgres modern stacks", "MLOps with reproducible feature stores and CI", "Optional: ship straight to RINK Data Analytics", "Privacy-aware pipelines with encryption at rest from day one"], cta: { to: ANALYTICS.home, external: true, label: "Open RINK Data Analytics" } },
  { id: "web", label: "Web & e-commerce", intro: "Conversion-focused websites and online stores — from storefront to checkout to the admin dashboard that runs the business.", points: ["Responsive storefronts with fast, SEO-friendly pages", "Product catalog, cart, and secure checkout (Stripe & more)", "Delivery / pickup scheduling and order management", "Owner dashboard for inventory, orders, and promotions", "Recently delivered: a complete grocery e-commerce platform"], cta: { to: "/#selected-work", label: "See the work" } },
  { id: "cloud", label: "Cloud migrations", intro: "Move workloads to AWS, Azure, or GCP without breaking what's already working.", points: ["Landing-zone design with cost guard-rails", "Migration waves planned around business calendars", "Containers, serverless, or managed databases where it pays off", "Hand-off runbooks so your team owns it after go-live"], cta: { to: "/contact?reason=sales", label: "Plan a migration" } },
  { id: "security", label: "Cybersecurity", intro: "From hardened landing zones to 24×7 SOC retainers — security as the baseline, not an upsell.", points: ["Identity-first architectures (Entra, AWS SSO, Okta)", "Continuous controls for SOC2 / HIPAA / ISO 27001", "Detection-as-code pipelines and IR retainers", "Threat-modeling workshops before the first sprint"], cta: { to: "/contact?reason=security", label: "Talk to security" } },
  { id: "managed", label: "Managed services", intro: "Outcome-based ops with monthly KPI reporting — never minutes-billed body-shopping.", points: ["24×7 monitoring, patching, backup, and DR", "L1–L3 helpdesk with named pods", "FinOps and cost optimisation built into every runbook", "Quarterly account reviews with the senior practice lead"], cta: { to: "/contact?reason=sales", label: "Hand us the ops" } },
];

function Explorer() {
  const [active, setActive] = useState(EXPLORER_TABS[0].id);
  const tab = EXPLORER_TABS.find((t) => t.id === active);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-2 sm:p-3">
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-slate-100">
        {EXPLORER_TABS.map((tt) => {
          const on = tt.id === active;
          return (
            <button
              key={tt.id}
              type="button"
              onClick={() => setActive(tt.id)}
              aria-pressed={on}
              className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                on
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-700 hover:bg-white hover:text-slate-900"
              }`}
            >
              {tt.label}
            </button>
          );
        })}
      </div>
      <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{tab.intro}</h3>
          <ul className="mt-6 space-y-3">
            {tab.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-1 w-5 h-5 rounded-md bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center flex-none">
                  <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
          {tab.cta.external ? (
            <a
              href={tab.cta.to}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
            >
              {tab.cta.label}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          ) : (
            <Link
              to={tab.cta.to}
              className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
            >
              {tab.cta.label}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          {[
            { v: "Live SaaS", l: "RINK Data Analytics" },
            { v: "C2C + W2", l: "engagement models" },
            { v: "< 48 h", l: "first shortlist" },
            { v: "US-based", l: "Farmington Hills, MI" },
          ].map((s) => (
            <div key={s.l} className="px-5 py-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
              <div className="text-base font-bold text-slate-900">{s.v}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Home() {
  const { user, displayName } = useAuth();

  return (
    <div className="text-slate-900">
      {/* ============== HERO ============== */}
      <section className="relative px-4 sm:px-6 lg:px-10 pt-14 pb-20 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-5 px-3 py-1 rounded-full ring-1 ring-blue-100 bg-blue-50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              IT Consulting · Staffing · Managed Services
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900">
              The IT delivery partner that{" "}
              <span className="text-blue-700">ships, not just staffs.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-700 max-w-xl leading-relaxed">
              RINK Global Services helps <b>vendors</b> and <b>end clients</b> ship cloud,
              infrastructure, cybersecurity, and data programs. C2C and W2 talent on tap,
              fixed-bid projects, 24×7 managed services — and we operate our own
              production SaaS, <a href={ANALYTICS.home} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 underline decoration-blue-200 underline-offset-4">RINK Data Analytics</a>, as proof we actually ship.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/contact?reason=sales"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 transition"
              >
                Request a consultation
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href={user ? ANALYTICS.workspace : ANALYTICS.signUp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-900 bg-white ring-1 ring-slate-200 hover:bg-slate-50 transition"
              >
                {user ? "Open RINK Data Analytics" : "Try RINK Data Analytics (free)"}
              </a>
            </div>

            {/* Trust micro-strip — real signals only */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-emerald-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Based in <b>Farmington Hills, MI</b></span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-emerald-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Founder-led by <b>Nikhila Vintha</b></span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-emerald-600 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Live SaaS: <b>RINK Data Analytics</b></span>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            <div className="relative aspect-[5/4] rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-xl shadow-blue-500/10">
              <img
                src={HERO_IMG}
                alt="A team collaborating in a modern office"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.style.background =
                    "linear-gradient(135deg,#0b1b3d,#3b82f6)";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 via-transparent to-transparent" />
              {/* Floating callout */}
              <div className="absolute left-4 right-4 sm:left-6 sm:right-6 bottom-4 sm:bottom-6 rounded-xl bg-white/95 backdrop-blur p-4 ring-1 ring-slate-200 shadow-lg">
                <div className="text-[10px] uppercase tracking-widest text-blue-700 font-semibold">Founding clients welcome</div>
                <div className="text-sm font-semibold text-slate-900 mt-1">Senior, hands-on attention and direct access to the founder</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== WHAT WE DELIVER ============== */}
      <section id="services" className="px-4 sm:px-6 lg:px-10 py-20 scroll-mt-20 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">What we deliver</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Seven practices. One accountable partner.</h2>
            <p className="text-slate-600 mt-3">Pick a service or hand us the whole stack. Each practice is owned end-to-end — discovery to handover.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s) => {
              const inner = (
                <>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ring-1 ${ACCENT[s.accent]}`}>
                    <ServiceIcon accent={s.accent} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{s.name}</h3>
                    {s.badge && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-purple-100 ring-1 ring-purple-200 text-purple-700">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-700/80 mt-0.5">{s.tagline}</p>
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">{s.description}</p>
                  {s.href && (
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                      {s.external ? "Open product" : "See the work"}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </>
              );
              return s.href ? (
                s.external ? (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-6 rounded-2xl bg-white ring-1 ring-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition"
                  >
                    {inner}
                  </a>
                ) : (
                  <Link key={s.name} to={s.href} className="group p-6 rounded-2xl bg-white ring-1 ring-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition">
                    {inner}
                  </Link>
                )
              ) : (
                <div key={s.name} className="p-6 rounded-2xl bg-white ring-1 ring-slate-200 hover:shadow-md transition">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== INTERACTIVE EXPLORER ============== */}
      <section id="explore" className="px-4 sm:px-6 lg:px-10 py-20 scroll-mt-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Explore RINK</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Click a practice. See how we engage.</h2>
            <p className="text-slate-600 mt-3">One engagement framework across every practice. Same operator-grade team behind every door.</p>
          </div>
          <Explorer />
        </div>
      </section>

      {/* ============== LIVE PRODUCT PROOF ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-10 sm:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-purple-700 font-semibold mb-3 px-2.5 py-1 rounded-full ring-1 ring-purple-200 bg-purple-50">
                  Real product · Real proof
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                  We don't just pitch. We operate our own SaaS.
                </h2>
                <p className="text-slate-700 mt-5 leading-relaxed">
                  RINK Data Analytics is a production-grade workspace for forecasting,
                  anomaly detection, churn, segmentation, A/B testing, and route
                  optimisation. It's our proof point — and it's free for you to try.
                  Data-engagement clients get the platform included.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href={user ? ANALYTICS.workspace : ANALYTICS.signUp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 transition"
                  >
                    {user ? "Open workspace" : "Try it free"}
                  </a>
                  <a
                    href="https://docs.rinkglobal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-slate-900 bg-white ring-1 ring-slate-200 hover:bg-slate-50 transition"
                  >
                    Read the docs
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "7", l: "analytics tools" },
                  { v: "REST", l: "API surface" },
                  { v: "< 1 s", l: "typical run" },
                  { v: "AES-128", l: "encrypted at rest" },
                ].map((t) => (
                  <div key={t.l} className="p-5 rounded-2xl bg-white ring-1 ring-slate-200">
                    <div className="text-2xl font-bold text-slate-900">{t.v}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{t.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== SELECTED WORK / CASE STUDY ============== */}
      <section id="selected-work" className="px-4 sm:px-6 lg:px-10 py-20 scroll-mt-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-[11px] uppercase tracking-widest text-teal-700 font-semibold mb-3">Selected work</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Real builds. Shipped and live.</h2>
            <p className="text-slate-600 mt-3">A look at what we deliver beyond the platform — full-stack product work for real businesses.</p>
          </div>

          <div className="rounded-3xl overflow-hidden ring-1 ring-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Visual */}
              <div className="relative min-h-[260px] bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-700 p-8 sm:p-10 flex flex-col justify-between text-white">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full ring-1 ring-white/30 bg-white/10">
                    Case study · E-commerce
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-5 leading-tight">
                    Grocery e-commerce platform
                  </h3>
                  <p className="text-white/85 mt-3 leading-relaxed text-sm">
                    A complete online grocery store — browse, cart, checkout, and delivery/pickup —
                    plus an owner dashboard to manage products, inventory, and orders. Designed to
                    turn foot-traffic shoppers into repeat online customers.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2 text-[11px]">
                  {["React", "Node.js", "Responsive", "Secure checkout", "Admin dashboard", "SEO"].map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-md bg-white/15 ring-1 ring-white/20">{t}</span>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="p-8 sm:p-10">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">What we built</div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {[
                    "Mobile-first storefront with searchable product catalog and categories",
                    "Cart, secure checkout, and online payments",
                    "Delivery and in-store pickup scheduling",
                    "Order management + inventory and promotions dashboard for the owner",
                    "Fast, SEO-friendly pages to win local search",
                  ].map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <span className="mt-1 w-4 h-4 rounded bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center flex-none">
                        <svg className="w-2.5 h-2.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                {/* Outcome chips — replace bracketed values with real metrics when ready */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { v: "Live", l: "in production" },
                    { v: "[X]", l: "products listed" },
                    { v: "[X]%", l: "more online orders" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-center">
                      <div className="text-lg font-bold text-slate-900">{s.v}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/contact?reason=sales" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition">
                    Build something like this
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                  <a href="https://docs.rinkglobal.com/showcase" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-900 bg-white ring-1 ring-slate-200 hover:bg-slate-50 transition">
                    Read the case study
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Client name shared on request. Add live URL &amp; metrics when approved.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-white">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-10 sm:p-14 text-center">
          <img src={logo} alt="RINK" className="h-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Hiring? Migrating?<br />
            Just need a steady hand on the operations?
          </h2>
          <p className="text-blue-100 mt-5 text-base max-w-2xl mx-auto">
            Send us a JD, a problem statement, or an architecture diagram. We'll reply within one business day — straight from Farmington Hills.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              to="/contact?reason=sales"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-slate-900 bg-white hover:bg-slate-100 transition"
            >
              Talk to our team
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="mailto:nikhila.vintha@rinkglobal.com"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/20 transition"
            >
              Email Nikhila directly
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons by accent — tiny inline set so each service card has its own visual.
// ---------------------------------------------------------------------------

function ServiceIcon({ accent }) {
  const path = {
    blue: "M3 15a4 4 0 004 4h11a5 5 0 100-10 7 7 0 00-13.5-1.5A4 4 0 003 15z",
    cyan: "M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5M5 12v5a2 2 0 002 2h10a2 2 0 002-2v-5M5 12h14",
    red: "M12 11c0-1.105.895-2 2-2s2 .895 2 2v2m-4 0h4m-7 8a9 9 0 110-18 9 9 0 010 18z",
    emerald: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25",
    purple: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    teal: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    amber: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  }[accent] || "";
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}
