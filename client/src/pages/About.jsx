import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/rink-logo.png";

const VALUES = [
  { title: "Outcomes over hours", body: "We bill for results, not for filling timesheets. Every engagement starts with a clear definition of done and an honest line of sight to ROI." },
  { title: "Operator-grade delivery", body: "Our consultants ship code, configure landing zones, and run on-call rotations. We don't farm out the hard parts to subcontractors you haven't met." },
  { title: "Vendor-neutral integrity", body: "We staff both prime vendors and end clients. Right-to-represent stays clean. No back-channels, no double dipping — long-term trust over a single placement." },
  { title: "Security first by default", body: "Encryption at rest, least-privilege IAM, and signed audit trails aren't add-ons we sell — they're how every engagement starts." },
];

const REAL_SIGNALS = [
  { v: "Live SaaS", l: "RINK Data Analytics" },
  { v: "Farmington Hills, MI", l: "US headquarters" },
  { v: "C2C + W2", l: "engagement models" },
  { v: "Founder-led", l: "President directly reachable" },
];

const STORY = [
  { year: "Founded", title: "Built by an operator, for operators", body: "RINK Global Services was founded by Nikhila Vintha after years of watching staffing firms that couldn't write code and consulting firms that couldn't deploy it. The thesis: one operator-led firm that can both place consultants AND ship real product." },
  { year: "Today", title: "Multi-practice consulting + an in-house product", body: "We're just out of stealth, focused on cloud, infrastructure, cybersecurity, managed services, and data analytics — for vendors who need C2C consultants and end clients who need delivery teams. We also operate RINK Data Analytics, our own production SaaS, which keeps our delivery muscle sharp." },
  { year: "Tomorrow", title: "Founding cohort, then scale", body: "We're picking a small founding cohort of customers we can give President-level attention to, then growing the bench around the playbooks we build with them. No body-shopping, no race to the bottom on rates." },
];

const LOCATIONS = [
  { city: "United States", note: "Primary delivery hub · Farmington Hills, Michigan" },
  { city: "Canada", note: "Cross-border placements · CAD billing on request" },
  { city: "Offshore delivery", note: "24×7 follow-the-sun support" },
];

export default function About() {
  return (
    <div className="text-slate-900">
      {/* ============== HERO ============== */}
      <section className="relative px-4 sm:px-6 lg:px-10 pt-14 pb-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-4">About RINK</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-slate-900">
            An IT consulting firm{" "}
            <span className="text-blue-700">that ships, not just staffs.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-700 max-w-3xl leading-relaxed">
            RINK Global Services is a founder-led IT consulting and staffing firm based in
            Farmington Hills, Michigan. We deliver cloud, infrastructure, security, managed
            services, and data programs for prime vendors and end clients — and we operate
            our own production SaaS, <Link to="/analytics" className="text-blue-700 hover:text-blue-800 underline decoration-blue-200 underline-offset-4">RINK Data Analytics</Link>, so we live the same uptime our customers ask us to deliver.
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REAL_SIGNALS.map((s) => (
              <div key={s.l} className="px-4 py-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <div className="text-base font-bold text-slate-900">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FOUNDER ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 max-w-2xl">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Leadership</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Who you're working with.</h2>
          </div>
          <div className="p-8 rounded-2xl bg-white ring-1 ring-slate-200">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-none w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white text-3xl font-bold flex items-center justify-center shadow-md">
                NV
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">President &amp; Founder</div>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">Nikhila Vintha</h3>
                <p className="text-slate-700 mt-3 leading-relaxed">
                  Nikhila leads the consulting practice and the in-house product team behind RINK Data Analytics. She personally takes engagement-level questions from founding-cohort customers — you'll have her email, not a regional account exec's.
                </p>
                <a href="mailto:nikhila.vintha@rinkglobal.com" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800">
                  nikhila.vintha@rinkglobal.com
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== VALUES ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">What we believe</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Four operating principles, not a wall of corporate values.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="p-7 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">{v.title}</h3>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== STORY TIMELINE ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Our story</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Founder-led. Operator-built. Just out of stealth.</h2>
          </div>
          <ol className="relative border-l border-slate-200 pl-6 sm:pl-10 space-y-10">
            {STORY.map((s) => (
              <li key={s.year} className="relative">
                <span className="absolute -left-[34px] sm:-left-[52px] mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 ring-4 ring-white" />
                <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">{s.year}</div>
                <h3 className="text-xl font-semibold text-slate-900 mt-1">{s.title}</h3>
                <p className="text-slate-700 mt-2 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============== OFFICE + LOCATIONS ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Where we work</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">One office, three delivery footprints.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
            {/* HQ card */}
            <div className="p-7 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
              <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold">Headquarters</div>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Farmington Hills, Michigan</h3>
              <address className="text-sm text-slate-600 mt-3 leading-relaxed not-italic">
                38214 Saratoga Cir<br />
                Farmington Hills, MI 48331<br />
                United States
              </address>
            </div>
            {/* Delivery footprints */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LOCATIONS.map((l) => (
                <div key={l.city} className="p-5 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">{l.city}</h3>
                  <p className="text-slate-600 mt-1.5 text-xs leading-relaxed">{l.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-white">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-10 sm:p-14 text-center">
          <img src={logo} alt="RINK" className="h-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Want the same posture on your next project?</h2>
          <p className="text-blue-100 mt-4 max-w-2xl mx-auto">Send us a JD, a problem statement, or an architecture diagram. We'll reply within one business day.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link to="/contact?reason=sales" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 transition">
              Talk to our team
            </Link>
            <Link to="/careers" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/20 transition">
              See open roles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
