"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import { apiPost, ApiError } from "../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [captchaRayId, setCaptchaRayId] = useState("");
  const emailValid = EMAIL_RE.test(email.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    if (!captchaRayId) { setError("Please complete the CAPTCHA."); return; }
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/password-reset/request", { email: email.trim().toLowerCase(), captchaRayId });
      setSuccess(`Reset link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--bg-muted)" }}>
        <Mail size={20} />
      </div>

      {success && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--success) 45%, var(--border))",
            background: "color-mix(in srgb, var(--success) 7%, var(--bg-surface))",
            color: "var(--success)",
          }}
        >
          <p className="leading-5">{success}</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--error) 45%, var(--border))",
            background: "color-mix(in srgb, var(--error) 7%, var(--bg-surface))",
            color: "var(--error)",
          }}
        >
          <p className="leading-5">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className="form-label required">Email address</label>
          <div className="relative">
            <input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoFocus
              autoComplete="email"
              aria-invalid={!!email && !emailValid}
              className="!pr-12"
              style={{
                borderColor: email ? (emailValid ? "var(--success, #22c55e)" : "var(--error)") : undefined,
              }}
            />
            {email && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailValid ? (
                  <ArrowRight size={18} style={{ color: "var(--success, #22c55e)" }} />
                ) : (
                  <span className="text-xs font-semibold" style={{ color: "var(--error)" }}>!</span>
                )}
              </div>
            )}
          </div>
          {!emailValid && email && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--error)" }} role="alert">
              Enter a valid email address.
            </p>
          )}
        </div>

        <CaptchaWidget onSuccess={(id) => setCaptchaRayId(id)} />

        <button type="submit" className="btn-primary" disabled={loading || !emailValid || !captchaRayId}>
          {loading ? "Sending..." : <>Send reset link <ArrowRight size={17} /></>}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-center">
        <a href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-60" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={14} />
          Back to sign in
        </a>
      </div>
    </AuthShell>
  );
}
