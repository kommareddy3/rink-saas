import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Button, Card, PageHeader, SectionHeader, ToastList, useToasts, prettyError,
} from "../components/ToolUI";
import API_BASE_URL from "../config";
import { useAuth } from "../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const REASONS = [
  { id: "general",     label: "General inquiry",         icon: "💬" },
  { id: "support",     label: "Technical support",       icon: "🛠" },
  { id: "feedback",    label: "Feedback / feature idea", icon: "💡" },
  { id: "sales",       label: "Sales / Enterprise",      icon: "💼" },
  { id: "partnership", label: "Partnership",             icon: "🤝" },
  { id: "security",    label: "Security disclosure",     icon: "🔒" },
  { id: "account",     label: "Account or billing",      icon: "👤" },
  { id: "other",       label: "Something else",          icon: "✨" },
];

// Allowed values for the ?reason= URL parameter (mapped to internal ids).
const REASON_ALIASES = {
  "delete-account": "account",
  "billing": "account",
  "bug": "support",
  "issue": "support",
  "feedback": "feedback",
  "feature": "feedback",
  "sales": "sales",
  "enterprise": "sales",
  "security": "security",
  "partner": "partnership",
};

const QUICK_OPTIONS = [
  {
    title: "Browse the docs",
    body: "Step-by-step guides, API reference, and deployment notes.",
    href: "https://docs.rinkglobal.com",
    external: true,
    accent: "from-blue-500/20 to-blue-500/0 text-blue-300",
  },
  {
    title: "Check system status",
    body: "Live uptime and incident history for every tier.",
    href: "https://status.rinkglobal.com",
    external: true,
    accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
  },
  {
    title: "Ask the AI assistant",
    body: "Quick ML questions answered in the bottom-right of every page.",
    href: "/",
    accent: "from-purple-500/20 to-purple-500/0 text-purple-300",
  },
];

