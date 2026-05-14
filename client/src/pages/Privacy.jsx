import React from "react";
import { Link } from "react-router-dom";

const updated = "May 14, 2026";

const sections = [
  {
    title: "Who we are",
    body: [
      "RINK Global Services Inc. is a United States S corporation providing IT consulting, AI analytics, software development, data engineering, and related technology services. This Privacy Policy explains how we collect, use, protect, and share information when you visit our website, use the RINK analytics workspace, contact us, or engage us for consulting services.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "Account and contact information, such as your name, email address, phone number, company, login method, and support communications.",
      "Workspace data you choose to upload or enter, including CSV files, route inputs, experiment data, customer tables, model outputs, and related metadata.",
      "Authentication and security information, including Supabase user identifiers, session activity, passkey metadata, device/browser information, and audit signals used to protect accounts.",
      "Technical and usage information, such as IP address, browser type, pages visited, feature usage, diagnostics, error logs, and performance information.",
      "Consulting and business information you provide during discovery, proposals, statements of work, project delivery, support, billing, or vendor onboarding.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "Provide, operate, secure, and improve our website, analytics tools, APIs, and consulting services.",
      "Authenticate users, maintain sessions, support passkeys, detect abuse, and protect user workspaces.",
      "Process uploaded data to generate forecasts, anomaly results, churn scores, customer segments, A/B test analysis, route plans, and related outputs.",
      "Respond to inquiries, provide support, prepare proposals, deliver IT consulting work, and manage client relationships.",
      "Send service messages, security notices, product updates, and administrative communications.",
      "Comply with legal, tax, accounting, security, and contractual obligations.",
    ],
  },
  {
    title: "Client and uploaded data",
    body: [
      "You control the data you upload to the RINK workspace. Uploaded files and generated models are stored in a user-scoped workspace and are used to provide the requested analytics functionality.",
      "The application is designed to delete user-scoped uploaded files and trained models when you sign out or when the idle timeout cleanup flow runs. Some logs, backups, security records, or support communications may remain for legitimate business, security, or legal reasons.",
      "Do not upload sensitive personal information, regulated health information, payment card data, government identification numbers, or confidential third-party data unless you have the right to do so and a written agreement with RINK specifically covers that use.",
    ],
  },
  {
    title: "Vendors and service providers",
    body: [
      "We may use trusted vendors to host, secure, authenticate, monitor, and operate our services. These may include cloud hosting providers, authentication providers, analytics or logging services, email providers, AI infrastructure providers, and payment or business operations tools.",
      "Current platform components may include services such as Supabase for authentication, Vercel for application hosting, Render for backend or ML service hosting, and AI/API providers used by the assistant or analytics features.",
      "Service providers are authorized to process information only as needed to provide services to RINK, comply with law, or protect the security and integrity of their systems.",
    ],
  },
  {
    title: "Cookies and similar technologies",
    body: [
      "We may use cookies, local storage, session storage, and similar technologies to keep you signed in, remember preferences, protect the service, understand usage, and improve performance. You can control cookies through your browser settings, but disabling them may affect account or workspace functionality.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. These include authenticated access, user-scoped storage, access controls, encrypted transport, provider security controls, and cleanup routines for workspace data.",
      "No online service can be guaranteed to be perfectly secure. You are responsible for using strong credentials, protecting your devices, and ensuring that data you upload is appropriate for the service.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "We retain information for as long as needed to provide services, maintain accounts, support security, comply with legal and tax obligations, resolve disputes, and enforce agreements. Workspace uploads may be deleted through sign-out and idle cleanup flows, while business records and logs may be retained longer where appropriate.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You may request access, correction, deletion, or export of certain personal information by contacting us. We may need to verify your identity and may retain information where required by law, security needs, contractual obligations, or legitimate business purposes.",
      "You may unsubscribe from non-essential marketing communications using the instructions in those messages or by contacting us.",
    ],
  },
  {
    title: "Children",
    body: [
      "RINK services are intended for business and professional use and are not directed to children under 13. We do not knowingly collect personal information from children under 13.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "We may update this Privacy Policy as our services, technology, business, or legal obligations change. The updated date above shows when this page was last revised. Continued use of the services after an update means the revised policy applies.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-white/10 bg-white/[0.05] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200/80">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-gray-400">Last updated: {updated}</p>
          <p className="mt-6 text-base leading-8 text-gray-300">
            This page is intended to provide clear information about how RINK Global Services Inc.
            handles data for its website, AI analytics platform, and IT consulting services. It is
            not a substitute for a signed client agreement, data processing addendum, or legal advice.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-white/10 bg-black/20 p-6">
              <h2 className="text-2xl font-semibold tracking-normal text-white">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
                {section.body.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-blue-300/20 bg-blue-500/10 p-6 text-sm leading-7 text-blue-50">
          <h2 className="text-xl font-semibold text-white">Contact</h2>
          <p className="mt-3">
            For privacy requests or questions, contact RINK Global Services Inc. at{" "}
            <a className="font-semibold underline decoration-blue-200/50 underline-offset-4" href="mailto:hello@rinkglobal.com">
              hello@rinkglobal.com
            </a>{" "}
            or use the <Link className="font-semibold underline decoration-blue-200/50 underline-offset-4" to="/contact">contact page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
