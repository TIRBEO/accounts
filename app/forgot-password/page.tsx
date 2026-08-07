"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthLayout, Brand, FieldError, SecurityFooter } from "../components/auth-layout";
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
    <AuthLayout>
      <div style={{ width: "100%", maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}><Brand /></div>
        <div className="auth-card" style={{ padding: "48px" }}>
          <span className="kicker">Account recovery</span>
          <h1 className="auth-title mt-3">Forgot password</h1>
          <p className="mb-8 mt-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>Enter your email and we'll send you a reset link.</p>

          {success && <div className="auth-message auth-message-success">{success}</div>}
          {error && <div className="auth-message auth-message-error">{error}</div>}
          {!emailValid && email && <FieldError>Email is invalid</FieldError>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label required">Email address</label>
              <div style={{ position: "relative" }}>
                <input type="email" placeholder="name@company.com" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} autoFocus style={{ paddingRight: "48px", borderColor: email ? (emailValid ? "var(--success)" : "var(--error)") : undefined }} />
                {email && <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)" }}>{emailValid ? <ArrowRight size={20} style={{ color: "var(--success)" }} /> : null}</div>}
              </div>
            </div>
            <CaptchaWidget onSuccess={(id) => setCaptchaRayId(id)} />
            <button type="submit" className="btn-primary" disabled={loading || !emailValid || !captchaRayId}>{loading ? <span className="spinner" /> : <>Send reset link <ArrowRight size={18} /></>}</button>
          </form>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "24px", paddingTop: "24px", borderTop: "2px solid var(--border)" }}>
            <a href="/login" className="auth-link" style={{ fontSize: "13px" }}>&larr; Back to sign in</a>
          </div>
        </div>
        <SecurityFooter />
      </div>
    </AuthLayout>
  );
}
