"use client";

import { useState, useCallback } from "react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { Fingerprint } from "lucide-react";
import { getRedirectUrl } from "../lib/redirect";

export default function PasskeyPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasskeyAuth = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const options = await apiPost("passkey/auth/options");
      const authResp = await startAuthentication({ optionsJSON: options });
      await apiPost("passkey/auth/verify", authResp);
      window.location.href = getRedirectUrl();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message || "Passkey authentication failed");
      else setError("Passkey authentication failed");
    }
    setLoading(false);
  }, []);

  return (
    <AuthShell title="Sign in with passkey" subtitle="Use your device to verify it's you.">
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <Fingerprint className="w-10 h-10 text-[#5f6368]" />
        </div>
        <div className="flex justify-center">
          <button type="button" onClick={handlePasskeyAuth} disabled={loading}
            className="h-8 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {loading && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Use passkey
          </button>
        </div>
        {error && <p className="text-[13px] text-center text-[#d93025]">{error}</p>}
        <p>
          <a href={`/login?redirect_to=${encodeURIComponent(getRedirectUrl())}`} className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">Sign in with password instead</a>
        </p>
      </div>
    </AuthShell>
  );
}
