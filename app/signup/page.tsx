"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Check, Shield, Upload } from "lucide-react";
import { OTPInput } from "../components/ui/otp-input";
import { AuthLayout, Brand, FieldError, SecurityFooter } from "../components/auth-layout";
import { CaptchaWidget } from "../components/captcha/captcha-widget";
import { ResendButton } from "../components/resend-button";
import { apiPost, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";
import { getDeviceFingerprint } from "../lib/fingerprint";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ["name", "details", "security", "policy", "verify", "success"] as const;
type Step = (typeof STEPS)[number];

const OCCUPATIONS = ["Designer", "Developer", "Product", "Founder", "Student", "Researcher", "Writer", "Other"];

function initialFormData() {
  return { firstName: "", lastName: "", username: "", email: "", photoUrl: "", dob: "", gender: "", occupation: "", companyName: "", password: "", confirmPassword: "" };
}

export default function SignupPage() {
  const [step, setStep] = useState<Step>("name");
  const [form, setForm] = useState(initialFormData());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState("");
  const [captchaRayId, setCaptchaRayId] = useState("");
  const [emailExists, setEmailExists] = useState<{ exists: boolean; hasPassword: boolean } | null>(null);
  const emailCheckRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clearError = (k: string) => setFieldError((f) => { const c = { ...f }; delete c[k]; return c; });

  const passwordStrength = () => {
    const p = form.password;
    if (p.length < 8) return { label: "Weak", color: "var(--error)" };
    if (p.length >= 12 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) return { label: "Strong", color: "var(--success)" };
    return p.length >= 8 ? { label: "Fair", color: "var(--text-secondary)" } : { label: "Weak", color: "var(--error)" };
  };

  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1] as Step);
  const back = () => setStep(STEPS[STEPS.indexOf(step) - 1] as Step);

  const checkEmailExists = async (emailValue: string): Promise<{ exists: boolean; hasPassword: boolean } | null> => {
    const e = emailValue.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return null;
    try {
      const data = await apiPost("auth/email-exists", { email: e });
      const exists = !!(data?.exists);
      return exists ? { exists: true, hasPassword: !!data?.hasPassword } : null;
    } catch {
      return null;
    }
  };

  const debouncedCheckEmail = (v: string) => {
    if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    emailCheckRef.current = window.setTimeout(async () => {
      const result = await checkEmailExists(v);
      setEmailExists(result);
    }, 400);
  };

  const EmailTakenPopup = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
      <div className="auth-card" style={{ padding: 36, maxWidth: 420, margin: "0 auto", textAlign: "center", border: "3px solid var(--error)" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--error)", marginBottom: 12 }}>Account already exists</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>An account with this email already exists. Sign in or reset your password.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <a href="/login" className="btn-ghost" style={{ flex: 1, height: 48, fontSize: 13 }}>Sign in</a>
          <a href="/forgot-password" className="btn-primary" style={{ flex: 1, height: 48, fontSize: 13 }}>Reset password</a>
        </div>
      </div>
    </div>
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/profile/avatar`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
      update("photoUrl", data.photoUrl || data.url);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const generateSignatureDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(`${form.firstName} ${form.lastName}`, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== "policy") return;
    const p = form.password;
    if (p.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (p !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (!form.occupation) { setError("Please select an occupation."); return; }
    if (!captchaRayId) { setError("Please complete the CAPTCHA."); return; }
    setLoading(true);
    setError("");
    const signatureDataUrl = generateSignatureDataUrl();
    try {
      await apiPost("auth/signup", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim().toLowerCase() || undefined,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        photoUrl: form.photoUrl || undefined,
        occupation: form.occupation,
        companyName: form.companyName.trim() || undefined,
        policyAccepted: true,
        adminDataAccess: false,
        signatureDataUrl,
        signatureName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        captchaRayId,
        fingerprint: getDeviceFingerprint(),
      });
      setStep("verify");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Could not create account. Please try again."));
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
      await apiPost("auth/verify-email", { email: form.email.trim().toLowerCase(), otpCode: otp });
      setSuccess("Account created!");
      setStep("success");
      setTimeout(() => { window.location.href = getRedirectUrl(); }, 1500);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (err?.message || "Invalid code."));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsNext = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      setFieldError({ firstName: "Required", lastName: "Required", email: "Required" });
      return;
    }
    if (!EMAIL_RE.test(form.email.trim().toLowerCase())) {
      setFieldError({ email: "Invalid email" });
      return;
    }
    if (emailExists?.exists) {
      return;
    }
    next();
  };

  const renderName = () => (
    <>
      <div className="form-group">
        <label className="form-label required">First name</label>
        <input type="text" placeholder="Jane" value={form.firstName} onChange={(e) => { update("firstName", e.target.value); clearError("firstName"); }} autoFocus />
        {fieldError.firstName && <FieldError>{fieldError.firstName}</FieldError>}
      </div>
      <div className="form-group">
        <label className="form-label required">Last name</label>
        <input type="text" placeholder="Doe" value={form.lastName} onChange={(e) => { update("lastName", e.target.value); clearError("lastName"); }} />
        {fieldError.lastName && <FieldError>{fieldError.lastName}</FieldError>}
      </div>
      <div className="form-group">
        <label className="form-label">Username</label>
        <input type="text" placeholder="janedoe (optional)" value={form.username} onChange={(e) => update("username", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label required">Email address</label>
        <div style={{ position: "relative" }}>
          <input
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => { update("email", e.target.value); clearError("email"); debouncedCheckEmail(e.target.value); }}
            className={form.email ? (EMAIL_RE.test(form.email.trim().toLowerCase()) ? "border-success" : "border-error") : ""}
            style={{ paddingRight: 48 }}
          />
          {form.email && (
            <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
              {EMAIL_RE.test(form.email.trim().toLowerCase()) ? <Check size={20} style={{ color: "var(--success)" }} /> : <ArrowRight size={20} style={{ color: "var(--error)" }} />}
            </div>
          )}
        </div>
        {fieldError.email && <FieldError>{fieldError.email}</FieldError>}
        {emailExists?.exists && !fieldError.email && (
          <p style={{ color: "var(--error)", fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>Account already exists — <a href="/login" className="auth-link">sign in</a> or <a href="/forgot-password" className="auth-link">reset password</a></p>
        )}
      </div>
      <button type="button" className="btn-primary" onClick={handleDetailsNext}>
        Continue <ArrowRight size={18} />
      </button>
    </>
  );

  const renderDetails = () => (
    <>
      <div className="form-group">
        <label className="form-label">Photo</label>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button type="button" className="btn-ghost" style={{ width: "auto", height: 44, padding: "0 16px", fontSize: 13 }} onClick={() => photoInputRef.current?.click()}>
            <Upload size={16} style={{ marginRight: 6, display: "inline" }} />{form.photoUrl ? "Change photo" : "Upload photo"}
          </button>
          <input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          {form.photoUrl && <img src={form.photoUrl} alt="avatar" style={{ width: 48, height: 48, border: "2px solid var(--border)", objectFit: "cover" }} />}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Date of birth</label>
        <input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Gender</label>
        <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
          <option value="">Prefer not to say</option>
          <option>Man</option><option>Woman</option><option>Non-binary</option><option>Other</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Occupation</label>
        <select value={form.occupation} onChange={(e) => update("occupation", e.target.value)}>
          <option value="">Select</option>
          {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Company (optional)</label>
        <input type="text" placeholder="Acme Inc." value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button type="button" className="btn-ghost" style={{ flex: 1, height: 50, fontSize: 13 }} onClick={back}><ArrowLeft size={16} style={{ marginRight: 6 }} />Back</button>
        <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={next}>Continue <ArrowRight size={18} /></button>
      </div>
    </>
  );

  const renderSecurity = () => {
    const pw = passwordStrength();
    return (
      <>
        <div className="form-group">
          <label className="form-label required">Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
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
          {form.password && <p style={{ fontSize: 12, color: pw.color, fontWeight: 600, marginTop: 6 }}>Strength: {pw.label}</p>}
        </div>
        <div className="form-group">
          <label className="form-label required">Confirm password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              style={{ paddingRight: 56 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label required">Signature</label>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Your full name will be rendered as your signature below.</p>
          <canvas ref={canvasRef} width={320} height={64} style={{ width: "100%", height: 64, border: "2px dashed var(--border)", background: "var(--bg-surface)" }} />
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Your signature: {form.firstName} {form.lastName}</p>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button type="button" className="btn-ghost" style={{ flex: 1, height: 50, fontSize: 13 }} onClick={back}><ArrowLeft size={16} style={{ marginRight: 6 }} />Back</button>
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              if (!form.password || form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
              if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
              next();
            }}
          >
            Continue <ArrowRight size={18} />
          </button>
        </div>
      </>
    );
  };

  const renderPolicy = () => (
    <>
      <div className="form-group">
        <label className="form-label required">Occupation</label>
        <select value={form.occupation} onChange={(e) => update("occupation", e.target.value)}>
          <option value="">Select</option>
          {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginTop: 24 }}>
        <div style={{ padding: 16, border: "2px solid var(--border)", background: "var(--bg)" }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            By creating an account, you agree to Tirbeo&apos;s <a href="/terms" className="auth-link">Terms of Service</a> and <a href="/privacy" className="auth-link">Privacy Policy</a>.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked readOnly style={{ width: 18, height: 18 }} />
            I agree and accept
          </label>
        </div>
      </div>
      <CaptchaWidget
        onSuccess={(id) => setCaptchaRayId(id)}
        forceShow
      />
      {error && <div className="auth-message auth-message-error"><Shield size={16} style={{ marginTop: 2 }} />{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button type="button" className="btn-ghost" style={{ flex: 1, height: 50, fontSize: 13 }} onClick={back}><ArrowLeft size={16} style={{ marginRight: 6 }} />Back</button>
          <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading || !captchaRayId}>
            {loading ? <span className="spinner" /> : "Create account"}
          </button>
        </div>
      </form>
    </>
  );

  const renderVerify = () => (
    <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="form-group">
        <label className="form-label required">Verification code</label>
        <OTPInput value={otp} onChange={setOtp} numDigits={6} error={!!error} disabled={loading} className="otp-input-container" />
      </div>
      {error && <div className="auth-message auth-message-error"><Shield size={16} style={{ marginTop: 2 }} />{error}</div>}
      <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
        {loading ? <span className="spinner" /> : <>Verify & sign in <ArrowRight size={18} /></>}
      </button>
      <ResendButton
        onResend={async () => { await apiPost("auth/signup-otp/request", { email: form.email.trim().toLowerCase() }); }}
        cooldown={30}
        label="Resend code"
        className="auth-link"
        spinnerClassName="spinner"
      />
    </form>
  );

  const renderSuccess = () => (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ width: 72, height: 72, border: "2px solid var(--border)", background: "var(--success)", color: "var(--background)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <Check size={36} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Welcome aboard!</h2>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>Your account is ready. Redirecting…</p>
      <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} />
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case "name": return renderName();
      case "details": return renderDetails();
      case "security": return renderSecurity();
      case "policy": return renderPolicy();
      case "verify": return renderVerify();
      case "success": return renderSuccess();
      default: return null;
    }
  };

  const titles: Record<Step, string> = {
    name: "Create your account", details: "Your details", security: "Security settings", policy: "Review & accept", verify: "Verify your email", success: "Welcome!",
  };
  const subtitles: Record<Step, string> = {
    name: "Start with your name and email.", details: "Add your profile information.", security: "Create a strong password and signature.", policy: "Accept the terms to continue.", verify: `Enter the 6-digit code sent to ${form.email}`, success: "Your account is ready.",
  };

  const progress = STEPS.indexOf(step);
  const showProgress = ["name", "details", "security", "policy", "verify", "success"].includes(step);

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
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 8 }}>{titles[step]}</h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 32 }}>{subtitles[step]}</p>

          {success && <div className="auth-message auth-message-success"><Check size={16} style={{ marginTop: 2 }} />{success}</div>}

          {showProgress && step !== "verify" && step !== "success" && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {STEPS.slice(0, 5).map((s, i) => (<div key={s} style={{ flex: 1, height: 6, background: i <= progress ? "var(--text)" : "var(--border)" }} />))}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{progress + 1} of 5</div>
            </div>
          )}

          {renderStep()}

          {step === "verify" && <div style={{ marginTop: 28, textAlign: "center" }}><a href="/login" className="auth-link">Already verified? Sign in</a></div>}

          <div className="auth-footer">
            <a href="/login" className="auth-link">Already have an account? Sign in</a>
          </div>
          <p className="auth-footer-text">By continuing, you agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
          <SecurityFooter />
        </motion.div>
        {emailExists && emailExists.exists && <EmailTakenPopup />}
      </div>
    </AuthLayout>
  );
}
