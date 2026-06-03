import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "./Industries";

const FAQ_ITEMS = [
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

export default function FAQ() {
  return (
    <div className="text-slate-900">
      <PageHero
        eyebrow="Frequently asked"
        title="The questions you'd ask first."
        subtitle="Straight answers about how we work, hire, and deliver. Don't see yours? Talk to us."
      />

      <section className="px-4 sm:px-6 lg:px-10 pb-20 bg-white">
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="group p-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 open:shadow-sm">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                <span className="text-base font-semibold text-slate-900">{item.q}</span>
                <span className="flex-none mt-1 w-6 h-6 rounded-full bg-white ring-1 ring-slate-200 flex items-center justify-center text-slate-500 group-open:rotate-45 transition-transform">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </summary>
              <p className="text-slate-700 mt-4 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
          <div className="text-center mt-8 text-sm">
            <Link to="/contact" className="text-blue-700 hover:text-blue-800 font-medium">
              Other questions? Talk to us →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
