import React, { useState } from "react";
import { Link } from "react-router-dom";

const OPENINGS = [
  { id: "aws-cloud-architect", title: "Senior AWS Cloud Architect", practice: "Cloud Migrations", location: "Remote (US) · Hybrid (Detroit metro)", type: "C2C or W2", summary: "Lead landing-zone designs, multi-account governance, and migration waves for enterprise clients. AWS Solutions Architect Professional preferred; Terraform and FinOps a plus." },
  { id: "azure-devops", title: "Azure DevOps Engineer", practice: "IT Infrastructure", location: "Remote (US/Canada)", type: "C2C or W2", summary: "Build and operate Azure DevOps pipelines, GitHub Actions, and AKS clusters. Strong in IaC (Bicep / Terraform) and incident response." },
  { id: "soc-analyst", title: "SOC Analyst (L2 / L3)", practice: "Cybersecurity", location: "Hybrid (US) · Follow-the-sun offshore", type: "W2 preferred", summary: "Triage SIEM alerts, run threat-hunting playbooks, and lead IR on customer engagements. Familiar with MITRE ATT&CK; cloud-detection experience preferred." },
  { id: "data-engineer", title: "Senior Data Engineer (Snowflake / Databricks)", practice: "Data Analytics & AI", location: "Remote (US)", type: "C2C or W2", summary: "Build modern data platforms with Snowflake, dbt, Airflow, and Databricks. Bonus: experience embedding into our own RINK Data Analytics product." },
  { id: "managed-services-lead", title: "Managed Services Delivery Lead", practice: "Managed Services", location: "US (any major metro)", type: "W2", summary: "Own 24×7 ops for 3–5 mid-market clients. Run shift schedules, runbooks, monthly KPI reviews; escalate fast and write clear post-mortems." },
  { id: "fullstack", title: "Full-stack Engineer (React + Node / Python)", practice: "In-house Product · RINK Data Analytics", location: "Remote (US/Canada/India)", type: "C2C or W2", summary: "Help us ship the next generation of RINK Data Analytics. React 19, Vite, FastAPI, Supabase, Render. Real customers, fast feedback, deep ownership." },
];

const WHY = [
  { title: "Founder-led, not body-shopped", body: "Nikhila (our President) personally interviews every consultant we bring on, and stays close to every engagement. You're not a row in a bench tracker." },
  { title: "Choose your contract", body: "C2C through your LLC, W2 with full benefits, or contract-to-hire. Switch later if your situation changes." },
  { title: "Real ownership", body: "You're staffed end-to-end on engagements — discovery to handover. No revolving-door bench politics." },
  { title: "Tools that don't suck", body: "We pay for the good seat licenses, run our own SaaS on the side, and write internal tooling so you can focus on the client problem." },
];

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
    <div className="text-slate-900">
      {/* ============== HERO ============== */}
      <section className="px-4 sm:px-6 lg:px-10 pt-14 pb-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-4">Careers at RINK</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900">
            Build the engagements{" "}
            <span className="text-blue-700">you'd actually be proud to ship.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-700 max-w-3xl leading-relaxed">
            We hire senior consultants for cloud, infrastructure, cybersecurity, managed services, and data engagements — on both <b>C2C</b> and <b>W2</b> terms. We also build product (RINK Data Analytics), so you'll see the same stack on staffed engagements and our own roadmap.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {OPENINGS.length} open roles
            </span>
            <span>· C2C and W2 friendly</span>
            <span>· US, Canada, offshore delivery</span>
          </div>
        </div>
      </section>

      {/* ============== OPENINGS ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-2">Open roles</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
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
              <div className="p-8 text-center rounded-2xl ring-1 ring-dashed ring-slate-300 bg-white text-slate-600">
                No matches — try widening the filters, or send us your résumé below for future roles.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============== WHY RINK ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Why work with us</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">A bench you'd want to stay on.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WHY.map((w) => (
              <div key={w.title} className="p-7 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">{w.title}</h3>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== APPLY CTA ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-white">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-10 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Don't see your role? Send your résumé anyway.</h2>
          <p className="text-blue-100 mt-5 max-w-2xl mx-auto">
            We hire faster than we update this page. If you're a senior cloud, security, data, or infrastructure consultant — C2C or W2 — we want to talk.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link to="/contact?reason=other" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 transition">
              Apply · send your résumé
            </Link>
            <a href="mailto:nikhila.vintha@rinkglobal.com?subject=Open%20bench%20application" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/20 transition">
              Email Nikhila directly
            </a>
          </div>
          <p className="text-xs text-blue-200 mt-6">
            C2C: corp-to-corp consultants via your LLC · W2: full benefits, RINK payroll
          </p>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (light theme)
// ---------------------------------------------------------------------------

function Filter({ label, options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white ring-1 ring-slate-200">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-slate-900 outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-white">{o}</option>
        ))}
      </select>
    </div>
  );
}

function Opening({ title, practice, location, type, summary }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h3>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-50 ring-1 ring-blue-200 text-blue-700">
              {type}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{practice} · {location}</div>
        </div>
        <span className={`flex-none w-7 h-7 rounded-full bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/contact?reason=other&subject=${encodeURIComponent("Apply: " + title)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Apply for this role
            </Link>
            <a
              href={`mailto:nikhila.vintha@rinkglobal.com?subject=${encodeURIComponent("Apply: " + title)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Email Nikhila
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
