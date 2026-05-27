import React from "react";
import { Link } from "react-router-dom";
import { Card, PageHeader, SectionHeader } from "../components/ToolUI";

// ---------------------------------------------------------------------------
// Sub-processors. Keep this list current — every vendor that processes
// customer Personal Data must be listed.
// ---------------------------------------------------------------------------

const SUBPROCESSORS = [
  { name: "Supabase",  purpose: "Authentication and Postgres storage",        location: "US / EU (configurable)",  policy: "https://supabase.com/privacy" },
  { name: "Vercel",    purpose: "Frontend, API gateway, docs hosting",        location: "Global edge network",      policy: "https://vercel.com/legal/privacy-policy" },
  { name: "Render",    purpose: "FastAPI ML service hosting + storage",       location: "US (Oregon)",              policy: "https://render.com/privacy" },
  { name: "Groq",      purpose: "LLM inference for AI assistant + reports",   location: "US",                       policy: "https://groq.com/privacy-policy" },
  { name: "Resend",    purpose: "Transactional email delivery",               location: "US",                       policy: "https://resend.com/legal/privacy-policy" },
  { name: "Cloudflare",purpose: "DNS, TLS, DDoS protection (via Vercel/Render)", location: "Global",                policy: "https://www.cloudflare.com/privacypolicy/" },
];

const HEAD = "text-left text-xs uppercase tracking-wider text-gray-400 font-semibold py-3 pr-4";
const CELL = "py-3 pr-4 text-sm text-gray-200 align-top";

