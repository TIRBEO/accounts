"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ApiError, apiPost, API } from "../lib/api";
import { OTPInput } from "@tirbeo/ui";
import { useAccountsConfig } from "../lib/use-accounts-config";
import { getRedirectUrl } from "../lib/redirect";
import { getDeviceFingerprint } from "../lib/fingerprint";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import { AuthShell } from "../components/auth-shell";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryBtn,
  secondaryBtn,
  textLink,
  spinnerLight,
  spinnerDark,
  InlineError,
  OrDivider,
  AuthFooterLinks,
} from "../components/auth-ui";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";

type Step = "welcome" | "password" | "mfa" | "notfound" | "provider" | "locked" | "success";

export default function LoginPage() {
  const { config } = useAccountsConfig();
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [lockedMessage, setLockedMessage] = useState("");
  const [captchaRayId, setCaptchaRayId] = useState("");
  const [captchaForceShow, setCaptchaForceShow] = useState(false);

  useEffect(() => {
    if (config.captchaForceShow) setCaptchaForceShow(true);
  }, [config.captchaForceShow]);

  const goStep = useCallback((next: Step) => {
    setStep(next);
    setError("");
    setFieldErrors({});
  }, []);

  const validateEmail = (v: string) => {
    if (!v.trim()) return "Enter your email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter a valid email address";
    return "";
  };

  const checkPasskeys = useCallback(async (value: string) => {
    try {
      const { publicKey } = await apiPost("passkey/auth/options", { email: value });
      setPasskeyCount((publicKey?.allowCredentials ?? []).length || 0);
    } catch {
      setPasskeyCount(0);
    }
  }, []);

  const handleEmailNext = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateEmail(email);
      if (err) {
        setFieldErrors({ email: err });
        return;
      }
      setLoading(true);
      setError("");
      setFieldErrors({});
      try {
        const { exists, hasPassword: hp } = await apiPost("auth/email-exists", {
          email: email.trim(),
        });
        setHasPassword(!!hp);
        if (!exists) {
          goStep("notfound");
        } else if (!hp) {
          goStep("provider");
        } else {
          goStep("password");
          checkPasskeys(email.trim());
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) setError(err.message);
        else setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, goStep, checkPasskeys]
  );

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) {
        setFieldErrors({ password: "Enter your password" });
        return;
      }
      setLoading(true);
      setError("");
      setFieldErrors({});
      try {
        const data = await apiPost("auth/login", {
          email: email.trim(),
          password,
          captchaRayId,
          fingerprint: getDeviceFingerprint(),
        });
        if (data.needs2FA) {
          setTempToken(data.tempToken);
          setOtp("");
          goStep("mfa");
        } else {
          goStep("success");
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 900);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError("Wrong password. Try again or reset it.");
          } else if (err.status === 403 && /captcha/i.test(err.message)) {
            setCaptchaForceShow(true);
            setError(err.message);
          } else if (err.status === 403) {
            setLockedMessage(err.message);
            goStep("locked");
          } else {
            setError(err.message);
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, captchaRayId, goStep]
  );

  const handleMfaSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (otp.length !== 6) {
        setError("Enter a valid 6-digit code");
        return;
      }
      setLoading(true);
      setError("");
      try {
        await apiPost("auth/verify-2fa", { tempToken, token: otp });
        goStep("success");
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 900);
      } catch (err: unknown) {
        if (err instanceof ApiError) setError(err.message || "Invalid code");
        else setError("Invalid code");
        setOtp("");
      } finally {
        setLoading(false);
      }
    },
    [otp, tempToken, goStep]
  );

  const handlePasskeyAuth = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const { publicKey, challengeNonce } = await apiPost("passkey/auth/options", {
        email: email.trim(),
      });
      const credential = await startAuthentication({ optionsJSON: publicKey });
      await apiPost("passkey/auth/verify", { credential, challengeNonce });
      goStep("success");
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 900);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message || "Passkey authentication failed");
      else setError("Passkey authentication failed");
    } finally {
      setLoading(false);
    }
  }, [email, loading, goStep]);

  const handleBackToEmail = useCallback(() => {
    setPassword("");
    setShowPassword(false);
    goStep("welcome");
  }, [goStep]);

  const handleTryAnother = useCallback(() => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    goStep("welcome");
  }, [goStep]);

  const handleOauth = (key: string) => {
    if (oauthBusy) return;
    setOauthBusy(key);
    window.location.href = `${API}/api/auth/${key}?redirect=${encodeURIComponent(getRedirectUrl())}`;
  };

  const googleIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  );
  const githubIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
  );
  const discordIcon = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="#5865F2"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
  );

  const oauthProviders = [
    { key: "google", name: "Google", enabled: config.oauth.google.enabled, icon: googleIcon },
    { key: "github", name: "GitHub", enabled: config.oauth.github.enabled, icon: githubIcon },
    { key: "discord", name: "Discord", enabled: config.oauth.discord.enabled, icon: discordIcon },
  ].filter((p) => p.enabled);

  const oauthButtons = (
    <div className="grid gap-2.5">
      {oauthProviders.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => handleOauth(p.key)}
          disabled={!!oauthBusy}
          className={secondaryBtn + " w-full"}
        >
          {oauthBusy === p.key ? <span className={spinnerDark} /> : p.icon}
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );

  const signupUrl = `/signup?redirect_to=${encodeURIComponent(getRedirectUrl())}`;
  const forgotUrl = `/forgot-password?redirect_to=${encodeURIComponent(getRedirectUrl())}`;

  const footer = (
    <AuthFooterLinks
      privacy={config.ui.privacyLink}
      terms={config.ui.termsLink}
      help={config.ui.helpLink}
    />
  );

  return (
    <AuthShell footer={footer}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          {step === "welcome" && (
            <div className="space-y-6">
              <header>
                <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-[#202124]">
                  {config.ui.welcomeTitle}
                </h1>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#5F6368]">
                  {config.ui.welcomeSubtitle}
                </p>
              </header>

              <form onSubmit={handleEmailNext} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-email" className={labelClass}>Email or username</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#80868B]" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                        setFieldErrors({});
                      }}
                      placeholder="you@example.com"
                      autoFocus
                      autoComplete="email"
                      aria-invalid={!!fieldErrors.email}
                      className={`${inputClass} !pl-11 !pr-4 ${fieldErrors.email ? inputErrorClass : ""}`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#D93025]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                <button type="submit" disabled={!email.trim() || loading} className={primaryBtn + " w-full"}>
                  {loading ? (
                    <>
                      <span className={spinnerLight} /> Checking…
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                {error && <InlineError>{error}</InlineError>}
              </form>

              {oauthProviders.length > 0 && (
                <div className="space-y-4">
                  <OrDivider label="Or continue with" />
                  {oauthButtons}
                </div>
              )}

              <p className="text-center text-sm text-[#5F6368]">
                Don&apos;t have an account?{" "}
                <a href={signupUrl} className={textLink}>Create account</a>
              </p>
            </div>
          )}

          {step === "password" && (
            <div className="space-y-6">
              <header>
                <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-[#202124]">
                  Welcome back
                </h1>
                <p className="mt-1.5 truncate text-[15px] text-[#5F6368]">{email}</p>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[#5F6368] transition-colors hover:text-[#202124]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Not you?
                </button>
              </header>

              <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-password" className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#80868B]" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                        setFieldErrors({});
                      }}
                      placeholder="Enter your password"
                      autoFocus
                      autoComplete="current-password"
                      aria-invalid={!!fieldErrors.password}
                      className={`${inputClass} !pl-11 !pr-11 ${fieldErrors.password ? inputErrorClass : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6368] transition-colors hover:text-[#202124]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#D93025]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {error && <InlineError>{error}</InlineError>}

                <CaptchaWidget
                  forceShow={captchaForceShow}
                  onSuccess={(rayId) => setCaptchaRayId(rayId)}
                  onBlocked={(rayId, reason) => {
                    setError(`Access blocked: ${reason}. Ray ID: ${rayId}`);
                  }}
                />

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    disabled={loading}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#5F6368] transition-colors hover:text-[#202124] disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={!password || loading}
                    className={primaryBtn + " min-w-[128px]"}
                  >
                    {loading ? (
                      <span className={spinnerLight} />
                    ) : (
                      <>
                        Sign in <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <a href={forgotUrl} className={textLink}>Forgot password?</a>
                </div>

                {passkeyCount > 0 && (
                  <button
                    type="button"
                    onClick={handlePasskeyAuth}
                    disabled={loading}
                    className={secondaryBtn + " w-full"}
                  >
                    <Fingerprint className="h-4 w-4 text-[#5F6368]" />
                    Use a passkey
                  </button>
                )}
              </form>
            </div>
          )}

          {step === "mfa" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FE]">
                <ShieldCheck className="h-7 w-7 text-[#1A73E8]" />
              </div>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#202124]">
                  Verify it&apos;s you
                </h1>
                <p className="mx-auto mt-1.5 max-w-[320px] text-sm leading-relaxed text-[#5F6368]">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <OTPInput value={otp} onChange={(v) => { setOtp(v); setError(""); }} error={!!error} />
                {error && <InlineError>{error}</InlineError>}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={primaryBtn + " w-full max-w-[200px]"}
                >
                  {loading ? (
                    <span className={spinnerLight} />
                  ) : (
                    <>
                      Verify <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
              <button
                type="button"
                onClick={handleBackToEmail}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#5F6368] transition-colors hover:text-[#202124]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            </div>
          )}

          {step === "notfound" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FE]">
                <UserRoundX className="h-7 w-7 text-[#1A73E8]" />
              </div>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#202124]">
                  This account doesn&apos;t exist
                </h1>
                <p className="mx-auto mt-1.5 max-w-[340px] text-sm leading-relaxed text-[#5F6368]">
                  No TIRBEO account is registered for{" "}
                  <span className="font-medium text-[#3C4043]">{email}</span>. Create one to get
                  started.
                </p>
              </div>
              <div className="space-y-2.5">
                <a href={signupUrl} className={primaryBtn + " w-full"}>
                  Create account <ArrowRight className="h-4 w-4" />
                </a>
                <button type="button" onClick={handleTryAnother} className={secondaryBtn + " w-full"}>
                  Try another email
                </button>
              </div>
            </div>
          )}

          {step === "provider" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FE]">
                <KeyRound className="h-7 w-7 text-[#1A73E8]" />
              </div>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#202124]">
                  Choose a sign-in method
                </h1>
                <p className="mx-auto mt-1.5 max-w-[340px] text-sm leading-relaxed text-[#5F6368]">
                  {email} is linked to a connected account. Continue with one of the providers
                  below.
                </p>
              </div>
              {oauthProviders.length > 0 ? (
                <div className="space-y-2.5">{oauthButtons}</div>
              ) : (
                <p className="text-sm text-[#5F6368]">
                  This account uses a sign-in method that is currently unavailable.
                </p>
              )}
              <button
                type="button"
                onClick={handleBackToEmail}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#5F6368] transition-colors hover:text-[#202124]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to email
              </button>
            </div>
          )}

          {step === "locked" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FCE8E6]">
                <Lock className="h-7 w-7 text-[#C5221F]" />
              </div>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#202124]">
                  Account locked
                </h1>
                <p className="mx-auto mt-1.5 max-w-[340px] text-sm leading-relaxed text-[#5F6368]">
                  {lockedMessage || "This account has been locked. Contact support if you believe this is a mistake."}
                </p>
              </div>
              <div className="space-y-2.5">
                <button type="button" onClick={handleTryAnother} className={primaryBtn + " w-full"}>
                  Try another account
                </button>
                <a href={config.ui.helpLink} target="_blank" rel="noreferrer" className={secondaryBtn + " w-full"}>
                  Contact support
                </a>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4EA]">
                <CheckCircle2 className="h-8 w-8 text-[#188038]" />
              </div>
              <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-[#202124]">
                You&apos;re signed in
              </h1>
              <p className="mt-1.5 text-sm text-[#5F6368]">Redirecting you to TIRBEO…</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
