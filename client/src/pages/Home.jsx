import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/rink-logo.png";

// ---------------------------------------------------------------------------
// Data — central so copy is easy to evolve.
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    name: "Cloud Migrations",
    tagline: "AWS · Azure · GCP",
    description:
      "Lift-and-shift, replatform, or refactor. Discovery, landing-zone design, migration waves, and post-migration optimisation — with cost guard-rails baked in.",
    accent: "from-blue-500/20 to-blue-500/0 text-blue-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h11a5 5 0 100-10 7 7 0 00-13.5-1.5A4 4 0 003 15z" />
      </svg>
    ),
  },
  {
    name: "IT Infrastructure",
    tagline: "Networks · hybrid · virtualization",
    description:
      "Datacenter modernisation, SD-WAN, VMware/Hyper-V, storage refresh, hybrid-cloud connectivity, and end-user computing. Designed for uptime, costed for reality.",
    accent: "from-cyan-500/20 to-cyan-500/0 text-cyan-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5M5 12v5a2 2 0 002 2h10a2 2 0 002-2v-5M5 12h14M8 17h.01M8 7h.01" />
      </svg>
    ),
  },
  {
    name: "Cybersecurity",
    tagline: "Zero-trust · IAM · 24×7 SOC",
    description:
      "Threat detection & response, identity & access management, vulnerability programs, SOC2 / HIPAA / ISO readiness, and incident response retainers.",
    accent: "from-red-500/20 to-red-500/0 text-red-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105.895-2 2-2s2 .895 2 2v2m-4 0h4m-7 8a9 9 0 110-18 9 9 0 010 18z" />
      </svg>
    ),
  },
  {
    name: "Managed Services",
    tagline: "24×7 ops & support",
    description:
      "Monitoring, patching, backup & DR, ITSM, FinOps, and L1–L3 helpdesk. Outcome-based SLAs with monthly KPI reporting — not body-shop minutes.",
    accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
  },
  {
    name: "Data Analytics & AI",
    tagline: "Including our in-house platform",
    description:
      "Data engineering, MLOps, dashboards, and forecasting accelerators. Optionally delivered on top of RINK Data Analytics — our own production-grade workspace.",
    accent: "from-purple-500/20 to-purple-500/0 text-purple-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    badge: "Product",
    href: "/analytics",
  },
  {
    name: "IT Staff Augmentation",
    tagline: "C2C and W2 talent",
    description:
      "Pre-vetted cloud, DevOps, security, data, and full-stack consultants — same-day shortlists, MSA-friendly paperwork, and clean handover.",
    accent: "from-amber-500/20 to-amber-500/0 text-amber-300",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

const ENGAGEMENT_MODELS = [
  {
    audience: "For Vendors",
    headline: "C2C consultants on tap",
    blurb:
      "Need a senior AWS architect by next Tuesday? Send us the JD; we'll send back a vetted shortlist with rates, availability, and code samples — usually same-day. MSA-friendly, NET-30/45 terms, and we never poach.",
    bullets: [
      "Corp-to-Corp (C2C) consultants on our payroll",
      "Standard MSA / SOW templates ready to sign",
      "Right-to-represent transparency",
      "US, Canada, and offshore delivery",
    ],
    gradient: "from-blue-500/20 to-purple-500/10",
    border: "border-blue-500/30",
    cta: { label: "Send a JD", to: "/contact?reason=sales" },
  },
  {
    audience: "For End Clients",
    headline: "Projects, talent, or fully managed",
    blurb:
      "Run a one-off cloud migration with a fixed-bid SOW, embed a long-term W2 consultant, or hand us the whole operation as a managed service. One partner across cloud, infrastructure, security, and data.",
    bullets: [
      "Fixed-bid statements of work or T&M",
      "W-2 placements and contract-to-hire",
      "Outcome-based managed services with monthly KPI reporting",
      "Vendor-neutral — we don't compete with your other partners",
    ],
    gradient: "from-emerald-500/20 to-cyan-500/10",
    border: "border-emerald-500/30",
    cta: { label: "Request a consultation", to: "/contact?reason=sales" },
  },
];

const STEPS = [
  {
    n: "01",
    title: "Discovery call",
    body: "Free 30-minute call. Bring a problem statement, a JD, or an architecture diagram — we'll tell you whether we're the right partner.",
  },
  {
    n: "02",
    title: "Shortlist or proposal",
    body: "Staff aug: shortlist with rates inside 48 hours. Projects: scoped proposal with milestones, risks, and a fixed price or T&M ceiling.",
  },
  {
    n: "03",
    title: "Kick-off & deliver",
    body: "Consultants embed with your team. Project teams ship in weekly cadences with demos. Managed services start with a 30-day stabilisation phase.",
  },
  {
    n: "04",
    title: "Operate & report",
    body: "Monthly KPI reports for managed work. Quarterly account reviews. Plus structured handover whenever an engagement winds down.",
  },
];

const INDUSTRIES = [
  {
    industry: "Financial services",
    headline: "Regulated and ready",
    blurb:
      "Core-banking integrations, AML / KYC pipelines, AWS landing zones with PCI-DSS controls, and SOC retainers for trading floors.",
    tools: ["Cloud Migrations", "Cybersecurity", "Data Analytics"],
    gradient: "from-blue-500/20 to-purple-500/10",
    border: "border-blue-500/30",
  },
  {
    industry: "Healthcare & life sciences",
    headline: "HIPAA from day one",
    blurb:
      "HL7/FHIR integrations, EHR migrations, HIPAA-compliant cloud landing zones, and analytics for population-health programs.",
    tools: ["Cloud Migrations", "Cybersecurity", "Managed Services"],
    gradient: "from-emerald-500/20 to-cyan-500/10",
    border: "border-emerald-500/30",
  },
  {
    industry: "Retail, logistics & supply chain",
    headline: "Forecast, plan, deliver",
    blurb:
      "Demand forecasting, route optimisation, and 24×7 retail-ops support — including our own RINK Data Analytics workspace for sub-second forecasts.",
    tools: ["Data Analytics", "Managed Services", "IT Infrastructure"],
    gradient: "from-amber-500/20 to-red-500/10",
    border: "border-amber-500/30",
  },
  {
    industry: "Energy, utilities & public sector",
    headline: "Mission-critical uptime",
    blurb:
      "OT/IT convergence, GIS modernisation, FedRAMP-aware cloud designs, and managed SOCs aligned to NIST CSF.",
    tools: ["IT Infrastructure", "Cybersecurity", "Managed Services"],
    gradient: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/30",
  },
];

const DIFFERENTIATORS = [
  {
    title: "One partner, full stack",
    body: "Cloud, infrastructure, security, data, and people under one MSA. Fewer vendors to manage, one accountable team.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    title: "Vendor-neutral by design",
    body: "We staff vendors AND end clients but never compete with our partner vendors on their accounts. Right-to-represent stays clean.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Same-day shortlists",
    body: "A senior C2C resume in your inbox within 24 hours for most roles, 48 hours for niche skills. With code samples and reference checks already done.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "We build our own products",
    body: "RINK Data Analytics is a production SaaS we operate ourselves — proof we ship, not just staff. You get the platform for free on data engagements.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

const FAQ = [
  {
    q: "What's the difference between C2C and W2 for our team?",
    a: "C2C (Corp-to-Corp) consultants are on our payroll and we invoice you on NET-30/45 terms — flexible, fast to scale up and down, and the consultant carries their own benefits. W2 means we place a permanent or contract-to-hire employee on your payroll. Many clients mix both: C2C to ramp a project quickly, W2 to retain the institutional knowledge afterwards.",
  },
  {
    q: "How fast can you fill a role?",
    a: "For common stacks (AWS, Azure, .NET, Java, React, Python, Snowflake, Databricks, Salesforce): a vetted shortlist within 24 hours. For niche skills (FedRAMP, OT/SCADA, specific industry experience): 48–72 hours. We don't believe in week-long shortlists — by then your client has moved on.",
  },
  {
    q: "Do you support remote, hybrid, and on-site?",
    a: "All three. Our consultant pool is split across the US, Canada, and offshore delivery centres, with on-site coverage available in major US metros. We default to remote-first but match whatever your client's policy requires.",
  },
  {
    q: "We already have a prime-vendor MSA. Can you sub through them?",
    a: "Yes — we work as a tier-2 supplier under most major prime-vendor programs. Share the prime's onboarding portal and we'll have paperwork done within a week. We've signed roughly 80 MSAs to date and the templates rarely surprise us.",
  },
  {
    q: "What's the deal with RINK Data Analytics?",
    a: "It's our own SaaS — a forecasting / anomaly / churn / A/B / route-optimisation workspace we built to scratch our own itch on data engagements. It's a real product (open the workspace from the navbar). Clients who hire us for data work get to use it as part of the engagement; we also license it standalone.",
  },
  {
    q: "Do you offer fixed-bid pricing?",
    a: "Yes for well-scoped projects (cloud migrations, security assessments, dashboard builds). For ambiguous discovery work or open-ended platform builds, we recommend T&M with a not-to-exceed ceiling — same cost certainty, less risk of cutting corners on scope.",
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
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300 font-semibold mb-5 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            IT Consulting · Staffing · Managed Services
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block">Your IT delivery partner.</span>
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              People, projects, products.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            RINK Global Services helps <b className="text-white">vendors</b> and <b className="text-white">end clients</b> ship
            cloud, infrastructure, cybersecurity, and data programs.
            C2C consultants, W2 placements, fixed-bid projects, and 24×7 managed services —
            backed by our own production SaaS, <Link to="/analytics" className="text-blue-300 hover:text-blue-200 underline decoration-blue-300/30 underline-offset-4">RINK Data Analytics</Link>.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              to="/contact?reason=sales"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all"
            >
              {user ? "Talk to your account team" : "Request a consultation"}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#services"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              See all services
            </a>
            <Link
              to={user ? "/analytics" : "/auth?mode=register"}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 transition"
            >
              {user ? "Open the analytics workspace" : "Try RINK Data Analytics (free)"}
            </Link>
          </div>

          {/* Security trust line */}
          <div className="mt-6 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Vendor-neutral · NDA-first
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              C2C &amp; W2 friendly
            </span>
            <a href="/security" className="inline-flex items-center gap-1.5 text-blue-300 hover:text-blue-200 transition">
              Our security posture
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

          {/* Stats / proof bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
            {[
              { v: "6", l: "service practices" },
              { v: "C2C + W2", l: "engagement models" },
              { v: "< 48 h", l: "shortlist SLA" },
              { v: "Own SaaS", l: "RINK Data Analytics" },
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

      {/* ============== SERVICES ============== */}
      <section id="services" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              What we do
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">
              Six practices. One accountable partner.
            </h2>
            <p className="text-gray-400 mt-4 text-lg">
              Pick a service or hand us the whole stack. Each practice is run
              by a senior practitioner — not a sales rep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((s) => {
              const inner = (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-40 ${s.accent}`} />
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 ${s.accent.split(" ").pop()}`}>
                      {s.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-white">{s.name}</h3>
                      {s.badge && (
                        <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-purple-500/30 border border-purple-400/30 text-purple-100">
                          {s.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-blue-300/80 mt-0.5">{s.tagline}</p>
                    <p className="text-sm text-gray-400 mt-3 leading-relaxed">{s.description}</p>
                    {s.href && (
                      <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-white">
                        Open product
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    )}
                  </div>
                </>
              );
              return s.href ? (
                <Link key={s.name} to={s.href} className="group relative overflow-hidden p-6 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
                  {inner}
                </Link>
              ) : (
                <div key={s.name} className="relative overflow-hidden p-6 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============== ENGAGEMENT MODELS ============== */}
      <section id="how-we-engage" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              How we engage
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Two doors in. Same delivery muscle behind both.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ENGAGEMENT_MODELS.map((m) => (
              <div
                key={m.audience}
                className={`relative p-8 rounded-2xl bg-gradient-to-br ${m.gradient} border ${m.border} backdrop-blur`}
              >
                <div className="text-xs uppercase tracking-widest text-white/70 font-semibold">
                  {m.audience}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2">{m.headline}</h3>
                <p className="text-gray-200 mt-3 leading-relaxed">{m.blurb}</p>
                <ul className="mt-5 space-y-2 text-sm text-gray-100">
                  {m.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-300 flex-none" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={m.cta.to}
                  className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition"
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

      {/* ============== HOW WE WORK ============== */}
      <section id="how" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              How we work
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">From a problem statement to a shipped result.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative p-7 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur">
                <div className="absolute -top-3 left-7 text-xs font-bold tracking-widest px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  STEP {s.n}
                </div>
                <h3 className="text-xl font-semibold text-white mt-3">{s.title}</h3>
                <p className="text-gray-400 mt-3 leading-relaxed">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <svg className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== IN-HOUSE PRODUCT SPOTLIGHT ============== */}
      <section id="product" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/15 via-purple-600/15 to-pink-600/15 backdrop-blur p-10 sm:p-14">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
                  Our in-house product
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                  RINK Data Analytics — built by us, used by us.
                </h2>
                <p className="text-gray-300 mt-5 leading-relaxed">
                  We didn't want to be just another body shop. So we built our
                  own production SaaS: a forecasting, anomaly-detection,
                  churn, segmentation, A/B-test, and route-optimisation
                  workspace. Real customers, real uptime — and proof that we
                  ship code, not just consultants.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-gray-200">
                  {[
                    "Seven analytics tools in one workspace",
                    "Encrypted at rest, isolated per user",
                    "REST API + docs for embedding it in your stack",
                    "Free during beta — included on data engagements",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-none" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to={user ? "/analytics" : "/auth?mode=register"}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/30 transition"
                  >
                    {user ? "Open workspace" : "Try it free"}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <a
                    href="https://docs.rinkglobal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                  >
                    Read the docs
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "7", l: "tools" },
                  { v: "REST", l: "API surface" },
                  { v: "< 1 s", l: "typical run" },
                  { v: "10 MB", l: "max CSV" },
                ].map((t) => (
                  <div
                    key={t.l}
                    className="p-5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur"
                  >
                    <div className="text-3xl font-bold text-white tabular-nums">{t.v}</div>
                    <div className="text-[11px] uppercase tracking-widest text-gray-400 mt-1">
                      {t.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== INDUSTRIES ============== */}
      <section id="use-cases" className="px-4 sm:px-6 lg:px-10 py-24 scroll-mt-24 bg-gradient-to-b from-transparent via-black/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              Industries we serve
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Where we've delivered the most.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INDUSTRIES.map((uc) => (
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
            <h2 className="text-3xl sm:text-5xl font-bold">The boring stuff that quietly makes us different.</h2>
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
            <h2 className="text-3xl sm:text-5xl font-bold">Things vendors and clients ask first.</h2>
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
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200"
            >
              Other questions? Talk to us
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
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
              Hiring? Migrating?<br />
              Just need a steady hand on the operations?
            </h2>
            <p className="text-gray-300 mt-5 text-lg max-w-2xl mx-auto">
              Send us a JD, a problem statement, or an architecture diagram.
              We'll reply within one business day with the right team to take it from here.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
              <Link
                to="/contact?reason=sales"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-blue-500/30 transition"
              >
                Talk to our team
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to={user ? "/analytics" : "/auth?mode=register"}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                {user ? "Open the analytics workspace" : "Try our analytics platform"}
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              MSA &amp; NDA templates ready · C2C and W2 friendly · US, Canada, and offshore delivery
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
