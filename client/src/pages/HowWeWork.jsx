import React from "react";
import { Link } from "react-router-dom";
import { PageHero, BottomCta } from "./Industries";

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

export default function HowWeWork() {
  return (
    <div className="text-slate-900">
      <PageHero
        eyebrow="How we engage"
        title="Two doors in. Same delivery muscle behind both."
        subtitle="Whether you need consultants on tap or a team to own the whole thing, the engagement framework is the same operator-grade crew."
      />

      {/* Engagement models */}
      <section className="px-4 sm:px-6 lg:px-10 pb-16 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {ENGAGEMENT_MODELS.map((m) => (
            <div key={m.audience} className="p-8 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
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
      </section>

      {/* Process */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">The process</div>
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

      <BottomCta />
    </div>
  );
}
