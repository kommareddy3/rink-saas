import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PasskeyManager from "../components/PasskeyManager";

// ---------------------------------------------------------------------------
// Validators (mirrored from Auth.jsx)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9\s()-]{7,}$/;

const validateName = (v, label) => {
  if (!v?.trim()) return `${label} is required.`;
  if (v.trim().length < 2) return `${label} is too short.`;
  return null;
};
const validatePhone = (v) => (!v?.trim() ? null : PHONE_RE.test(v.trim()) ? null : "Use digits, spaces, +, -, ( ).");
const validateEmail = (v) => (!v?.trim() ? "Email is required." : EMAIL_RE.test(v.trim()) ? null : "Invalid email.");
const validatePassword = (v) => (!v ? "Password is required." : v.length < 8 ? "Use at least 8 characters." : null);

function passwordStrength(value) {
  if (!value) return { score: 0, label: "Empty", tone: "gray" };
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  score = Math.min(score, 4);
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const tones = ["red", "red", "amber", "emerald", "emerald"];
  return { score, label: labels[score], tone: tones[score] };
}

// ---------------------------------------------------------------------------
// Toast system (lightweight, mirrors Analytics)
// ---------------------------------------------------------------------------

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const dismiss = (id) => setToasts((p) => p.filter((t) => t.id !== id));
  const push = (message, kind = "info", ttl = 4000) => {
    const id = ++idRef.current;
    setToasts((p) => [...p, { id, message, kind }]);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
  };
  return {
    toasts,
    dismiss,
    toast: {
      info: (m, t) => push(m, "info", t),
      success: (m, t) => push(m, "success", t),
      error: (m, t) => push(m, "error", t ?? 6000),
    },
  };
}

function ToastList({ toasts, dismiss }) {
  const palette = {
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    info: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  };
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${palette[t.kind]}`}
        >
          <div className="flex-1 text-sm">{t.message}</div>
          <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center flex-none">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Field({ label, name, value, onChange, error, touched, hint, type = "text", placeholder, autoComplete, disabled, children, required }) {
  const show = touched && error;
  return (
    <div>
      <label htmlFor={name} className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border transition focus:outline-none focus:ring-2 disabled:opacity-50 ${
            show
              ? "border-red-400/60 focus:border-red-400 focus:ring-red-500/20"
              : "border-white/10 focus:border-blue-400/60 focus:ring-blue-500/20"
          }`}
        />
        {children}
      </div>
      {show ? (
        <p className="text-xs text-red-300 mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <Field {...props} type={show ? "text" : "password"}>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
        aria-label={show ? "Hide password" : "Show password"}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {show ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </>
          )}
        </svg>
      </button>
    </Field>
  );
}

