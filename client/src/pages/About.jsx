import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/rink-logo.png";

const VALUES = [
  {
    title: "Outcomes over hours",
    body: "We bill for results, not for filling timesheets. Every engagement starts with a clear definition of done and an honest line of sight to ROI.",
  },
  {
    title: "Operator-grade delivery",
    body: "Our consultants ship code, configure landing zones, and run on-call rotations. We don't farm out the hard parts to subcontractors you haven't met.",
  },
  {
    title: "Vendor-neutral integrity",
    body: "We staff both prime vendors and end clients. Right-to-represent stays clean. No back-channels, no double dipping — long-term trust over a single placement.",
  },
  {
    title: "Security first by default",
    body: "Encryption at rest, least-privilege IAM, and signed audit trails aren't add-ons we sell — they're how every engagement starts.",
  },
];

const NUMBERS = [
  { v: "6", l: "service practices" },
  { v: "C2C + W2", l: "engagement models" },
  { v: "< 48 h", l: "shortlist SLA" },
  { v: "Own SaaS", l: "RINK Data Analytics" },
];

const STORY = [
  {
    year: "Founding",
    title: "Built by operators, for operators",
    body:
      "RINK Global Services was founded by IT practitioners who got tired of staffing firms that couldn't write code and consulting firms that couldn't deploy it. We started small with a tight pool of senior consultants and one rule — every engagement gets shipped by people who could do the job themselves.",
  },
  {
    year: "Today",
    title: "Multi-practice consulting + an in-house product",
    body:
      "Today we deliver across cloud, IT infrastructure, cybersecurity, managed services, and data analytics — for vendors who need C2C consultants and end clients who need project teams. We also operate our own production SaaS, RINK Data Analytics, which sharpens us on what production really means.",
  },
  {
    year: "Tomorrow",
    title: "More partners, more products, same posture",
    body:
      "We're growing the bench, deepening industry verticals, and shipping more products built on the same operator-grade discipline. We'll never become a body shop and we'll never sell something we haven't tried ourselves.",
  },
];

const LOCATIONS = [
  { city: "United States", note: "Primary delivery hub · CST/EST coverage" },
  { city: "Canada", note: "Cross-border placements · CAD billing" },
  { city: "Offshore delivery", note: "24×7 follow-the-sun support" },
];

export default function About() {
  return (
    <div className="text-white">
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-10 pt-20 pb-20">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-4">
            About RINK
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            <span className="block">An IT consulting firm</span>
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              that ships, not just staffs.
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-3xl leading-relaxed">
            RINK Global Services is an IT consulting and staffing firm built by
            operators. We deliver cloud, infrastructure, security, managed
            services, and data programs for prime vendors and end clients —
            and we operate our own production SaaS, <Link to="/analytics" className="text-blue-300 hover:text-blue-200 underline decoration-blue-300/30 underline-offset-4">RINK Data Analytics</Link>,
            so we live the same uptime our customers ask us to deliver.
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {NUMBERS.map((s) => (
              <div key={s.l} className="px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur">
                <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{s.v}</div>
                <div className="text-[11px] uppercase tracking-widest text-gray-400 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== VALUES ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">What we believe</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Four operating principles, not a wall of corporate values.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="p-7 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{v.title}</h3>
                <p className="text-gray-300 mt-2 leading-relaxed text-sm">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== STORY TIMELINE ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">Our story</div>
            <h2 className="text-3xl sm:text-4xl font-bold">From senior bench to multi-practice partner.</h2>
          </div>
          <ol className="relative border-l border-white/10 pl-6 sm:pl-10 space-y-10">
            {STORY.map((s, i) => (
              <li key={s.year} className="relative">
                <span className="absolute -left-[34px] sm:-left-[52px] mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-black" />
                <div className="text-[11px] uppercase tracking-widest text-blue-300 font-semibold">{s.year}</div>
                <h3 className="text-xl font-semibold text-white mt-1">{s.title}</h3>
                <p className="text-gray-300 mt-2 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============== LOCATIONS ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20 bg-gradient-to-b from-transparent via-black/20 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3">Where we work</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Three delivery footprints. One accountable team.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {LOCATIONS.map((l) => (
              <div key={l.city} className="p-7 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{l.city}</h3>
                <p className="text-gray-400 mt-2 text-sm">{l.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="px-4 sm:px-6 lg:px-10 py-20">
        <div className="relative overflow-hidden max-w-5xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur p-10 sm:p-14 text-center">
          <img src={logo} alt="RINK" className="h-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Want the same posture on your next project?
          </h2>
          <p className="text-gray-300 mt-4 text-lg max-w-2xl mx-auto">
            Send us a JD, a problem statement, or an architecture diagram. We'll reply within one business day.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              to="/contact?reason=sales"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl shadow-blue-500/30 transition"
            >
              Talk to our team
            </Link>
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              See open roles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