export default function DPA() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Legal"
        title="Data Processing Addendum"
        subtitle="The processor agreement that governs how RINK handles customer Personal Data on your behalf. Effective 2026-05-12."
      />

      <Card className="p-6 mb-6">
        <p className="text-sm text-gray-200 leading-relaxed">
          This Data Processing Addendum ("<b>DPA</b>") forms part of the agreement under which RINK
          Global Services ("<b>RINK</b>", "we", "us") provides the rinkglobal.com platform (the
          "<b>Service</b>") to a customer ("<b>Customer</b>", "you"). It governs RINK's processing of
          Personal Data on your behalf and is automatically incorporated by reference into our Terms
          of Service when you create an account.
        </p>
        <p className="text-sm text-gray-300 mt-3 leading-relaxed">
          If you require a counter-signed copy on letterhead — for example to satisfy procurement
          or compliance review — <Link to="/contact?reason=sales" className="text-blue-300 hover:text-blue-200">contact us</Link>
          {" "}and we'll provide one at no charge.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="1. Definitions" />
        <dl className="text-sm space-y-3">
          <DefRow term="Personal Data">Information relating to an identified or identifiable natural person, as defined under GDPR Article 4(1) (and equivalent terms under CCPA, UK DPA 2018, and similar laws).</DefRow>
          <DefRow term="Processing">Any operation performed on Personal Data — collection, storage, use, disclosure, deletion.</DefRow>
          <DefRow term="Controller / Processor">As defined in GDPR Article 4. For Service usage, Customer is the Controller and RINK is the Processor.</DefRow>
          <DefRow term="Sub-processor">Any third party engaged by RINK to process Customer Personal Data.</DefRow>
          <DefRow term="Customer Data">All content, files, model artefacts, and metadata that Customer (or its users) uploads to or generates within the Service.</DefRow>
        </dl>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="2. Roles & scope" />
        <ul className="text-sm text-gray-200 space-y-2.5 list-disc pl-5">
          <li>Customer is the <b>Controller</b> of Customer Data and is responsible for the lawful basis of processing.</li>
          <li>RINK is a <b>Processor</b> acting only on documented instructions from Customer (the instructions consist of the Service's documented features and any written request submitted via our <Link to="/contact" className="text-blue-300 hover:text-blue-200">contact form</Link>).</li>
          <li>This DPA covers Personal Data processed in connection with the Service for the duration of the Customer's subscription, plus the deletion period in §7.</li>
          <li>The categories of data subjects are Customer's authorized users and any individuals identifiable within Customer Data they upload. RINK does not actively process additional categories beyond those.</li>
        </ul>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="3. Confidentiality & personnel" />
        <ul className="text-sm text-gray-200 space-y-2.5 list-disc pl-5">
          <li>All RINK personnel with access to Personal Data are bound by confidentiality obligations either by contract or by law.</li>
          <li>Access is granted on a strict need-to-know basis and revoked promptly upon role change or termination.</li>
          <li>Background checks are performed on all personnel with production-system access.</li>
        </ul>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="4. Security measures" />
        <p className="text-sm text-gray-200 mb-3">RINK implements the technical and organizational measures set out in our <Link to="/security" className="text-blue-300 hover:text-blue-200">Security overview</Link>, including but not limited to:</p>
        <ul className="text-sm text-gray-200 space-y-1.5 list-disc pl-5">
          <li>TLS 1.2+ on all public endpoints.</li>
          <li>Encryption at rest (AES-256) on storage volumes and database content.</li>
          <li>Per-user data isolation enforced by Supabase row-level security and per-user file paths on the ML service.</li>
          <li>4-hour idle session timeout and automatic deletion of in-flight Customer Data on sign-out.</li>
          <li>WebAuthn passkeys and SSO via established identity providers.</li>
          <li>Mandatory MFA on internal admin accounts.</li>
        </ul>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="5. Sub-processors" />
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
          Customer authorizes RINK to engage the sub-processors listed below to process Personal Data
          in connection with the Service. We will notify Customer (by email and an updated entry on
          this page) at least <b>30 days</b> before adding a new sub-processor; Customer may object
          for legitimate reasons by replying to that notice.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={HEAD}>Vendor</th>
                <th className={HEAD}>Purpose</th>
                <th className={HEAD}>Location</th>
                <th className={HEAD}>Privacy policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {SUBPROCESSORS.map((sp) => (
                <tr key={sp.name}>
                  <td className={CELL}><b>{sp.name}</b></td>
                  <td className={CELL}>{sp.purpose}</td>
                  <td className={CELL}>{sp.location}</td>
                  <td className={CELL}>
                    <a href={sp.policy} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Each sub-processor is bound by contractual data protection terms substantially equivalent
          to those in this DPA.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="6. International transfers" />
        <p className="text-sm text-gray-200 leading-relaxed">
          To the extent Customer Personal Data is transferred from the European Economic Area, the
          United Kingdom, or Switzerland to a country not subject to an adequacy decision, the
          transfer is governed by the <b>EU Standard Contractual Clauses</b> (Module Two:
          Controller-to-Processor, 2021/914) and, where applicable, the UK International Data
          Transfer Addendum. These clauses are incorporated into this DPA by reference and prevail
          in the event of conflict with any other term.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="7. Data return & deletion" />
        <ul className="text-sm text-gray-200 space-y-2.5 list-disc pl-5">
          <li>On Customer's request, RINK will provide a CSV export of Customer Data within 7 days.</li>
          <li>On termination of the subscription, RINK will delete Customer Data within <b>30 days</b> unless retention is required by law.</li>
          <li>Customer-uploaded files and trained models are deleted automatically on sign-out or after 4 hours of inactivity — the at-rest deletion clock is therefore much shorter in practice.</li>
          <li>RINK will certify deletion in writing on Customer's request.</li>
        </ul>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="8. Data subject rights" />
        <p className="text-sm text-gray-200 leading-relaxed mb-2">
          RINK will provide reasonable assistance to Customer in responding to data subject requests
          (access, rectification, erasure, restriction, portability, objection). Most requests can be
          fulfilled by Customer directly using the Profile and Sign-out flows in the Service.
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">
          Where Customer requires RINK's direct assistance, contact{" "}
          <a href="mailto:admin@rinkglobal.com" className="text-blue-300 hover:text-blue-200">admin@rinkglobal.com</a>.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="9. Incident notification" />
        <p className="text-sm text-gray-200 leading-relaxed">
          RINK will notify Customer without undue delay — and in any case within <b>72 hours</b> of
          becoming aware — of any Personal Data Breach affecting Customer Data. The notice will
          describe the nature of the breach, the categories and approximate number of data subjects
          affected, likely consequences, and steps taken or proposed.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="10. Audits" />
        <p className="text-sm text-gray-200 leading-relaxed">
          Customer may, on reasonable prior written notice (no more than once per year), audit
          RINK's compliance with this DPA. RINK may satisfy this obligation by providing recent
          third-party audit reports (SOC 2, ISO 27001) from itself or its sub-processors covering
          the relevant controls.
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <SectionHeader title="11. Liability & precedence" />
        <p className="text-sm text-gray-200 leading-relaxed">
          The liability provisions of the master Terms of Service apply to this DPA. To the extent
          of any conflict between this DPA and the Terms of Service, this DPA prevails with respect
          to the processing of Personal Data.
        </p>
      </Card>

      <Card className="p-6">
        <SectionHeader title="12. Contact" />
        <p className="text-sm text-gray-200 leading-relaxed">
          Questions about this DPA, requests for a signed copy, or data protection inquiries:{" "}
          <a href="mailto:admin@rinkglobal.com" className="text-blue-300 hover:text-blue-200">admin@rinkglobal.com</a>.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          For general support, use our <Link to="/contact" className="text-blue-300 hover:text-blue-200">contact form</Link>.
        </p>
      </Card>
    </div>
  );
}

function DefRow({ term, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
      <dt className="text-xs uppercase tracking-wider text-gray-400 font-semibold pt-0.5">{term}</dt>
      <dd className="text-gray-200 leading-relaxed">{children}</dd>
    </div>
  );
}
