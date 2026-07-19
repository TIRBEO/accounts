"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { appUrl } from "@tirbeo/utils";
import { createClient } from "@tirbeo/database/client";
import { Chrome, Github, Eye, EyeOff, Shield, Mail, User, Briefcase, Phone, Globe, MessageSquare, Check, Upload, AlertCircle } from "lucide-react";

const DRAFT_KEY = "tirbeo_signup_draft";
const LOGO_BUCKET = "LOGOS";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirbeo.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AVATAR_SEEDS = ["Felix", "Luna", "Milo", "Nala", "Oscar", "Pixel", "Ruby", "Sage", "Tango", "Ursa", "Willow", "Xena", "Yuki", "Zara", "Aria", "Blaze", "Cleo", "Dexter", "Ember"];
const AVATAR_URLS = AVATAR_SEEDS.map(s => `https://api.dicebear.com/7.x/adventurer/svg?seed=${s}&backgroundColor=050505,0A0A0A,111111,1A1A1A,2A2A2A`);

type Mode = "login" | "signup";
type SignupPhase = 1 | 1.5 | 2 | 3;

function Spinner({ size = 20, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span
      className="ring-spinner"
      style={{
        width: size,
        height: size,
        borderColor: dark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
        borderTopColor: dark ? "#0A0A0A" : "#ffffff",
      }}
    />
  );
}

function FullLoader({ label }: { label?: string }) {
  return (
    <div className="full-loader" role="status" aria-live="polite">
      <span className="full-loader__ring" />
      {label && <p className="full-loader__label">{label}</p>}
    </div>
  );
}

