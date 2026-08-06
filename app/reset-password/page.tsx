"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { PasswordStrength } from "@tirbeo/ui";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [invalidToken, setInvalidToken] = useState(!token);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errors: Record<string, string> = {};
      if (!newPassword || newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
      if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";
      if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
      setFieldErrors({});
      setLoading(true);
      setError("");
      try {
        await apiPost("auth/password-reset/confirm", { resetToken: token, newPassword });
        setDone(true);
      } catch (err: unknown) {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to reset password. The link may have expired.");
      }
      setLoading(false);
    },
    [token, newPassword, confirmPassword]
  );

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="space-y-4 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your password has been changed successfully.
          </p>
          <a href="/login" className="btn-primary w-full">
            Sign in <ArrowRight size={17} />
          </a>
        </div>
      </AuthShell>
    );
  }

  if (invalidToken) {
    return (
      <AuthShell title="Invalid link">
        <div className="space-y-4 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <a href="/forgot-password" className="btn-primary w-full">
            Reset password
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={email ? `Set a new password for ${email}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="form-label required">New password</label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setFieldErrors({}); }}
              placeholder="At least 8 characters"
              autoFocus
              autoComplete="new-password"
              className="!pr-12"
              aria-invalid={!!fieldErrors.newPassword}
              style={{ borderColor: fieldErrors.newPassword ? "var(--error)" : undefined }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 transition-opacity hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.newPassword && <p className="mt-1.5 text-xs" style={{ color: "var(--error)" }}>{fieldErrors.newPassword}</p>}
          <PasswordStrength password={newPassword} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="form-label required">Confirm password</label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors({}); }}
              placeholder="Re-enter password"
              autoComplete="new-password"
              className="!pr-12"
              aria-invalid={!!fieldErrors.confirmPassword}
              style={{ borderColor: fieldErrors.confirmPassword ? "var(--error)" : undefined }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 transition-opacity hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
              tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs" style={{ color: "var(--error)" }}>{fieldErrors.confirmPassword}</p>}
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "var(--error)", color: "var(--error)", background: "var(--error-surface)" }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={!newPassword || newPassword.length < 8 || !confirmPassword || loading}
          className="btn-primary w-full"
        >
          {loading ? "Updating..." : "Update password"}
          {!loading && <ArrowRight size={17} />}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="Loading..."><div className="flex justify-center py-6"><span className="spinner" /></div></AuthShell>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
