"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import OAuthButtons from "../components/oauth-buttons";
import { OTPInput } from "../components/ui/otp-input";
import { apiPost, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import { ResendButton } from "../components/resend-button";
import { getDeviceFingerprint } from "../lib/fingerprint";
import { useAccountsConfig } from "../lib/use-accounts-config";

type Step = "name" | "details" | "verify" | "security" | "policy" | "success";
type FieldName =
  | "firstName"
  | "lastName"
  | "dob"
  | "gender"
  | "occupation"
  | "email"
  | "username"
  | "companyName"
  | "photo"
  | "password"
  | "confirmPassword"
  | "policyAccepted";

type FieldErrors = Partial<Record<FieldName, string>>;

const STEPS: Array<{ id: Step; title: string; short: string }> = [
  { id: "name", title: "Your name", short: "Name" },
  { id: "details", title: "Your details", short: "Details" },
  { id: "verify", title: "Verify email", short: "Verify" },
  { id: "security", title: "Security", short: "Security" },
  { id: "policy", title: "Finish", short: "Finish" },
];

const OCCUPATIONS = [
  "Designer", "Developer", "Product", "Founder", "Student",
  "Researcher", "Writer", "Other",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;
const MAX_COMPANY_LENGTH = 100;
const MAX_ADMIN_REASON_LENGTH = 1000;
const MAX_REFERRER_LENGTH = 100;
const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

const YEARS = Array.from({ length: 100 }, (_, index) => String(CURRENT_YEAR - index));

function daysInMonth(month: number, year: number) {
  if (!month) return 31;
  return new Date(year || CURRENT_YEAR, month, 0).getDate();
}

function isValidDateParts(day: string, month: string, year: string) {
  if (!day || !month || !year) return false;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return false;
  if (m < 1 || m > 12 || y < CURRENT_YEAR - 99 || y > CURRENT_YEAR) return false;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) return false;
  return date <= new Date();
}

function validateName(value: string, label: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) return `${label} is required`;
  if (normalized.length < MIN_NAME_LENGTH) {
    return `${label} must be at least ${MIN_NAME_LENGTH} characters`;
  }
  if (normalized.length > MAX_NAME_LENGTH) {
    return `${label} must be ${MAX_NAME_LENGTH} characters or less`;
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(normalized)) {
    return `${label} can use letters, spaces, apostrophes or hyphens only`;
  }

  return "";
}

function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return "Email is required";
  if (email.length > 254) return "Email is too long";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Enter a valid email address";
  return "";
}

function validateUsername(value: string) {
  const username = value.trim();
  if (!username) return "";
  if (!/^[A-Za-z0-9._-]{3,24}$/.test(username)) {
    return "Use 3–24 letters, numbers, dots, underscores or dashes";
  }
  if (!/[A-Za-z0-9]/.test(username)) return "Username needs at least one letter or number";
  return "";
}

function validatePassword(value: string) {
  if (!value) return "Password is required";
  if (value.length < 8) return "Use at least 8 characters";
  if (value.length > 128) return "Password must be 128 characters or less";
  if (/\s/.test(value)) return "Password cannot contain spaces";
  if (!/[A-Za-z]/.test(value)) return "Password needs at least one letter";
  if (!/\d/.test(value)) return "Password needs at least one number";
  return "";
}

function validateCompany(value: string) {
  if (!value.trim()) return "";
  if (value.length > MAX_COMPANY_LENGTH) return `Company name must be ${MAX_COMPANY_LENGTH} characters or less`;
  if (!/^[A-Za-z0-9 &'.,()\-/]+$/.test(value.trim())) return "Company name contains unsupported characters";
  return "";
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-xs" style={{ color: "var(--error)" }} role="alert">
      {children}
    </p>
  );
}

function FieldStatus({ valid, invalid }: { valid: boolean; invalid: boolean }) {
  if (!valid && !invalid) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center"
      style={{
        background: invalid ? "var(--error)" : "var(--success, #22c55e)",
        color: "var(--bg)",
      }}
    >
      {invalid ? <X size={15} strokeWidth={3} /> : <Check size={15} strokeWidth={3} />}
    </span>
  );
}

