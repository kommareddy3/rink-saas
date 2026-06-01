import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ToastList, useToasts, prettyError } from "../components/ToolUI";
import api from "../api";
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
    accent: "from-blue-500/10 text-blue-700",
  },
  {
    title: "Check system status",
    body: "Live uptime and incident history for every tier.",
    href: "https://status.rinkglobal.com",
    external: true,
    accent: "from-emerald-500/10 text-emerald-700",
  },
  {
    title: "Ask the AI assistant",
    body: "Quick questions answered in the bottom-right of every page.",
    href: "/",
    accent: "from-purple-500/10 text-purple-700",
  },
];

const DIRECT_EMAILS = [
  { label: "General",  email: "hello@rinkglobal.com" },
  { label: "Support",  email: "support@rinkglobal.com" },
  { label: "Billing",  email: "billing@rinkglobal.com" },
  { label: "Security & admin", email: "admin@rinkglobal.com" },
];

// Attachment rules — resumes, analytics data, job postings, etc.
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 MB total
const MAX_FILES = 5;
const ACCEPT =
  ".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip,.json";

function formatBytes(n) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

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
  const [files, setFiles] = useState([]);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

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

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = (incoming) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;
    let next = [...files];
    for (const f of list) {
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`“${f.name}” is ${formatBytes(f.size)} — limit is ${formatBytes(MAX_FILE_BYTES)}.`);
        continue;
      }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.reduce((s, x) => s + x.size, 0) + f.size > MAX_TOTAL_BYTES) {
        toast.error(`Attachments total over ${formatBytes(MAX_TOTAL_BYTES)}. Remove one and try again.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (idx) => setFiles((p) => p.filter((_, i) => i !== idx));

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
      if (files.length) {
        const fd = new FormData();
        fd.append("name", form.name.trim());
        fd.append("email", form.email.trim());
        if (form.company.trim()) fd.append("company", form.company.trim());
        fd.append("reason", form.reason);
        fd.append("message", form.message.trim());
        fd.append("consent", String(form.consent));
        fd.append("website", form.website);
        files.forEach((f) => fd.append("attachments", f, f.name));
        await api.post("/api/contact", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/api/contact", {
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          reason: form.reason,
          message: form.message.trim(),
          consent: form.consent,
          website: form.website,
        });
      }
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
    <div className="px-4 sm:px-6 lg:px-10 py-12 max-w-7xl mx-auto overflow-x-hidden text-slate-900">
      <ToastList toasts={toasts} dismiss={dismiss} />

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-700 font-semibold mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Contact
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">We're here to help.</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Questions, feedback, partnerships, or security disclosures — pick the right path below.
          We read everything and reply within one business day.
        </p>
      </div>

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
                setFiles([]);
                setTouched({});
              }}
            />
          ) : (
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6 sm:p-8">
              <SectionHeading
                title="Send us a message"
                subtitle="Pick a topic so we route this to the right person."
              />

              <form onSubmit={handleSubmit} noValidate className="relative">
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
                          ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-400 text-blue-900 ring-1 ring-blue-200"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
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
                  <Label htmlFor="company">Company <span className="text-slate-400 text-[10px] font-normal normal-case tracking-normal ml-1">optional</span></Label>
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
                        ? "Describe what you tried, what you expected, and what happened instead. Screenshots welcome — attach them below."
                        : form.reason === "security"
                        ? "Describe the issue, steps to reproduce, and the impact. Include any proof of concept. We'll respond within 24 hours."
                        : "Tell us a bit about your team and what you're trying to do."
                    }
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    {showError("message") ? <FieldError msg={errors.message} /> : <span />}
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {form.message.length} / 5,000
                    </span>
                  </div>
                </div>

                {/* Attachments */}
                <div className="mt-5">
                  <Label>
                    Attachments
                    <span className="text-slate-400 text-[10px] font-normal normal-case tracking-normal ml-1">
                      optional — resume, analytics data, job postings, etc.
                    </span>
                  </Label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-300 transition p-5 text-center"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPT}
                      className="hidden"
                      onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                    <div className="mx-auto w-10 h-10 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center mb-2 text-slate-500">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9 5 5 0 119.74-1.5 4 4 0 011.14 7.4M12 12v8m0-8l-3 3m3-3l3 3" />
                      </svg>
                    </div>
                    <div className="text-sm text-slate-700 font-medium">Drop files or click to browse</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Up to {MAX_FILES} files · {formatBytes(MAX_FILE_BYTES)} max each
                    </div>
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center gap-3 rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2"
                        >
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center flex-none">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-slate-800 truncate">{f.name}</span>
                            <span className="block text-xs text-slate-500">{formatBytes(f.size)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="text-slate-400 hover:text-slate-700 p-1 flex-none"
                            aria-label={`Remove ${f.name}`}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                      <li className="text-[11px] text-slate-500 text-right tabular-nums">
                        {formatBytes(totalBytes)} / {formatBytes(MAX_TOTAL_BYTES)} total
                      </li>
                    </ul>
                  )}
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 mt-5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => { setField("consent", e.target.checked); markTouched("consent"); }}
                    className="mt-1 accent-blue-600 w-4 h-4 flex-none"
                  />
                  <span className="text-slate-600">
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
                  <p className="text-xs text-slate-400">
                    By submitting you confirm you're not a robot 🤖
                  </p>
                  <button
                    type="submit"
                    disabled={!isValid || submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting && (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {submitting ? "Sending…" : "Send message"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar (1/3) */}
        <aside className="lg:col-span-1 space-y-5">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
            <SectionHeading title="Response times" subtitle="What to expect after you hit send." />
            <ul className="text-sm text-slate-700 space-y-2.5">
              <ResponseRow tone="emerald" label="Security" detail="Within 24 hours" />
              <ResponseRow tone="blue" label="Support & bugs" detail="One business day" />
              <ResponseRow tone="purple" label="Sales" detail="One business day" />
              <ResponseRow tone="gray" label="General / feedback" detail="Two business days" />
            </ul>
            <p className="text-[11px] text-slate-400 mt-4">
              Business hours: Mon–Fri, 9am–6pm ET.
            </p>
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
            <SectionHeading title="Email us directly" subtitle="If you prefer to bypass the form." />
            <ul className="text-sm space-y-2.5">
              {DIRECT_EMAILS.map((e) => (
                <li key={e.email} className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 flex-none">{e.label}</span>
                  <a
                    href={`mailto:${e.email}`}
                    className="text-blue-700 hover:text-blue-800 truncate min-w-0 text-right"
                  >
                    {e.email}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
            <SectionHeading title="Stay in the loop" subtitle="Follow the team." />
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 ring-1 ring-slate-200 transition"
                >
                  {s.label}
                  <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Security-disclosure note when relevant */}
          {form.reason === "security" && (
            <div className="rounded-2xl p-5 ring-1 ring-amber-300 bg-amber-50">
              <p className="text-xs text-amber-800 leading-relaxed">
                <b>Responsible disclosure:</b> We treat security reports as a
                top priority. Please don't share any reproduction details
                publicly until we've had a chance to investigate and ship a
                fix. We'll credit reporters on request.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* FAQ pointer */}
      <div className="mt-12 text-center">
        <p className="text-sm text-slate-600">
          Looking for quick answers?{" "}
          <a
            href="https://docs.rinkglobal.com/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-800 font-medium"
          >
            Browse the FAQ →
          </a>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (light theme)
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
      className="group relative overflow-hidden p-5 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:shadow-md transition-all"
    >
      <div className={`absolute inset-0 bg-gradient-to-br to-transparent opacity-60 ${accent}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{body}</p>
        </div>
        <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </Wrapper>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Label({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs uppercase tracking-wider text-slate-600 font-semibold mb-1.5"
    >
      {children}
    </label>
  );
}

function inputClass(hasError) {
  const base =
    "w-full px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border transition focus:outline-none focus:ring-2 text-sm";
  return (
    base +
    " " +
    (hasError
      ? "border-red-400 focus:border-red-400 focus:ring-red-500/20"
      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20")
  );
}

function FieldError({ msg }) {
  return (
    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
      <svg className="w-3 h-3 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {msg}
    </p>
  );
}

function ResponseRow({ tone, label, detail }) {
  const dot = { emerald: "bg-emerald-500", blue: "bg-blue-500", purple: "bg-purple-500", gray: "bg-slate-400" }[tone];
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-slate-600">{label}</span>
      </span>
      <span className="text-slate-900 font-medium tabular-nums">{detail}</span>
    </li>
  );
}

function SuccessState({ onSendAnother }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-emerald-300 shadow-sm p-8 sm:p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-slate-900">Message sent — thanks!</h2>
      <p className="text-slate-600 mt-3 max-w-md mx-auto">
        We've routed your note to the right team. You'll hear back at the email you
        provided, usually within one business day.
      </p>
      <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onSendAnother}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white ring-1 ring-slate-200 hover:bg-slate-50 transition"
        >
          Send another message
        </button>
        <a
          href="https://docs.rinkglobal.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition"
        >
          Browse the docs
        </a>
      </div>
    </div>
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
