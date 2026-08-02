"use client";

import { useState, useCallback } from "react";
import { AuthShell } from "../components/auth-shell";
import { apiPost } from "../lib/api";

export default function RecoveryPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleEmailRecovery = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/recovery-email/send-code", { email });
      setDone(true);
      setMessage("If the email matches, recovery instructions have been sent.");
    } catch {
      setDone(true);
      setMessage("If the email matches, recovery instructions have been sent.");
    }
    setLoading(false);
  }, [email]);

  if (done) {
    return (
      <AuthShell title="Request sent" subtitle="Check your email for recovery instructions.">
        <div className="space-y-4 text-center">
          <div className="rounded-[7px] bg-[#f8f9fa] border border-[#dadce0] px-4 py-5">
            <p className="text-[13px] text-[#5f6368]">{message}</p>
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
      <form onSubmit={handleEmailRecovery} className="space-y-3">
        <div>
          <label htmlFor="recovery-email" className="block text-[13px] font-medium text-[#3c4043] mb-1">Email</label>
          <input id="recovery-email" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            placeholder="you@example.com" autoFocus
            className="block w-full h-9 rounded-[7px] border border-[#dadce0] bg-white px-3 text-[13px] text-[#202124] outline-none transition-colors placeholder:text-[#80868b] focus:border-[#1A73E8] focus:shadow-[0_0_0_1px_#1A73E8]" />
        </div>
        {error && <p className="text-[13px] text-[#d93025]">{error}</p>}
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={!email || loading}
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
