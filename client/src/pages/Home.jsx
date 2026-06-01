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
  red: "bg-red-50 text-red-700 ring-red-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  purple: "bg-purple-50 text-purple-700 ring-purple-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
};

const ENGAGEMENT_MODELS = [
  {
    audience: "For Vendors",
    headline: "C2C consultants on tap",
    blurb: "Need a senior AWS architect by next Tuesday? Send us the JD; we'll send back a vetted shortlist with rates, availability, and code samples — usually same-day. MSA-friendly, NET-30/45 terms.",
    bullets: [
      "Corp-to-Corp (C2C) consultants on our payroll",
      "Standard MSA / SOW templates ready to sign",
      "Right-to-represent transparency",
      "US, Canada, and offshore delivery",
    ],
    cta: { label: "Send a JD", to: "/contact?reason=sales" },
  },
  {
    audience: "For End Clients",
    headline: "Projects, talent, or fully managed",
    blurb: "Run a one-off cloud migration with a fixed-bid SOW, embed a long-term W2 consultant, or hand us the whole operation as a managed service. One partner across cloud, infra, security, and data.",
    bullets: [
      "Fixed-bid statements of work or T&M",
      "W-2 placements and contract-to-hire",
      "Outcome-based managed services with monthly KPI reporting",
      "Vendor-neutral — we don't compete with your other partners",
    ],
    cta: { label: "Request a consultation", to: "/contact?reason=sales" },
  },
];

const STEPS = [
  { n: "01", title: "Discovery call", body: "Free 30-minute call. Bring a JD or an architecture diagram — we'll tell you straight whether we're the right partner." },
  { n: "02", title: "Shortlist or proposal", body: "Staff aug: shortlist with rates inside 48 hours. Projects: scoped proposal with milestones and fixed-price or T&M ceiling." },
  { n: "03", title: "Kick-off & deliver", body: "Consultants embed with your team. Project teams ship in weekly cadences with demos. Managed services start with a 30-day stabilisation phase." },
  { n: "04", title: "Operate & report", body: "Monthly KPI reports for managed work. Quarterly account reviews. Clean handover whenever an engagement winds down." },
];

const INDUSTRIES = [
  { industry: "Financial Services", headline: "Regulated and ready", blurb: "Core-banking integrations, AML/KYC pipelines, PCI-DSS aware AWS landing zones." },
  { industry: "Healthcare & Life Sciences", headline: "HIPAA from day one", blurb: "HL7/FHIR integrations, EHR migrations, HIPAA-compliant landing zones, population-health analytics." },
  { industry: "Retail, Logistics & Supply Chain", headline: "Forecast, plan, deliver", blurb: "Demand forecasting, route optimisation, 24×7 retail ops — powered by RINK Data Analytics." },
  { industry: "Energy, Utilities & Public Sector", headline: "Mission-critical uptime", blurb: "OT/IT convergence, GIS modernisation, FedRAMP-aware cloud designs, NIST CSF-aligned SOCs." },
];

const FAQ = [
  {
    q: "We've never heard of RINK. Why should we trust you?",
    a: "Honest answer: we're a founder-led firm just out of stealth, based in Farmington Hills, Michigan, led by Nikhila Vintha. We don't have client logos to wave at you yet — what we do have is an in-house production SaaS (RINK Data Analytics) we operate ourselves, a US office address, and the founder's direct email at the bottom of this page. Founding-cohort customers get senior, hands-on attention and direct access to the people doing the work.",
  },
  { q: "What's the difference between C2C and W2 for our team?", a: "C2C (Corp-to-Corp) consultants are on our payroll and we invoice you on NET-30/45 terms — flexible, fast to scale up and down, the consultant carries their own benefits. W2 means we place a permanent or contract-to-hire employee on your payroll. Many clients mix both: C2C to ramp a project quickly, W2 to retain the institutional knowledge afterwards." },
  { q: "How fast can you fill a role?", a: "For common stacks (AWS, Azure, .NET, Java, React, Python): a vetted shortlist within 48 hours. For niche skills (FedRAMP, OT/SCADA, specific industry experience): 72 hours. We don't believe in week-long shortlists — by then your client has moved on." },
  { q: "Do you support remote, hybrid, and on-site?", a: "All three. Our delivery footprint covers US, Canada, and an offshore centre for follow-the-sun coverage. We default to remote-first but match whatever your client's policy requires." },
  { q: "We already have a prime-vendor MSA. Can you sub through them?", a: "Yes — we work as a tier-2 supplier under prime-vendor programs. Share the prime's onboarding portal and we'll have paperwork done within a week." },
  { q: "What's RINK Data Analytics, and is it relevant to me?", a: "It's our own SaaS — a forecasting, anomaly-detection, churn, segmentation, A/B-test, and route-optimisation workspace. It exists for two reasons: (1) it sharpens us on what production really means, and (2) data-engagement clients get the platform included. Try it free at analytics.rinkglobal.com." },
];

// ---------------------------------------------------------------------------
// Interactive tabbed Explorer (Plan A version — light)
// ---------------------------------------------------------------------------

