"use client";

import { useState, useCallback } from "react";
import { AuthShell } from "../components/auth-shell";
import { ResendButton } from "../components/resend-button";
import { apiPost } from "../lib/api";
import { OTPInput } from "@tirbeo/ui";
import { Mail, Smartphone, Send, ArrowLeft } from "lucide-react";
import { getRedirectUrl } from "../lib/redirect";

const THEME = {
  primary: "#1A73E8",
  primaryHover: "#1769d2",
  text: "#202124",
  textSecondary: "#5f6368",
  border: "#dadce0",
  error: "#d93025",
  surface: "#ffffff",
};

type ResetMethod = "otp" | "magic_link";

const inputClassName = "w-full h-11 rounded-lg border border-[#dadce0] bg-white px-3.5 text-sm text-[#202124] placeholder:text-[#80868b] outline-none transition-all duration-200";
const inputFocusClassName = "focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/5 hover:border-[#9aa0a6]";
const labelClassName = "block text-sm font-medium text-[#3c4043] mb-1.5";
const errorClassName = "text-xs text-[#d93025] mt-1.5";
const primaryButtonClassName = "h-10 px-5 rounded-lg bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md";
const methodCardClassName = "flex items-center gap-3.5 p-4 rounded-xl border-2 border-[#dadce0] bg-white hover:border-[#1A73E8] hover:bg-[#f8f9fa] transition-all cursor-pointer text-left w-full group";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<ResetMethod>("otp");
  const [step, setStep] = useState<"choose_method" | "enter_email" | "verify_otp" | "sent">("choose_method");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const handleChooseMethod = useCallback((m: ResetMethod) => {
    setMethod(m);
    setStep("enter_email");
    setError("");
    setFieldError("");
  }, []);

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setFieldError("Enter an email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFieldError("Enter a valid email"); return; }
    setFieldError("");
    setLoading(true);
    setError("");

    try {
      await apiPost("auth/password-reset/request", { email: email.trim(), method });
    } catch {
      // Don't reveal if email exists
    }

    if (method === "otp") {
      setStep("verify_otp");
    } else {
      setStep("sent");
    }
    setLoading(false);
  }, [email, method]);

  const handleOtpSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) { setOtpError("Enter the 6-digit code"); return; }
    setOtpError("");
    setLoading(true);
    setError("");

    try {
      const result = await apiPost("auth/password-reset/verify", {
        email: email.trim(),
        code: otp.trim()
      });
      if (result.resetToken) {
        const url = new URL("/reset-password", window.location.origin);
        url.searchParams.set("token", result.resetToken);
        url.searchParams.set("email", email.trim());
        window.location.href = url.toString();
      } else {
        setError("Failed to verify code. Please try again.");
      }
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }, [otp, email]);

  const handleBackToMethod = useCallback(() => {
    setStep("choose_method");
    setEmail("");
    setOtp("");
    setError("");
    setFieldError("");
    setOtpError("");
  }, []);

  const handleBackToEmail = useCallback(() => {
    setStep("enter_email");
    setOtp("");
    setError("");
    setOtpError("");
  }, []);

  const handleResend = useCallback(async () => {
    setError("");
    setOtpError("");
    await apiPost("auth/password-reset/request", { email: email.trim(), method });
  }, [email, method]);

  if (step === "sent") {
    const methodLabel = method === "otp" ? "verification code" : "magic link";
    return (
      <AuthShell title="Check your email" subtitle={`We've sent a ${methodLabel} to ${email}`}>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1A73E8]/5 border border-[#1A73E8]/10">
            <Mail className="h-7 w-7 text-[#1A73E8]" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-[#5f6368]">
              If an account exists for <strong className="text-[#202124]">{email}</strong>, you'll receive a {methodLabel} shortly.
            </p>
            <p className="text-xs text-[#5f6368]">Please check your inbox and spam folder.</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={() => setStep("verify_otp")}
              className="h-10 px-5 rounded-lg bg-[#1A73E8] hover:bg-[#1769d2] text-white text-sm font-medium transition-colors">
              Enter verification code
            </button>
            <ResendButton
              onResend={handleResend}
              label={method === "otp" ? "Resend code" : "Resend magic link"}
              cooldown={30}
              className="h-10 px-5 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[#3c4043] text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <a href="/login"
              className="h-10 px-5 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[#3c4043] text-sm font-medium transition-colors inline-flex items-center justify-center">
              Back to sign in
            </a>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (step === "verify_otp") {
    return (
      <AuthShell title="Enter verification code" subtitle={`We sent a 6-digit code to ${email}`}>
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div>
            <label className={labelClassName}>Verification code</label>
            <OTPInput
              value={otp}
              onChange={v => { setOtp(v.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
              error={!!otpError}
            />
            {otpError && <p className={errorClassName}>{otpError}</p>}
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-[#d93025]">{error}</p>
            </div>
          )}
          <button type="submit" disabled={otp.length !== 6 || loading} className={primaryButtonClassName + " w-full"}>
            {loading ? "Verifying..." : "Verify code"}
          </button>
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={handleBackToEmail} disabled={loading}
              className="text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-4">
              <ResendButton
                onResend={handleResend}
                label="Resend code"
                cooldown={30}
                className="text-sm font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button type="button" onClick={handleBackToMethod} disabled={loading}
                className="text-sm font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
                Change method
              </button>
            </div>
          </div>
        </form>
      </AuthShell>
    );
  }

  if (step === "choose_method") {
    return (
      <AuthShell title="Reset your password" subtitle="Choose how you'd like to reset your password">
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleChooseMethod("otp")}
              className={methodCardClassName}>
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-[#1A73E8]/5 border border-[#1A73E8]/10 text-[#1A73E8] flex-shrink-0 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#202124]">Verification code (OTP)</p>
                <p className="text-xs text-[#5f6368] mt-0.5">Receive a 6-digit code via email to verify your identity</p>
              </div>
            </button>

            <button
              onClick={() => handleChooseMethod("magic_link")}
              className={methodCardClassName}>
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-[#1A73E8]/5 border border-[#1A73E8]/10 text-[#1A73E8] flex-shrink-0 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#202124]">Magic link</p>
                <p className="text-xs text-[#5f6368] mt-0.5">Receive a secure link to sign in and reset your password</p>
              </div>
            </button>
          </div>

          <p className="text-center text-sm text-[#5f6368] pt-2">
            <a href="/login" className="font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">Back to sign in</a>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Enter your email" subtitle={`We'll send a ${method === 'otp' ? 'verification code' : 'magic link'} to this address`}>
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className={labelClassName}>Email</label>
          <input id="reset-email" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setFieldError(""); setError(""); }}
            placeholder="you@example.com" autoFocus autoComplete="email"
            className={`${inputClassName} ${inputFocusClassName}`}
            aria-invalid={!!fieldError} />
          {fieldError && <p className={errorClassName}>{fieldError}</p>}
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-sm text-[#d93025]">{error}</p>
          </div>
        )}
        <button type="submit" disabled={!email.trim() || loading} className={primaryButtonClassName + " w-full"}>
          {loading ? "Sending..." : (method === 'otp' ? 'Send code' : 'Send magic link')}
        </button>
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={handleBackToMethod} disabled={loading}
            className="text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Change method
          </button>
          <a href="/login" className="text-sm font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
            Back to sign in
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
