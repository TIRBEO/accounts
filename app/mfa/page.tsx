"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { Button, OTPInput } from "@tirbeo/ui";
import { getRedirectUrl } from "../lib/redirect";
import { Fingerprint, Key, Smartphone } from "lucide-react";

type Method = "totp" | "recovery";

function MfaContent() {
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<Method>("totp");
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [tempToken] = useState(() => searchParams.get("tempToken") || "");
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "totp" && otp.length !== 6) return;
    if (method === "recovery" && !recoveryCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (method === "totp") {
        await apiPost("auth/verify-2fa", { tempToken, token: otp });
      } else {
        await apiPost("auth/recovery-2fa", { tempToken, recoveryCode: recoveryCode.trim() });
      }
      window.location.href = getRedirectUrl();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Verification failed. Try again.");
      setOtp("");
    }
    setLoading(false);
  }, [method, otp, recoveryCode, tempToken]);

  if (showAlternatives) {
    return (
      <AuthShell title="Choose another way" subtitle="Select a verification method">
        <div className="space-y-2.5">
          {[
            { id: "passkey", label: "Use a passkey", icon: Fingerprint, desc: "Fingerprint, face, or security key" },
            { id: "recovery", label: "Use recovery code", icon: Key, desc: "Enter a one-time recovery code" },
            { id: "totp", label: "Use authenticator app", icon: Smartphone, desc: "Enter a code from your authenticator" },
          ].map(item => (
            <button key={item.id} type="button" onClick={() => {
              if (item.id === "passkey") { window.location.href = `/passkey?redirect_to=${encodeURIComponent(getRedirectUrl())}`; return; }
              setMethod(item.id as Method);
              setShowAlternatives(false);
              setError("");
              setOtp("");
              setRecoveryCode("");
            }}
              className="flex w-full items-center gap-3.5 p-3.5 rounded-[7px] border border-[#dadce0] bg-white transition-colors hover:bg-[#f8f9fa] hover:border-[#1A73E8] text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[#1A73E8]/5 border border-[#1A73E8]/10">
                <item.icon className="w-4 h-4 text-[#1A73E8]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#202124]">{item.label}</p>
                <p className="text-xs text-[#5f6368] mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verify it's you" subtitle={method === "totp" ? "Enter the 6-digit code from your authenticator app." : "Enter your recovery code."}>
      <form onSubmit={handleVerify} className="space-y-4">
        {method === "totp" ? (
          <OTPInput value={otp} onChange={v => { setOtp(v); setError(""); }} error={!!error} />
        ) : (
          <div>
            <label htmlFor="recovery-code" className="block text-[13px] font-medium text-[#3c4043] mb-1.5">Recovery code</label>
            <input id="recovery-code" type="text" value={recoveryCode}
              onChange={e => { setRecoveryCode(e.target.value); setError(""); }}
              placeholder="XXXX-XXXX-XXXX" autoFocus autoComplete="off"
              className="block w-full h-10 rounded-[7px] border border-[#dadce0] bg-white px-3.5 text-[14px] text-[#202124] outline-none transition-all duration-200 placeholder:text-[#80868b] focus:border-[#1A73E8] focus:ring-[3px] focus:ring-[#1A73E8]/5 font-mono" />
          </div>
        )}
        {error && <p className="text-[13px] text-center text-[#d93025]">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={(method === "totp" ? otp.length !== 6 : !recoveryCode.trim())} loading={loading}
            className="h-8 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Continue
          </Button>
        </div>
        <div className="text-center space-y-2">
          {method === "totp" ? (
            <button type="button" onClick={() => setMethod("recovery")}
              className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
              Use recovery code instead
            </button>
          ) : (
            <button type="button" onClick={() => setMethod("totp")}
              className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
              Use authenticator app instead
            </button>
          )}
          <div>
            <button type="button" onClick={() => window.location.href = `/challenge?tempToken=${encodeURIComponent(tempToken)}&redirect_to=${encodeURIComponent(getRedirectUrl())}`}
              className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
              Try another way
            </button>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <MfaContent />
    </Suspense>
  );
}
