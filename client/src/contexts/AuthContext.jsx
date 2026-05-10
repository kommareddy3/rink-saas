import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import supabase from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Supabase fires PASSWORD_RECOVERY when the user lands on the app via a
  // password-reset email. Components listen for this so they can render the
  // "set a new password" form.
  const [recoveryActive, setRecoveryActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        if (event === "PASSWORD_RECOVERY") setRecoveryActive(true);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          // Recovery is one-shot; clear once the user takes action.
          if (event !== "PASSWORD_RECOVERY") setRecoveryActive(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async ({ email, password }) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
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
      options: {
        data: userMetadata,
        emailRedirectTo,
      },
    });
    setLoading(false);
    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (!error) {
      setUser(null);
      setSession(null);
      setRecoveryActive(false);
    }
    return { error };
  };

  const resetPasswordForEmail = async (email) => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data, error };
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (data?.user) setUser(data.user);
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
      resendConfirmation,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, loading, recoveryActive, displayName]
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
