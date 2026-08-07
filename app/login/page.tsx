"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Mail,
  Shield,
  X,
} from "lucide-react";
import { OTPInput } from "../components/ui/otp-input";
import { AuthShell } from "../components/auth-shell";

import OAuthButtons from "../components/oauth-buttons";
import { apiPost, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import { useAccountsConfig } from "../lib/use-accounts-config";

type Step = "welcome" | "verify-email" | "password" | "mfa";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* -------------------------------------------------------------------------- */
/* Field message                                                              */
/* -------------------------------------------------------------------------- */

function FieldMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p
        className="mt-2 flex items-center gap-1.5 text-xs font-medium"
        style={{ color: "var(--error)" }}
      >
        <X size={13} />
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p
        className="mt-2 flex items-center gap-1.5 text-xs font-medium"
        style={{ color: "var(--success, #22c55e)" }}
      >
        <Check size={13} />
        {success}
      </p>
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Error box                                                                  */
/* -------------------------------------------------------------------------- */

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm"
      style={{
        borderColor: "color-mix(in srgb, var(--error) 45%, var(--border))",
        background:
          "color-mix(in srgb, var(--error) 7%, var(--bg-surface))",
        color: "var(--error)",
      }}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current">
        <X size={11} />
      </div>

      <p className="leading-5">{message}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Password field                                                             */
/* -------------------------------------------------------------------------- */

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          aria-invalid={!!error}
          className="!pr-12"
          style={{
            borderColor: error ? "var(--error)" : undefined,
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition-opacity hover:opacity-60"
          style={{ color: "var(--text-muted)" }}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <FieldMessage error={error} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Login page                                                                 */
/* -------------------------------------------------------------------------- */

export default function LoginPage() {
  const { config } = useAccountsConfig();

  const [step, setStep] = useState<Step>("welcome");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(
    {}
  );

  const [loading, setLoading] = useState(false);

  const [captchaRayId, setCaptchaRayId] = useState("");
  const [captchaForceShow, setCaptchaForceShow] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  /* Account-exists state on the first step */
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [accountCheck, setAccountCheck] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "exists"; hasPassword: boolean }
    | { status: "missing" }
    | { status: "error" }
  >({ status: "idle" });
  const [accountCheckEmail, setAccountCheckEmail] = useState("");

  /* ------------------------------------------------------------------------ */
  /* Captcha                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (config.captchaForceShow) {
      setCaptchaForceShow(true);
    }
  }, [config.captchaForceShow]);

  /* ------------------------------------------------------------------------ */
  /* Resend timer                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  /* ------------------------------------------------------------------------ */
  /* Email                                                                    */
  /* ------------------------------------------------------------------------ */

  const normalizedEmail = useMemo(
    () => email.trim().toLowerCase(),
    [email]
  );

  const emailValid = EMAIL_RE.test(normalizedEmail);

  const validateEmail = useCallback((value: string) => {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return "Enter your email address.";
    }

    if (!EMAIL_RE.test(normalized)) {
      return "Enter a valid email address.";
    }

    return "";
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Account-exists check (first step)                                        */
  /* ------------------------------------------------------------------------ */

  const checkAccountExists = useCallback(
    async (value: string) => {
      const clean = value.trim().toLowerCase();
      if (!EMAIL_RE.test(clean)) return;

      setCheckingAccount(true);
      setAccountCheck({ status: "checking" });
      setAccountCheckEmail(clean);
      setError("");

      try {
        const result = await apiPost("auth/email-exists", {
          email: clean,
        });
        if (result?.exists) {
          setAccountCheck({
            status: "exists",
            hasPassword: !!result.hasPassword,
          });
        } else {
          setAccountCheck({ status: "missing" });
        }
      } catch {
        setAccountCheck({ status: "error" });
      } finally {
        setCheckingAccount(false);
      }
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Request email OTP                                                        */
  /* ------------------------------------------------------------------------ */

  const handleEmailSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const validationError = validateEmail(email);

      if (validationError) {
        setFieldErrors({ email: validationError });
        return;
      }

      // If the account doesn't exist, don't send an OTP — send to signup instead.
      if (accountCheck.status === "missing" && accountCheckEmail === normalizedEmail) {
        setError("No account found with this email. Create one instead.");
        return;
      }

      setLoading(true);
      setError("");
      setFieldErrors({});

      try {
        await apiPost("auth/login-otp/request", {
          email: normalizedEmail,
        });

        setOtp("");
        setResendSeconds(30);
        setStep("verify-email");
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(
            err.message || "Unable to send the verification code."
          );
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [accountCheck, accountCheckEmail, email, normalizedEmail, validateEmail]
  );

  /* ------------------------------------------------------------------------ */
  /* Verify email OTP                                                         */
  /* ------------------------------------------------------------------------ */

  const handleVerifyEmail = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);

      if (cleanOtp.length !== 6) {
        setError("Enter the 6-digit verification code.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        await apiPost("auth/login-otp/verify", {
          email: normalizedEmail,
          otpCode: cleanOtp,
        });

        setOtp("");
        // OAuth-only accounts have no password — the OTP verify already created
        // a session, so send them straight to their destination.
        if (accountCheck.status === "exists" && !accountCheck.hasPassword) {
          window.location.assign(getRedirectUrl());
          return;
        }
        setStep("password");
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message || "Invalid or expired code.");
        } else {
          setError("Invalid or expired verification code.");
        }

        setOtp("");
      } finally {
        setLoading(false);
      }
    },
    [accountCheck, normalizedEmail, otp]
  );

  /* ------------------------------------------------------------------------ */
  /* Password login                                                           */
  /* ------------------------------------------------------------------------ */

  const handlePasswordSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!password) {
        setFieldErrors({
          password: "Enter your password.",
        });
        return;
      }

      setFieldErrors({});
      setError("");
      setLoading(true);

      try {
        const data = await apiPost("auth/login", {
          email: normalizedEmail,
          password,
          captchaRayId,
        });

        if (data?.needs2FA) {
          setTempToken(data.tempToken);
          setOtp("");
          setStep("mfa");
        } else {
          window.location.assign(getRedirectUrl());
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError("Invalid email or password.");
          } else {
            setError(err.message || "Unable to sign you in.");
          }

          if (
            err.status === 403 &&
            /captcha/i.test(err.message || "")
          ) {
            setCaptchaForceShow(true);
          }
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [captchaRayId, normalizedEmail, password]
  );

  /* ------------------------------------------------------------------------ */
  /* MFA                                                                      */
  /* ------------------------------------------------------------------------ */

  const handleMfaSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);

      if (cleanOtp.length !== 6) {
        setError("Enter the 6-digit authentication code.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        await apiPost("auth/verify-2fa", {
          tempToken,
          code: cleanOtp,
        });

        window.location.assign(getRedirectUrl());
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(
            err.message || "Invalid authentication code."
          );
        } else {
          setError("Invalid authentication code.");
        }

        setOtp("");
      } finally {
        setLoading(false);
      }
    },
    [otp, tempToken]
  );

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const handleBackToEmail = useCallback(() => {
    setStep("welcome");
    setPassword("");
    setOtp("");
    setTempToken("");
    setError("");
    setFieldErrors({});
    setShowPassword(false);
  }, []);

  const handleBackToVerify = useCallback(() => {
    setStep("verify-email");
    setPassword("");
    setOtp("");
    setError("");
    setFieldErrors({});
    setShowPassword(false);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Resend OTP                                                               */
  /* ------------------------------------------------------------------------ */

  const handleResendOtp = useCallback(async () => {
    if (
      resendSeconds > 0 ||
      resendLoading ||
      !normalizedEmail
    ) {
      return;
    }

    setResendLoading(true);
    setError("");

    try {
      await apiPost("auth/login-otp/request", {
        email: normalizedEmail,
      });

      setResendSeconds(30);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Couldn't resend the code.");
      } else {
        setError("Couldn't resend the code. Please try again.");
      }
    } finally {
      setResendLoading(false);
    }
  }, [normalizedEmail, resendLoading, resendSeconds]);

  const signUpUrl = `/signup?redirect_to=${encodeURIComponent(
    getRedirectUrl()
  )}`;

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <AuthShell footer="By continuing, you agree to Tirbeo's terms and privacy policy.">
      {/* ==================================================================== */}
      {/* EMAIL                                                                 */}
      {/* ==================================================================== */}

      {step === "welcome" && (
        <div>
          <header className="mb-7">
            <p
              className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{ color: "var(--text-muted)" }}
            >
              Tirbeo account
            </p>

            <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[34px]">
              Welcome back
            </h1>

            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Sign in to continue to Tirbeo.
            </p>
          </header>

          <div
            className="mb-6 rounded-2xl border p-4"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-muted)",
            }}
          >
            <OAuthButtons redirect={getRedirectUrl()} />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div
              className="h-px flex-1"
              style={{ background: "var(--border)" }}
            />

            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "var(--text-muted)" }}
            >
              or continue with email
            </span>

            <div
              className="h-px flex-1"
              style={{ background: "var(--border)" }}
            />
          </div>

          <form
            onSubmit={handleEmailSubmit}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="login-email"
                className="form-label required"
              >
                Email address
              </label>

              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    const value = event.target.value;

                    setEmail(value);
                    setError("");
                    setAccountCheck({ status: "idle" });

                    const validationError = value
                      ? validateEmail(value)
                      : "";

                    setFieldErrors(
                      validationError
                        ? { email: validationError }
                        : {}
                    );
                  }}
                  onBlur={() => {
                    if (EMAIL_RE.test(email)) void checkAccountExists(email);
                  }}
                  placeholder="you@example.com"
                  autoFocus
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  className="!pr-12"
                  style={{
                    borderColor: fieldErrors.email
                      ? "var(--error)"
                      : emailValid
                        ? "var(--success, #22c55e)"
                        : undefined,
                  }}
                />

                {email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValid ? (
                      <Check
                        size={18}
                        style={{
                          color: "var(--success, #22c55e)",
                        }}
                      />
                    ) : (
                      <X
                        size={18}
                        style={{
                          color: "var(--error)",
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <FieldMessage error={fieldErrors.email} />
            </div>

            <ErrorBox message={error} />

            {accountCheck.status === "missing" &&
              accountCheckEmail === normalizedEmail && (
                <div
                  className="auth-panel border p-3.5 text-sm"
                  style={{
                    borderColor: "var(--text)",
                    background: "var(--bg-muted)",
                  }}
                >
                  <p className="font-semibold">No account found with this email.</p>
                  <p className="mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Create a Tirbeo account to get started — it takes about a
                    minute.
                  </p>
                  <a
                    href={signUpUrl}
                    className="btn-primary mt-3 !h-11 !text-[11px]"
                  >
                    Create account <ArrowRight size={15} />
                  </a>
                </div>
              )}

            <button
              type="submit"
              className="btn-primary"
              disabled={
                loading ||
                !emailValid ||
                checkingAccount ||
                (accountCheck.status === "missing" &&
                  accountCheckEmail === normalizedEmail)
              }
            >
              <span>
                {loading
                  ? "Sending code..."
                  : checkingAccount
                    ? "Checking…"
                    : "Continue"}
              </span>

              {!loading && !checkingAccount && (
                <ArrowRight size={17} />
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p
              className="text-[13px]"
              style={{ color: "var(--text-muted)" }}
            >
              Don&apos;t have an account?{" "}
              <a
                href={signUpUrl}
                className="font-semibold underline-offset-4 hover:underline"
                style={{ color: "var(--text)" }}
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VERIFY EMAIL                                                          */}
      {/* ==================================================================== */}

      {step === "verify-email" && (
        <div>
          <header className="mb-7">
            <div
              className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-muted)",
              }}
            >
              <Mail size={20} />
            </div>

            <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
              Check your email
            </h1>

            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-muted)" }}
            >
              We sent a 6-digit verification code to{" "}
              <strong style={{ color: "var(--text)" }}>
                {normalizedEmail}
              </strong>
              .
            </p>
          </header>

          <form
            onSubmit={handleVerifyEmail}
            className="space-y-5"
            noValidate
          >
            <div>
              <label className="form-label">
                Verification code
              </label>

              <div className="mt-2 flex justify-center rounded-2xl border p-5 sm:p-6">
                <OTPInput
                  value={otp}
                  onChange={(value) => {
                    setOtp(
                      value.replace(/\D/g, "").slice(0, 6)
                    );
                    setError("");
                  }}
                />
              </div>
            </div>

            <ErrorBox message={error} />

            <button
              type="submit"
              className="btn-primary"
              disabled={
                loading ||
                otp.replace(/\D/g, "").length !== 6
              }
            >
              {loading ? "Verifying..." : "Continue"}

              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={
                resendLoading || resendSeconds > 0
              }
              className="text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: "var(--text)" }}
            >
              {resendLoading
                ? "Sending..."
                : resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : "Resend code"}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASSWORD                                                              */}
      {/* ==================================================================== */}

      {step === "password" && (
        <div>
          <header className="mb-7">
            <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
              Enter your password
            </h1>

            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Continue with{" "}
              <strong style={{ color: "var(--text)" }}>
                {normalizedEmail}
              </strong>
            </p>
          </header>

          <form
            onSubmit={handlePasswordSubmit}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="login-password"
                className="form-label required"
              >
                Password
              </label>

              <PasswordField
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setError("");
                  setFieldErrors({});
                }}
                visible={showPassword}
                onToggle={() =>
                  setShowPassword((value) => !value)
                }
                error={fieldErrors.password}
              />
            </div>

            <ErrorBox message={error} />

            <CaptchaWidget
              autoShow
              forceShow={captchaForceShow}
              onSuccess={(rayId: string) => {
                setCaptchaRayId(rayId);
                setError("");
              }}
              onBlocked={(_: string, reason: string) => {
                setError(`Access blocked: ${reason}`);
              }}
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !password}
            >
              {loading ? "Signing in..." : "Sign in"}

              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToVerify}
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <a
              href="/forgot-password"
              className="text-xs font-semibold hover:opacity-60"
              style={{ color: "var(--text)" }}
            >
              Forgot password?
            </a>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MFA                                                                   */}
      {/* ==================================================================== */}

      {step === "mfa" && (
        <div>
          <header className="mb-7">
            <div
              className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-muted)",
              }}
            >
              <Shield size={20} />
            </div>

            <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
              Verify it&apos;s you
            </h1>

            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-muted)" }}
            >
              Enter the 6-digit code from your authenticator
              app.
            </p>
          </header>

          <form
            onSubmit={handleMfaSubmit}
            className="space-y-5"
            noValidate
          >
            <div>
              <label className="form-label">
                Authentication code
              </label>

              <div className="mt-2 flex justify-center rounded-2xl border p-5 sm:p-6">
                <OTPInput
                  value={otp}
                  onChange={(value) => {
                    setOtp(
                      value.replace(/\D/g, "").slice(0, 6)
                    );
                    setError("");
                  }}
                />
              </div>
            </div>

            <ErrorBox message={error} />

            <button
              type="submit"
              className="btn-primary"
              disabled={
                loading ||
                otp.replace(/\D/g, "").length !== 6
              }
            >
              {loading
                ? "Verifying..."
                : "Verify and sign in"}

              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <button
            type="button"
            onClick={handleBackToEmail}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={14} />
            Back to email
          </button>
        </div>
      )}
    </AuthShell>
  );
}
