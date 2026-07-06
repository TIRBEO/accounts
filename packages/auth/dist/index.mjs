"use client";

// src/index.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@tirbeo/database/client";
import { jsx } from "react/jsx-runtime";
var AuthContext = createContext(void 0);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };
  const fetchAdmin = async (userId) => {
    const { data } = await supabase.from("admin_users").select("*").eq("user_id", userId).single();
    if (data) setAdmin(data);
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        fetchAdmin(s.user.id);
      }
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
          await fetchAdmin(s.user.id);
        } else {
          setProfile(null);
          setAdmin(null);
        }
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);
  const signInWithPassword = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };
  const signInWithOtp = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message || null };
  };
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };
  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (data.user && !error) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        full_name: null,
        avatar_url: null,
        district_id: null,
        bio: null
      });
    }
    return { error: error?.message || null };
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAdmin(null);
    setSession(null);
  };
  const refreshSession = async () => {
    const { data: { session: s } } = await supabase.auth.refreshSession();
    setSession(s);
    setUser(s?.user ?? null);
  };
  const isAdmin = !!(admin && ["super_admin", "moderator"].includes(admin.role));
  const adminRole = admin?.role ?? null;
  return /* @__PURE__ */ jsx(
    AuthContext.Provider,
    {
      value: {
        user,
        profile,
        admin,
        session,
        isLoading,
        isAdmin,
        adminRole,
        signInWithPassword,
        signInWithOtp,
        signInWithGoogle,
        signUp,
        signOut,
        refreshSession
      },
      children
    }
  );
}
function useAuth() {
  const context = useContext(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
export {
  AuthProvider,
  useAuth
};
//# sourceMappingURL=index.mjs.map