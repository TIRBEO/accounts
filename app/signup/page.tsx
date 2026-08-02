"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { OTPInput } from "@tirbeo/ui";
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { getRedirectUrl } from "../lib/redirect";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import { ResendButton } from "../components/resend-button";
import { getDeviceFingerprint } from "../lib/fingerprint";
import { useAccountsConfig } from "../lib/use-accounts-config";

type Step = "name" | "info" | "email" | "password" | "verify" | "success";

const TOTAL_STEPS = 4;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => String(CURRENT_YEAR - i));

const SELECT_CHEVRON = {
  backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235F6368%22 stroke-width=%222%22%3E%3Cpolyline points=%226 9 12 15 18 9%22/%3E%3C/svg%3E')",
  backgroundSize: "20px",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
} as const;

const THEME = {
  primary: "#1A73E8",
  primaryHover: "#1769d2",
  primaryLight: "#1A73E8",
  text: "#202124",
  textSecondary: "#5f6368",
  textTertiary: "#80868b",
  border: "#dadce0",
  borderFocus: "#1A73E8",
  error: "#d93025",
  success: "#188038",
  surface: "#ffffff",
  background: "#f8f9fa",
};

function ProgressIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all duration-300"
            style={{
              backgroundColor: i <= current ? THEME.primary : THEME.background,
              color: i <= current ? "white" : THEME.textTertiary,
              border: i <= current ? "none" : `1.5px solid ${THEME.border}`,
            }}>
            {i <= current && i < TOTAL_STEPS - 1 ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className="flex-1 h-0.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i < current ? THEME.primary : THEME.border }} />
          )}
        </div>
      ))}
    </div>
  );
}

const inputClassName = "w-full h-11 rounded-lg border bg-white px-3.5 text-sm outline-none transition-all duration-200 placeholder:text-sm";
const inputFocusClassName = "focus:border-[#1A73E8] focus:shadow-[0_0_0_3px_rgba(26,115,232,0.08)]";
const labelClassName = "block text-sm font-medium text-[#3c4043] mb-1.5";
const errorClassName = "text-xs text-[#d93025] mt-1.5";
const primaryButtonClassName = "h-10 px-5 rounded-lg bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md";
const secondaryButtonClassName = "h-10 px-5 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f8f9fa] text-[#3c4043] text-sm font-medium transition-colors inline-flex items-center justify-center gap-2";

