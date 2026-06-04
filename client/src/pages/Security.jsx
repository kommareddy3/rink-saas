import React from "react";
import { Link } from "react-router-dom";
import { Badge, Card, PageHeader, SectionHeader } from "../components/ToolUI";

// ---------------------------------------------------------------------------
// Sections rendered on the page. Keep the tone factual — claims should be
// accurate to the implementation (per-user storage, idle timeout, etc.).
// ---------------------------------------------------------------------------

const PILLARS = [
  {
    title: "Customer data isolation",
    body: "Every uploaded file and trained model is stored under your Supabase user UUID — never on a shared filesystem. Cross-tenant reads are impossible because file paths embed the UUID and gateway endpoints verify it on every call.",
  },
  {
    title: "Encrypted in transit, at rest",
    body: "TLS 1.2+ on every public endpoint. Storage volumes on Render are encrypted at rest (AES-256). Database content on Supabase is encrypted at rest and accessible only via TLS.",
  },
  {
    title: "Short-lived sessions",
    body: "Supabase access tokens expire after 1 hour; refresh tokens are revocable. A 4-hour client-side idle timeout adds an upper bound on session length and triggers a full data wipe on expiry.",
  },
  {
    title: "Principle of least privilege",
    body: "The browser only ever holds a Supabase anon key (safe by design) and the user's access token. The service-role key lives only on the gateway in encrypted Vercel env vars. The ML service is locked to gateway traffic via a shared header secret when configured.",
  },
];

const ROW_HEAD = "text-left text-xs uppercase tracking-wider text-slate-500 font-semibold py-3 pr-4";
const ROW_CELL = "py-3 pr-4 text-sm text-slate-700";

