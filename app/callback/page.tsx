"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, apiFetch, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";
import { ResendButton } from "../components/resend-button";

type ConsentStage = "consent" | "password" | "done";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error" | "oauth-new">("loading");
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");

  /* OAuth consent flow state */
  const [consentStage, setConsentStage] = useState<ConsentStage>("consent");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [adminDataAccess, setAdminDataAccess] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentError, setConsentError] = useState("");

  /* Add-password popup state */
  const [addPassword, setAddPassword] = useState(false);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const redirectUrl = getRedirectUrl();

  useEffect(() => {
    async function handleCallback() {
      const oauthParam = searchParams.get("oauth");
      const providerParam = searchParams.get("provider");

      if (oauthParam === "new") {
        // OAuth created a brand-new account — require policy consent first.
        setProvider(providerParam || "");
        setState("oauth-new");
        return;
      }

      try {
        const magicToken = searchParams.get("magic_token");
        const urlToken = searchParams.get("token");

        let token: string | null = null;
        if (magicToken) {
          const data = await apiPost("auth/magic-link/verify", { token: magicToken });
          token = data.token || null;
        } else if (urlToken) {
          const data = await apiPost("auth/verify", { token: urlToken });
          token = data.token || null;
        } else {
          try {
            const me = await apiFetch('/api/users/me');
            if (me.ok) {
              setState("success");
              setTimeout(() => { window.location.href = redirectUrl; }, 1000);
              return;
            }
          } catch {}
          setState("error");
          setError("Invalid callback parameters.");
          return;
        }
        setState("success");
        if (token) {
          const url = new URL(redirectUrl);
          url.searchParams.set('token', token);
          setTimeout(() => { window.location.href = url.toString(); }, 1500);
        } else {
          setTimeout(() => { window.location.href = redirectUrl; }, 1500);
        }
      } catch (err: unknown) {
        setState("error");
        if (err instanceof ApiError) setError(err.message);
        else setError("Authentication failed. The link may have expired.");
      }
    }
    handleCallback();
  }, [searchParams, redirectUrl]);

  /* Consent → record it → offer the password popup */
  const handleConsent = useCallback(async () => {
    if (!policyAccepted) {
      setConsentError("You must accept the Terms and Privacy Policy to continue.");
      return;
    }
    setSavingConsent(true);
    setConsentError("");
    try {
      await apiPost("auth/oauth-consent", {
        policyAccepted,
        adminDataAccess,
      });
      setConsentStage("done");
      setAddPassword(true); // show "add a password now or later?" popup
    } catch (err) {
      setConsentError(err instanceof ApiError ? err.message : "Couldn't save your preferences. Please try again.");
    } finally {
      setSavingConsent(false);
    }
  }, [policyAccepted, adminDataAccess]);

  /* Send the email OTP required to set a password on a passwordless account */
  const handleSendOtp = useCallback(async () => {
    setOtpSending(true);
    setPwError("");
    try {
      await apiPost("auth/email-otp/request", {});
      setOtpSent(true);
      setOtpCooldown(30);
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Couldn't send the verification code.");
    } finally {
      setOtpSending(false);
    }
  }, []);

  const handleSetPassword = useCallback(async () => {
    if (pw.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pwConfirm) {
      setPwError("Passwords don't match.");
      return;
    }
    if (!otpSent || otp.length !== 6) {
      setPwError("Enter the 6-digit verification code sent to your email.");
      return;
    }
    setPwSaving(true);
    setPwError("");
    try {
      await apiPost("security/set-password", { password: pw, otpCode: otp });
      setAddPassword(false);
      window.location.href = redirectUrl;
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Couldn't set your password.");
    } finally {
      setPwSaving(false);
    }
  }, [pw, pwConfirm, otp, otpSent, redirectUrl]);

  const skipPassword = useCallback(() => {
    window.location.href = redirectUrl;
  }, [redirectUrl]);

  if (state === "oauth-new") {
    return (
      <AuthShell title="Finish creating your account">
        {consentStage === "consent" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-muted)" }}>
              <div className="auth-icon flex h-11 w-11 shrink-0 items-center justify-center border" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">Signed in with {provider || "your provider"}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  One last step — accept the terms to finish setting up your account.
                </p>
              </div>
            </div>

            <div
              className="auth-panel border p-4"
              style={{
                borderColor: policyAccepted ? "var(--text)" : "var(--border)",
                background: "var(--bg-surface)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Terms & Privacy</p>
                  <p className="mt-1 text-sm leading-5" style={{ color: "var(--text-muted)" }}>
                    I agree to Tirbeo&apos;s{" "}
                    <a href="/terms" className="font-medium underline">Terms</a> and{" "}
                    <a href="/privacy" className="font-medium underline">Privacy Policy</a>.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={policyAccepted}
                  onClick={() => setPolicyAccepted((v) => !v)}
                  className="relative h-7 w-12 shrink-0 border transition-all"
                  style={{
                    background: policyAccepted ? "var(--text)" : "var(--bg-muted)",
                    borderColor: policyAccepted ? "var(--text)" : "var(--border)",
                  }}
                >
                  <span
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 transition-all"
                    style={{
                      left: policyAccepted ? "24px" : "3px",
                      background: policyAccepted ? "var(--bg)" : "var(--text-muted)",
                    }}
                  />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Support access</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    Allow admins to view signup details when helping you.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={adminDataAccess}
                  onClick={() => setAdminDataAccess((v) => !v)}
                  className="relative h-7 w-12 shrink-0 border transition-all"
                  style={{
                    background: adminDataAccess ? "var(--text)" : "var(--bg-muted)",
                    borderColor: adminDataAccess ? "var(--text)" : "var(--border)",
                  }}
                >
                  <span
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 transition-all"
                    style={{
                      left: adminDataAccess ? "24px" : "3px",
                      background: adminDataAccess ? "var(--bg)" : "var(--text-muted)",
                    }}
                  />
                </button>
              </div>
            </div>

            {consentError && (
              <div className="border p-3 text-sm" style={{ borderColor: "var(--error)", color: "var(--error)" }} role="alert">
                {consentError}
              </div>
            )}

            <button type="button" className="btn-primary" disabled={savingConsent || !policyAccepted} onClick={handleConsent}>
              {savingConsent ? <span className="spinner" /> : "Accept & continue"}
              {!savingConsent && <ArrowRight size={17} />}
            </button>
          </div>
        )}

        {consentStage === "done" && !addPassword && (
          <div className="mt-2 space-y-5 text-center">
            <div className="auth-icon mx-auto flex h-14 w-14 items-center justify-center border" style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--success-surface)" }}>
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Account ready. Redirecting…</p>
          </div>
        )}

        {/* Add-a-password popup */}
        {addPassword && (
          <div className="captcha-overlay" role="dialog" aria-modal="true" aria-label="Add a password">
            <div className="captcha-modal" onClick={(e) => e.stopPropagation()}>
              <div className="captcha-modal-head">
                <span className="captcha-label flex items-center gap-2"><KeyRound size={15} /> Add a password?</span>
              </div>
              <div className="captcha-modal-body">
                {!otpSent ? (
                  <>
                    <p className="text-sm leading-5" style={{ color: "var(--text-muted)" }}>
                      Adding a password lets you sign in with your email too. You can skip this and add one later from your settings.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button type="button" className="btn-secondary" onClick={skipPassword}>Later</button>
                      <button type="button" className="btn-primary" onClick={handleSendOtp} disabled={otpSending}>
                        {otpSending ? <span className="spinner" /> : "Add now"}
                      </button>
                    </div>
                    {pwError && <p className="mt-2 text-xs" style={{ color: "var(--error)" }}>{pwError}</p>}
                  </>
                ) : (
                  <form
                    onSubmit={(e) => { e.preventDefault(); void handleSetPassword(); }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="form-label">Verification code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit code"
                      />
                      <div className="mt-1.5 flex items-center justify-between">
                        <ResendButton onResend={handleSendOtp} label="Resend code" cooldown={otpCooldown} />
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Sent to your email</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">New password</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={pw}
                          onChange={(e) => setPw(e.target.value)}
                          placeholder="At least 8 characters"
                          className="!pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: "var(--text-muted)" }}
                          aria-label={showPw ? "Hide password" : "Show password"}
                        >
                          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Confirm password</label>
                      <input
                        type={showPw ? "text" : "password"}
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        placeholder="Repeat password"
                      />
                    </div>
                    {pwError && <p className="text-xs" style={{ color: "var(--error)" }}>{pwError}</p>}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button type="button" className="btn-secondary" onClick={skipPassword}>Later</button>
                      <button type="submit" className="btn-primary" disabled={pwSaving || !pw || !pwConfirm || otp.length !== 6}>
                        {pwSaving ? <span className="spinner" /> : "Save password"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthShell>
    );
  }

  if (state === "loading") {
    return (
      <AuthShell title="Signing you in...">
        <div className="flex justify-center py-6">
          <span className="spinner" />
        </div>
      </AuthShell>
    );
  }

  if (state === "success") {
    return (
      <AuthShell title="Signed in">
        <div className="mt-2 space-y-5 text-center">
          <div
            className="auth-icon mx-auto flex h-14 w-14 items-center justify-center border"
            style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--success-surface)" }}
          >
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            You have been signed in. Redirecting...
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Authentication failed">
      <div className="mt-2 space-y-5">
        <div
          className="auth-icon mx-auto flex h-14 w-14 items-center justify-center border"
          style={{ borderColor: "var(--error)", color: "var(--error)", background: "var(--error-surface)" }}
        >
          <XCircle className="h-7 w-7" />
        </div>
        <p className="text-center text-sm" style={{ color: "var(--error)" }}>{error}</p>
        <a
          href={`/login?redirect_to=${encodeURIComponent(redirectUrl)}`}
          className="btn-primary w-full"
        >
          Back to sign in <ArrowRight size={16} />
        </a>
      </div>
    </AuthShell>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<AuthShell title="Loading..."><div className="flex justify-center py-6"><span className="spinner" /></div></AuthShell>}>
      <CallbackContent />
    </Suspense>
  );
}
