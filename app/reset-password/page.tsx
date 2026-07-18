"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowLeft, Check, Loader2, Mail, Shield, KeyRound, Lock, PartyPopper } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirbeo.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FlowStep = "email" | "code" | "set-password" | "success";

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto mb-2">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i + 1 === step;
        const isDone = i + 1 < step;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              isActive ? "bg-gradient-to-br from-accent to-accent text-white shadow-lg shadow-accent/25" :
              isDone ? "bg-success/20 text-success" :
              "bg-white/5 text-white/25"
            }`}>
              {isDone ? <Check size={14} /> : i + 1}
            </div>
            <div className={`h-0.5 w-full rounded-full transition-all duration-300 ${
              isDone ? "bg-success/40" : isActive ? "bg-[#4F8CFF]/40" : "bg-white/10"
            }`} />
          </div>
        );
      })}
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");

  const [step, setStep] = useState<FlowStep>(urlToken ? "set-password" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState(urlToken || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const stepNumber = step === "email" ? 1 : step === "code" ? 2 : step === "set-password" ? 3 : 3;

  const apiFetch = useCallback(async (path: string, body: Record<string, unknown>, opts?: { noCreds?: boolean }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: opts?.noCreds ? undefined : "include",
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

  useEffect(() => {
    if (urlToken) {
      setResetToken(urlToken);
      setStep("set-password");
    }
  }, [urlToken]);

  const handleRequestReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (!EMAIL_RE.test(email)) { setError("Enter a valid email address"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/password-reset/request", { email });
      if (res.ok) {
        try { const j = await res.json(); if (j.devCode) setDevCode(j.devCode); } catch {}
        setStep("code");
        setCode("");
        return;
      }
      setError(await res.text() || "Failed to send reset email");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, apiFetch]);

  const handleVerifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (code.length < 4) { setError("Enter the code from your email"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/password-reset/verify", { email, code });
      if (res.ok) {
        const data = await res.json();
        if (data.resetToken) {
          setResetToken(data.resetToken);
          setStep("set-password");
          return;
        }
      }
      setError(await res.text() || "Invalid or expired code");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, code, apiFetch]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    submittedRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/password-reset/confirm", { email, resetToken, newPassword });
      if (res.ok) {
        setStep("success");
        return;
      }
      setError(await res.text() || "Failed to reset password. The link may have expired.");
    } catch (err: any) {
      setError(err?.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  }, [email, resetToken, newPassword, confirmPassword, apiFetch]);

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto space-y-8"
    >
      {step !== "success" && (
        <div className="flex items-center gap-4 mb-2">
          <a href="/login" className="text-white/30 hover:text-white/80 transition-colors">
            <ArrowLeft size={20} />
          </a>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {step === "email" ? "Reset Password" :
               step === "code" ? "Enter Code" :
               "Set New Password"}
            </h1>
            <p className="text-white/40 text-sm mt-2">
              {step === "email" ? "Enter your email to receive a reset code." :
               step === "code" ? `We sent a code to ${email}` :
               urlToken ? "Your link is verified. Choose a new password." :
               "Choose a strong password for your account."}
            </p>
          </div>
        </div>
      )}

      {step !== "success" && (
        <StepIndicator step={stepNumber} total={3} />
      )}

      {step === "email" && (
        <form onSubmit={handleRequestReset} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Email</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent transition-colors z-10">
                <Mail size={16} />
              </div>
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoFocus
                className="w-full bg-[#0A0A0A] border border-white/[0.06] rounded-2xl h-12 pl-11 pr-4 text-white placeholder:text-[#8A8A8A] focus:border-[#4F8CFF] focus:ring-[4px] focus:ring-[#4F8CFF]/15 outline-none text-sm transition-all duration-200"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#111111] border border-white/[0.08] text-white font-medium rounded-2xl hover:bg-[#1A1A1A] hover:border-white/[0.12] hover:shadow-[0_0_30px_rgba(79,140,255,0.12)] active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Verification Code</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent transition-colors z-10">
                <KeyRound size={16} />
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                autoFocus
                className="w-full bg-[#0A0A0A] border border-white/[0.06] rounded-2xl h-12 pl-11 pr-4 text-white placeholder:text-[#8A8A8A] focus:border-[#4F8CFF] focus:ring-[4px] focus:ring-[#4F8CFF]/15 outline-none text-sm tracking-[0.3em] font-mono transition-all duration-200"
              />
            </div>
          </div>

          {devCode && process.env.NODE_ENV === 'development' && (
            <div className="p-4 rounded-2xl bg-[#111111] border border-white/[0.06]">
              <p className="text-xs font-medium text-accent">Dev Mode &mdash; Your code: <span className="font-bold text-sm">{devCode}</span></p>
            </div>
          )}

          <div className="text-center">
            <button type="button" onClick={handleRequestReset} disabled={loading} className="text-sm text-accent/80 underline hover:text-accent transition-colors">
              Resend code
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full h-14 bg-[#111111] border border-white/[0.08] text-white font-medium rounded-2xl hover:bg-[#1A1A1A] hover:border-white/[0.12] hover:shadow-[0_0_30px_rgba(79,140,255,0.12)] active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
          </button>
        </form>
      )}

      {step === "set-password" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <PasswordInput
            label="New Password"
            placeholder="8+ characters"
            value={newPassword}
            onChange={(v) => { setNewPassword(v); setError(null); }}
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(v) => { setConfirmPassword(v); setError(null); }}
          />
          {newPassword && newPassword.length < 8 && (
            <p className="text-xs text-white/30">Password must be at least 8 characters.</p>
          )}
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-danger/80">Passwords do not match.</p>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
            className="w-full h-14 bg-[#111111] border border-white/[0.08] text-white font-medium rounded-2xl hover:bg-[#1A1A1A] hover:border-white/[0.12] hover:shadow-[0_0_30px_rgba(79,140,255,0.12)] active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
          </button>
        </form>
      )}

      {step === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-8 py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", bounce: 0.4 }}
            className="w-24 h-24 rounded-full bg-[#111111] border border-white/[0.08] flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(79,140,255,0.12)]"
          >
            <Check size={40} className="text-white" strokeWidth={3} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white">Password Reset</h2>
            <p className="text-white/40 text-sm mt-2 max-w-xs mx-auto">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center gap-4"
          >
            <a
              href="/login"
              className="w-full h-14 bg-gradient-to-r from-accent to-accent text-white font-semibold rounded-2xl hover:from-accent hover:to-accent/80 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
            >
              Go to Login
            </a>
          </motion.div>

          <ConfettiDots />
        </motion.div>
      )}
    </motion.div>
  );
}

function PasswordInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-accent transition-colors z-10">
          <Lock size={16} />
        </div>
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-white/[0.06] rounded-2xl h-12 pl-11 pr-11 text-white placeholder:text-[#8A8A8A] focus:border-[#4F8CFF] focus:ring-[4px] focus:ring-[#4F8CFF]/15 outline-none text-sm transition-all duration-200"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function ConfettiDots() {
  const colors = ["#4F8CFF", "#275d46", "#D8B36A", "#F5EFE7", "#5F7352"];
  const dots = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${5 + Math.random() * 90}%`,
    delay: Math.random() * 0.6,
    size: 4 + Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 1, y: -20, scale: 1 }}
          animate={{ opacity: 0, y: 320, scale: 0.5, rotate: 360 }}
          transition={{ duration: 1.8 + Math.random(), delay: 0.3 + d.delay, ease: "easeIn" }}
          className="absolute rounded-full"
          style={{ left: d.left, top: 0, width: d.size, height: d.size, background: d.color }}
        />
      ))}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-accent/30"
      style={{ background: "#0A0A0B" }}
    >
      <div className="noise-overlay" />
      <div className="vignette" />

      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
