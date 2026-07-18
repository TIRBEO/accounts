"use client";

import { useState, useCallback, useRef } from "react";
import { appUrl } from "@tirbeo/utils";
import { Chrome, Github, Eye, EyeOff, Loader2, Shield, Mail, User, Briefcase, Phone, Globe, MessageSquare } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirbeo.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AVATAR_SEEDS = ["Felix", "Luna", "Milo", "Nala", "Oscar", "Pixel", "Ruby", "Sage", "Tango", "Ursa", "Willow", "Xena", "Yuki", "Zara", "Aria", "Blaze", "Cleo", "Dexter", "Ember"];
const AVATAR_URLS = AVATAR_SEEDS.map(s => `https://api.dicebear.com/7.x/adventurer/svg?seed=${s}&backgroundColor=050505,0A0A0A,111111,1A1A1A,2A2A2A`);

type Mode = "login" | "signup";
type SignupPhase = 1 | 1.5 | 2 | 3;

function Spinner() {
  return <Loader2 className="w-5 h-5 animate-spin" />;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>(() =>
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signup") ? "signup" : "login"
  );
  const [phase, setPhase] = useState<SignupPhase>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [phone, setPhone] = useState("");
  const [whoYouAre, setWhoYouAre] = useState("");
  const [findUs, setFindUs] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_URLS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPwd, setShowPwd] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setCustomAvatar(url);
      setSelectedAvatar(url);
    };
    reader.readAsDataURL(file);
  }, []);

  const redirectTo = appUrl("dashboard");

  const apiFetch = useCallback(async (path: string, body: Record<string, unknown>) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") throw new Error("Request timed out. Check your connection.");
      throw new Error(err?.message || "Network request failed");
    }
  }, []);

  const handleGoogleLogin = useCallback(() => { window.location.href = `${API}/auth/google`; }, []);
  const handleGithubLogin = useCallback(() => { window.location.href = `${API}/auth/github`; }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", { email, password });
      if (res.ok) { window.location.href = redirectTo; return; }
      setError(await res.text() || "Invalid credentials");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, password, redirectTo, apiFetch]);

  const handleSignupSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const liveEmail = (fd.get("email") as string) || email;
    const livePassword = (fd.get("password") as string) || password;
    const liveFirst = (fd.get("firstName") as string) || firstName;
    const liveLast = (fd.get("lastName") as string) || lastName;
    if (!EMAIL_RE.test(liveEmail)) { setError("Enter a valid email address"); return; }
    if (livePassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const name = [liveFirst, liveLast].filter(Boolean).join(" ").trim() || liveEmail.split("@")[0];
      const res = await apiFetch("/api/auth/signup-otp/request", { email: liveEmail, password: livePassword, name });
      if (res.ok) {
        setPhase(1.5);
        return;
      }
      setError(await res.text() || "Failed to send verification code");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, password, firstName, lastName, apiFetch]);

  const handleResendOtp = useCallback(async () => {
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/signup-otp/request", { email });
      if (res.ok) {
        try { const j = await res.json().catch(() => ({})); if (j.devCode) setError(`Dev code: ${j.devCode}`); } catch {}
        return;
      }
      setError(await res.text() || "Failed to resend code");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, apiFetch]);

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (otpCode.length < 6) { setError("Enter the 6-digit code"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const name = [firstName, lastName].filter(Boolean).join(" ").trim() || email.split("@")[0];
      const res = await apiFetch("/api/auth/signup", { email, password, name, otpCode });
      if (res.ok) {
        setPhase(2);
        return;
      }
      setError(await res.text() || "Signup failed");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, password, firstName, lastName, otpCode, apiFetch]);

  const handleSaveProfile = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);
    try {
      // Only send a remote URL for the avatar; custom data-URL uploads are
      // kept client-side so we never hit the storage bucket / Cloudflare limit.
      const photoUrl = selectedAvatar.startsWith("http") ? selectedAvatar : undefined;
      const res = await fetch(`${API}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: [firstName, lastName].filter(Boolean).join(" ").trim() || undefined,
          phoneNumber: phone || undefined,
          occupation: occupation || whoYouAre || undefined,
          photoUrl,
        }),
      });
      if (!res.ok) {
        console.warn("[PROFILE] save failed:", await res.text().catch(() => "unknown"));
      }
    } catch (err: any) {
      console.warn("[PROFILE] save error:", err?.message);
    } finally {
      setLoading(false);
      submittedRef.current = false;
      // Account is already created — never trap the user on this step.
      setPhase(3);
    }
  }, [firstName, lastName, phone, occupation, whoYouAre, selectedAvatar, API]);

  const handleOtpLogin = useCallback(async () => {
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login-otp/request", { email });
      if (res.ok) { window.location.href = redirectTo; return; }
      setError(await res.text() || "Failed to send code");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, redirectTo, apiFetch]);

  const handleMagicLink = useCallback(async () => {
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/magic-link/request", { email });
      if (res.ok) { alert("Magic link sent to your email."); return; }
      setError(await res.text() || "Failed to send magic link");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, apiFetch]);

  const inputCls =
    "w-full bg-transparent border-0 border-b border-white/15 rounded-none h-12 pl-11 pr-4 text-white placeholder:text-white/30 focus:border-white/40 focus:ring-0 outline-none text-sm transition-all duration-200";
  const labelCls = "text-sm font-medium text-white/70";
  const fieldIcon = "absolute left-4 top-1/2 -translate-y-1/2 text-white/40";

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/login-hero.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="noise-overlay" />
      <div className="pointer-events-none fixed inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />

      <div className="relative z-10 w-full max-w-xl">
        <div
          className="relative p-10 overflow-y-auto rounded-[28px]"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.45)",
            maxHeight: "92vh",
          }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {mode === "login" ? "Welcome to Tirbeo" : phase === 1.5 ? "Verify Your Email" : phase === 2 ? "Configure Your Studio" : phase === 3 ? "Finalize Your Profile" : "Create an Account"}
            </h1>
            <p className="text-white/60 text-sm mt-2">
              {mode === "login"
                ? "Sign in to access your workspace"
                : phase === 1.5
                ? `We sent a verification code to ${email}`
                : phase === 2
                ? "Tell us a bit about yourself."
                : phase === 3
                ? "You're all set. Ready to explore Tirbeo."
                : "Sign up to get started."}
            </p>
          </div>

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={handleGoogleLogin} disabled={loading}
                  className="flex items-center justify-center gap-2.5 bg-black rounded-2xl px-4 py-3 text-sm font-medium text-white hover:bg-black/80 transition-all duration-250 disabled:opacity-40">
                  <Chrome className="w-5 h-5" /> Google
                </button>
                <button type="button" onClick={handleGithubLogin} disabled={loading}
                  className="flex items-center justify-center gap-2.5 bg-black rounded-2xl px-4 py-3 text-sm font-medium text-white hover:bg-black/80 transition-all duration-250 disabled:opacity-40">
                  <Github className="w-5 h-5" /> GitHub
                </button>
              </div>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs font-medium text-white/35 uppercase tracking-widest">Or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <div className={fieldIcon}><Mail size={16} /></div>
                    <input type="email" placeholder="hello@example.com" value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      className={inputCls} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <div className={fieldIcon}><Shield size={16} /></div>
                    <input type={showPwd ? "text" : "password"} name="password" placeholder="8+ characters" value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className={inputCls} />
                    <button type="button" onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#E45D5D] flex-shrink-0" />
                    <p className="text-sm text-[#E45D5D]">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-12 bg-black text-white font-semibold rounded-2xl border-0 hover:bg-black/80 active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <Spinner /> : "Sign In"}
                </button>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button type="button" onClick={handleOtpLogin} disabled={loading}
                    className="w-full h-11 rounded-2xl bg-black text-sm font-medium text-white/80 hover:bg-black/80 transition-all disabled:opacity-50">
                    Send one-time code
                  </button>
                  <button type="button" onClick={handleMagicLink} disabled={loading}
                    className="w-full h-11 rounded-2xl bg-black text-sm font-medium text-white/80 hover:bg-black/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <Mail size={14} /> Sign in with magic link
                  </button>
                </div>
              </form>

              <div className="text-center mt-4">
                <a href="/reset-password" className="text-sm text-white/45 hover:text-white/70 transition-colors">Forgot your password?</a>
              </div>
            </>
          )}

          {/* ── SIGNUP PHASE 1 ── */}
          {mode === "signup" && phase === 1 && (
            <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>First Name</label>
                  <div className="relative">
                    <div className={fieldIcon}><User size={16} /></div>
                    <input type="text" name="firstName" placeholder="John" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-white/15 rounded-none h-12 pl-11 pr-4 text-white placeholder:text-white/30 focus:border-white/40 focus:ring-0 outline-none text-sm transition-all duration-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Last Name</label>
                  <div className="relative">
                    <div className={fieldIcon}><User size={16} /></div>
                    <input type="text" name="lastName" placeholder="Doe" value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-white/15 rounded-none h-12 pl-11 pr-4 text-white placeholder:text-white/30 focus:border-white/40 focus:ring-0 outline-none text-sm transition-all duration-200" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Email</label>
                <div className="relative">
                  <div className={fieldIcon}><Mail size={16} /></div>
                  <input type="email" name="email" placeholder="hello@example.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className={inputCls} />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <div className={fieldIcon}><Shield size={16} /></div>
                  <input type={showPwd ? "text" : "password"} placeholder="8+ characters" value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className={inputCls} />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#E45D5D] flex-shrink-0" />
                  <p className="text-sm text-[#E45D5D]">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-12 bg-black text-white font-semibold rounded-2xl border-0 hover:bg-black/80 active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <Spinner /> : "Create Account"}
              </button>
            </form>
          )}

          {/* ── SIGNUP PHASE 1.5 — VERIFY EMAIL ── */}
          {mode === "signup" && phase === 1.5 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
              <div className="flex gap-3 justify-center" onPaste={(e) => {
                const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                if (text) {
                  e.preventDefault();
                  setOtpCode(text);
                  setError(null);
                  const inputs = (e.currentTarget as HTMLDivElement).querySelectorAll("input");
                  inputs?.[Math.min(text.length, 5)]?.focus();
                }
              }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpCode[i] || ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(-1);
                      const next = otpCode.split("");
                      next[i] = v;
                      const joined = next.join("").slice(0, 6);
                      setOtpCode(joined);
                      setError(null);
                      if (v && i < 5) {
                        const inputs = (e.target as HTMLInputElement).parentElement?.querySelectorAll("input");
                        inputs?.[i + 1]?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                        const inputs = (e.target as HTMLInputElement).parentElement?.querySelectorAll("input");
                        inputs?.[i - 1]?.focus();
                      }
                    }}
                    className="w-12 h-14 rounded-xl border border-white/15 bg-transparent text-white text-xl font-semibold text-center outline-none focus:border-white/40 transition-all duration-200"
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#E45D5D] flex-shrink-0" />
                  <p className="text-sm text-[#E45D5D]">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-12 bg-black text-white font-semibold rounded-2xl border-0 hover:bg-black/80 active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <Spinner /> : "Verify & Continue"}
              </button>

              <button type="button" onClick={handleResendOtp} disabled={loading}
                className="w-full text-center text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-50">
                Resend code
              </button>
            </form>
          )}

          {/* ── SIGNUP PHASE 2 ── */}
          {mode === "signup" && phase === 2 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <label className={labelCls}>Choose Your Avatar</label>
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_URLS.map((url, i) => (
                    <button key={i} type="button" onClick={() => setSelectedAvatar(url)}
                      className={`w-full aspect-square rounded-full overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${selectedAvatar === url ? "border-white ring-2 ring-white/30 scale-105" : "border-white/15 hover:border-white/30"}`}>
                      <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full" />
                    </button>
                  ))}
                  {/* Upload your own */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className={`w-full aspect-square rounded-full overflow-hidden border-2 border-dashed flex items-center justify-center transition-all duration-300 hover:scale-105 ${customAvatar && selectedAvatar === customAvatar ? "border-white ring-2 ring-white/30 scale-105" : "border-white/20 hover:border-white/40"}`}>
                    {customAvatar ? (
                      <img src={customAvatar} alt="Your photo" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-white/50" />
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                {/* Occupation — dropdown (frosted) */}
                <div className="space-y-2">
                  <label className={labelCls}>Occupation</label>
                  <div className="relative">
                    <div className={fieldIcon}><Briefcase size={16} /></div>
                    <select value={occupation} onChange={(e) => setOccupation(e.target.value)}
                      className="w-full appearance-none border-0 border-b border-white/15 rounded-none h-12 pl-11 pr-10 text-white text-sm outline-none focus:border-white/40 transition-all duration-200"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <option value="" disabled className="bg-[#0A0A0A]">Select your role</option>
                      <option value="Designer" className="bg-[#0A0A0A]">Designer</option>
                      <option value="Developer" className="bg-[#0A0A0A]">Developer</option>
                      <option value="Engineer" className="bg-[#0A0A0A]">Engineer</option>
                      <option value="Founder / CEO" className="bg-[#0A0A0A]">Founder / CEO</option>
                      <option value="Product Manager" className="bg-[#0A0A0A]">Product Manager</option>
                      <option value="Content Creator" className="bg-[#0A0A0A]">Content Creator</option>
                      <option value="Student" className="bg-[#0A0A0A]">Student</option>
                      <option value="Other" className="bg-[#0A0A0A]">Other</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">▾</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Phone Number</label>
                  <div className="relative">
                    <div className={fieldIcon}><Phone size={16} /></div>
                    <input type="tel" placeholder="+977 98XXXXXXXX" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>Who you are</label>
                  <div className="relative">
                    <div className={fieldIcon}><MessageSquare size={16} /></div>
                    <input type="text" placeholder="A short bio about yourself" value={whoYouAre}
                      onChange={(e) => setWhoYouAre(e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                {/* Where did you find us — dropdown (frosted) */}
                <div className="space-y-2">
                  <label className={labelCls}>Where did you find us?</label>
                  <div className="relative">
                    <div className={fieldIcon}><Globe size={16} /></div>
                    <select value={findUs} onChange={(e) => setFindUs(e.target.value)}
                      className="w-full appearance-none border-0 border-b border-white/15 rounded-none h-12 pl-11 pr-10 text-white text-sm outline-none focus:border-white/40 transition-all duration-200"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <option value="" disabled className="bg-[#0A0A0A]">Choose an option</option>
                      <option value="Google" className="bg-[#0A0A0A]">Google</option>
                      <option value="Friend" className="bg-[#0A0A0A]">Friend</option>
                      <option value="Social Media" className="bg-[#0A0A0A]">Social Media</option>
                      <option value="Newsletter" className="bg-[#0A0A0A]">Newsletter</option>
                      <option value="Event" className="bg-[#0A0A0A]">Event</option>
                      <option value="Other" className="bg-[#0A0A0A]">Other</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">▾</div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#E45D5D] flex-shrink-0" />
                  <p className="text-sm text-[#E45D5D]">{error}</p>
                </div>
              )}

              <button type="button" onClick={handleSaveProfile} disabled={loading}
                className="w-full h-12 bg-black text-white font-semibold rounded-2xl border-0 hover:bg-black/80 active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <Spinner /> : "Continue"}
              </button>
            </div>
          )}

          {/* ── SIGNUP PHASE 3 ── */}
          {mode === "signup" && phase === 3 && (
            <div className="space-y-6 pt-2 text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-white/30 ring-4 ring-white/10">
                <img src={selectedAvatar} alt="Your avatar" className="w-full h-full" />
              </div>
              <div>
                <p className="text-white text-lg font-semibold">Profile Complete</p>
                <p className="text-white/50 text-sm mt-1">
                  {firstName} {lastName} &middot; {occupation || "Member"}
                </p>
              </div>
              <button type="button" onClick={() => (window.location.href = redirectTo)}
                className="w-full h-12 bg-black text-white font-semibold rounded-2xl border-0 hover:bg-black/80 active:scale-[0.98] transition-all duration-250 flex items-center justify-center gap-2">
                Go to Dashboard
              </button>
            </div>
          )}

          <p className="text-center text-sm text-white/50 mt-6">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <a href="/register" className="text-white/80 hover:text-white font-medium transition-colors">Create one</a>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <a href="/login" className="text-white/80 hover:text-white font-medium transition-colors">Sign in</a>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
