import React from "react";
import { Link } from "react-router-dom";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ToolUI";

// Cookies the app actually sets today. Update when you change auth/analytics.
const COOKIES = [
  {
    name: "sb-access-token",
    category: "Strictly necessary",
    purpose: "Holds your Supabase access JWT so you stay signed in across pages.",
    duration: "1 hour (rotated automatically)",
    party: "First-party",
    tone: "emerald",
  },
  {
    name: "sb-refresh-token",
    category: "Strictly necessary",
    purpose: "Refreshes the access token before it expires.",
    duration: "Until you sign out",
    party: "First-party",
    tone: "emerald",
  },
  {
    name: "rink:lastActivity",
    category: "Functional",
    purpose: "Records your last interaction time so we can enforce the 4-hour idle timeout (stored in localStorage, not a true cookie but listed for transparency).",
    duration: "Until you sign out",
    party: "First-party",
    tone: "blue",
  },
  {
    name: "rink:selectedColumn",
    category: "Functional",
    purpose: "Remembers which CSV column you last forecasted on, per browser.",
    duration: "Until cleared",
    party: "First-party",
    tone: "blue",
  },
  {
    name: "rink:dateRange",
    category: "Functional",
    purpose: "Remembers the chart range you last picked (90D / 1Y / 5Y / All).",
    duration: "Until cleared",
    party: "First-party",
    tone: "blue",
  },
];

const CATEGORY_DESCRIPTIONS = [
  {
    title: "Strictly necessary",
    body: "Required to keep you signed in and to keep the workspace functional. Cannot be disabled.",
    tone: "emerald",
  },
  {
    title: "Functional",
    body: "Remember your preferences (column choice, chart range, idle timer) so the app feels stable across reloads. You can clear these from your browser at any time.",
    tone: "blue",
  },
  {
    title: "Analytics",
    body: "We don't currently use analytics cookies. If we add them, we'll list them here and ship an opt-in banner first.",
    tone: "gray",
  },
  {
    title: "Marketing",
    body: "We don't set any. We don't run ad pixels, retargeting tags, or social-share trackers.",
    tone: "gray",
  },
];

const HEAD = "text-left text-xs uppercase tracking-wider text-slate-500 font-semibold py-3 pr-4 whitespace-nowrap";
const CELL = "py-3 pr-4 text-sm text-slate-700 align-top";

export default function Cookies() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Cookies"
        title="Cookie policy"
        subtitle="What we set in your browser, why, and how long it sticks around. Last updated 2026-05-12."
      />

      {/* Intro */}
      <Card className="p-6 mb-6">
        <p className="text-sm text-slate-700 leading-relaxed">
          RINK uses a small number of cookies and similar technologies (localStorage entries) to keep
          you signed in and to remember your preferences. We don't use cookies for cross-site
          tracking, advertising, or analytics. If that ever changes, we'll tell you here first and
          give you a clear opt-in choice.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed mt-3">
          By using rinkglobal.com you consent to the cookies described below. You can clear them at
          any time from your browser settings; doing so will sign you out and reset workspace
          preferences but won't affect any data we've stored under your account.
        </p>
      </Card>

      {/* Categories */}
      <Card className="p-6 mb-6">
        <SectionHeader
          title="Cookie categories"
          subtitle="Four standard buckets; we only use the first two."
          icon={
            <svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORY_DESCRIPTIONS.map((c) => (
            <div key={c.title} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge tone={c.tone}>{c.title}</Badge>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed table */}
      <Card className="p-6 mb-6">
        <SectionHeader
          title="Everything we currently set"
          subtitle="One row per cookie or localStorage entry."
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={HEAD}>Name</th>
                <th className={HEAD}>Category</th>
                <th className={HEAD}>Purpose</th>
                <th className={HEAD}>Duration</th>
                <th className={HEAD}>Party</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className={CELL}><code className="text-blue-700 font-mono text-xs">{c.name}</code></td>
                  <td className={CELL}><Badge tone={c.tone}>{c.category}</Badge></td>
                  <td className={CELL}>{c.purpose}</td>
                  <td className={CELL}>{c.duration}</td>
                  <td className={CELL}>{c.party}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Third-party note */}
      <Card className="p-6 mb-6">
        <SectionHeader title="Third-party services" />
        <p className="text-sm text-slate-700 leading-relaxed">
          When you sign in via Google, GitHub, Microsoft, or LinkedIn, those providers set their own
          cookies on their own domains during the OAuth handshake. We don't control or have access
          to those cookies — see each provider's cookie policy for details.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed mt-3">
          Our documentation site (docs.rinkglobal.com) is served by Vercel and may set a small
          number of strictly-necessary cookies for routing and CDN behaviour. None are used for
          tracking.
        </p>
      </Card>

      {/* How to manage */}
      <Card className="p-6">
        <SectionHeader
          title="How to manage cookies"
          subtitle="Three ways to take control."
        />
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-700 text-xs flex items-center justify-center font-semibold">1</span>
            <span><b>Clear from your browser.</b> Site settings → Cookies and site data → rinkglobal.com → Clear. Signs you out and resets preferences.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-700 text-xs flex items-center justify-center font-semibold">2</span>
            <span><b>Sign out.</b> Avatar menu → Sign out. Clears your session cookies and triggers server-side data deletion.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-700 text-xs flex items-center justify-center font-semibold">3</span>
            <span><b>Delete your account.</b> <Link to="/contact?reason=delete-account" className="text-blue-700 hover:text-blue-800">Email us</Link> and we'll wipe your account and any associated data within 30 days.</span>
          </li>
        </ol>
        <p className="text-xs text-slate-500 mt-5">
          Questions? <Link to="/contact?reason=account" className="text-blue-700 hover:text-blue-800">Contact our team</Link>.
        </p>
      </Card>
    </div>
  );
}
