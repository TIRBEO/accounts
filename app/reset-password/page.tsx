"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { Button, PasswordStrength } from "@tirbeo/ui";
import { Eye, EyeOff } from "lucide-react";

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [token, newPassword, confirmPassword]);

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="space-y-4 text-center">
          <p className="text-[13px] text-[#5f6368]">Your password has been changed successfully.</p>
          <a href="/login"
            className="flex w-full items-center justify-center h-8 rounded-[7px] bg-[#1A73E8] text-[13px] font-medium text-white hover:bg-[#1769d2] transition-colors">
            Sign in
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="new-password" className="block text-[13px] font-medium text-[#3c4043] mb-1">New password</label>
          <div className="relative">
            <input id="new-password" type={showPassword ? "text" : "password"} value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setFieldErrors({}); }}
              placeholder="At least 8 characters" autoFocus autoComplete="new-password"
              className="block w-full h-9 rounded-[7px] border border-[#dadce0] bg-white px-3 pr-9 text-[13px] text-[#202124] outline-none transition-colors placeholder:text-[#80868b] focus:border-[#1A73E8] focus:shadow-[0_0_0_1px_#1A73E8]"
              aria-invalid={!!fieldErrors.newPassword} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] transition-colors" tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {fieldErrors.newPassword && <p className="text-[12px] text-[#d93025] mt-1">{fieldErrors.newPassword}</p>}
          <PasswordStrength password={newPassword} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-[13px] font-medium text-[#3c4043] mb-1">Confirm password</label>
          <div className="relative">
            <input id="confirm-password" type={showConfirm ? "text" : "password"} value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setFieldErrors({}); }}
              placeholder="Re-enter password" autoComplete="new-password"
              className="block w-full h-9 rounded-[7px] border border-[#dadce0] bg-white px-3 pr-9 text-[13px] text-[#202124] outline-none transition-colors placeholder:text-[#80868b] focus:border-[#1A73E8] focus:shadow-[0_0_0_1px_#1A73E8]"
              aria-invalid={!!fieldErrors.confirmPassword} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] transition-colors" tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}>
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="text-[12px] text-[#d93025] mt-1">{fieldErrors.confirmPassword}</p>}
        </div>
        {error && <p className="text-[13px] text-[#d93025]">{error}</p>}
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={!newPassword || newPassword.length < 8 || !confirmPassword} loading={loading}
            className="h-8 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Update password
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
