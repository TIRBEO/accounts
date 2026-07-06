"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { type Profile, type AdminUser, type AdminRole } from "@tirbeo/database/types";
import { createClient } from "@tirbeo/database/client";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  admin: AdminUser | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const fetchAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setAdmin(data as AdminUser);
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
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message || null };
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (data.user && !error) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        full_name: null,
        avatar_url: null,
        district_id: null,
        bio: null,
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

  return (
    <AuthContext.Provider
      value={{
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
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
