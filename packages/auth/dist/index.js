"use strict";
"use client";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.tsx
var src_exports = {};
__export(src_exports, {
  AuthProvider: () => AuthProvider,
  useAuth: () => useAuth
});
module.exports = __toCommonJS(src_exports);
var import_react = require("react");
var import_client = require("@tirbeo/database/client");
var import_jsx_runtime = require("react/jsx-runtime");
var AuthContext = (0, import_react.createContext)(void 0);
function AuthProvider({ children }) {
  const [user, setUser] = (0, import_react.useState)(null);
  const [profile, setProfile] = (0, import_react.useState)(null);
  const [admin, setAdmin] = (0, import_react.useState)(null);
  const [session, setSession] = (0, import_react.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const supabase = (0, import_client.createClient)();
  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };
  const fetchAdmin = async (userId) => {
    const { data } = await supabase.from("admin_users").select("*").eq("user_id", userId).single();
    if (data) setAdmin(data);
  };
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
  const context = (0, import_react.useContext)(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthProvider,
  useAuth
});
//# sourceMappingURL=index.js.map