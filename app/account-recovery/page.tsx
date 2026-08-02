"use client";

import { useState, useCallback } from "react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { ShieldCheck } from "lucide-react";

export default function AccountRecoveryPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setFieldError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFieldError("Enter a valid email"); return; }
    setFieldError("");
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/account-recovery", { email: email.trim() });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status !== 404) setError(err.message);
      }
    }
    setDone(true);
    setLoading(false);
  }, [email]);

  if (done) {
    return (
      <AuthShell title="Request sent" subtitle="If the email matches our records, recovery instructions will be sent.">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FE]">
            <ShieldCheck className="h-7 w-7 text-[#1A73E8]" />
          </div>
          <div className="rounded-[7px] bg-[#f8f9fa] border border-[#dadce0] px-4 py-5">
            <p className="text-[13px] text-[#5f6368]">
              If an account exists for <strong className="text-[#202124]">{email}</strong>, recovery instructions will be sent shortly.
            </p>
          </div>
          <a href="/login"
            className="flex w-full items-center justify-center h-8 rounded-[7px] bg-[#1A73E8] text-[13px] font-medium text-white hover:bg-[#1769d2] transition-colors">
            Back to sign in
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Account recovery" subtitle="Enter your email to receive recovery instructions.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="recovery-email" className="block text-[13px] font-medium text-[#3c4043] mb-1">Email</label>
          <input id="recovery-email" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setFieldError(""); setError(""); }}
            placeholder="you@example.com" autoFocus autoComplete="email"
            className="block w-full h-9 rounded-[7px] border border-[#dadce0] bg-white px-3 text-[13px] text-[#202124] outline-none transition-colors placeholder:text-[#80868b] focus:border-[#1A73E8] focus:shadow-[0_0_0_1px_#1A73E8]"
            aria-invalid={!!fieldError} />
          {fieldError && <p className="text-[12px] text-[#d93025] mt-1">{fieldError}</p>}
        </div>
        {error && <p className="text-[13px] text-[#d93025]">{error}</p>}
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={!email.trim() || loading}
            className="h-8 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {loading && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Send recovery email
          </button>
        </div>
        <p className="text-center pt-1">
          <a href="/login" className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">Back to sign in</a>
        </p>
      </form>
    </AuthShell>
  );
}
