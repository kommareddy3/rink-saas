import React, { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription?.unsubscribe();
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
    const displayName = `${firstName} ${lastName}`.trim();
    const userMetadata = {
      display_name: displayName,
    };

    if (phone?.trim()) {
      userMetadata.phone = phone.trim();
    }

    const { data, error } = await supabase.auth.signUp(
      { email, password },
      { data: userMetadata }
    );
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
    }
    return { error };
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: Boolean(user),
        displayName,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
