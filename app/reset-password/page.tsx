"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowLeft, Check, Mail, KeyRound, Lock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirbeo.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FlowStep = "email" | "code" | "set-password" | "success";

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="ring-spinner"
      style={{
        width: size,
        height: size,
        borderColor: "rgba(0,0,0,0.15)",
        borderTopColor: "#0A0A0A",
      }}
    />
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const isActive = i + 1 === step;
        const isDone = i + 1 < step;
        return (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{
              background: isDone
                ? "rgba(255,255,255,0.85)"
                : isActive
                ? "rgba(255,255,255,0.55)"
                : "rgba(255,255,255,0.12)",
            }}
          />
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

  const stepNumber = step === "email" ? 1 : step === "code" ? 2 : 3;

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

  const labelCls = "text-sm font-medium text-white/70";
  const fieldIcon = "absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10";

  const errorBlock = error && (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[#E45D5D] flex-shrink-0" />
      <p className="text-sm text-[#E45D5D]">{error}</p>
    </div>
  );

  return (
    <div key={step} className="phase-fade dir-to-signup">
      {step !== "success" && (
        <>
          <div className="mb-6 flex items-start gap-3">
            <a
              href="/login"
              className="mt-1 text-white/40 transition-colors hover:text-white"
              aria-label="Back to login"
            >
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {step === "email" ? "Reset Password" : step === "code" ? "Enter Code" : "Set New Password"}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                {step === "email"
                  ? "Enter your email to receive a reset code."
                  : step === "code"
                  ? `We sent a code to ${email}`
                  : urlToken
                  ? "Your link is verified. Choose a new password."
                  : "Choose a strong password for your account."}
              </p>
            </div>
          </div>
          <StepDots step={stepNumber} total={3} />
        </>
      )}

      {step === "email" && (
        <form onSubmit={handleRequestReset} className="space-y-6">
          <div className="space-y-2">
            <label className={labelCls}>Email</label>
            <div className="relative">
              <div className={fieldIcon}><Mail size={16} /></div>
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoFocus
                className="field-underline"
              />
            </div>
          </div>

          {errorBlock}

          <button type="submit" disabled={loading} className="btn-primary-ac">
            {loading ? <Spinner /> : "Send Reset Code"}
          </button>

          <p className="text-center text-sm text-white/50">
            Remember your password?{" "}
            <a href="/login" className="text-white/85 underline underline-offset-2 hover:text-white">Sign in</a>
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="space-y-2">
            <label className={labelCls}>Verification Code</label>
            <div className="relative">
              <div className={fieldIcon}><KeyRound size={16} /></div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                autoFocus
                className="field-underline"
                style={{ letterSpacing: "0.3em" }}
              />
            </div>
          </div>

          {devCode && process.env.NODE_ENV === "development" && (
            <p className="text-xs text-white/50">
              Dev Mode &mdash; Your code: <span className="font-semibold text-white">{devCode}</span>
            </p>
          )}

          {errorBlock}

          <button type="submit" disabled={loading || code.length < 4} className="btn-primary-ac">
            {loading ? <Spinner /> : "Verify Code"}
          </button>

          <button
            type="button"
            onClick={handleRequestReset}
            disabled={loading}
            className="btn-ghost-ac w-full"
          >
            Resend code
          </button>
        </form>
      )}

      {step === "set-password" && (
        <form onSubmit={handleResetPassword} className="space-y-6">
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
            <p className="text-xs text-white/40">Password must be at least 8 characters.</p>
          )}
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-[#E45D5D]">Passwords do not match.</p>
          )}

          {errorBlock}

          <button
            type="submit"
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
            className="btn-primary-ac"
          >
            {loading ? <Spinner /> : "Reset Password"}
          </button>
        </form>
      )}

      {step === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8 py-4 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, type: "spring", bounce: 0.45 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: "#fff",
              boxShadow: "0 10px 40px rgba(255,255,255,0.2)",
            }}
          >
            <Check size={38} className="text-black" strokeWidth={3} />
          </motion.div>

          <div>
            <h2 className="text-2xl font-semibold text-white">Password Reset</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/60">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </div>

          <a href="/login" className="btn-primary-ac inline-flex">
            Go to Login
          </a>
        </motion.div>
      )}
    </div>
  );
}

function PasswordInput({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">
          <Lock size={16} />
        </div>
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-underline"
          style={{ paddingRight: "2.5rem" }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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

      <div className="relative z-10 w-full max-w-md">
        <div
          className="relative overflow-y-auto rounded-[28px] p-10"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.45)",
            maxHeight: "92vh",
          }}
        >
          <Suspense
            fallback={
              <div className="flex h-48 items-center justify-center">
                <span className="ring-spinner" style={{ width: 32, height: 32 }} />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
