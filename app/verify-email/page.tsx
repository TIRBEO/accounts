"use client";

import { useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, Check, Mail, RefreshCw } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { OTPInput } from "../components/ui/otp-input";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"enter" | "sent">("enter");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const maskedEmail =
    email.length > 0
      ? email[0] + "••••" + (email.includes("@") ? email.substring(email.indexOf("@")) : "")
      : "";

  const handleRequest = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) { setFieldError("Enter your email"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFieldError("Enter a valid email"); return; }
      setFieldError("");
      setLoading(true);
      setError("");
      try {
        await apiPost("auth/verify-email", { email: email.trim() });
        setStep("sent");
        setMessage("");
      } catch (err: unknown) {
        if (err instanceof ApiError) setError(err.message);
        else setError("Couldn't send the verification code. Try again.");
      }
      setLoading(false);
    },
    [email]
  );

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otp.length !== 6) { setError("Enter the 6-digit verification code"); return; }
      setLoading(true);
      setError("");
      try {
        await apiPost("auth/verify-email", { email: email.trim(), code: otp });
        setMessage("Your email has been verified successfully.");
        setOtp("");
      } catch (err: unknown) {
        if (err instanceof ApiError) setError(err.message);
        else setError("Invalid or expired verification code.");
        setOtp("");
      }
      setLoading(false);
    },
    [otp, email]
  );

  const handleResend = useCallback(async () => {
    setError("");
    try {
      await apiPost("auth/verify-email", { email: email.trim() });
      setMessage("Verification code resent. Check your inbox.");
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Couldn't resend the code.");
    }
  }, [email]);

  return (
    <AuthShell
      title={step === "enter" ? "Verify your email" : "Check your email"}
      subtitle={
        step === "enter"
          ? "Enter your email to receive a verification code."
          : `We sent a 6-digit code to ${maskedEmail || "your email"}.`
      }
    >
      {step === "enter" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label htmlFor="verify-email" className="form-label required">Email address</label>
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldError(""); setError(""); }}
              placeholder="you@example.com"
              autoFocus
              autoComplete="email"
              aria-invalid={!!fieldError}
              style={{ borderColor: fieldError ? "var(--error)" : undefined }}
            />
            {fieldError && <p className="mt-1.5 text-xs" style={{ color: "var(--error)" }}>{fieldError}</p>}
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "var(--error)", color: "var(--error)", background: "var(--error-surface)" }}
            >
              {error}
            </div>
          )}
          <button type="submit" disabled={!email.trim() || loading} className="btn-primary w-full">
            {loading ? "Sending..." : "Send verification code"}
            {!loading && <ArrowRight size={17} />}
          </button>
          <p className="pt-1 text-center text-sm">
            <a href="/login" className="font-medium underline-offset-4 hover:underline" style={{ color: "var(--text)" }}>
              Back to sign in
            </a>
          </p>
        </form>
      ) : (
        <div className="space-y-5">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--border)", background: "var(--bg-muted)", color: "var(--text)" }}
          >
            <Mail className="h-6 w-6" />
          </div>
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="form-label">Verification code</label>
              <div className="mt-2 flex justify-center rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)" }}>
                <OTPInput
                  value={otp}
                  onChange={(v) => { setOtp(v.replace(/\D/g, "").slice(0, 6)); setError(""); setMessage(""); }}
                  error={!!error}
                />
              </div>
            </div>
            {error && (
              <div
                role="alert"
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "var(--error)", color: "var(--error)", background: "var(--error-surface)" }}
              >
                {error}
              </div>
            )}
            {message && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border p-3 text-sm"
                style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--success-surface)" }}
              >
                <Check size={15} /> {message}
              </div>
            )}
            <button type="submit" disabled={otp.length !== 6 || loading} className="btn-primary w-full">
              {loading ? "Verifying..." : "Verify email"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => setStep("enter")} className="auth-back">
              <ArrowLeft className="h-3.5 w-3.5" /> Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-60 disabled:opacity-40"
              style={{ color: "var(--text)" }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Resend code
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