const DIRECT_EMAILS = [
  { label: "General",  email: "hello@rinkglobal.com" },
  { label: "Support",  email: "support@rinkglobal.com" },
  { label: "Billing",  email: "billing@rinkglobal.com" },
  { label: "Security & admin", email: "admin@rinkglobal.com" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Your name is required.";
  else if (form.name.trim().length < 2) errors.name = "Use at least 2 characters.";
  else if (form.name.length > 100) errors.name = "That's a bit long — please shorten.";

  if (!form.email.trim()) errors.email = "Your email is required.";
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Use a valid email format.";

  if (form.company && form.company.length > 100) errors.company = "Company name is too long.";

  if (!form.reason) errors.reason = "Pick a topic so we can route this.";

  if (!form.message.trim()) errors.message = "Please tell us a bit about your request.";
  else if (form.message.trim().length < 10) errors.message = "Add a few more details — at least 10 characters.";
  else if (form.message.length > 5000) errors.message = "Keep it under 5,000 characters.";

  if (!form.consent) errors.consent = "Please tick the consent box.";

  return errors;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Contact() {
  const { toasts, toast, dismiss } = useToasts();
  const { user, displayName } = useAuth();
  const [searchParams] = useSearchParams();

  const initialReason = useMemo(() => {
    const raw = (searchParams.get("reason") || "").toLowerCase();
    if (REASONS.some((r) => r.id === raw)) return raw;
    if (REASON_ALIASES[raw]) return REASON_ALIASES[raw];
    return "";
  }, [searchParams]);

  const [form, setForm] = useState({
    name: displayName || "",
    email: user?.email || "",
    company: "",
    reason: initialReason,
    message: prefillMessageFor(initialReason, searchParams),
    consent: false,
    website: "", // honeypot — keep empty
  });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Resync name/email if the user signs in while viewing the page.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: f.name || displayName || "",
      email: f.email || user?.email || "",
    }));
  }, [user, displayName]);

  const errors = useMemo(() => validate(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const markTouched = (name) => setTouched((p) => ({ ...p, [name]: true }));

  const showError = (k) => touched[k] && errors[k];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      name: true, email: true, company: true, reason: true, message: true, consent: true,
    });
    if (!isValid) {
      toast.error("Please fix the highlighted fields and try again.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/contact`, {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        reason: form.reason,
        message: form.message.trim(),
        consent: form.consent,
        website: form.website, // honeypot
      });
      setSubmitted(true);
      toast.success("Message sent — we'll be in touch within one business day.");
    } catch (err) {
      toast.error(prettyError(err, "Could not send your message."));
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-7xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />

      <PageHeader
        eyebrow="Contact"
        title="We're here to help."
        subtitle="Questions, feedback, partnerships, or security disclosures — pick the right path below. We read everything and reply within one business day."
      />

      {/* Quick self-serve options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {QUICK_OPTIONS.map((q) => (
          <QuickCard key={q.title} {...q} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form (2/3) */}
        <div className="lg:col-span-2">
          {submitted ? (
            <SuccessState
              onSendAnother={() => {
                setSubmitted(false);
                setForm((p) => ({ ...p, message: "", reason: "", consent: false }));
                setTouched({});
              }}
            />
          ) : (
            <Card className="p-6 sm:p-8">
              <SectionHeader
                title="Send us a message"
                subtitle="Pick a topic so we route this to the right person."
                icon={
                  <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              <form onSubmit={handleSubmit} noValidate>
                {/* Topic selector */}
                <Label>What's this about?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => { setField("reason", r.id); markTouched("reason"); }}
                      className={`text-left px-3 py-2.5 rounded-xl text-xs font-medium border transition ${
                        form.reason === r.id
                          ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-blue-400/50 text-white"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className="mr-1.5">{r.icon}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
                {showError("reason") && <FieldError msg={errors.reason} />}

                {/* Name + email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      onBlur={() => markTouched("name")}
                      autoComplete="name"
                      className={inputClass(showError("name"))}
                      placeholder="Ada Lovelace"
                    />
                    {showError("name") && <FieldError msg={errors.name} />}
                  </div>
                  <div>
                    <Label htmlFor="email">Work email</Label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      onBlur={() => markTouched("email")}
                      autoComplete="email"
                      className={inputClass(showError("email"))}
                      placeholder="you@company.com"
                    />
                    {showError("email") && <FieldError msg={errors.email} />}
                  </div>
                </div>

                {/* Company */}
                <div className="mt-4">
                  <Label htmlFor="company">Company <span className="text-gray-500 text-[10px] font-normal normal-case tracking-normal ml-1">optional</span></Label>
                  <input
                    id="company"
                    type="text"
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                    onBlur={() => markTouched("company")}
                    autoComplete="organization"
                    className={inputClass(showError("company"))}
                    placeholder="Where do you work?"
                  />
                  {showError("company") && <FieldError msg={errors.company} />}
                </div>

                {/* Message */}
                <div className="mt-4">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    rows={6}
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                    onBlur={() => markTouched("message")}
                    maxLength={5000}
                    className={inputClass(showError("message")) + " resize-y"}
                    placeholder={
                      form.reason === "support"
                        ? "Describe what you tried, what you expected, and what happened instead. Screenshots welcome — paste any links."
                        : form.reason === "security"
                        ? "Describe the issue, steps to reproduce, and the impact. Include any proof of concept. We'll respond within 24 hours."
                        : "Tell us a bit about your team and what you're trying to do."
                    }
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    {showError("message") ? <FieldError msg={errors.message} /> : <span />}
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {form.message.length} / 5,000
                    </span>
                  </div>
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 mt-5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => { setField("consent", e.target.checked); markTouched("consent"); }}
                    className="mt-1 accent-blue-500 w-4 h-4 flex-none"
                  />
                  <span className="text-gray-300">
                    I agree that RINK can contact me about my request and store this message securely. We don't share your details with third parties.
                  </span>
                </label>
                {showError("consent") && <FieldError msg={errors.consent} />}

                {/* Honeypot — hidden from real users */}
                <div className="absolute -left-[9999px] w-0 h-0 overflow-hidden" aria-hidden="true">
                  <label>Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      type="text"
                      value={form.website}
                      onChange={(e) => setField("website", e.target.value)}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    By submitting you confirm you're not a robot 🤖
                  </p>
                  <Button variant="primary" type="submit" loading={submitting} disabled={!isValid}>
                    {submitting ? "Sending…" : "Send message"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Sidebar (1/3) */}
        <aside className="lg:col-span-1 space-y-5">
          <Card className="p-6">
            <SectionHeader
              title="Response times"
              subtitle="What to expect after you hit send."
              icon={
                <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <ul className="text-sm text-gray-200 space-y-2.5">
              <ResponseRow tone="emerald" label="Security" detail="Within 24 hours" />
              <ResponseRow tone="blue" label="Support & bugs" detail="One business day" />
              <ResponseRow tone="purple" label="Sales" detail="One business day" />
              <ResponseRow tone="gray" label="General / feedback" detail="Two business days" />
            </ul>
            <p className="text-[11px] text-gray-500 mt-4">
              Business hours: Mon–Fri, 9am–6pm in your replier's local time.
            </p>
          </Card>

          <Card className="p-6">
            <SectionHeader
              title="Email us directly"
              subtitle="If you prefer to bypass the form."
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            <ul className="text-sm space-y-2.5">
              {DIRECT_EMAILS.map((e) => (
                <li key={e.email} className="flex items-center justify-between">
                  <span className="text-gray-400">{e.label}</span>
                  <a
                    href={`mailto:${e.email}`}
                    className="text-blue-300 hover:text-blue-200 truncate"
                  >
                    {e.email}
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <SectionHeader
              title="Stay in the loop"
              subtitle="Follow the team."
            />
            <div className="flex flex-wrap gap-2">
              {[
                { label: "LinkedIn", href: "https://www.linkedin.com/" },
                { label: "GitHub", href: "https://github.com/" },
                { label: "X / Twitter", href: "https://x.com/" },
                { label: "Docs", href: "https://docs.rinkglobal.com" },
                { label: "Status", href: "https://status.rinkglobal.com" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                >
                  {s.label}
                  <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </Card>

          {/* Security-disclosure note when relevant */}
          {form.reason === "security" && (
            <Card className="p-5 border-amber-400/30 bg-amber-500/5">
              <p className="text-xs text-amber-200 leading-relaxed">
                <b>Responsible disclosure:</b> We treat security reports as a
                top priority. Please don't share any reproduction details
                publicly until we've had a chance to investigate and ship a
                fix. We'll credit reporters on request.
              </p>
            </Card>
          )}
        </aside>
      </div>

      {/* FAQ pointer */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-400">
          Looking for quick answers?{" "}
          <a
            href="https://docs.rinkglobal.com/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 hover:text-blue-200 font-medium"
          >
            Browse the FAQ →
          </a>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuickCard({ title, body, href, external, accent }) {
  const isExternal = !!external;
  const Wrapper = isExternal ? "a" : Link;
  const props = isExternal
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { to: href };
  return (
    <Wrapper
      {...props}
      className="group relative overflow-hidden p-5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/[0.06] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br opacity-40 ${accent}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{body}</p>
        </div>
        <svg className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </Wrapper>
  );
}

function Label({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5"
    >
      {children}
    </label>
  );
}

function inputClass(hasError) {
  const base =
    "w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border transition focus:outline-none focus:ring-2 text-sm";
  return (
    base +
    " " +
    (hasError
      ? "border-red-400/60 focus:border-red-400 focus:ring-red-500/20"
      : "border-white/10 focus:border-blue-400/60 focus:ring-blue-500/20")
  );
}

function FieldError({ msg }) {
  return (
    <p className="text-xs text-red-300 mt-1.5 flex items-center gap-1">
      <svg className="w-3 h-3 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {msg}
    </p>
  );
}

function ResponseRow({ tone, label, detail }) {
  const dot = { emerald: "bg-emerald-400", blue: "bg-blue-400", purple: "bg-purple-400", gray: "bg-gray-400" }[tone];
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-gray-300">{label}</span>
      </span>
      <span className="text-white font-medium tabular-nums">{detail}</span>
    </li>
  );
}

function SuccessState({ onSendAnother }) {
  return (
    <Card className="p-8 sm:p-12 text-center border-emerald-400/30">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-white">Message sent — thanks!</h2>
      <p className="text-gray-300 mt-3 max-w-md mx-auto">
        We've routed your note to the right team. You'll hear back at the email you
        provided, usually within one business day.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="ghost" onClick={onSendAnother}>
          Send another message
        </Button>
        <a
          href="https://docs.rinkglobal.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="primary">Browse the docs</Button>
        </a>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Deep-link helpers
// ---------------------------------------------------------------------------

function prefillMessageFor(reason, params) {
  if (reason === "account" && params.get("reason") === "delete-account") {
    return "I'd like to permanently delete my RINK account and all associated data. Please confirm what information you'll need from me to verify the request.";
  }
  return "";
}
