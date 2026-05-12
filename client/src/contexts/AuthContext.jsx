import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import supabase from "../supabaseClient";
import API_BASE_URL from "../config";

// ---------------------------------------------------------------------------
// Idle-timeout configuration
// ---------------------------------------------------------------------------
//
// A user's session is considered active for at most IDLE_TIMEOUT_MS of
// real-world inactivity. Each user-driven event (mousedown, keydown, scroll,
// touch, click, focus) resets the activity stamp. A periodic interval checks
// the stamp; if it has aged past the timeout, we sign the user out.
//
// The activity stamp lives in localStorage so it's shared across tabs of the
// same browser and survives page reloads.
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;     // 4 hours
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;       // re-check every 60 s
const ACTIVITY_THROTTLE_MS = 30 * 1000;         // write at most once every 30 s
const LS_KEY_LAST_ACTIVITY = "rink:lastActivity";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click", "focus"];

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readLastActivity() {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(LS_KEY_LAST_ACTIVITY);
  const n = parseInt(raw || "", 10);
  return Number.isFinite(n) ? n : Date.now();
}

function writeLastActivity(ts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY_LAST_ACTIVITY, String(ts));
}

function clearLastActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY_LAST_ACTIVITY);
}

// Best-effort DELETE /api/user-data using the freshest access token. We bypass
// the project's axios instance to avoid any import-cycle weirdness during
// sign-out, and to control the timeout precisely.
async function wipeServerData(token) {
  if (!token) return false;
  try {
    await axios.delete(`${API_BASE_URL}/api/user-data`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    return true;
  } catch (err) {
    console.warn("[auth] failed to wipe server data on logout:", err?.message || err);
    return false;
  }
}

// Best-effort POST /api/welcome-email. Returns true on success so the caller
// can flip the welcome_sent metadata flag.
async function sendWelcomeEmail(token) {
  if (!token) return false;
  try {
    await axios.post(
      `${API_BASE_URL}/api/welcome-email`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
    );
    return true;
  } catch (err) {
    // 503 = email service not configured — that's fine, just skip silently.
    const status = err?.response?.status;
    if (status !== 503) {
      console.warn("[auth] welcome email failed:", err?.message || err);
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryActive, setRecoveryActive] = useState(false);

  // Latest access token in a ref so the idle interval can read it without
  // re-subscribing every state change.
  const tokenRef = useRef(null);
  const signingOutRef = useRef(false);

  useEffect(() => {
    tokenRef.current = session?.access_token || null;
  }, [session]);

  // -------------------------------------------------------------------------
  // Initial hydration + Supabase auth listener
  // -------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const initialSession = data.session ?? null;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      // If we have a returning user but they've been idle past the threshold,
      // sign them out immediately.
      if (initialSession?.user) {
        const last = readLastActivity();
        if (Date.now() - last > IDLE_TIMEOUT_MS) {
          // Fire and forget — the caller's session is already stale.
          void enforcedSignOut("idle");
        } else {
          writeLastActivity(Date.now());
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        if (event === "PASSWORD_RECOVERY") setRecoveryActive(true);
        if (event === "SIGNED_IN") {
          writeLastActivity(Date.now());
          setRecoveryActive(false);
          // Send the welcome email once per account.
          if (newSession?.user && !newSession.user.user_metadata?.welcome_sent) {
            const token = newSession.access_token;
            sendWelcomeEmail(token).then((ok) => {
              if (!ok) return;
              supabase.auth
                .updateUser({ data: { welcome_sent: true } })
                .then(({ data }) => {
                  if (mounted && data?.user) setUser(data.user);
                })
                .catch(() => {});
            });
          }
        }
        if (event === "SIGNED_OUT") {
          clearLastActivity();
          setRecoveryActive(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Idle tracking — only active while the user is signed in.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_THROTTLE_MS) return;
      lastWrite = now;
      writeLastActivity(now);
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );
    // Initial stamp — important when the user has just signed in.
    writeLastActivity(Date.now());

    const interval = setInterval(() => {
      if (signingOutRef.current) return;
      const last = readLastActivity();
      if (Date.now() - last > IDLE_TIMEOUT_MS) {
        void enforcedSignOut("idle");
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -------------------------------------------------------------------------
  // Auth methods
  // -------------------------------------------------------------------------

  const signIn = async ({ email, password }) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      writeLastActivity(Date.now());
    }
    return { data, error };
  };

  const signUp = async ({ email, password, firstName, lastName, phone }) => {
    setLoading(true);
    const displayName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    const userMetadata = {};
    if (displayName) userMetadata.display_name = displayName;
    if (firstName?.trim()) userMetadata.first_name = firstName.trim();
    if (lastName?.trim()) userMetadata.last_name = lastName.trim();
    if (phone?.trim()) userMetadata.phone = phone.trim();

    const emailRedirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userMetadata, emailRedirectTo },
    });
    setLoading(false);
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      writeLastActivity(Date.now());
    }
    return { data, error };
  };

  // Internal sign-out that always wipes server data first. ``reason`` is logged
  // so we can distinguish "user clicked Sign out" vs "session went idle".
  const enforcedSignOut = useCallback(async (reason = "manual") => {
    if (signingOutRef.current) return { error: null };
    signingOutRef.current = true;
    setLoading(true);
    try {
      const token = tokenRef.current;
      // Best-effort: tell the server to delete the user's files. Don't block
      // the actual sign-out on this — fire it with a 5s ceiling.
      await wipeServerData(token);
      clearLastActivity();
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        setRecoveryActive(false);
        if (reason === "idle") {
          // Surface why the page just navigated away.
          console.info("[auth] signed out due to inactivity");
        }
      }
      return { error };
    } finally {
      setLoading(false);
      signingOutRef.current = false;
    }
  }, []);

  const signOut = useCallback(() => enforcedSignOut("manual"), [enforcedSignOut]);

  const resetPasswordForEmail = async (email) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { data, error };
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (data?.user) {
      setUser(data.user);
      writeLastActivity(Date.now());
    }
    return { data, error };
  };

  // Update user metadata (first_name, last_name, phone, etc).
  // Pass null for a field to clear it.
  const updateProfile = async ({ firstName, lastName, phone }) => {
    const meta = { ...(user?.user_metadata || {}) };
    if (firstName !== undefined) meta.first_name = firstName?.trim() || null;
    if (lastName !== undefined) meta.last_name = lastName?.trim() || null;
    if (phone !== undefined) meta.phone = phone?.trim() || null;
    // Recompute the combined display name when name fields change.
    if (firstName !== undefined || lastName !== undefined) {
      const combined = `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim();
      meta.display_name = combined || null;
    }
    const { data, error } = await supabase.auth.updateUser({ data: meta });
    if (data?.user) setUser(data.user);
    return { data, error };
  };

  // Trigger Supabase's "change email" flow. Supabase sends a verification
  // link to the NEW address; the change isn't effective until clicked.
  const updateEmail = async (newEmail) => {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });
    return { data, error };
  };

  const resendConfirmation = async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
      },
    });
    return { data, error };
  };

  // ----------------------------- SSO / OAuth ----------------------------
  // Triggers the Supabase OAuth flow for the chosen provider. Supabase
  // handles the entire redirect dance; on return our PASSWORD_RECOVERY /
  // SIGNED_IN listeners pick up the new session.
  const signInWithProvider = async (provider) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    return { data, error };
  };

  // ----------------------------- Passkey OTP exchange -------------------
  // After the server verifies a WebAuthn assertion it returns a hashed OTP
  // token. We complete sign-in by calling verifyOtp with that token.
  const completePasskeySignIn = async ({ token_hash, type = "magiclink" }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      writeLastActivity(Date.now());
    }
    return { data, error };
  };

  const displayName =
    user?.user_metadata?.display_name ||
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "";

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(user),
      recoveryActive,
      displayName,
      signIn,
      signUp,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      updateProfile,
      updateEmail,
      resendConfirmation,
      signInWithProvider,
      completePasskeySignIn,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, loading, recoveryActive, displayName, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
