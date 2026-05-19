import React from "react";
import { Link } from "react-router-dom";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ToolUI";

// ---------------------------------------------------------------------------
// Release history. Newest first. Keep entries terse and shipping-focused —
// users mostly skim this to see what's new and what changed.
// ---------------------------------------------------------------------------

const RELEASES = [
  {
    version: "0.6.0",
    date: "2026-05-14",
    tag: "Beta",
    title: "Report Studio + AI executive analysis",
    changes: [
      { kind: "added", text: "Report Studio on every tool — Executive / Slides / Markdown views with print-to-PDF, .md download, and clipboard copy." },
      { kind: "added", text: "AI-Enrich button: Groq-backed 3-paragraph executive memo prepended to any report." },
      { kind: "added", text: "Public contact form (`POST /api/contact`) with topic routing, honeypot, and Resend delivery." },
      { kind: "added", text: "CSV export of forecast steps and full series on the Forecasting page." },
      { kind: "changed", text: "Home page rewritten as a public-facing platform landing page (7 tools showcased)." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-05-08",
    tag: "Beta",
    title: "Toolkit complete · seven tools live",
    changes: [
      { kind: "added", text: "A/B Test Analyzer with Welch's t-test, two-proportion z-test, and sample-size power calc." },
      { kind: "added", text: "Customer Segmentation (K-means + PCA, auto-tuned k, silhouette score, segment profiles)." },
      { kind: "added", text: "Anomaly Detection (Isolation Forest with lag features), Churn Prediction (Random Forest), TSP and VRP solvers." },
      { kind: "added", text: "Tools dropdown in the navbar with per-tool icons; mobile drawer mirrors it." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-04-29",
    tag: "Beta",
    title: "Identity & account hardening",
    changes: [
      { kind: "added", text: "SSO sign-in via Google, GitHub, Microsoft (Azure AD), LinkedIn." },
      { kind: "added", text: "WebAuthn passkeys with discoverable-credential sign-in flow." },
      { kind: "added", text: "Profile page: edit name/phone/email, change password, manage passkeys, danger zone." },
      { kind: "added", text: "Custom email templates (confirm, reset, magic link, change-email) installed in Supabase." },
      { kind: "added", text: "Welcome email via Resend on first authenticated session (idempotent via user metadata flag)." },
      { kind: "changed", text: "4-hour idle timeout with cross-tab activity tracking; sign-out wipes server data automatically." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-04-18",
    tag: "Beta",
    title: "Forecasting workspace, mature design",
    changes: [
      { kind: "added", text: "Date auto-detection and chronological sort — handles reverse-ordered CSVs correctly." },
      { kind: "added", text: "Frequency inference (daily / weekly / monthly / quarterly / yearly) drives horizon labels." },
      { kind: "added", text: "Column picker (auto-detect, override) with localStorage persistence." },
      { kind: "added", text: "Chart confidence bands that widen with horizon; brush for zooming long series." },
      { kind: "added", text: "Date-range selector (90D / 1Y / 5Y / All) above the chart." },
      { kind: "changed", text: "Upload limit lowered to 10 MB everywhere; client-side validation prevents wasted bytes." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-04-04",
    tag: "Beta",
    title: "Production deployment, per-user storage",
    changes: [
      { kind: "added", text: "Per-user file storage on the ML service (`/var/data/users/<uuid>/`)." },
      { kind: "added", text: "Public documentation site at docs.rinkglobal.com (VitePress)." },
      { kind: "added", text: "Express gateway forwarding Supabase JWT to FastAPI via `X-User-ID` (+ optional `X-Gateway-Secret`)." },
      { kind: "added", text: "Render Blueprint config (`render.yaml`) and Vercel API wrapper (`api/index.js`)." },
      { kind: "security", text: "Gateway-side CORS allow-list locked to rinkglobal.com domains; rotated all dev keys." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-03-21",
    tag: "Alpha",
    title: "Initial forecasting prototype",
    changes: [
      { kind: "added", text: "FastAPI ML service with engineered lag/rolling features and a Gradient Boosting regressor." },
      { kind: "added", text: "React + Vite frontend with Tailwind, Recharts visualisations, and Supabase auth." },
      { kind: "added", text: "AI Assistant (Groq) chat widget on the landing page." },
    ],
  },
];

const KIND_STYLES = {
  added:    { tone: "emerald", label: "Added" },
  changed:  { tone: "blue",    label: "Changed" },
  fixed:    { tone: "amber",   label: "Fixed" },
  removed:  { tone: "red",     label: "Removed" },
  security: { tone: "purple",  label: "Security" },
};

function dot(tone) {
  return {
    emerald: "bg-emerald-400",
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    purple: "bg-purple-400",
  }[tone];
}

export default function Changelog() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Changelog"
        title="What's shipped"
        subtitle="A timeline of every meaningful change to RINK Global Services. Updates land here as soon as they hit production."
      />

      <div className="space-y-6">
        {RELEASES.map((release) => (
          <Card key={release.version} className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-white tabular-nums">v{release.version}</span>
                  <Badge tone={release.tag === "Alpha" ? "amber" : "purple"}>{release.tag}</Badge>
                  <span className="text-sm text-gray-400 tabular-nums">{release.date}</span>
                </div>
                <h2 className="text-lg font-semibold text-white mt-1">{release.title}</h2>
              </div>
            </div>

            <ul className="space-y-2.5">
              {release.changes.map((ch, i) => {
                const k = KIND_STYLES[ch.kind] || KIND_STYLES.added;
                return (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${dot(k.tone)} flex-none`} />
                    <span className="flex-1">
                      <span className={`inline-block text-[10px] uppercase tracking-widest font-semibold mr-2 ${
                        k.tone === "emerald" ? "text-emerald-300" :
                        k.tone === "blue"    ? "text-blue-300" :
                        k.tone === "amber"   ? "text-amber-300" :
                        k.tone === "red"     ? "text-red-300" :
                        "text-purple-300"
                      }`}>
                        {k.label}
                      </span>
                      <span className="text-gray-200">{ch.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-6 mt-10">
        <SectionHeader
          title="Stay in the loop"
          subtitle="Three lightweight ways to track what we ship."
        />
        <ul className="text-sm text-gray-300 space-y-2.5">
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-none" />
            <span>
              Subscribe to the <a href="https://status.rinkglobal.com" className="text-blue-300 hover:text-blue-200" target="_blank" rel="noopener noreferrer">status page</a> for incident and maintenance updates.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-none" />
            <span>
              Follow the <a href="https://github.com/" className="text-blue-300 hover:text-blue-200" target="_blank" rel="noopener noreferrer">GitHub repo</a> — every release is tagged.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-none" />
            <span>
              Drop the team a note via the <Link to="/contact" className="text-blue-300 hover:text-blue-200">contact form</Link> if there's something specific you want us to ship next.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