const EXPLORER_TABS = [
  { id: "staffing", label: "Staff augmentation", intro: "Senior C2C consultants or W2 placements — vetted, code-reviewed, and reference-checked.", points: ["Shortlists within 48 hours for common stacks", "Right-to-represent stays clean — vendor-neutral by policy", "C2C through your LLC OR W2 on our payroll", "US, Canada, and offshore delivery options"], cta: { to: "/contact?reason=sales", label: "Send a JD" } },
  { id: "data", label: "Data analytics & AI", intro: "Data engineering, MLOps, and our own SaaS — RINK Data Analytics — for short time-to-value.", points: ["Snowflake / Databricks / Postgres modern stacks", "MLOps with reproducible feature stores and CI", "Optional: ship straight to RINK Data Analytics", "Privacy-aware pipelines with encryption at rest from day one"], cta: { to: ANALYTICS.home, external: true, label: "Open RINK Data Analytics" } },
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
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Six practices. One accountable partner.</h2>
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
                      Open product
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
            <p className="text-slate-600 mt-3">Five tabs, one engagement framework. Same operator-grade team behind every door.</p>
          </div>
          <Explorer />
        </div>
      </section>

      {/* ============== ENGAGEMENT MODELS ============== */}
      <section id="how-we-engage" className="px-4 sm:px-6 lg:px-10 py-20 scroll-mt-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">How we engage</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Two doors in. Same delivery muscle behind both.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ENGAGEMENT_MODELS.map((m) => (
              <div key={m.audience} className="p-8 rounded-2xl bg-white ring-1 ring-slate-200">
                <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">{m.audience}</div>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{m.headline}</h3>
                <p className="text-slate-600 mt-3 leading-relaxed">{m.blurb}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  {m.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-600 flex-none" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={m.cta.to}
                  className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
                >
                  {m.cta.label}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
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

      {/* ============== PROCESS ============== */}
      <section id="how" className="px-4 sm:px-6 lg:px-10 py-20 scroll-mt-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">How we work</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">From a problem statement to a shipped result.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="relative p-6 rounded-2xl bg-white ring-1 ring-slate-200">
                <div className="absolute -top-3 left-6 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  STEP {s.n}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-3">{s.title}</h3>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== INDUSTRIES ============== */}
      <section id="use-cases" className="px-4 sm:px-6 lg:px-10 py-20 scroll-mt-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Industries we serve</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Where we plan to deliver the most.</h2>
            <p className="text-slate-600 mt-3 text-sm">As a founder-led firm, we're focused on a small number of verticals so we go deep, not wide.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INDUSTRIES.map((uc) => (
              <div key={uc.industry} className="p-7 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">{uc.industry}</div>
                <h3 className="text-xl font-bold text-slate-900 mt-2">{uc.headline}</h3>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">{uc.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FOUNDING CLIENTS — honest banner ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-blue-200 font-semibold mb-5 px-3 py-1 rounded-full ring-1 ring-white/20 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Founding-cohort program
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Be one of our first clients — and get treated like one.
          </h2>
          <p className="text-blue-100 mt-5 max-w-2xl mx-auto leading-relaxed">
            We're just out of stealth. Founding-cohort customers get a level of attention you don't get from larger firms:
            direct access to the founder, senior people on the work, and pricing that reflects helping us prove the model.
          </p>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            {[
              { t: "Direct access to the founder", b: "Talk to Nikhila Vintha directly — not a regional account exec." },
              { t: "Senior people on the work", b: "The people you meet are the people who deliver — no bait-and-switch." },
              { t: "Honest pricing", b: "Discounted founding-client rates while we build our case-study book." },
            ].map((x) => (
              <div key={x.t} className="p-5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur">
                <div className="text-sm font-semibold text-white">{x.t}</div>
                <div className="text-sm text-blue-100 mt-1.5 leading-relaxed">{x.b}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/contact?reason=sales"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 transition"
            >
              Apply to be a founding client
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ============== FOUNDER + OFFICE (real-person trust) ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Who you're working with</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Founder-led, US-based, contactable.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Founder card */}
            <div className="p-7 rounded-2xl ring-1 ring-slate-200 bg-slate-50">
              <div className="flex items-start gap-5">
                <div className="flex-none w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold flex items-center justify-center shadow-md">
                  NV
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">Founder</div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Nikhila Vintha</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Founder of RINK Global Services. Leads the consulting practice and the in-house product team behind RINK Data Analytics. Personally reachable for engagement-level questions.
                  </p>
                  <a
                    href="mailto:nikhila.vintha@rinkglobal.com"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
                  >
                    nikhila.vintha@rinkglobal.com
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            {/* Office card */}
            <div className="p-7 rounded-2xl ring-1 ring-slate-200 bg-slate-50">
              <div className="flex items-start gap-5">
                <div className="flex-none w-20 h-20 rounded-2xl bg-white ring-1 ring-slate-200 flex items-center justify-center text-slate-700">
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">Headquarters</div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">Farmington Hills, Michigan</h3>
                  <address className="text-sm text-slate-600 mt-2 leading-relaxed not-italic">
                    38214 Saratoga Cir<br />
                    Farmington Hills, MI 48331<br />
                    United States
                  </address>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-md bg-white ring-1 ring-slate-200 text-slate-700">US delivery hub</span>
                    <span className="px-2 py-1 rounded-md bg-white ring-1 ring-slate-200 text-slate-700">EST / CST coverage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section id="faq" className="px-4 sm:px-6 lg:px-10 py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Frequently asked</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">The questions you'd ask first.</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="group p-5 rounded-2xl bg-white ring-1 ring-slate-200 open:shadow-sm">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <span className="text-base font-semibold text-slate-900">{item.q}</span>
                  <span className="flex-none mt-1 w-6 h-6 rounded-full bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-500 group-open:rotate-45 transition-transform">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </summary>
                <p className="text-slate-700 mt-4 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-8 text-sm">
            <Link to="/contact" className="text-blue-700 hover:text-blue-800 font-medium">
              Other questions? Talk to us →
            </Link>
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
    amber: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  }[accent] || "";
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}
