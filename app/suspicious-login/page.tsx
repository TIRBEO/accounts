"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { Button, Alert } from "@tirbeo/ui";
import { getRedirectUrl } from "../lib/redirect";
import { Monitor } from "lucide-react";

function SuspiciousLoginContent() {
  const searchParams = useSearchParams();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = searchParams.get("token") || "";
  const device = searchParams.get("device") || "Unknown device";
  const location = searchParams.get("location") || "Unknown location";
  const browser = searchParams.get("browser") || "Web browser";

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/suspicious-login/confirm", { token });
      setConfirmed(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to confirm. Please try again.");
      }
    }
    setLoading(false);
  }, [token]);

  const handleDeny = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await apiPost("auth/suspicious-login/deny", { token });
    } catch {}
    window.location.href = "/login";
  }, [token]);

  if (confirmed) {
    return (
      <AuthShell title="Confirmed" subtitle="Thank you. You can now continue.">
        <a href={getRedirectUrl()}
          className="flex w-full items-center justify-center h-8 px-4 rounded-[7px] bg-[#1A73E8] text-[13px] font-medium text-white hover:bg-[#1769d2] transition-colors">
          Continue to Dashboard
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirm it's you" subtitle="We noticed a sign-in attempt from an unrecognized device.">
      <div className="space-y-4">
        <div className="flex items-center gap-3.5 rounded-[7px] border border-[#dadce0] bg-[#f8f9fa] p-3.5">
          <Monitor className="w-7 h-7 text-[#5f6368]" />
          <div>
            <p className="text-[13px] font-medium text-[#202124]">{browser}</p>
            <p className="text-xs text-[#5f6368]">{device}</p>
            <p className="text-xs text-[#5f6368] mt-0.5">{location}</p>
          </div>
        </div>
        <p className="text-[13px] text-[#5f6368]">If this was you, confirm to proceed. Otherwise, deny to secure your account.</p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex gap-2.5">
          <Button type="button" variant="outline" onClick={handleDeny} disabled={loading}
            className="flex-1 h-8 text-[13px] font-medium rounded-[7px] border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124]">
            This wasn't me
          </Button>
          <Button type="button" onClick={handleConfirm} loading={loading}
            className="flex-1 h-8 text-[13px] font-medium rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] text-white">
            Yes, it's me
          </Button>
        </div>
        <p className="text-center">
          <a href="/challenge" className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] hover:underline">
            Try another way to verify
          </a>
        </p>
      </div>
    </AuthShell>
  );
}

export default function SuspiciousLoginPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <SuspiciousLoginContent />
    </Suspense>
  );
}
