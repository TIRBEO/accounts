"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Check, X, Shield } from "lucide-react";
import { OTPInput } from "../components/ui/otp-input";
import { AuthLayout, Brand, SecurityFooter } from "../components/auth-layout";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import OAuthButtons from "../components/oauth-buttons";
import { apiPost, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";
import { useAccountsConfig } from "../lib/use-accounts-config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { config, loaded } = useAccountsConfig();
  const [step, setStep] = useState<"welcome" | "verify" | "password" | "mfa">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [captchaRayId, setCaptchaRayId] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailValid = EMAIL_RE.test(normalizedEmail);
  const oauthEnabled = config.oauth && (config.oauth.google?.enabled || config.oauth.github?.enabled || config.oauth.discord?.enabled);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || loading) return;
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/login-otp/request", { email: normalizedEmail });
      setCountdown(30);
      setSuccess(`Verification code sent to ${normalizedEmail}`);
      setStep("verify");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Failed to send code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || loading) return;
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/login-otp/verify", { email: normalizedEmail, otpCode: otp });
      setStep("password");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Invalid code."));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("auth/login", { email: normalizedEmail, password, captchaRayId });
      if (data?.needs2FA) {
        setTempToken(data.tempToken);
        setStep("mfa");
      } else {
        setSuccess("Signed in!");
        setTimeout(() => (window.location.href = getRedirectUrl()), 1000);
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Sign in failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || loading) return;
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/verify-2fa", { tempToken, code: otp });
      setSuccess("Signed in!");
      setTimeout(() => (window.location.href = getRedirectUrl()), 1000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Verification failed."));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setCountdown(30);
    setSuccess("");
    try {
      await apiPost("auth/login-otp/request", { email: normalizedEmail });
      setSuccess("New code sent!");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Failed to resend."));
    }
  };

  const titles: Record<string, string> = {
    welcome: config.ui.welcomeTitle || "Sign in",
    verify: "Check your email",
    password: "Enter your password",
    mfa: "Verify it's you",
  };
  const subtitles: Record<string, string> = {
    welcome: config.ui.welcomeSubtitle || "Enter your email to continue.",
    verify: `We sent a 6-digit code to ${normalizedEmail}`,
    password: `Continue with ${normalizedEmail}`,
    mfa: "Enter the code from your authenticator.",
  };

  return (
    <AuthLayout>
      <div style={{ width: "100%", maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}><Brand /></div>
        <motion.div
          className="auth-card"
          style={{ padding: 48 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          suppressHydrationWarning
        >
          <span className="kicker">Welcome</span>
          <h1 className="auth-title mt-3">
            {titles[step]}
          </h1>
          <p className="mb-8 mt-1 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            {subtitles[step]}
          </p>

          {success && <div className="auth-message auth-message-success"><Check size={16} style={{ marginTop: 2 }} />{success}</div>}
          {error && <div className="auth-message auth-message-error"><Shield size={16} style={{ marginTop: 2 }} />{error}</div>}

          {step === "welcome" && loaded && (
            <>
              {oauthEnabled && (
                <div style={{ marginBottom: 24 }}>
                  <OAuthButtons redirect={config.ui?.helpLink} />
                </div>
              )}
              <div className="auth-divider"><span className="auth-divider-text">or continue with email</span></div>
              <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="form-group">
                  <label className="form-label required">Email address</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      autoFocus
                      style={{ paddingRight: 48, borderColor: email ? (emailValid ? "var(--success)" : "var(--error)") : undefined }}
                    />
                    {email && (
                      <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
                        {emailValid ? <Check size={20} style={{ color: "var(--success)" }} /> : <X size={20} style={{ color: "var(--error)" }} />}
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading || !emailValid}>
                  {loading ? <span className="spinner" /> : <>Continue <ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="form-group">
                <label className="form-label required">Verification code</label>
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  numDigits={6}
                  error={!!error}
                  disabled={loading}
                  className="otp-input-container"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? <span className="spinner" /> : <>Verify <ArrowRight size={18} /></>}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" onClick={() => setStep("welcome")} className="auth-back">← Back</button>
                <button type="button" onClick={handleResend} disabled={countdown > 0 || loading} className="auth-link" style={{ fontSize: 13 }}>
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="form-group">
                <label className="form-label required">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoFocus
                    style={{ paddingRight: 56 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <CaptchaWidget onSuccess={(id) => setCaptchaRayId(id)} />
              <button type="submit" className="btn-primary" disabled={loading || !password || !captchaRayId}>
                {loading ? <span className="spinner" /> : <>Sign in <ArrowRight size={18} /></>}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" onClick={() => setStep("welcome")} className="auth-back">← Back</button>
                <a href="/forgot-password" className="auth-link" style={{ fontSize: 13 }}>Forgot password?</a>
              </div>
            </form>
          )}

          {step === "mfa" && (
            <form onSubmit={handleMfaSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8 }}>
                <Shield size={18} style={{ color: "var(--text-secondary)" }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Enter the 6-digit code from your authenticator app.</span>
              </div>
              <div className="form-group">
                <label className="form-label required">Authenticator code</label>
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  numDigits={6}
                  error={!!error}
                  disabled={loading}
                  className="otp-input-container"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? <span className="spinner" /> : <>Verify & sign in <ArrowRight size={18} /></>}
              </button>
              <button type="button" onClick={() => setStep("welcome")} className="auth-back">← Back to email</button>
            </form>
          )}

          <div className="auth-footer">
            <a href="/signup" className="auth-link">Don't have an account? Sign up</a>
          </div>
          <p className="auth-footer-text">
            By continuing, you agree to the <a href={config.ui.termsLink}>Terms of Service</a> and <a href={config.ui.privacyLink}>Privacy Policy</a>.
          </p>
          <SecurityFooter />
        </motion.div>
      </div>
    </AuthLayout>
  );
}