function Bird({ onDone }: { onDone?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="bird-layer" aria-hidden>
      <div className="bird-trail" />
      <div className="bird">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.5 2.5L1.5 10.2l6.9 2.7L11 19.5l3.1-6.6L21.5 2.5z" fill="url(#planeGrad)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" strokeLinejoin="round" />
          <path d="M8.4 12.9L21.5 2.5" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" strokeLinecap="round" />
          <path d="M11 19.5l-1.4-4.4 4.4 1.4" fill="rgba(255,255,255,0.18)" />
          <defs>
            <linearGradient id="planeGrad" x1="1.5" y1="2.5" x2="21.5" y2="19.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C4B5FD" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>(() =>
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signup") ? "signup" : "login"
  );
  const [phase, setPhase] = useState<SignupPhase>(1);
  const [switching, setSwitching] = useState(false);
  const [switchDir, setSwitchDir] = useState<"to-signup" | "to-login">("to-signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [phone, setPhone] = useState("");
  const [whoYouAre, setWhoYouAre] = useState("");
  const [findUs, setFindUs] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPwd, setShowPwd] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(true);
  const submittedRef = useRef(false);

  // Login one-time-code flow (separate from signup phases).
  const [loginPhase, setLoginPhase] = useState<"form" | "code">("form");
  const [birding, setBirding] = useState(false);
  const [sentStamp, setSentStamp] = useState(false);

  // Auto-dismiss the floating "sent" toast after a few seconds.
  useEffect(() => {
    if (!sentStamp) return;
    const t = setTimeout(() => setSentStamp(false), 3500);
    return () => clearTimeout(t);
  }, [sentStamp]);

  // Vibrate the card whenever a new error appears.
  const [cardShake, setCardShake] = useState(false);
  useEffect(() => {
    if (!error) return;
    setCardShake(true);
    const t = setTimeout(() => setCardShake(false), 500);
    return () => clearTimeout(t);
  }, [error]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [noAccount, setNoAccount] = useState(false);

  // Animated switch between login <-> signup. Clearing the draft + URL param
  // is what stops the "stuck on Create Account / re-redirect" glitch.
  const switchMode = useCallback((next: Mode) => {
    setSwitchDir(next === "signup" ? "to-signup" : "to-login");
    setSwitching(true);
    setError(null);
    setNotice(null);
    setTimeout(() => {
       if (next === "login") {
        try { localStorage.removeItem(DRAFT_KEY); } catch {}
        setPhase(1);
        setLoginPhase("form");
      } else {
        setPhase(1);
      }
      setMode(next);
      // Keep the URL in sync so a refresh doesn't fight the chosen mode.
      try {
        const url = new URL(window.location.href);
        if (next === "signup") url.searchParams.set("mode", "signup");
        else url.searchParams.delete("mode");
        window.history.replaceState({}, "", url.toString());
      } catch {}
      setSwitching(false);
    }, 220);
  }, []);

  // ── RESUME: server session first, then localStorage draft ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) If already authenticated, jump straight to the dashboard.
      //    Guard with a timeout so a slow/unreachable API never freezes the loader.
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(`${API}/api/users/me`, {
          credentials: "include",
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (!cancelled && res.ok) {
          window.location.href = appUrl("dashboard");
          return;
        }
      } catch {}

      // 2) Only restore a signup draft when the URL explicitly asks for signup.
      //    (Prevents a stale draft from forcing Create Account on /login.)
      const wantsSignup =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mode") === "signup";

      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!cancelled && raw && wantsSignup) {
          const d = JSON.parse(raw);
          if (d.email) setEmail(d.email);
          if (d.firstName) setFirstName(d.firstName);
          if (d.lastName) setLastName(d.lastName);
          if (d.occupation) setOccupation(d.occupation);
          if (d.phone) setPhone(d.phone);
          if (d.whoYouAre) setWhoYouAre(d.whoYouAre);
          if (d.findUs) setFindUs(d.findUs);
          if (d.selectedAvatar) setSelectedAvatar(d.selectedAvatar);
          if (d.customAvatar) setCustomAvatar(d.customAvatar);
          if (typeof d.agreeTerms === "boolean") setAgreeTerms(d.agreeTerms);
          setMode("signup");
          if (d.phase) setPhase(d.phase);
        } else if (!cancelled && !wantsSignup) {
          // Landed on /login without ?mode=signup → force clean login view.
          setMode("login");
          setPhase(1);
        }
      } catch {}
      if (!cancelled) setResuming(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist signup draft as the user progresses (login mode never persists).
  useEffect(() => {
    if (resuming) return;
    if (mode !== "signup") { try { localStorage.removeItem(DRAFT_KEY); } catch {} return; }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        phase, email, firstName, lastName, occupation, phone,
        whoYouAre, findUs, selectedAvatar, customAvatar, agreeTerms,
      }));
    } catch {}
  }, [resuming, mode, phase, email, firstName, lastName, occupation, phone, whoYouAre, findUs, selectedAvatar, customAvatar, agreeTerms]);

  // Upload a custom avatar to the Supabase "LOGOS" bucket → returns a public URL.
  // Accepts either a File or a data URL (re-upload the bytes to storage).
  const uploadAvatarToStorage = useCallback(
    async (file: File | string, fileExt = "png"): Promise<string> => {
      let bytes: Blob;
      let contentType = "image/png";
      if (typeof file === "string") {
        const res = await fetch(file);
        bytes = await res.blob();
        contentType = bytes.type || contentType;
      } else {
        bytes = file;
        contentType = file.type || contentType;
      }
      const ext = (typeof file === "string" ? fileExt : (file.name.split(".").pop() || "png")).toLowerCase();
      const supabase = createClient();
      const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, bytes, { cacheControl: "3600", upsert: false, contentType });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("Could not get public URL");
      return data.publicUrl;
    },
    [],
  );

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB"); return; }
    if (!file.type.startsWith("image/")) { setError("Please choose an image file"); return; }

    setError(null);
    setUploadingAvatar(true);

    // Instant local preview while the upload runs.
    const previewReader = new FileReader();
    previewReader.onload = () => setCustomAvatar(previewReader.result as string);
    previewReader.readAsDataURL(file);

    try {
      const publicUrl = await uploadAvatarToStorage(file);
      setCustomAvatar(publicUrl);
      setSelectedAvatar(publicUrl);
    } catch (err: any) {
      // Fall back to the local data URL so the user can still continue.
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setCustomAvatar(url);
        setSelectedAvatar(url);
      };
      reader.readAsDataURL(file);
      setError(err?.message ? `Upload failed (${err.message}). Using local preview — will retry on save.` : "Upload failed. Using local preview — will retry on save.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadAvatarToStorage]);

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
      const msg = (await res.text()) || "Invalid credentials";
      setError(msg);
      if (res.status === 404) setNoAccount(true);
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
    if (!agreeTerms) { setError("Please accept the Terms & Privacy Policy to continue"); return; }
    setEmail(liveEmail); setPassword(livePassword); setFirstName(liveFirst); setLastName(liveLast);
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
  }, [email, password, firstName, lastName, agreeTerms, apiFetch]);

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
    if (!selectedAvatar) { setError("Choose an avatar to continue"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      // Resolve the avatar to a remote URL the DB can persist.
      let photoUrl: string | undefined;
      if (selectedAvatar.startsWith("http")) {
        photoUrl = selectedAvatar;
      } else if (selectedAvatar.startsWith("data:")) {
        // Upload never completed (or failed) — retry now so the link is stored.
        try {
          photoUrl = await uploadAvatarToStorage(selectedAvatar, "png");
          setSelectedAvatar(photoUrl);
          setCustomAvatar(photoUrl);
        } catch (err: any) {
          console.warn("[PROFILE] avatar re-upload failed:", err?.message);
        }
      }
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
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setPhase(3);
    }
  }, [firstName, lastName, phone, occupation, whoYouAre, selectedAvatar, API, uploadAvatarToStorage]);

  const handleOtpLoginRequest = useCallback(async () => {
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login-otp/request", { email });
      if (res.ok) {
        try {
          const j = await res.json().catch(() => ({}));
          if (j.devCode) setNotice(`Dev code: ${j.devCode}`);
        } catch {}
        setBirding(true);
        setSentStamp(true);
        setLoginPhase("code");
        setOtpCode("");
        return;
      }
      setError(await res.text() || "Failed to send code");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, apiFetch]);

  const handleOtpLoginResend = useCallback(async () => {
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login-otp/request", { email });
      if (res.ok) {
        try {
          const j = await res.json().catch(() => ({}));
          if (j.devCode) setNotice(`Dev code: ${j.devCode}`);
          else setNotice("A new code has been sent to your email.");
        } catch { setNotice("A new code has been sent to your email."); }
        setBirding(true);
        setSentStamp(true);
        setOtpCode("");
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

  const handleOtpLoginVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (otpCode.length < 6) { setError("Enter the 6-digit code"); return; }
    submittedRef.current = true;
    setError(null);
    setNotice(null);
    setSentStamp(false);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login-otp/verify", { email, otpCode });
      if (res.ok) {
        // Backend sets the session cookie, then sends us to the dashboard.
        window.location.href = redirectTo;
        return;
      }
      setError(await res.text() || "Invalid or expired code");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, otpCode, redirectTo, apiFetch]);

  const handleMagicLink = useCallback(async () => {
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/magic-link/request", { email });
      if (res.ok) { setNotice("Magic link sent to your email."); return; }
      setError(await res.text() || "Failed to send magic link");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, apiFetch]);

  const inputCls = "field-underline";
  const labelCls = "text-sm font-medium text-white/70";
  const fieldIcon = "absolute left-4 top-1/2 -translate-y-1/2 text-white/40";

  if (resuming) {
    return <FullLoader label="Loading your session…" />;
  }

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

      {birding && <Bird onDone={() => setBirding(false)} />}

      {sentStamp && (
        <div className="sent-toast" role="status" aria-live="polite">
          <svg className="sent-plane" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 3l-9 18-2-7-7-2 18-9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Code sent to your email</span>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle />
          <span>{error}</span>
          {noAccount && (
            <button type="button" onClick={() => switchMode("signup")}>Create one</button>
          )}
        </div>
      )}

      <div className="relative z-[9999] w-full max-w-xl">
        <div
          className={`relative p-10 overflow-y-auto rounded-[28px] ${cardShake ? "card-shake" : ""}`}
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.45)",
            maxHeight: "92vh",
          }}
        >
          <div key={mode} className={`phase-fade dir-${switchDir} ${switching ? "is-switching" : ""}`}>
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
          {mode === "login" && loginPhase === "form" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn-glass-ac">
                  <Chrome className="w-5 h-5" /> Google
                </button>
                <button type="button" onClick={handleGithubLogin} disabled={loading} className="btn-glass-ac">
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
                      onChange={(e) => { setEmail(e.target.value); setError(null); setNotice(null); setSentStamp(false); setNoAccount(false); }}
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

                {noAccount && (
                  <button type="button" onClick={() => switchMode("signup")}
                    className="text-sm text-white/90 underline underline-offset-2 hover:text-white">
                    Create one
                  </button>
                )}

                <button type="submit" disabled={loading} className="btn-primary-ac">
                  {loading ? <Spinner dark /> : "Sign In"}
                </button>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button type="button" onClick={handleOtpLoginRequest} disabled={loading} className="btn-ghost-ac">
                    Send one-time code
                  </button>
                  <button type="button" onClick={handleMagicLink} disabled={loading} className="btn-ghost-ac">
                    <Mail size={14} /> Magic link
                  </button>
                </div>
              </form>

              <div className="text-center mt-4">
                <a href="/reset-password" className="text-sm text-white/45 hover:text-white/70 transition-colors">Forgot your password?</a>
              </div>
            </>
          )}

          {/* ── LOGIN: ONE-TIME CODE ── */}
          {mode === "login" && loginPhase === "code" && (
            <form onSubmit={handleOtpLoginVerify} className="space-y-5" noValidate>
              <p className="text-white/60 text-sm">
                We sent a 6-digit code to <span className="text-white/90">{email}</span>. Enter it below to sign in.
              </p>
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
                    className="otp-box"
                  />
                ))}
              </div>


              {notice && (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#3FB950] flex-shrink-0" />
                  <p className="text-sm text-[#3FB950]">{notice}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary-ac">
                {loading ? <Spinner dark /> : "Verify & Sign In"}
              </button>

              <div className="flex items-center justify-center gap-4 pt-1">
                <button type="button" onClick={() => { setLoginPhase("form"); setOtpCode(""); setError(null); setNotice(null); setSentStamp(false); }}
                  disabled={loading} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                  Use password instead
                </button>
                <span className="text-white/15">|</span>
                <button type="button" onClick={handleOtpLoginResend} disabled={loading}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-50">
                  Resend code
                </button>
              </div>
            </form>
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
                      className="field-underline" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Last Name</label>
                  <div className="relative">
                    <div className={fieldIcon}><User size={16} /></div>
                    <input type="text" name="lastName" placeholder="Doe" value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="field-underline" />
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

              <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                <button type="button" role="checkbox" aria-checked={agreeTerms}
                  onClick={() => { setAgreeTerms((v) => !v); setError(null); }}
                  className={`check-pill mt-0.5 ${agreeTerms ? "is-checked" : ""}`}>
                  {agreeTerms && <Check size={13} strokeWidth={3} />}
                </button>
                <span className="text-xs leading-relaxed text-white/55">
                  I agree to the{" "}
                   <a href="https://docs.tirbeo.app/terms" target="_blank" rel="noreferrer" className="text-white/85 underline underline-offset-2 hover:text-white">Terms of Service</a>{" "}
                   and{" "}
                   <a href="https://docs.tirbeo.app/privacy" target="_blank" rel="noreferrer" className="text-white/85 underline underline-offset-2 hover:text-white">Privacy Policy</a>.
                </span>
              </label>


              <button type="submit" disabled={loading || !agreeTerms} className="btn-primary-ac">
                {loading ? <Spinner dark /> : "Create Account"}
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
                    className="otp-box"
                  />
                ))}
              </div>


              <button type="submit" disabled={loading} className="btn-primary-ac">
                {loading ? <Spinner dark /> : "Verify & Continue"}
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
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Choose Your Avatar</label>
                  {!selectedAvatar && <span className="text-xs text-white/40">Required</span>}
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_URLS.map((url, i) => (
                    <button key={i} type="button" onClick={() => { setSelectedAvatar(url); setError(null); }}
                      className={`avatar-tile ${selectedAvatar === url ? "is-selected" : ""}`}>
                      <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full" />
                      {selectedAvatar === url && <span className="avatar-check"><Check size={12} strokeWidth={3} /></span>}
                    </button>
                  ))}
                  {/* Upload your own */}
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                    className={`avatar-tile is-upload ${customAvatar && selectedAvatar === customAvatar ? "is-selected" : ""}`}>
                    {uploadingAvatar ? (
                      <Spinner size={18} />
                    ) : customAvatar ? (
                      <img src={customAvatar} alt="Your photo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={18} className="text-white/50" />
                    )}
                    {selectedAvatar && selectedAvatar === customAvatar && !uploadingAvatar && (
                      <span className="avatar-check"><Check size={12} strokeWidth={3} /></span>
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


              <button type="button" onClick={handleSaveProfile} disabled={loading || uploadingAvatar || !selectedAvatar} className="btn-primary-ac">
                {loading ? <Spinner dark /> : uploadingAvatar ? <Spinner dark /> : "Continue"}
              </button>
            </div>
          )}

          {/* ── SIGNUP PHASE 3 ── */}
          {mode === "signup" && phase === 3 && (
            <div className="space-y-6 pt-2 text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-white/30 ring-4 ring-white/10">
                {selectedAvatar && <img src={selectedAvatar} alt="Your avatar" className="w-full h-full" />}
              </div>
              <div>
                <p className="text-white text-lg font-semibold">Profile Complete</p>
                <p className="text-white/50 text-sm mt-1">
                  {firstName} {lastName} &middot; {occupation || "Member"}
                </p>
              </div>
              <button type="button" onClick={() => (window.location.href = redirectTo)} className="btn-primary-ac">
                Go to Dashboard
              </button>
            </div>
          )}

          {(mode === "login" || phase === 1) && (
            <p className="text-center text-sm text-white/50 mt-6">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => switchMode("signup")} className="text-white/85 hover:text-white font-medium transition-colors">Create one</button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("login")} className="text-white/85 hover:text-white font-medium transition-colors">Sign in</button>
                </>
              )}
            </p>
          )}
          </div>
        </div>
      </div>
    </main>
  );
}
