import React from "react";
import { Link } from "react-router-dom";

const INDUSTRIES = [
  { industry: "Financial Services", headline: "Regulated and ready", blurb: "Core-banking integrations, AML/KYC pipelines, PCI-DSS aware AWS landing zones." },
  { industry: "Healthcare & Life Sciences", headline: "HIPAA from day one", blurb: "HL7/FHIR integrations, EHR migrations, HIPAA-compliant landing zones, population-health analytics." },
  { industry: "Retail, Logistics & Supply Chain", headline: "Forecast, plan, deliver", blurb: "Demand forecasting, route optimisation, 24×7 retail ops — powered by RINK Data Analytics." },
  { industry: "Energy, Utilities & Public Sector", headline: "Mission-critical uptime", blurb: "OT/IT convergence, GIS modernisation, FedRAMP-aware cloud designs, NIST CSF-aligned SOCs." },
];

export default function Industries() {
  return (
    <div className="text-slate-900">
      <PageHero
        eyebrow="Industries we serve"
        title="Where we plan to deliver the most."
        subtitle="As a founder-led firm, we're focused on a small number of verticals so we go deep, not wide."
      />

      <section className="px-4 sm:px-6 lg:px-10 pb-20 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {INDUSTRIES.map((uc) => (
            <div key={uc.industry} className="p-7 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
              <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">{uc.industry}</div>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{uc.headline}</h3>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">{uc.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <BottomCta />
    </div>
  );
}

export function PageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="px-4 sm:px-6 lg:px-10 pt-16 pb-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">{eyebrow}</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-600 mt-4 max-w-2xl text-lg leading-relaxed">{subtitle}</p>}
      </div>
    </section>
  );
}

export function BottomCta({
  title = "Tell us what you're trying to ship.",
  body = "Send us a JD, a problem statement, or an architecture diagram. We'll reply within one business day.",
}) {
  return (
    <section className="px-4 sm:px-6 lg:px-10 py-20 bg-white">
      <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-10 sm:p-14 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold leading-tight">{title}</h2>
        <p className="text-blue-100 mt-5 text-base max-w-2xl mx-auto">{body}</p>
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
            Email us directly
          </a>
        </div>
      </div>
    </section>
  );
}
