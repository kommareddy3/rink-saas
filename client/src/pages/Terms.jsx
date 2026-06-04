import React from "react";
import { Link } from "react-router-dom";

const updated = "May 14, 2026";

const sections = [
  {
    title: "Agreement to these Terms",
    body: [
      "These Terms of Service govern your access to and use of the RINK Global Services Inc. website, RINK analytics workspace, APIs, documentation, software features, support channels, and related services. By using the services, creating an account, or engaging RINK for work, you agree to these Terms.",
      "RINK Global Services Inc. is a United States S corporation providing IT consulting, AI analytics, software development, data engineering, automation, and related technology services.",
    ],
  },
  {
    title: "Consulting and client engagements",
    body: [
      "Specific consulting projects may be governed by a separate proposal, statement of work, master services agreement, invoice, data processing addendum, or other written agreement. If a signed written agreement conflicts with these Terms, the signed agreement controls for that engagement.",
      "Unless otherwise agreed in writing, project timelines, deliverables, fees, acceptance criteria, support commitments, confidentiality obligations, and ownership of custom work product will be described in the applicable statement of work or order document.",
    ],
  },
  {
    title: "Accounts and access",
    body: [
      "You are responsible for maintaining the confidentiality of your credentials, passkeys, devices, and account access. You must provide accurate account information and promptly update it when necessary.",
      "You are responsible for activity that occurs under your account, including data uploaded, tools run, outputs generated, and API calls made using your credentials.",
      "We may suspend or restrict access if we believe an account is being misused, creates security risk, violates these Terms, or could harm RINK, users, clients, vendors, or third parties.",
    ],
  },
  {
    title: "Permitted use",
    body: [
      "You may use RINK services for lawful business, professional, analytical, and operational purposes. You must have all rights and permissions required to upload, process, analyze, or share any data you provide.",
      "You may not use the services to violate law, infringe rights, upload malicious code, attempt unauthorized access, interfere with service operations, reverse engineer restricted components, overload infrastructure, or process data you are not authorized to use.",
      "You may not use the services to make automated high-impact decisions about individuals without appropriate human review, legal basis, validation, and compliance controls.",
    ],
  },
  {
    title: "Analytics, AI, and model outputs",
    body: [
      "RINK provides analytics, predictions, statistical outputs, route plans, risk scores, and AI-assisted information to support decision-making. Outputs are generated from the data and assumptions provided and may be incomplete, inaccurate, or inappropriate for certain use cases.",
      "You are responsible for reviewing outputs, validating them for your context, and deciding how to use them. RINK outputs are not financial, legal, medical, tax, investment, employment, insurance, or professional advice.",
      "Do not rely on model outputs as the sole basis for decisions that have legal, financial, safety, employment, credit, healthcare, housing, or other significant effects on individuals unless you have implemented appropriate review and compliance processes.",
    ],
  },
  {
    title: "Your data and content",
    body: [
      "You retain ownership of data, files, text, and materials you upload or provide to RINK. You grant RINK the limited rights needed to host, process, transmit, display, analyze, secure, and support that content for the purpose of providing the services and fulfilling client engagements.",
      "You represent that you have the necessary rights, notices, permissions, consents, and legal basis to provide data to RINK and to allow RINK to process it as described in these Terms, the Privacy Policy, and any applicable written agreement.",
      "RINK may generate aggregated, de-identified, or diagnostic information to improve reliability, security, performance, and product quality, provided it does not identify you or your clients as the source unless otherwise agreed.",
    ],
  },
  {
    title: "RINK intellectual property",
    body: [
      "RINK and its licensors own the website, platform, software, workflows, designs, documentation, models, templates, know-how, trademarks, service marks, and other intellectual property used to provide the services, except for your data and any rights expressly assigned in a written agreement.",
      "No rights are granted except as expressly stated in these Terms or a signed agreement. You may not copy, resell, sublicense, or commercialize the platform or documentation except as authorized by RINK.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "RINK services may depend on third-party providers for hosting, authentication, AI infrastructure, email, monitoring, analytics, and other business operations. Third-party services are governed by their own terms and policies.",
      "RINK is not responsible for third-party outages, changes, security incidents, or limitations outside of RINK's reasonable control, but we will use commercially reasonable efforts to operate and support the services.",
    ],
  },
  {
    title: "Fees, taxes, and payment",
    body: [
      "Some services may be free, trial-based, subscription-based, usage-based, or governed by a consulting proposal. Fees, billing schedules, taxes, reimbursable expenses, and payment terms will be shown at checkout, in an invoice, or in a written agreement.",
      "Unless a written agreement says otherwise, fees are non-refundable once services are delivered, work has begun, or platform access has been provided for the applicable billing period.",
    ],
  },
  {
    title: "Confidentiality",
    body: [
      "During consulting or platform use, either party may receive non-public business, technical, financial, product, security, or customer information. Each party agrees to use reasonable care to protect confidential information and to use it only for the purpose of the relationship.",
      "Confidentiality obligations do not apply to information that is public, already known without restriction, independently developed, lawfully received from another source, or required to be disclosed by law.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "Except as expressly stated in a signed agreement, the services are provided on an 'as is' and 'as available' basis. RINK does not warrant that the services will be uninterrupted, error-free, secure, or that outputs will be accurate, complete, or fit for your particular purpose.",
      "RINK disclaims all warranties to the fullest extent permitted by law, including implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "To the fullest extent permitted by law, RINK Global Services Inc. will not be liable for indirect, incidental, special, consequential, exemplary, punitive, or lost-profit damages, or for loss of data, revenue, goodwill, or business opportunities.",
      "Except where prohibited by law or expressly stated in a signed agreement, RINK's total liability for claims arising from the services will not exceed the amount you paid RINK for the service giving rise to the claim during the three months before the event giving rise to liability.",
    ],
  },
  {
    title: "Termination",
    body: [
      "You may stop using the services at any time. RINK may suspend or terminate access if you violate these Terms, create risk, fail to pay amounts owed, or if continuing to provide the services would be unlawful or impractical.",
      "After termination, certain provisions will survive, including ownership, confidentiality, payment obligations, disclaimers, limitations of liability, and any provisions that by their nature should survive.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these Terms as our business, services, technology, or legal obligations change. The updated date above shows when this page was last revised. Continued use of the services after an update means you accept the revised Terms.",
    ],
  },
];

export default function Terms() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700/80">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-900 sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-slate-500">Last updated: {updated}</p>
          <p className="mt-6 text-base leading-8 text-slate-700">
            These Terms are written for RINK Global Services Inc. as an S-corp IT consulting
            and AI analytics business. They are general website and platform terms and should be
            reviewed by counsel before being used as final legal terms.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-2xl font-semibold tracking-normal text-slate-900">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                {section.body.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-blue-300/20 bg-blue-500/10 p-6 text-sm leading-7 text-blue-50">
          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p className="mt-3">
            Questions about these Terms can be sent to{" "}
            <a className="font-semibold underline decoration-blue-200/50 underline-offset-4" href="mailto:hello@rinkglobal.com">
              hello@rinkglobal.com
            </a>{" "}
            or submitted through the <Link className="font-semibold underline decoration-blue-200/50 underline-offset-4" to="/contact">contact page</Link>.
          </p>
          <p className="mt-3">
            Your use of RINK is also governed by our{" "}
            <Link className="font-semibold underline decoration-blue-200/50 underline-offset-4" to="/privacy">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