function FieldShell({
  children,
  valid,
  invalid,
}: {
  children: ReactNode;
  valid: boolean;
  invalid: boolean;
}) {
  return (
    <div className="relative">
      {children}
      <FieldStatus valid={valid} invalid={invalid} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 border transition-all"
      style={{
        background: checked ? "var(--text)" : "var(--bg-muted)",
        borderColor: checked ? "var(--text)" : "var(--border)",
      }}
    >
      <span
        className="absolute top-1/2 h-5 w-5 -translate-y-1/2 transition-all"
        style={{
          left: checked ? "24px" : "3px",
          background: checked ? "var(--bg)" : "var(--text-muted)",
        }}
      />
    </button>
  );
}

function Progress({ current }: { current: Step }) {
  const index = STEPS.findIndex((item) => item.id === current);
  return (
    <div className="mb-7">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 right-0 top-5 h-px" style={{ background: "var(--border)" }} />
        <div
          className="absolute left-0 top-5 h-px transition-all duration-500"
          style={{ background: "var(--text)", width: `${(index / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((item, i) => {
          const active = i === index;
          const complete = i < index;
          return (
            <div key={item.id} className="relative z-10 flex flex-col items-center">
              <div
                className="flex h-10 w-10 items-center justify-center border text-sm font-semibold transition-all"
                style={{
                  background: active || complete ? "var(--text)" : "var(--bg-surface)",
                  color: active || complete ? "var(--bg)" : "var(--text-muted)",
                  borderColor: active || complete ? "var(--text)" : "var(--border)",
                  boxShadow: active ? "4px 4px 0 var(--bg-muted)" : "none",
                }}
              >
                {complete ? <Check size={17} /> : i + 1}
              </div>
              <span className="mt-2 hidden text-[11px] font-medium sm:block" style={{ color: active ? "var(--text)" : "var(--text-muted)" }}>
                {item.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  invalid,
  valid,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
  invalid: boolean;
  valid: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        aria-invalid={invalid}
        className={`!pr-24 ${invalid ? "!border-[var(--error)]" : valid ? "!border-[var(--success,#22c55e)]" : ""}`}
      />
      {value && <FieldStatus valid={valid} invalid={invalid} />}
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-10 top-1/2 -translate-y-1/2 p-1.5 transition-opacity hover:opacity-60"
        style={{ color: "var(--text-muted)" }}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function SignupPage() {
  const { config } = useAccountsConfig();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [adminDataAccess, setAdminDataAccess] = useState(false);
  const [adminReason, setAdminReason] = useState("");
  const [adminReferredBy, setAdminReferredBy] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [captchaRayId, setCaptchaRayId] = useState("");
  const [captchaForceShow, setCaptchaForceShow] = useState(false);
  const [adminRequest, setAdminRequest] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setCaptchaForceShow(Boolean(config.captchaForceShow));
  }, [config.captchaForceShow]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAdminRequest(new URLSearchParams(window.location.search).has("admin_request"));
  }, []);

  const dob = useMemo(() => {
    if (!dobYear || !dobMonth || !dobDay) return "";
    return `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`;
  }, [dobDay, dobMonth, dobYear]);

  const dayOptions = daysInMonth(Number(dobMonth), Number(dobYear) || CURRENT_YEAR);

  useEffect(() => {
    if (dobDay && Number(dobDay) > dayOptions) setDobDay(String(dayOptions));
  }, [dayOptions, dobDay]);

  const firstNameError = validateName(firstName, "First name");
  const lastNameError = validateName(lastName, "Last name");
  const emailError = validateEmail(email);
  const usernameError = validateUsername(username);
  const companyError = validateCompany(companyName);
  const passwordError = validatePassword(password);
  const confirmPasswordError = !confirmPassword
    ? "Confirm your password"
    : password !== confirmPassword
      ? "Passwords don't match"
      : "";
  const nameStepValid = !firstNameError && !lastNameError;
  const detailsValid =
    isValidDateParts(dobDay, dobMonth, dobYear) &&
    Boolean(gender) &&
    Boolean(occupation) &&
    !emailError &&
    !usernameError &&
    !companyError &&
    !emailExists;
  const securityValid = !passwordError && !confirmPasswordError;

  const clearGlobalError = useCallback(() => {
    setError("");
  }, []);

  const setFieldError = useCallback((field: FieldName, message: string) => {
    setErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setError("");
  }, []);

  const go = useCallback((target: Step) => {
    setErrors({});
    setError("");
    setStep(target);
  }, []);

  const validateNameStep = () => {
    const next: FieldErrors = {};
    const first = validateName(firstName, "First name");
    const last = validateName(lastName, "Last name");
    if (first) next.firstName = first;
    if (last) next.lastName = last;
    return next;
  };

  const validateDetailsStep = () => {
    const next: FieldErrors = {};
    if (!isValidDateParts(dobDay, dobMonth, dobYear)) next.dob = "Enter a valid date of birth";
    if (!gender) next.gender = "Select a gender";
    if (!occupation) next.occupation = "Select an occupation";
    const emailMessage = validateEmail(email);
    if (emailMessage) next.email = emailMessage;
    const usernameMessage = validateUsername(username);
    if (usernameMessage) next.username = usernameMessage;
    const companyMessage = validateCompany(companyName);
    if (companyMessage) next.companyName = companyMessage;
    return next;
  };

  const validateSecurityStep = () => {
    const next: FieldErrors = {};
    const passwordMessage = validatePassword(password);
    if (passwordMessage) next.password = passwordMessage;
    if (!confirmPassword) next.confirmPassword = "Confirm your password";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords don't match";
    return next;
  };

  const handleNameChange = (value: string, field: "firstName" | "lastName") => {
    clearGlobalError();
    if (field === "firstName") setFirstName(value);
    else setLastName(value);

    const message = value.trim() ? validateName(value, field === "firstName" ? "First name" : "Last name") : "";
    setFieldError(field, message);
  };

  const handleNameNext = (event: FormEvent) => {
    event.preventDefault();
    const next = validateNameStep();
    setErrors(next);
    if (Object.keys(next).length) return;
    go("details");
  };

  /* Live availability check: restrict "continue" when the email already exists */
  const checkEmailAvailability = useCallback(
    async (value: string) => {
      const clean = value.trim().toLowerCase();
      if (!validateEmail(clean)) {
        setEmailExists(false);
        setFieldError("email", "");
        return;
      }
      setCheckingEmail(true);
      try {
        const result = await apiPost("auth/email-exists", { email: clean });
        const exists = !!result?.exists;
        setEmailExists(exists);
        setFieldError("email", exists ? "An account already exists with this email. Sign in instead." : "");
      } catch {
        setEmailExists(false);
        setFieldError("email", "");
      } finally {
        setCheckingEmail(false);
      }
    },
    [setFieldError]
  );

  const handleDetailsNext = async (event: FormEvent) => {
    event.preventDefault();
    const next = validateDetailsStep();
    setErrors(next);
    if (Object.keys(next).length) return;

    setCheckingEmail(true);
    setError("");
    try {
      const result = await apiPost("auth/email-exists", { email: email.trim().toLowerCase() });
      if (result?.exists) {
        setEmailExists(true);
        setFieldError("email", "An account already exists with this email. Sign in instead.");
        setError("This email is already registered. Sign in instead.");
        return;
      }
      // Send the pre-signup verification code, then go to the verify step.
      setSendingCode(true);
      await apiPost("auth/signup-otp/request", { email: email.trim().toLowerCase() });
      setCodeSent(true);
      setOtpCode("");
      setVerifyOtp("");
      go("verify");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || /registered/i.test(err.message))) {
        setEmailExists(true);
        setFieldError("email", "An account already exists with this email. Sign in instead.");
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't send the verification code. Please try again.");
      }
    } finally {
      setCheckingEmail(false);
      setSendingCode(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (verifyOtp.length !== 6) {
      setVerifyError("Enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    setVerifyError("");
    try {
      const res = await apiPost("auth/signup-otp/verify", { email: email.trim().toLowerCase(), code: verifyOtp });
      if (res?.verified) {
        setOtpCode(verifyOtp);
        go("security");
      } else {
        setVerifyError("Invalid or expired verification code");
      }
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    await apiPost("auth/signup-otp/request", { email: email.trim().toLowerCase() });
  };

  const handleSecurityNext = (event: FormEvent) => {
    event.preventDefault();
    const next = validateSecurityStep();
    setErrors(next);
    if (Object.keys(next).length) return;
    go("policy");
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearGlobalError();
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFieldError("photo", "Please choose an image file");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setFieldError("photo", "Image must be smaller than 4MB");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
        setPhotoName(file.name);
        setFieldError("photo", "");
      } else {
        setFieldError("photo", "Could not read that image");
      }
    };
    reader.onerror = () => setFieldError("photo", "Could not read that image");
    reader.readAsDataURL(file);
  };

  const generateSignatureDataUrl = (): string => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return "";
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(`${firstName.trim()} ${lastName.trim()}`.trim(), canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (!policyAccepted) {
      setFieldError("policyAccepted", "You must accept the Terms and Privacy Policy");
      return;
    }

    const security = validateSecurityStep();
    if (Object.keys(security).length) {
      setErrors(security);
      go("security");
      return;
    }

    setLoading(true);
    setError("");

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      await apiPost("auth/signup", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim().toLowerCase() || undefined,
        email: email.trim().toLowerCase(),
        password,
        dob,
        gender,
        occupation: occupation || "Other",
        photoUrl: photoUrl || undefined,
        companyName: companyName.trim() || undefined,
        policyAccepted,
        adminDataAccess,
        signatureDataUrl: generateSignatureDataUrl(),
        signatureName: fullName || email.trim().toLowerCase(),
        captchaRayId,
        fingerprint: getDeviceFingerprint(),
        otpCode,
      });

      if (adminRequest) {
        try {
          await apiPost("admin/requests", {
            fullName,
            reason: adminReason.trim(),
            referredBy: adminReferredBy.trim() || undefined,
          });
        } catch {
          // Account creation succeeded; admin request failure should not block email verification.
        }
      }

      go("success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 403 && /captcha/i.test(err.message)) setCaptchaForceShow(true);
      } else {
        setError("Couldn't create your account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score: 1, label: "Weak" };
    if (score <= 3) return { score: 2, label: "Fair" };
    if (score <= 4) return { score: 3, label: "Good" };
    return { score: 4, label: "Strong" };
  }, [password]);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const loginUrl = `/login?redirect_to=${encodeURIComponent(getRedirectUrl())}`;

  if (step === "success") {
    return (
      <AuthLayout>
        <div className="mx-auto w-full max-w-md text-center">
          <div className="auth-icon mx-auto mb-6 flex h-16 w-16 items-center justify-center border" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
            <Check size={30} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">You're all set</h1>
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-muted)" }}>Your Tirbeo account has been created successfully.</p>
          {fullName && <p className="mt-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Welcome, {fullName}</p>}
          {adminRequest && <div className="auth-panel mt-5 border p-4 text-left text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-muted)" }}>Your admin access request has been submitted for review.</div>}
          <button type="button" onClick={() => { window.location.href = getRedirectUrl(); }} className="btn-primary mt-7">Go to your dashboard <ArrowRight size={18} /></button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-7 lg:hidden"><Brand /></div>
        <div className="auth-panel grid border lg:grid-cols-[0.85fr_1.15fr]" style={{ borderColor: "var(--border)" }}>
          <aside className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden p-9 lg:flex" style={{ background: "var(--bg-surface)" }}>
            <div className="absolute -right-24 -top-24 h-72 w-72 border opacity-50" style={{ borderColor: "var(--border)" }} />
            <div className="absolute -bottom-32 -left-24 h-80 w-80 border opacity-30" style={{ borderColor: "var(--border)" }} />
            <div className="relative z-10">
              <Brand />
              <div className="mt-28 max-w-sm">
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Join Tirbeo</div>
                <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight">Your account.<br />Your journey.</h2>
                <p className="mt-5 max-w-xs text-sm leading-6" style={{ color: "var(--text-muted)" }}>Create your Tirbeo account and start building your experience.</p>
              </div>
            </div>
            <div className="relative z-10">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Continue with</div>
              <OAuthButtons redirect={getRedirectUrl()} />
            </div>
          </aside>

          <main className="min-h-[680px] p-5 sm:p-8 lg:p-10" style={{ background: "var(--bg)" }}>
            <div className="mx-auto max-w-xl">
              <div className="mb-7 flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {step === "name" && "Create your account"}
                    {step === "details" && "Tell us about yourself"}
                    {step === "verify" && "Verify your email"}
                    {step === "security" && "Secure your account"}
                    {step === "policy" && "Almost there"}
                  </h1>
                  <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {step === "name" && "Start with the basics."}
                    {step === "details" && "A few details help personalize your account."}
                    {step === "verify" && "We sent a 6-digit code to your email."}
                    {step === "security" && "Choose a strong password."}
                    {step === "policy" && "Review the final account settings."}
                  </p>
                </div>
                <a href={loginUrl} className="hidden text-sm font-semibold sm:block" style={{ color: "var(--text)" }}>Sign in</a>
              </div>

              <Progress current={step} />

              {step === "name" && (
                <div className="auth-panel mb-6 border p-4 lg:hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>Quick signup</p>
                  <OAuthButtons redirect={getRedirectUrl()} />
                  <div className="my-4 flex items-center gap-3"><div className="h-px flex-1" style={{ background: "var(--border)" }} /><span className="text-xs" style={{ color: "var(--text-muted)" }}>or continue with email</span><div className="h-px flex-1" style={{ background: "var(--border)" }} /></div>
                </div>
              )}

              {step === "name" && (
                <form onSubmit={handleNameNext} className="space-y-5" noValidate>
                  <div className="auth-panel border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Step 01</div>
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What should we call you?</h2>
                        <p className="mt-2 max-w-lg text-sm leading-6" style={{ color: "var(--text-muted)" }}>Use the name you want people to see on your Tirbeo profile.</p>
                      </div>
                      <span className="hidden border px-3 py-1.5 text-[10px] font-semibold sm:block" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>1 of 5</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="form-group">
                        <label htmlFor="first-name" className="form-label required">First name</label>
                        <FieldShell valid={Boolean(firstName.trim()) && !firstNameError} invalid={Boolean(firstName.trim()) && Boolean(firstNameError)}>
                          <input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => handleNameChange(e.target.value, "firstName")}
                            onBlur={() => {
                              const normalized = firstName.trim().replace(/\s+/g, " ");
                              setFirstName(normalized);
                              setFieldError("firstName", validateName(normalized, "First name"));
                            }}
                            placeholder="Bishnu"
                            autoFocus
                            autoComplete="given-name"
                            maxLength={MAX_NAME_LENGTH}
                            aria-invalid={Boolean(firstName.trim()) && Boolean(firstNameError)}
                            className={firstNameError ? "!border-[var(--error)] !pr-12" : firstName.trim() && !firstNameError ? "!border-[var(--success,#22c55e)] !pr-12" : ""}
                          />
                        </FieldShell>
                        <FieldError>{firstNameError || errors.firstName}</FieldError>
                      </div>

                      <div className="form-group">
                        <label htmlFor="last-name" className="form-label required">Last name</label>
                        <FieldShell valid={Boolean(lastName.trim()) && !lastNameError} invalid={Boolean(lastName.trim()) && Boolean(lastNameError)}>
                          <input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => handleNameChange(e.target.value, "lastName")}
                            onBlur={() => {
                              const normalized = lastName.trim().replace(/\s+/g, " ");
                              setLastName(normalized);
                              setFieldError("lastName", validateName(normalized, "Last name"));
                            }}
                            placeholder="Neupane"
                            autoComplete="family-name"
                            maxLength={MAX_NAME_LENGTH}
                            aria-invalid={Boolean(lastName.trim()) && Boolean(lastNameError)}
                            className={lastNameError ? "!border-[var(--error)] !pr-12" : lastName.trim() && !lastNameError ? "!border-[var(--success,#22c55e)] !pr-12" : ""}
                          />
                        </FieldShell>
                        <FieldError>{lastNameError || errors.lastName}</FieldError>
                      </div>
                    </div>

                    {fullName && !firstNameError && !lastNameError && (
                      <div className="auth-panel mt-4 border p-4" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center text-sm font-bold" style={{ background: "var(--text)", color: "var(--bg)" }}>{firstName.charAt(0).toUpperCase()}</div>
                          <div><p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>Profile preview</p><p className="text-sm font-semibold">{fullName}</p></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Letters, spaces, apostrophes and hyphens are allowed. Numbers and other symbols are not.</p>
                    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={!nameStepValid}>Continue <ArrowRight size={18} /></button>
                  </div>
                </form>
              )}

              {step === "details" && (
                <form onSubmit={handleDetailsNext} className="space-y-5" noValidate>
                  <div>
                    <label className="form-label required">Date of birth</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select value={dobMonth} onChange={(e) => { setDobMonth(e.target.value); setFieldError("dob", ""); }} aria-invalid={Boolean(errors.dob)}>
                        <option value="">Month</option>{MONTHS.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
                      </select>
                      <select value={dobDay} onChange={(e) => { setDobDay(e.target.value); setFieldError("dob", ""); }} aria-invalid={Boolean(errors.dob)}>
                        <option value="">Day</option>{Array.from({ length: dayOptions }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}</option>)}
                      </select>
                      <select value={dobYear} onChange={(e) => { setDobYear(e.target.value); setFieldError("dob", ""); }} aria-invalid={Boolean(errors.dob)}>
                        <option value="">Year</option>{YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </div>
                    <FieldError>{errors.dob}</FieldError>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label required">Gender</label>
                      <select value={gender} onChange={(e) => { setGender(e.target.value); setFieldError("gender", ""); }} aria-invalid={Boolean(errors.gender)}>
                        <option value="">Select gender</option><option value="Prefer not to say">Prefer not to say</option><option value="Female">Female</option><option value="Male">Male</option><option value="Non-binary">Non-binary</option><option value="Other">Other</option>
                      </select>
                      <FieldError>{errors.gender}</FieldError>
                    </div>

                    <div className="form-group">
                      <label className="form-label required">Occupation</label>
                      <select value={occupation} onChange={(e) => { setOccupation(e.target.value); setFieldError("occupation", ""); }} aria-invalid={Boolean(errors.occupation)}>
                        <option value="">Select occupation</option>
                        {OCCUPATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      <FieldError>{errors.occupation}</FieldError>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="form-label required">Email address</label>
                    <FieldShell valid={Boolean(email) && !emailError && !emailExists} invalid={Boolean(email) && (Boolean(emailError) || emailExists)}>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFieldError("email", ""); setEmailExists(false); setError(""); }}
                        onBlur={() => { const m = validateEmail(email); setFieldError("email", m); if (!m) void checkEmailAvailability(email); }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={Boolean(emailError) || emailExists}
                        className={(emailError || emailExists) ? "!border-[var(--error)] !pr-12" : email ? "!border-[var(--success,#22c55e)] !pr-12" : ""}
                      />
                    </FieldShell>
                    {checkingEmail && <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}><Loader2 size={12} className="animate-spin" /> Checking availability…</p>}
                    <FieldError>{emailError || errors.email}</FieldError>
                    {emailExists && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text)" }}>
                        <span>Already have an account?</span>
                        <a href={loginUrl} className="font-semibold underline underline-offset-4">Sign in instead</a>
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="form-group">
                      <label htmlFor="username" className="form-label">Username <span className="optional">optional</span></label>
                      <FieldShell valid={Boolean(username) && !usernameError} invalid={Boolean(username) && Boolean(usernameError)}>
                        <input id="username" value={username} onChange={(e) => { setUsername(e.target.value); setFieldError("username", ""); }} onBlur={() => setFieldError("username", validateUsername(username))} placeholder="yourname" autoComplete="username" maxLength={24} aria-invalid={Boolean(usernameError)} className={usernameError ? "!border-[var(--error)] !pr-12" : username ? "!border-[var(--success,#22c55e)] !pr-12" : ""} />
                      </FieldShell>
                      <FieldError>{usernameError || errors.username}</FieldError>
                    </div>
                    <div className="form-group">
                      <label htmlFor="company" className="form-label">Company <span className="optional">optional</span></label>
                      <FieldShell valid={Boolean(companyName) && !companyError} invalid={Boolean(companyName) && Boolean(companyError)}>
                        <input id="company" value={companyName} onChange={(e) => { setCompanyName(e.target.value); setFieldError("companyName", ""); }} onBlur={() => setFieldError("companyName", validateCompany(companyName))} placeholder="Company name" autoComplete="organization" maxLength={MAX_COMPANY_LENGTH} aria-invalid={Boolean(companyError)} className={companyError ? "!border-[var(--error)] !pr-12" : companyName ? "!border-[var(--success,#22c55e)] !pr-12" : ""} />
                      </FieldShell>
                      <FieldError>{companyError || errors.companyName}</FieldError>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profile photo <span className="optional">optional</span></label>
                    <label className="flex cursor-pointer items-center gap-4 border p-3 transition-colors hover:bg-[var(--bg-muted)]" style={{ borderColor: errors.photo ? "var(--error)" : "var(--border)" }}>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={handlePhotoChange} />
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border" style={{ borderColor: "var(--border)", background: "var(--bg-muted)" }}>
                        {photoUrl ? <img src={photoUrl} alt="Profile preview" className="h-full w-full object-cover" /> : <Upload size={19} style={{ color: "var(--text-muted)" }} />}
                      </div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{photoName || "Upload a photo"}</p><p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>JPG, PNG, WebP or GIF · Max 4MB</p></div>
                    </label>
                    <FieldError>{errors.photo}</FieldError>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <button type="button" onClick={() => go("name")} className="auth-back"><ArrowLeft size={15} /> Back</button>
                    <button type="submit" className="btn-primary sm:w-auto" disabled={checkingEmail || !detailsValid}>{checkingEmail ? "Checking..." : "Send code"}{!checkingEmail && <ArrowRight size={18} />}</button>
                  </div>
                </form>
              )}

              {step === "verify" && (
                <div className="space-y-5">
                  <div className="auth-panel border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="auth-icon flex h-11 w-11 items-center justify-center border" style={{ borderColor: "var(--border)", background: "var(--bg-muted)" }}>
                        <Mail size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Check your email</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Code sent to <strong style={{ color: "var(--text)" }}>{email}</strong></p>
                      </div>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4" noValidate>
                      <div className="form-group">
                        <label className="form-label">Verification code</label>
                        <OTPInput
                          value={verifyOtp}
                          onChange={(value) => { setVerifyOtp(value.replace(/\D/g, "").slice(0, 6)); setVerifyError(""); }}
                          error={!!verifyError}
                        />
                        <FieldError>{verifyError}</FieldError>
                      </div>
                      <button type="submit" className="btn-primary" disabled={verifyOtp.length !== 6 || loading}>
                        {loading ? "Verifying..." : "Verify and continue"}
                        {!loading && <ArrowRight size={18} />}
                      </button>
                    </form>
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => go("details")} className="auth-back"><ArrowLeft size={15} /> Back</button>
                    <ResendButton onResend={handleResend} label="Resend code" cooldown={30} className="text-sm font-medium" />
                  </div>
                </div>
              )}

              {step === "security" && (
                <form onSubmit={handleSecurityNext} className="space-y-5" noValidate>
                  <div className="form-group">
                    <label className="form-label required">Password</label>
                    <PasswordInput value={password} onChange={(value) => { setPassword(value); setFieldError("password", ""); }} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} placeholder="Create a password" invalid={Boolean(password) && Boolean(passwordError)} valid={Boolean(password) && !passwordError} />
                    {password && <div className="mt-3"><div className="flex gap-1.5">{[1,2,3,4].map((item) => <div key={item} className="h-1.5 flex-1" style={{ background: item <= passwordStrength.score ? "var(--text)" : "var(--border)" }} />)}</div><p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>Password strength: <strong style={{ color: "var(--text)" }}>{passwordStrength.label}</strong></p></div>}
                    <FieldError>{passwordError || errors.password}</FieldError>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Confirm password</label>
                    <PasswordInput value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setFieldError("confirmPassword", ""); }} visible={showConfirm} onToggle={() => setShowConfirm((value) => !value)} placeholder="Enter your password again" invalid={Boolean(confirmPassword) && Boolean(confirmPasswordError)} valid={Boolean(confirmPassword) && !confirmPasswordError} />
                    <FieldError>{confirmPasswordError || errors.confirmPassword}</FieldError>
                  </div>

                  <CaptchaWidget forceShow={captchaForceShow} onSuccess={(rayId) => { setCaptchaRayId(rayId); setError(""); }} onBlocked={(_, reason) => setError(`Access blocked: ${reason}`)} />
                  {error && <div className="auth-panel border p-3 text-sm" style={{ borderColor: "var(--error)", color: "var(--error)" }} role="alert">{error}</div>}

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <button type="button" onClick={() => go("verify")} className="auth-back"><ArrowLeft size={15} /> Back</button>
                    <button type="submit" className="btn-primary sm:w-auto" disabled={!securityValid}>Continue <ArrowRight size={18} /></button>
                  </div>
                </form>
              )}

              {step === "policy" && (
                <form onSubmit={handleCreate} className="space-y-4" noValidate>
                  <div className="auth-panel border p-5" style={{ borderColor: policyAccepted ? "var(--text)" : errors.policyAccepted ? "var(--error)" : "var(--border)", background: "var(--bg-surface)" }}>
                    <div className="flex items-center justify-between gap-5">
                      <div><p className="text-sm font-semibold">Terms & Privacy</p><p className="mt-1 text-sm leading-5" style={{ color: "var(--text-muted)" }}>I agree to Tirbeo&apos;s <a href={config.ui?.termsLink || "/terms"} className="font-medium underline">Terms</a> and <a href={config.ui?.privacyLink || "/privacy"} className="font-medium underline">Privacy Policy</a>.</p></div>
                      <Toggle checked={policyAccepted} onChange={(value) => { setPolicyAccepted(value); setFieldError("policyAccepted", ""); }} />
                    </div>
                    <FieldError>{errors.policyAccepted}</FieldError>
                  </div>

                  <div className="auth-panel border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <div className="flex items-center justify-between gap-5"><div><p className="text-sm font-semibold">Support access</p><p className="mt-1 text-sm leading-5" style={{ color: "var(--text-muted)" }}>Allow admins to view signup details when helping you.</p></div><Toggle checked={adminDataAccess} onChange={setAdminDataAccess} /></div>
                  </div>

                  {adminRequest && <div className="auth-panel border p-5" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    <p className="mb-4 text-sm font-semibold">Admin access request</p>
                    <div className="space-y-4">
                      <div className="form-group"><label className="form-label">Why do you need admin access?</label><textarea value={adminReason} onChange={(e) => setAdminReason(e.target.value)} rows={3} maxLength={MAX_ADMIN_REASON_LENGTH} placeholder="Describe your role and reason..." /><p className="mt-1 text-right text-xs" style={{ color: "var(--text-muted)" }}>{adminReason.length}/{MAX_ADMIN_REASON_LENGTH}</p></div>
                      <div className="form-group"><label className="form-label">Referred by <span className="optional">optional</span></label><input value={adminReferredBy} onChange={(e) => setAdminReferredBy(e.target.value)} maxLength={MAX_REFERRER_LENGTH} placeholder="Name or email" /></div>
                    </div>
                  </div>}

                  <canvas ref={signatureCanvasRef} width={320} height={64} style={{ display: "none" }} aria-hidden="true" />

                  {error && <div className="auth-panel border p-3 text-sm" style={{ borderColor: "var(--error)", color: "var(--error)" }} role="alert">{error}</div>}

                  <div className="flex items-center justify-between gap-4 pt-3">
                    <button type="button" onClick={() => go("security")} className="auth-back"><ArrowLeft size={15} /> Back</button>
                    <button type="submit" className="btn-primary sm:w-auto" disabled={loading || !policyAccepted}>{loading ? "Creating..." : adminRequest ? "Request access" : "Create account"}{!loading && <ArrowRight size={18} />}</button>
                  </div>
                </form>
              )}

              <div className="mt-8 border-t pt-5 text-center sm:hidden"><span className="text-sm" style={{ color: "var(--text-muted)" }}>Already have an account? </span><a href={loginUrl} className="text-sm font-semibold" style={{ color: "var(--text)" }}>Sign in</a></div>
            </div>
          </main>
        </div>
        <p className="mt-5 text-center text-xs" style={{ color: "var(--text-muted)" }}>By continuing, you agree to Tirbeo&apos;s terms and privacy policy.</p>
      </div>
    </AuthLayout>
  );
}

function Brand() {
  return <a href="/" className="inline-flex items-center gap-3" aria-label="Tirbeo home"><span className="flex h-9 w-9 items-center justify-center text-sm font-bold" style={{ background: "var(--text)", color: "var(--bg)" }}>T</span><span className="text-lg font-bold tracking-tight">Tirbeo</span></a>;
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-soft min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}><div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-5 sm:px-6 lg:px-10"><div className="w-full">{children}</div></div></div>;
}
