import React, { useState } from "react";
import { Link } from "react-router-dom";

// ---------------------------------------------------------------------------
// Data — easy to edit when real openings are posted.
// ---------------------------------------------------------------------------

const OPENINGS = [
  {
    id: "aws-cloud-architect",
    title: "Senior AWS Cloud Architect",
    practice: "Cloud Migrations",
    location: "Remote (US) · Hybrid (NYC, Dallas, Austin)",
    type: "C2C or W2",
    summary:
      "Lead landing-zone designs, multi-account governance, and migration waves for enterprise clients. AWS Solutions Architect Professional preferred; Terraform and FinOps a plus.",
  },
  {
    id: "azure-devops",
    title: "Azure DevOps Engineer",
    practice: "IT Infrastructure",
    location: "Remote (US/Canada)",
    type: "C2C or W2",
    summary:
      "Build and operate Azure DevOps pipelines, GitHub Actions, and AKS clusters. Strong in IaC (Bicep / Terraform) and incident response on shared-services platforms.",
  },
  {
    id: "soc-analyst",
    title: "SOC Analyst (L2 / L3)",
    practice: "Cybersecurity",
    location: "Hybrid (US) · Follow-the-sun offshore",
    type: "W2 preferred",
    summary:
      "Triage SIEM alerts, run threat-hunting playbooks, and lead IR on customer engagements. Familiar with MITRE ATT&CK; cloud-detection experience (CloudTrail / Defender) preferred.",
  },
  {
    id: "data-engineer",
    title: "Senior Data Engineer (Snowflake / Databricks)",
    practice: "Data Analytics & AI",
    location: "Remote (US)",
    type: "C2C or W2",
    summary:
      "Build modern data platforms with Snowflake, dbt, Airflow, and Databricks. Bonus: experience embedding into our own RINK Data Analytics product.",
  },
  {
    id: "managed-services-lead",
    title: "Managed Services Delivery Lead",
    practice: "Managed Services",
    location: "US (any major metro)",
    type: "W2",
    summary:
      "Own 24×7 ops for 3–5 mid-market clients. Run shift schedules, runbooks, monthly KPI reviews; escalate fast and write clear post-mortems.",
  },
  {
    id: "fullstack",
    title: "Full-stack Engineer (React + Node / Python)",
    practice: "In-house Product · RINK Data Analytics",
    location: "Remote (US/Canada/India)",
    type: "C2C or W2",
    summary:
      "Help us ship the next generation of RINK Data Analytics. React 19, Vite, FastAPI, Supabase, Render. Real customers, fast feedback, deep ownership.",
  },
];

const WHY = [
  {
    title: "Real ownership",
    body: "You're staffed end-to-end on engagements — discovery to handover. No revolving-door bench politics.",
  },
  {
    title: "Choose your contract",
    body: "C2C through your LLC, W2 with full benefits, or contract-to-hire. Switch later if your situation changes.",
  },
  {
    title: "Operator support",
    body: "Senior practice leads (real ones, not sales hats) jump on every engagement weekly. You're never alone on a deal.",
  },
  {
    title: "Tools that don't suck",
    body: "We pay for the good seat licenses, run our own SaaS on the side, and write internal tooling so you can focus on the client problem.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Careers() {
  const [practiceFilter, setPracticeFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const practices = ["All", ...Array.from(new Set(OPENINGS.map((o) => o.practice)))];
  const types = ["All", "C2C or W2", "W2 preferred", "W2"];

  const filtered = OPENINGS.filter((o) => {
    const matchP = practiceFilter === "All" || o.practice === practiceFilter;
    const matchT = typeFilter === "All" || o.type === typeFilter;
    return matchP && matchT;
  });

  return (
    <div className="text-white">
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-10 pt-20 pb-20">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-4">
            Careers at RINK
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            <span className="block">Build the engagements</span>
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              you'd actually be proud to ship.
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We hire senior consultants for cloud, infrastructure, cybersecurity,
            managed services, and data engagements — on both <b className="text-white">C2C</b> and <b className="text-white">W2</b> terms.
            We also build product (RINK Data Analytics), so you'll see the same
            stack from staffed engagements and our own roadmap.
          </p>

          <div className="mt-8 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {OPENINGS.length} open roles
            </span>
            <span>· C2C and W2 friendly</span>
            <span>· US, Canada, offshore</span>
          </div>
        </div>
      </section>

      {/* ============== OPENINGS (interactive) ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-2">
                Open roles
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {filtered.length === OPENINGS.length
                  ? `${OPENINGS.length} positions across ${practices.length - 1} practices`
                  : `${filtered.length} of ${OPENINGS.length} positions`}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Filter label="Practice" options={practices} value={practiceFilter} onChange={setPracticeFilter} />
              <Filter label="Type" options={types} value={typeFilter} onChange={setTypeFilter} />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((o) => (
              <Opening key={o.id} {...o} />
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 text-gray-400">
                No matches yet — try widening the filters, or send us your résumé below for future roles.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============== WHY RINK ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">
              Why work with us
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">A bench you'd want to stay on.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WHY.map((w) => (
              <div key={w.title} className="p-7 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{w.title}</h3>
                <p className="text-gray-300 mt-2 text-sm leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== APPLY CTA ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur p-10 sm:p-14 text-center">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
              Don't see your role? Send your résumé anyway.
            </h2>
            <p className="text-gray-300 mt-5 max-w-2xl mx-auto">
              We hire faster than we update this page. If you're a senior cloud, security,
              data, or infrastructure consultant — C2C or W2 — we want to talk.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row justify-center items-center gap-3">
              <Link
                to="/contact?reason=other"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-blue-500/30 transition"
              >
                Apply · send your résumé
              </Link>
              <a
                href="mailto:hello@rinkglobal.com?subject=Open%20bench%20application"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                Email hello@rinkglobal.com
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              C2C: corp-to-corp consultants via your LLC · W2: full benefits, RINK payroll
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Filter({ label, options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-white outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-gray-900">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Opening({ id, title, practice, location, type, summary }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur overflow-hidden transition hover:bg-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-200">
              {type}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {practice} · {location}
          </div>
        </div>
        <span className={`flex-none w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/contact?reason=other&subject=${encodeURIComponent("Apply: " + title)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Apply for this role
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href={`mailto:hello@rinkglobal.com?subject=${encodeURIComponent("Apply: " + title)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10"
            >
              Email résumé
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
