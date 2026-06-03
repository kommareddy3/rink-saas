import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { startAuthentication } from "@simplewebauthn/browser";
import { useAuth } from "../contexts/AuthContext";
import SocialLoginButtons from "../components/SocialLoginButtons";
import API_BASE_URL from "../config";
import logo from "../assets/rink-logo.png";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES = {
  LOGIN: "login",
  REGISTER: "register",
  FORGOT: "forgot",
  RESET: "reset",
  CHECK_EMAIL: "check_email",
  RESET_SENT: "reset_sent",
};

const DEFAULT_NEXT = "/analytics-workspace";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9\s()-]{7,}$/;

function validateEmail(value) {
  if (!value?.trim()) return "Email is required.";
  if (!EMAIL_RE.test(value.trim())) return "That doesn't look like a valid email.";
  return null;
}

function validatePassword(value, { signup = false } = {}) {
  if (!value) return "Password is required.";
  if (signup && value.length < 8) return "Use at least 8 characters.";
  if (!signup && value.length < 6) return "Password is too short.";
  return null;
}

function validateName(value, label) {
  if (!value?.trim()) return `${label} is required.`;
  if (value.trim().length < 2) return `${label} is too short.`;
  return null;
}

function validatePhone(value) {
  if (!value?.trim()) return null; // optional
  if (!PHONE_RE.test(value.trim())) return "Use digits, spaces, +, -, ( ).";
  return null;
}

function passwordStrength(value) {
  if (!value) return { score: 0, label: "Empty", tone: "gray" };
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  // Cap at 4 for the meter
  score = Math.min(score, 4);
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const tones = ["red", "red", "amber", "emerald", "emerald"];
  return { score, label: labels[score], tone: tones[score] };
}