function PasswordStrength({ password }) {
  const s = useMemo(() => passwordStrength(password), [password]);
  const colors = { gray: "bg-white/10", red: "bg-red-400", amber: "bg-amber-400", emerald: "bg-emerald-400" };
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < s.score ? colors[s.tone] : "bg-white/10"}`} />
        ))}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">
        Strength: <span className="text-white font-medium">{s.label}</span>
      </div>
    </div>
  );
}

function Button({ variant = "primary", className = "", loading, children, ...props }) {
  const v = {
    primary: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20",
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    danger: "bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-400/30",
  };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${className}`}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialsFromUser(user, displayName) {
  const name = (displayName || user?.email || "").trim();
  if (!name) return "?";
  if (name.includes("@")) return name[0].toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(seed) {
  let h = 0;
  for (const c of seed || "RINK") h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

function formatJoined(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Profile() {
  const { user, displayName, updateProfile, updatePassword, updateEmail } = useAuth();
  const { toasts, toast, dismiss } = useToasts();

  const meta = user?.user_metadata || {};

  // Personal info
  const [info, setInfo] = useState({
    firstName: meta.first_name || "",
    lastName: meta.last_name || "",
    phone: meta.phone || "",
  });
  const [infoTouched, setInfoTouched] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  // Email
  const [emailDraft, setEmailDraft] = useState(user?.email || "");
  const [emailTouched, setEmailTouched] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [pwTouched, setPwTouched] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  // Re-sync when user changes
  useEffect(() => {
    if (!user) return;
    const m = user.user_metadata || {};
    setInfo({
      firstName: m.first_name || "",
      lastName: m.last_name || "",
      phone: m.phone || "",
    });
    setEmailDraft(user.email || "");
  }, [user]);

  const infoErrors = useMemo(
    () => ({
      firstName: validateName(info.firstName, "First name"),
      lastName: validateName(info.lastName, "Last name"),
      phone: validatePhone(info.phone),
    }),
    [info]
  );
  const infoValid = Object.values(infoErrors).every((v) => !v);
  const infoDirty =
    info.firstName !== (meta.first_name || "") ||
    info.lastName !== (meta.last_name || "") ||
    info.phone !== (meta.phone || "");

  const emailError = validateEmail(emailDraft);
  const emailDirty = emailDraft.trim() && emailDraft.trim() !== (user?.email || "");

  const pwErrors = {
    newPassword: validatePassword(pwForm.newPassword),
    confirmPassword:
      !pwForm.confirmPassword
        ? "Confirm your new password."
        : pwForm.confirmPassword !== pwForm.newPassword
        ? "Passwords don't match."
        : null,
  };
  const pwValid = Object.values(pwErrors).every((v) => !v);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setInfoTouched({ firstName: true, lastName: true, phone: true });
    if (!infoValid) return;
    setSavingInfo(true);
    try {
      const { error } = await updateProfile({
        firstName: info.firstName,
        lastName: info.lastName,
        phone: info.phone,
      });
      if (error) {
        toast.error(error.message || "Couldn't save profile.");
        return;
      }
      toast.success("Profile updated.");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    if (emailError || !emailDirty) return;
    setSavingEmail(true);
    try {
      const { error } = await updateEmail(emailDraft.trim());
      if (error) {
        toast.error(error.message || "Couldn't change email.");
        return;
      }
      toast.success(`Confirmation sent to ${emailDraft}. Click the link to finish the change.`);
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwTouched({ newPassword: true, confirmPassword: true });
    if (!pwValid) return;
    setSavingPw(true);
    try {
      const { error } = await updatePassword(pwForm.newPassword);
      if (error) {
        toast.error(error.message || "Couldn't update password.");
        return;
      }
      setPwForm({ newPassword: "", confirmPassword: "" });
      setPwTouched({});
      toast.success("Password updated.");
    } finally {
      setSavingPw(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!user) return null;

  const initials = initialsFromUser(user, displayName);
  const color = avatarColor(user.email || displayName || "RINK");

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-5xl mx-auto">
      <ToastList toasts={toasts} dismiss={dismiss} />

      {/* Page header */}
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-2">Account</div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          View and update your personal information, email address, and password.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center">
            <div
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div className="mt-4 text-lg font-semibold text-white">{displayName || "Member"}</div>
            <div className="text-sm text-gray-400 mt-1 truncate">{user.email}</div>

            <dl className="mt-6 grid grid-cols-1 gap-3 text-left">
              <SummaryRow label="Email confirmed" value={user.email_confirmed_at ? "Yes" : "No"} tone={user.email_confirmed_at ? "emerald" : "amber"} />
              <SummaryRow label="Phone" value={meta.phone || "—"} />
              <SummaryRow label="Joined" value={formatJoined(user.created_at)} />
              <SummaryRow label="Last sign-in" value={formatJoined(user.last_sign_in_at)} />
            </dl>

            <Link
              to="/analytics"
              className="mt-6 inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 4 4 5-5" />
              </svg>
              Open workspace
            </Link>
          </Card>
        </div>

        {/* Forms column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <Card className="p-6">
            <SectionHeader
              title="Personal information"
              subtitle="Used for greetings and the avatar initials."
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <form onSubmit={handleInfoSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="First name"
                  name="firstName"
                  value={info.firstName}
                  onChange={(n, v) => setInfo((p) => ({ ...p, [n]: v }))}
                  required
                  autoComplete="given-name"
                  error={infoErrors.firstName}
                  touched={infoTouched.firstName}
                />
                <Field
                  label="Last name"
                  name="lastName"
                  value={info.lastName}
                  onChange={(n, v) => setInfo((p) => ({ ...p, [n]: v }))}
                  required
                  autoComplete="family-name"
                  error={infoErrors.lastName}
                  touched={infoTouched.lastName}
                />
              </div>
              <Field
                label="Phone"
                name="phone"
                type="tel"
                value={info.phone}
                onChange={(n, v) => setInfo((p) => ({ ...p, [n]: v }))}
                autoComplete="tel"
                error={infoErrors.phone}
                touched={infoTouched.phone}
                placeholder="+1 555 123 4567"
                hint="Optional. Used only if we need to contact you."
              />
              <div className="flex justify-end pt-1">
                <Button variant="primary" loading={savingInfo} disabled={!infoDirty || !infoValid}>
                  {savingInfo ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Email */}
          <Card className="p-6">
            <SectionHeader
              title="Email address"
              subtitle="Changing your email requires confirmation at the new address."
              icon={
                <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
              <Field
                label="Email"
                name="email"
                type="email"
                value={emailDraft}
                onChange={(_, v) => setEmailDraft(v)}
                autoComplete="email"
                required
                error={emailError}
                touched={emailTouched}
                hint={
                  user.email_confirmed_at
                    ? "Confirmed email. You'll receive a verification link before any change takes effect."
                    : "Your current email is not yet confirmed."
                }
              />
              <div className="flex justify-end">
                <Button variant="primary" loading={savingEmail} disabled={!emailDirty || !!emailError}>
                  {savingEmail ? "Sending…" : "Change email"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Password */}
          <Card className="p-6">
            <SectionHeader
              title="Password"
              subtitle="Choose a strong, unique password. We never see the original."
              icon={
                <svg className="w-5 h-5 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105.895-2 2-2h0a2 2 0 012 2v0a2 2 0 01-2 2h0c-1.105 0-2-.895-2-2zM5 12V8a7 7 0 1114 0v4M5 12h14v9H5v-9z" />
                </svg>
              }
            />
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <div>
                <PasswordField
                  label="New password"
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  value={pwForm.newPassword}
                  onChange={(n, v) => setPwForm((p) => ({ ...p, [n]: v }))}
                  error={pwErrors.newPassword}
                  touched={pwTouched.newPassword}
                  placeholder="At least 8 characters"
                />
                <PasswordStrength password={pwForm.newPassword} />
              </div>
              <PasswordField
                label="Confirm new password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={pwForm.confirmPassword}
                onChange={(n, v) => setPwForm((p) => ({ ...p, [n]: v }))}
                error={pwErrors.confirmPassword}
                touched={pwTouched.confirmPassword}
              />
              <div className="flex justify-end pt-1">
                <Button variant="primary" loading={savingPw} disabled={!pwForm.newPassword || !pwValid}>
                  {savingPw ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Passkeys */}
          <Card className="p-6">
            <SectionHeader
              title="Passkeys"
              subtitle="Passwordless sign-in with Face ID, Touch ID, Windows Hello, or a hardware key."
              icon={
                <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3 3h6l3-3v-4l-3-3" />
                </svg>
              }
            />
            <PasskeyManager onToast={toast} />
          </Card>

          {/* Danger zone */}
          <Card className="p-6 border-red-400/20">
            <SectionHeader
              title="Danger zone"
              subtitle="Permanent and irreversible actions."
              icon={
                <svg className="w-5 h-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
              }
            />
            <p className="text-sm text-gray-400 mb-4">
              Account deletion isn't available self-service yet. To permanently
              remove your account and all associated data,
              <Link to="/contact" className="text-blue-300 hover:text-blue-200"> contact our team</Link>.
            </p>
            <Button
              variant="danger"
              onClick={() => (window.location.href = "/contact?reason=delete-account")}
            >
              Request account deletion
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone = "gray" }) {
  const valueClass =
    tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5">
      <dt className="text-xs uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className={`text-sm font-medium ${valueClass} truncate text-right max-w-[60%]`}>{value}</dd>
    </div>
  );
}