export default function SignupPage() {
  const { config } = useAccountsConfig();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [captchaRayId, setCaptchaRayId] = useState("");
  const [captchaForceShow, setCaptchaForceShow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.captchaForceShow) setCaptchaForceShow(true);
  }, [config.captchaForceShow]);

  const dob = dobYear && dobMonth && dobDay
    ? `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
    : "";

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.opacity = "0";
      contentRef.current.style.transform = direction === "forward" ? "translateY(8px)" : "translateY(-8px)";
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.style.transition = "opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
          contentRef.current.style.opacity = "1";
          contentRef.current.style.transform = "translateY(0)";
        }
      });
    }
  }, [step, direction]);

  const goForward = useCallback((next: Step) => {
    setDirection("forward");
    setError("");
    setFieldErrors({});
    setStep(next);
  }, []);

  const goBack = useCallback((prev: Step) => {
    setDirection("back");
    setError("");
    setFieldErrors({});
    setStep(prev);
  }, []);

  const validateName = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    else if (firstName.trim().length < 2) errors.firstName = "First name must be at least 2 characters";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    else if (lastName.trim().length < 2) errors.lastName = "Last name must be at least 2 characters";
    return errors;
  };

  const validateInfo = () => {
    const errors: Record<string, string> = {};
    if (!dob) errors.dob = "Date of birth is required";
    if (!gender) errors.gender = "Please select a gender";
    return errors;
  };

  const validateEmail = () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address";
    return errors;
  };

  const validatePassword = () => {
    const errors: Record<string, string> = {};
    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Must be at least 8 characters";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    return errors;
  };

  const handleNameNext = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateName();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    goForward("info");
  }, [firstName, lastName, goForward]);

  const handleInfoNext = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateInfo();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    goForward("email");
  }, [dob, gender, goForward]);

  const handleEmailNext = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateEmail();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setError("");
    setCheckingEmail(true);
    try {
      const data = await apiPost("auth/email-exists", { email: email.trim() });
      if (data?.exists) {
        setFieldErrors({ email: "An account with this email already exists. Sign in instead." });
        return;
      }
      goForward("password");
    } catch {
      goForward("password");
    } finally {
      setCheckingEmail(false);
    }
  }, [email, goForward]);

  const handlePasswordNext = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePassword();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      await apiPost("auth/signup", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        dob,
        gender,
        captchaRayId,
        fingerprint: getDeviceFingerprint(),
      });
      goForward("verify");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 403 && /captcha/i.test(err.message)) setCaptchaForceShow(true);
      } else setError("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, email, password, confirmPassword, dob, gender, captchaRayId, goForward]);

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyOtp.trim() || verifyOtp.length !== 6) { setVerifyError("Enter the 6-digit code"); return; }
    setVerifyError("");
    setLoading(true);
    try {
      await apiPost("auth/verify-email", { email: email.trim(), code: verifyOtp.trim() });
      goForward("success");
    } catch (err: unknown) {
      if (err instanceof ApiError) setVerifyError(err.message);
      else setVerifyError("Invalid or expired code. Request a new one.");
    } finally {
      setLoading(false);
    }
  }, [verifyOtp, email, goForward]);

  const handleResendOtp = useCallback(async () => {
    setLoading(true);
    try {
      await apiPost("auth/verify-email", { email: email.trim() });
    } finally {
      setLoading(false);
    }
  }, [email]);

  const fullName = `${firstName} ${lastName}`.trim();

  if (step === "verify") {
    return (
      <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email}`}>
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <label className={labelClassName}>Verification code</label>
            <OTPInput
              value={verifyOtp}
              onChange={v => { setVerifyOtp(v.replace(/\D/g, "").slice(0, 6)); setVerifyError(""); }}
              error={!!verifyError}
            />
            {verifyError && <p className={errorClassName}>{verifyError}</p>}
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-[#d93025]">{error}</p>
            </div>
          )}
          <button type="submit" disabled={verifyOtp.length !== 6 || loading} className={primaryButtonClassName + " w-full"}>
            {loading ? "Verifying..." : "Verify email"}
          </button>
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={() => goBack("email")}
              className="text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
             <ResendButton
               onResend={handleResendOtp}
               label="Resend code"
               cooldown={30}
               className="text-sm font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
             />
          </div>
        </form>
      </AuthShell>
    );
  }

  if (step === "success") {
    return (
      <AuthShell title="" subtitle="">
        <div className="text-center space-y-5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f4ea]">
            <Check className="w-7 h-7 text-[#188038]" />
          </div>
          <div>
            <h1 className="text-[22px] font-medium text-[#202124] mb-2">Account created</h1>
            <p className="text-sm text-[#5f6368]">Your Tirbeo Account is ready.</p>
          </div>
          {fullName && (
            <p className="text-sm text-[#5f6368]">
              Welcome, <span className="font-medium text-[#202124]">{fullName}</span>
            </p>
          )}
          <div className="pt-2">
            <button type="button" onClick={() => window.location.href = `/login?redirect_to=${encodeURIComponent(getRedirectUrl())}`}
              className={primaryButtonClassName + " w-full max-w-[240px]"}>
              Sign in to continue
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  const stepLabels = ["Your name", "Basic info", "Email & password", "Create account"];
  const stepSubtitles = ["Enter your full name", "Date of birth and gender", "Choose your email and password", "Set up your password"];
  const stepIndex = ["name", "info", "email", "password", "verify"].indexOf(step);

  return (
    <AuthShell title="" subtitle="">
      <div ref={contentRef} className="min-h-[480px]">
        <div className="mb-5">
          <h1 className="text-[20px] font-medium text-[#202124]">{stepLabels[stepIndex]}</h1>
          <p className="text-sm text-[#5f6368] mt-1">{stepSubtitles[stepIndex]}</p>
        </div>
        <ProgressIndicator current={stepIndex} />

        {step === "name" && (
          <form onSubmit={handleNameNext} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className={labelClassName}>First name</label>
                <input id="firstName" type="text" value={firstName}
                  onChange={e => { setFirstName(e.target.value); setFieldErrors({}); }}
                  placeholder="First" autoFocus autoComplete="given-name"
                  className={`${inputClassName} ${inputFocusClassName}`}
                  aria-invalid={!!fieldErrors.firstName} />
                {fieldErrors.firstName && <p className={errorClassName}>{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className={labelClassName}>Last name</label>
                <input id="lastName" type="text" value={lastName}
                  onChange={e => { setLastName(e.target.value); setFieldErrors({}); }}
                  placeholder="Last" autoComplete="family-name"
                  className={`${inputClassName} ${inputFocusClassName}`}
                  aria-invalid={!!fieldErrors.lastName} />
                {fieldErrors.lastName && <p className={errorClassName}>{fieldErrors.lastName}</p>}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button type="submit" className={primaryButtonClassName}>
                Continue
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </form>
        )}

        {step === "info" && (
          <form onSubmit={handleInfoNext} className="space-y-4">
            <div>
              <label htmlFor="dob" className={labelClassName}>Date of birth</label>
              <div className="grid grid-cols-3 gap-3">
                <select id="dobMonth" value={dobMonth} autoFocus
                  onChange={e => { setDobMonth(e.target.value); setFieldErrors({}); }}
                  className={`${inputClassName} ${inputFocusClassName} appearance-none pr-8`}
                  style={SELECT_CHEVRON}
                  aria-invalid={!!fieldErrors.dob}>
                  <option value="" disabled>Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select id="dobDay" value={dobDay}
                  onChange={e => { setDobDay(e.target.value); setFieldErrors({}); }}
                  className={`${inputClassName} ${inputFocusClassName} appearance-none pr-8`}
                  style={SELECT_CHEVRON}
                  aria-invalid={!!fieldErrors.dob}>
                  <option value="" disabled>Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
                <select id="dobYear" value={dobYear}
                  onChange={e => { setDobYear(e.target.value); setFieldErrors({}); }}
                  className={`${inputClassName} ${inputFocusClassName} appearance-none pr-8`}
                  style={SELECT_CHEVRON}
                  aria-invalid={!!fieldErrors.dob}>
                  <option value="" disabled>Year</option>
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              {fieldErrors.dob && <p className={errorClassName}>{fieldErrors.dob}</p>}
            </div>
            <div>
              <label htmlFor="gender" className={labelClassName}>Gender</label>
              <select id="gender" value={gender}
                onChange={e => { setGender(e.target.value); setFieldErrors({}); }}
                className={`${inputClassName} ${inputFocusClassName} appearance-none`}
                style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235F6368%22 stroke-width=%222%22%3E%3Cpolyline points=%226 9 12 15 18 9%22/%3E%3C/svg%3E')", backgroundSize: "20px", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                aria-invalid={!!fieldErrors.gender}>
                <option value="" disabled>Select gender</option>
                {["Prefer not to say", "Female", "Male", "Non-binary", "Other"].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {fieldErrors.gender && <p className={errorClassName}>{fieldErrors.gender}</p>}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => goBack("name")}
                className="text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button type="submit" className={primaryButtonClassName}>
                Continue
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </form>
        )}

        {step === "email" && (
          <form onSubmit={handleEmailNext} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClassName}>Email address</label>
              <input id="email" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors({}); }}
                placeholder="you@example.com" autoFocus autoComplete="email"
                className={`${inputClassName} ${inputFocusClassName}`}
                aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <p className={errorClassName}>{fieldErrors.email}</p>}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => goBack("info")}
                className="text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button type="submit" disabled={checkingEmail} className={primaryButtonClassName}>
                {checkingEmail ? "Checking..." : "Continue"}
                {!checkingEmail && <ArrowLeft className="w-4 h-4 rotate-180" />}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordNext} className="space-y-4">
            <div>
              <label htmlFor="password" className={labelClassName}>Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors({}); }}
                  placeholder="Create a password" autoFocus autoComplete="new-password"
                  className={`${inputClassName} ${inputFocusClassName} pr-10`}
                  aria-invalid={!!fieldErrors.password} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] transition-colors"
                  tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className={errorClassName}>{fieldErrors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className={labelClassName}>Confirm password</label>
              <div className="relative">
                <input id="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setFieldErrors({}); }}
                  placeholder="Confirm your password" autoComplete="new-password"
                  className={`${inputClassName} ${inputFocusClassName} pr-10`}
                  aria-invalid={!!fieldErrors.confirmPassword} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] transition-colors"
                  tabIndex={-1} aria-label={showConfirm ? "Hide password" : "Show password"}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className={errorClassName}>{fieldErrors.confirmPassword}</p>}
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm text-[#d93025]">{error}</p>
              </div>
            )}
            <CaptchaWidget
              forceShow={captchaForceShow}
              onSuccess={(rayId) => setCaptchaRayId(rayId)}
              onBlocked={(rayId, reason) => {
                setError(`Access blocked: ${reason}. Ray ID: ${rayId}`);
              }}
            />
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => goBack("email")}
                className="text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button type="submit" disabled={loading} className={primaryButtonClassName}>
                {loading ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