// ---------------------------------------------------------------------------
// UI primitives
// ---------------------------------------------------------------------------

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  touched,
  autoComplete,
  placeholder,
  hint,
  required,
  children,
  inputRef,
  ...rest
}) {
  const showError = touched && error;
  return (
    <div>
      <label htmlFor={name} className="block text-xs uppercase tracking-wider text-gray-300 font-semibold mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur?.(name)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl bg-black/30 text-white placeholder-gray-500 border transition focus:outline-none focus:ring-2
            ${showError
              ? "border-red-400/60 focus:border-red-400 focus:ring-red-500/20"
              : "border-white/10 focus:border-blue-400/60 focus:ring-blue-500/20"
            }`}
          {...rest}
        />
        {children}
      </div>
      {showError ? (
        <p className="text-xs text-red-300 mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
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
        {show ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </Field>
  );
}

function PasswordStrength({ password }) {
  const s = useMemo(() => passwordStrength(password), [password]);
  const segs = [0, 1, 2, 3];
  const colors = {
    gray: "bg-white/10",
    red: "bg-red-400",
    amber: "bg-amber-400",
    emerald: "bg-emerald-400",
  };
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {segs.map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < s.score ? colors[s.tone] : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
        <span>Strength: <span className="text-white font-medium">{s.label}</span></span>
        <span className="text-gray-500">8+ chars · mix letters, numbers, symbols</span>
      </div>
    </div>
  );
}

function ServerAlert({ kind, children, onDismiss }) {
  if (!children) return null;
  const palette = {
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    info: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  };
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${palette[kind]} text-sm`}>
      <svg className="w-5 h-5 flex-none mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {kind === "success" ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        ) : kind === "error" ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        )}
      </svg>
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 -mr-1" aria-label="Dismiss">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SubmitButton({ children, loading, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all
        bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white
        shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      {...props}
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
// Main page
// ---------------------------------------------------------------------------

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    loading,
    recoveryActive,
    signIn,
    signUp,
    resetPasswordForEmail,
    updatePassword,
    resendConfirmation,
    signInWithProvider,
    completePasskeySignIn,
  } = useAuth();

  // ---------- Mode / URL routing ----------
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState(() => {
    if (recoveryActive) return MODES.RESET;
    if (requestedMode === "register") return MODES.REGISTER;
    if (requestedMode === "forgot") return MODES.FORGOT;
    return MODES.LOGIN;
  });

  // Sync URL ?mode= param when user toggles tabs (helpful for sharing).
  const setModeAndUrl = (next) => {
    setMode(next);
    const params = new URLSearchParams(searchParams);
    if (next === MODES.LOGIN || next === MODES.RESET || next === MODES.CHECK_EMAIL || next === MODES.RESET_SENT) {
      params.delete("mode");
    } else {
      params.set("mode", next);
    }
    setSearchParams(params, { replace: true });
    setServerError("");
    setServerSuccess("");
  };

  // Recovery event from Supabase wins over everything else.
  useEffect(() => {
    if (recoveryActive) setMode(MODES.RESET);
  }, [recoveryActive]);

  // Already-authenticated users should not see the form (except in reset).
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (mode === MODES.RESET) return; // let them finish setting their password
    const next = searchParams.get("next") || DEFAULT_NEXT;
    navigate(next, { replace: true });
  }, [user, loading, mode, navigate, searchParams]);

  // ---------- Form state ----------
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");
  const [pendingEmail, setPendingEmail] = useState(""); // for resend confirmation
  const [oauthBusy, setOauthBusy] = useState(null);     // provider id while redirecting
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const emailRef = useRef(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (serverError) setServerError("");
  };

  const markTouched = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

  // ---------- Validation per mode ----------
  const errors = useMemo(() => {
    const e = {};
    if (mode === MODES.LOGIN) {
      e.email = validateEmail(form.email);
      e.password = validatePassword(form.password);
    } else if (mode === MODES.REGISTER) {
      e.firstName = validateName(form.firstName, "First name");
      e.lastName = validateName(form.lastName, "Last name");
      e.email = validateEmail(form.email);
      e.password = validatePassword(form.password, { signup: true });
      e.confirmPassword =
        !form.confirmPassword
          ? "Please confirm your password."
          : form.confirmPassword !== form.password
          ? "Passwords don't match."
          : null;
      e.phone = validatePhone(form.phone);
    } else if (mode === MODES.FORGOT) {
      e.email = validateEmail(form.email);
    } else if (mode === MODES.RESET) {
      e.newPassword = validatePassword(form.newPassword, { signup: true });
      e.confirmNewPassword =
        !form.confirmNewPassword
          ? "Please confirm your new password."
          : form.confirmNewPassword !== form.newPassword
          ? "Passwords don't match."
          : null;
    }
    return e;
  }, [mode, form]);

  const isValid = useMemo(() => Object.values(errors).every((v) => !v), [errors]);

  // Touch every field in the current mode (used on submit).
  const touchAll = () => {
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(errors).forEach((k) => { next[k] = true; });
      return next;
    });
  };

  // ---------- Submit handlers ----------

  const handleLogin = async () => {
    setSubmitting(true);
    setServerError("");
    try {
      const { error } = await signIn({ email: form.email.trim(), password: form.password });
      if (error) {
        if ((error.message || "").toLowerCase().includes("not confirmed")) {
          setPendingEmail(form.email.trim());
          setMode(MODES.CHECK_EMAIL);
          return;
        }
        setServerError(error.message || "Login failed.");
        return;
      }
      const next = searchParams.get("next") || DEFAULT_NEXT;
      navigate(next, { replace: true });
    } catch (err) {
      setServerError(err?.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setSubmitting(true);
    setServerError("");
    try {
      const { data, error } = await signUp({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      });
      if (error) {
        setServerError(error.message || "Registration failed.");
        return;
      }
      if (data?.session) {
        // Auto-confirmed (e.g. email confirmation off) — straight in.
        const next = searchParams.get("next") || DEFAULT_NEXT;
        navigate(next, { replace: true });
        return;
      }
      // Email confirmation required.
      setPendingEmail(form.email.trim());
      setMode(MODES.CHECK_EMAIL);
    } catch (err) {
      setServerError(err?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async () => {
    setSubmitting(true);
    setServerError("");
    try {
      const { error } = await resetPasswordForEmail(form.email.trim());
      if (error) {
        setServerError(error.message || "Could not send reset email.");
        return;
      }
      setPendingEmail(form.email.trim());
      setMode(MODES.RESET_SENT);
    } catch (err) {
      setServerError(err?.message || "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setSubmitting(true);
    setServerError("");
    try {
      const { error } = await updatePassword(form.newPassword);
      if (error) {
        setServerError(error.message || "Could not update password.");
        return;
      }
      setServerSuccess("Password updated. You're signed in.");
      // Brief pause so the user sees the success state.
      setTimeout(() => {
        const next = searchParams.get("next") || DEFAULT_NEXT;
        navigate(next, { replace: true });
      }, 1200);
    } catch (err) {
      setServerError(err?.message || "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProvider = async (provider) => {
    setOauthBusy(provider);
    setServerError("");
    try {
      const { error } = await signInWithProvider(provider);
      if (error) setServerError(error.message || `${provider} sign-in failed.`);
      // Successful path navigates away; component unmounts.
    } catch (err) {
      setServerError(err?.message || `${provider} sign-in failed.`);
    } finally {
      // Browsers redirect, but if the call returns inline we restore state.
      setOauthBusy(null);
    }
  };

  const handlePasskey = async () => {
    setPasskeyBusy(true);
    setServerError("");
    try {
      // 1. Ask the server for a challenge. We pass the email if the user
      //    typed it in the login form — that lets the server build a tighter
      //    allowCredentials list. Otherwise the browser shows all discoverable
      //    credentials for this site.
      const beginRes = await axios.post(
        `${API_BASE_URL}/api/passkeys/authenticate/begin`,
        { email: form.email?.trim() || undefined }
      );
      const { options, sessionToken } = beginRes.data;

      // 2. Hand off to the browser's WebAuthn UI.
      // NOTE: @simplewebauthn/browser v10 takes the options object directly.
      // v11+ changed to { optionsJSON: options } — if you upgrade, update here.
      const assertion = await startAuthentication(options);

      // 3. Send the assertion back. The server verifies it and returns
      //    a Supabase OTP token.
      const finishRes = await axios.post(
        `${API_BASE_URL}/api/passkeys/authenticate/finish`,
        { sessionToken, response: assertion }
      );
      const { token_hash, type } = finishRes.data;

      // 4. Exchange the OTP for a real Supabase session.
      const { error } = await completePasskeySignIn({ token_hash, type });
      if (error) throw error;
      const next = searchParams.get("next") || DEFAULT_NEXT;
      navigate(next, { replace: true });
    } catch (err) {
      const data = err?.response?.data;
      setServerError(
        data?.error ||
          err?.message ||
          "Passkey sign-in failed. Try email + password, or register a passkey first."
      );
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setSubmitting(true);
    setServerError("");
    try {
      const { error } = await resendConfirmation(pendingEmail);
      if (error) {
        setServerError(error.message || "Could not resend email.");
        return;
      }
      setServerSuccess("Confirmation email sent again.");
    } catch (err) {
      setServerError(err?.message || "Could not resend email.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    touchAll();
    if (!isValid) return;
    if (mode === MODES.LOGIN) return handleLogin();
    if (mode === MODES.REGISTER) return handleRegister();
    if (mode === MODES.FORGOT) return handleForgot();
    if (mode === MODES.RESET) return handleReset();
  };

  // ---------- Render ----------
  return (
    <div className="min-h-[calc(100vh-72px)] grid lg:grid-cols-[1fr_minmax(0,520px)] gap-0">
      {/* Left brand panel — hidden on small screens */}
      <BrandPanel />

      {/* Right form panel */}
      <div className="flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md">
          {/* Tab switcher (only for login/register) */}
          {(mode === MODES.LOGIN || mode === MODES.REGISTER) && (
            <ModeTabs mode={mode} onChange={setModeAndUrl} disabled={submitting} />
          )}

          <FormHeader mode={mode} email={pendingEmail} />

          {serverError && (
            <div className="mb-4">
              <ServerAlert kind="error" onDismiss={() => setServerError("")}>
                {serverError}
              </ServerAlert>
            </div>
          )}
          {serverSuccess && (
            <div className="mb-4">
              <ServerAlert kind="success">{serverSuccess}</ServerAlert>
            </div>
          )}

          {/* SSO + passkey shortcuts (only on login & register modes) */}
          {(mode === MODES.LOGIN || mode === MODES.REGISTER) && (
            <div className="space-y-3 mb-5">
              <SocialLoginButtons
                onProvider={handleProvider}
                disabled={submitting || passkeyBusy}
                busyId={oauthBusy}
              />
              {mode === MODES.LOGIN && (
                <button
                  type="button"
                  onClick={handlePasskey}
                  disabled={submitting || passkeyBusy || oauthBusy}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                >
                  {passkeyBusy ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3 3h6l3-3v-4l-3-3" />
                    </svg>
                  )}
                  {passkeyBusy ? "Verifying…" : "Sign in with passkey"}
                </button>
              )}
              <div className="flex items-center gap-3 my-1">
                <span className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] uppercase tracking-widest text-gray-500">
                  or with email
                </span>
                <span className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* === Forms === */}
          {mode === MODES.LOGIN && (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field
                inputRef={emailRef}
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={setField}
                onBlur={markTouched}
                error={errors.email}
                touched={touched.email}
                placeholder="you@example.com"
              />
              <PasswordField
                label="Password"
                name="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={setField}
                onBlur={markTouched}
                error={errors.password}
                touched={touched.password}
                placeholder="••••••••"
              />
              <div className="flex items-center justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => setModeAndUrl(MODES.FORGOT)}
                  className="text-xs text-blue-300 hover:text-blue-200"
                >
                  Forgot password?
                </button>
              </div>
              <SubmitButton loading={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </SubmitButton>
              <p className="text-sm text-gray-400 text-center pt-2">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setModeAndUrl(MODES.REGISTER)}
                  className="text-blue-300 hover:text-blue-200 font-medium"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {mode === MODES.REGISTER && (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  inputRef={emailRef}
                  label="First name"
                  name="firstName"
                  autoComplete="given-name"
                  required
                  value={form.firstName}
                  onChange={setField}
                  onBlur={markTouched}
                  error={errors.firstName}
                  touched={touched.firstName}
                  placeholder="Ada"
                />
                <Field
                  label="Last name"
                  name="lastName"
                  autoComplete="family-name"
                  required
                  value={form.lastName}
                  onChange={setField}
                  onBlur={markTouched}
                  error={errors.lastName}
                  touched={touched.lastName}
                  placeholder="Lovelace"
                />
              </div>
              <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={setField}
                onBlur={markTouched}
                error={errors.email}
                touched={touched.email}
                placeholder="you@example.com"
              />
              <Field
                label="Phone (optional)"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={setField}
                onBlur={markTouched}
                error={errors.phone}
                touched={touched.phone}
                placeholder="+1 555 123 4567"
              />
              <div>
                <PasswordField
                  label="Password"
                  name="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={setField}
                  onBlur={markTouched}
                  error={errors.password}
                  touched={touched.password}
                  placeholder="At least 8 characters"
                />
                <PasswordStrength password={form.password} />
              </div>
              <PasswordField
                label="Confirm password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={setField}
                onBlur={markTouched}
                error={errors.confirmPassword}
                touched={touched.confirmPassword}
                placeholder="Re-enter password"
              />
              <SubmitButton loading={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </SubmitButton>
              <p className="text-xs text-gray-500 text-center">
                By creating an account, you agree to RINK's{" "}
                <Link to="/terms" className="text-blue-300 hover:text-blue-200">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-300 hover:text-blue-200">
                  Privacy Policy
                </Link>
                .
              </p>
              <p className="text-sm text-gray-400 text-center pt-1">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setModeAndUrl(MODES.LOGIN)}
                  className="text-blue-300 hover:text-blue-200 font-medium"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {mode === MODES.FORGOT && (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field
                inputRef={emailRef}
                label="Account email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={setField}
                onBlur={markTouched}
                error={errors.email}
                touched={touched.email}
                placeholder="you@example.com"
                hint="We'll send a reset link to this address."
              />
              <SubmitButton loading={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </SubmitButton>
              <button
                type="button"
                onClick={() => setModeAndUrl(MODES.LOGIN)}
                className="w-full text-center text-sm text-gray-400 hover:text-white pt-2"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {mode === MODES.RESET && (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <p className="text-sm text-gray-300 -mt-2 mb-2">
                Choose a new password to finish resetting your account.
              </p>
              <div>
                <PasswordField
                  label="New password"
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  value={form.newPassword}
                  onChange={setField}
                  onBlur={markTouched}
                  error={errors.newPassword}
                  touched={touched.newPassword}
                  placeholder="At least 8 characters"
                />
                <PasswordStrength password={form.newPassword} />
              </div>
              <PasswordField
                label="Confirm new password"
                name="confirmNewPassword"
                autoComplete="new-password"
                required
                value={form.confirmNewPassword}
                onChange={setField}
                onBlur={markTouched}
                error={errors.confirmNewPassword}
                touched={touched.confirmNewPassword}
                placeholder="Re-enter new password"
              />
              <SubmitButton loading={submitting}>
                {submitting ? "Updating…" : "Update password"}
              </SubmitButton>
            </form>
          )}

          {mode === MODES.CHECK_EMAIL && (
            <CheckEmailView
              email={pendingEmail}
              onResend={handleResend}
              onBack={() => setModeAndUrl(MODES.LOGIN)}
              busy={submitting}
            />
          )}

          {mode === MODES.RESET_SENT && (
            <ResetSentView
              email={pendingEmail}
              onBack={() => setModeAndUrl(MODES.LOGIN)}
            />
          )}

          {/* Security reassurance */}
          <div className="mt-7 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-500/5 border border-emerald-400/20">
            <svg className="w-4 h-4 mt-0.5 flex-none text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-[11px] leading-relaxed text-gray-400">
              Your data is <span className="text-gray-200 font-medium">virus-scanned, then encrypted at rest and in transit</span>,
              isolated to your account, and deletable anytime.{" "}
              <a href="/security" className="text-blue-300 hover:text-blue-200">Learn how we protect it →</a>
            </p>
          </div>

          {/* Footer link */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <Link to="/" className="hover:text-gray-300">← Back to home</Link>
            <span className="mx-2">·</span>
            <Link to="/contact" className="hover:text-gray-300">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BrandPanel() {
  return (
    <div className="hidden lg:flex relative overflow-hidden">
      {/* gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="RINK" className="h-9" />
          <span className="text-xl font-bold text-white">RINK</span>
        </Link>

        <div className="max-w-md">
          <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live forecasting platform
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Forecast your business<br />in minutes, not weeks.
          </h2>
          <p className="text-gray-300 mb-8">
            Upload time-series data and let RINK detect the cadence,
            engineer features, and generate confidence-banded forecasts —
            all from one workspace.
          </p>

          <ul className="space-y-3">
            {[
              "Auto-detect date columns and frequency",
              "Gradient-boosting models with validation metrics",
              "Multi-step forecasts with confidence bands",
              "Encrypted at rest & in transit — deleted on sign-out",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-gray-200">
                <span className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-none">
                  <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-gray-500">
          © {new Date().getFullYear()} RINK Global Services
        </div>
      </div>
    </div>
  );
}

function ModeTabs({ mode, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 mb-6">
      {[
        { id: MODES.LOGIN, label: "Sign in" },
        { id: MODES.REGISTER, label: "Create account" },
      ].map((t) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              active
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-400 hover:text-white"
            } disabled:opacity-50`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function FormHeader({ mode, email }) {
  const titles = {
    [MODES.LOGIN]: { h: "Welcome back", p: "Sign in to your RINK workspace." },
    [MODES.REGISTER]: { h: "Create your account", p: "Start forecasting in less than a minute." },
    [MODES.FORGOT]: { h: "Reset your password", p: "We'll email you a link to set a new one." },
    [MODES.RESET]: { h: "Set a new password", p: "Almost done — pick something secure." },
    [MODES.CHECK_EMAIL]: { h: "Check your inbox", p: email ? `We sent a confirmation link to ${email}.` : "We sent you a confirmation link." },
    [MODES.RESET_SENT]: { h: "Reset link sent", p: email ? `Check ${email} for the reset link.` : "Check your email for the reset link." },
  };
  const t = titles[mode];
  if (!t) return null;
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-white">{t.h}</h1>
      <p className="text-sm text-gray-400 mt-1">{t.p}</p>
    </div>
  );
}

function CheckEmailView({ email, onResend, onBack, busy }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-none">
            <svg className="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-200">
              Click the link in our email to confirm your address. After
              confirming, you'll be redirected back here and signed in.
            </p>
            {email && (
              <p className="text-xs text-gray-500 mt-2">
                Sent to <span className="text-white font-medium">{email}</span>
              </p>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onResend}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
          bg-white/5 hover:bg-white/10 text-white border border-white/10 disabled:opacity-50"
      >
        {busy ? "Resending…" : "Resend confirmation email"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-gray-400 hover:text-white"
      >
        ← Back to sign in
      </button>
    </div>
  );
}

function ResetSentView({ email, onBack }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-none">
            <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-200">
              We've sent a reset link. Click it to choose a new password — the
              link expires in an hour.
            </p>
            {email && (
              <p className="text-xs text-gray-500 mt-2">
                Sent to <span className="text-white font-medium">{email}</span>
              </p>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-gray-400 hover:text-white"
      >
        ← Back to sign in
      </button>
    </div>
  );
}