export default function Security() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Security"
        title="How we keep your data safe"
        subtitle="What's actually implemented today, not what we'd like to be true. Last reviewed 2026-05-12."
      />

      {/* Four-pillar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {PILLARS.map((p) => (
          <Card key={p.title} className="p-6">
            <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">{p.body}</p>
          </Card>
        ))}
      </div>

      {/* Authentication */}
      <Card className="p-6 mb-6">
        <SectionHeader
          title="Authentication & access"
          subtitle="Multiple methods, all backed by Supabase."
          icon={
            <svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v3m0-3h.01M5 11V7a7 7 0 0114 0v4M5 11h14M5 11H3m16 0h2" />
            </svg>
          }
        />
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <Badge tone="emerald">Available</Badge>
            <span>Email + password with verification, password reset, and live strength scoring.</span>
          </li>
          <li className="flex items-start gap-3">
            <Badge tone="emerald">Available</Badge>
            <span>SSO via Google, GitHub, Microsoft (Azure AD), LinkedIn.</span>
          </li>
          <li className="flex items-start gap-3">
            <Badge tone="emerald">Available</Badge>
            <span>WebAuthn passkeys with discoverable credentials — Face ID, Touch ID, Windows Hello, hardware keys.</span>
          </li>
          <li className="flex items-start gap-3">
            <Badge tone="amber">Roadmap</Badge>
            <span>TOTP-based 2FA for accounts that don't yet use passkeys.</span>
          </li>
          <li className="flex items-start gap-3">
            <Badge tone="amber">Roadmap</Badge>
            <span>SAML 2.0 for enterprise SSO (available via Supabase Pro).</span>
          </li>
        </ul>
      </Card>

      {/* Data handling */}
      <Card className="p-6 mb-6">
        <SectionHeader
          title="Data handling"
          subtitle="What we store, where, and for how long."
          icon={
            <svg className="w-5 h-5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={ROW_HEAD}>What</th>
                <th className={ROW_HEAD}>Where</th>
                <th className={ROW_HEAD}>Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className={ROW_CELL}>Account email + name</td>
                <td className={ROW_CELL}>Supabase Auth (EU/US region)</td>
                <td className={ROW_CELL}>Until account is deleted</td>
              </tr>
              <tr>
                <td className={ROW_CELL}>Uploaded CSVs</td>
                <td className={ROW_CELL}>Cloudflare R2, encrypted, per-user path</td>
                <td className={ROW_CELL}>Up to 90 days, then auto-deleted; or delete anytime</td>
              </tr>
              <tr>
                <td className={ROW_CELL}>Generated reports</td>
                <td className={ROW_CELL}>Cloudflare R2, encrypted, per-user path</td>
                <td className={ROW_CELL}>Up to 90 days, then auto-deleted; or delete anytime</td>
              </tr>
              <tr>
                <td className={ROW_CELL}>Trained models (.joblib)</td>
                <td className={ROW_CELL}>Regenerable working cache</td>
                <td className={ROW_CELL}>Transient; rebuilt from your data on demand</td>
              </tr>
              <tr>
                <td className={ROW_CELL}>Passkey public keys</td>
                <td className={ROW_CELL}>Supabase Postgres (row-level secured)</td>
                <td className={ROW_CELL}>Until you remove the passkey</td>
              </tr>
              <tr>
                <td className={ROW_CELL}>Contact form submissions</td>
                <td className={ROW_CELL}>Email inbox via Resend; not stored in our DB</td>
                <td className={ROW_CELL}>Standard email retention (90 days in Resend logs)</td>
              </tr>
              <tr>
                <td className={ROW_CELL}>AI assistant chats</td>
                <td className={ROW_CELL}>Stateless — not stored after the response</td>
                <td className={ROW_CELL}>Zero</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          We never train ML models on customer data, and we never sell or share it with third parties beyond the
          sub-processors listed in our <Link to="/dpa" className="text-blue-700 hover:text-blue-800">Data Processing Addendum</Link>.
        </p>
      </Card>

      {/* Infrastructure */}
      <Card className="p-6 mb-6">
        <SectionHeader
          title="Infrastructure"
          subtitle="Built on hardened, audited cloud providers."
          icon={
            <svg className="w-5 h-5 text-purple-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          }
        />
        <ul className="space-y-2.5 text-sm text-slate-700">
          <li><b>Vercel</b> hosts the React frontend, API gateway, and docs. SOC 2 Type 2 certified, ISO 27001.</li>
          <li><b>Render</b> hosts the FastAPI ML service. SOC 2 Type 2 certified, encrypted disks.</li>
          <li><b>Supabase</b> provides authentication and Postgres storage. SOC 2 Type 2 certified, HIPAA-eligible on paid plans.</li>
          <li><b>Groq</b> (AI assistant + executive narrative) processes prompts statelessly and does not retain content for training.</li>
          <li><b>Resend</b> (transactional email) is SOC 2 Type 2 certified; we use Reply-To headers so customer emails aren't forwarded to a shared inbox.</li>
        </ul>
      </Card>

      {/* Responsible disclosure */}
      <Card className="p-6 mb-6 border-amber-400/30 bg-amber-500/5">
        <SectionHeader
          title="Responsible disclosure"
          subtitle="Found a vulnerability? Tell us privately."
          icon={
            <svg className="w-5 h-5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
        <p className="text-sm text-slate-700 leading-relaxed">
          Email <a href="mailto:admin@rinkglobal.com" className="text-blue-700 hover:text-blue-800">admin@rinkglobal.com</a>
          {" "}with reproduction steps and impact. We commit to:
        </p>
        <ul className="text-sm text-slate-700 mt-3 space-y-1.5 list-disc pl-5">
          <li>Acknowledge receipt within 24 hours.</li>
          <li>Triage within 3 business days.</li>
          <li>Credit reporters in this changelog on request (or stay quiet, your call).</li>
          <li>Not pursue legal action against good-faith research that respects user data and avoids destructive testing.</li>
        </ul>
        <p className="text-xs text-slate-500 mt-4">
          Please don't disclose details publicly until we've shipped a fix. We aim for fix-and-disclose within 30 days for high-severity issues.
        </p>
      </Card>

      {/* Compliance roadmap */}
      <Card className="p-6">
        <SectionHeader
          title="Compliance roadmap"
          subtitle="Where we are vs. where we're going."
        />
        <ul className="space-y-2.5 text-sm text-slate-700">
          <li className="flex items-start gap-3"><Badge tone="emerald">In place</Badge><span>GDPR Art. 28 processor contract (see our DPA).</span></li>
          <li className="flex items-start gap-3"><Badge tone="emerald">In place</Badge><span>Per-user data deletion (right to erasure on request).</span></li>
          <li className="flex items-start gap-3"><Badge tone="amber">In progress</Badge><span>SOC 2 Type 1 — targeting Q4 2026.</span></li>
          <li className="flex items-start gap-3"><Badge tone="amber">In progress</Badge><span>ISO 27001 statement of applicability.</span></li>
          <li className="flex items-start gap-3"><Badge tone="gray">Planned</Badge><span>HIPAA-eligible deployment for healthcare customers.</span></li>
        </ul>
        <p className="text-xs text-slate-500 mt-5">
          Need a security questionnaire filled in? <Link to="/contact?reason=security" className="text-blue-700 hover:text-blue-800">Email the security team</Link> — we typically turn responses around in 2 business days.
        </p>
      </Card>
    </div>
  );
}
