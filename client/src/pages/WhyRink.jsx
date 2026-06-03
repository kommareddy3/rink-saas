import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "./Industries";

const FOUNDING = [
  { t: "Direct access to the founder", b: "Talk to Nikhila Vintha directly — not a regional account exec." },
  { t: "Senior people on the work", b: "The people you meet are the people who deliver — no bait-and-switch." },
  { t: "Honest pricing", b: "Discounted founding-client rates while we build our case-study book." },
];

export default function WhyRink() {
  return (
    <div className="text-slate-900">
      <PageHero
        eyebrow="Why RINK"
        title="Founder-led, US-based, contactable."
        subtitle="RINK stands for Research, Innovation, Next-gen, Knowledge — a small, operator-grade team you can actually reach."
      />

      {/* Founding cohort */}
      <section className="px-4 sm:px-6 lg:px-10 pb-4">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 to-blue-900 text-white p-10 sm:p-14 text-center">
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
            {FOUNDING.map((x) => (
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

      {/* Founder + office */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <div className="text-[11px] uppercase tracking-widest text-blue-700 font-semibold mb-3">Who you're working with</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">A real person, at a real address.</h2>
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
    </div>
  );
}
