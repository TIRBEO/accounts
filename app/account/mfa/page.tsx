"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { OTPInput } from "@tirbeo/ui";
import {
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

interface TotpSetup {
  secret: string;
  uri: string;
}

interface BackupCode {
  code: string;
  used?: boolean;
  usedAt?: string;
}

export default function MFAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);

  const [step, setStep] = useState<"idle" | "setup" | "verify" | "codes">("idle");
  const [setupData, setSetupData] = useState<TotpSetup | null>(null);
  const [otp, setOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesRevealed, setCodesRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const [disableConfirm, setDisableConfirm] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const codesData = await apiGet("security/backup-codes/list").catch(() => []);
        const count = typeof codesData?.count === "number" ? codesData.count : 0;
        if (count > 0) {
          setEnabled(true);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleSetup = useCallback(async () => {
    setError("");
    try {
      const data = await apiPost("security/totp/setup");
      setSetupData(data);
      setStep("setup");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to start setup.");
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const data = await apiPost("security/totp/verify", { token: otp });
      setEnabled(true);
      setStep("codes");
      setBackupCodes((data?.backupCodes || []).map((c: string | BackupCode) => (typeof c === "string" ? { code: c } : c)));
      setCodesRevealed(true);
    } catch (err: unknown) {
      setVerifyError(err instanceof ApiError ? err.message : "Invalid code. Try again.");
      setOtp("");
    } finally {
      setVerifyLoading(false);
    }
  }, [otp]);

  const loadBackupCodes = useCallback(async () => {
    setCodesLoading(true);
    try {
      const data = await apiGet("security/backup-codes/list");
      if (typeof data?.count === "number" && data.count > 0) {
        setEnabled(true);
      }
    } catch {
      // silently fail
    } finally {
      setCodesLoading(false);
    }
  }, []);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setActionError("");
    try {
      const data = await apiPost("security/backup-codes/regenerate");
      const codes = Array.isArray(data) ? data : data?.codes || [];
      setBackupCodes(codes.map((c: string | BackupCode) => (typeof c === "string" ? { code: c } : c)));
      setCodesRevealed(true);
      setActionSuccess("Backup codes regenerated.");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to regenerate codes.");
    } finally {
      setRegenerating(false);
    }
  }, []);

  const handleDisable = useCallback(async () => {
    setDisabling(true);
    setActionError("");
    try {
      await apiPost("security/totp/disable");
      setEnabled(false);
      setStep("idle");
      setSetupData(null);
      setBackupCodes([]);
      setCodesRevealed(false);
      setDisableConfirm(false);
      setActionSuccess("Two-step verification disabled.");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to disable.");
    } finally {
      setDisabling(false);
    }
  }, []);

  const handleCopyCodes = useCallback(() => {
    const text = backupCodes.map((b) => b.code).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [backupCodes]);

  const availableCodes = backupCodes.filter((b) => !b.used);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
      </div>
    );
  }

  if (step === "setup" && setupData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>
            2-Step Verification
          </h1>
          <p className="mt-1 text-sm text-[#5F6368]">Scan the QR code or enter the secret key in your authenticator app.</p>
        </div>

        <div className="rounded-xl border border-[#DADCE0] bg-white p-6 sm:p-7">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#E8F0FE] mb-4">
              <Smartphone size={28} className="text-[#1A73E8]" />
            </div>
            <h2 className="text-lg font-medium text-[#202124]">Scan QR Code</h2>
            <p className="text-sm text-[#5F6368] mt-1">Use your authenticator app to scan this code.</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-48 h-48 rounded-xl border border-[#DADCE0] bg-white p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.uri)}`}
                alt="QR Code for TOTP setup"
                className="w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-[#F8F9FA] border border-[#DADCE0] px-4 py-2.5">
              <code className="text-sm text-[#202124] font-mono select-all">{setupData.secret}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(setupData.secret);
                }}
                className="text-[#5F6368] hover:text-[#202124] transition-colors"
                aria-label="Copy secret key"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#DADCE0]">
            <h3 className="text-sm font-medium text-[#202124] mb-3">Enter the code from the app</h3>
            <OTPInput
              value={otp}
              onChange={setOtp}
              error={!!verifyError}
            />
            {verifyError && (
              <p className="text-sm text-center text-[#D93025] mt-3">{verifyError}</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={() => { setStep("idle"); setSetupData(null); setOtp(""); setVerifyError(""); }}
                className="h-12 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={otp.length !== 6 || verifyLoading}
                className="flex items-center justify-center gap-2 h-12 rounded-lg bg-[#1A73E8] px-4 text-sm font-medium text-white hover:bg-[#1769d2] transition-colors disabled:opacity-50"
              >
                {verifyLoading && <Loader2 size={16} className="animate-spin" />}
                {verifyLoading ? "Verifying..." : "Verify & enable"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "codes") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>
            2-Step Verification
          </h1>
          <p className="mt-1 text-sm text-[#5F6368]">
            Two-step verification is now enabled. Save your backup codes in a safe place.
          </p>
        </div>

        <div className="rounded-xl border border-[#DADCE0] bg-white p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-[#188038]" />
            <h2 className="text-base font-medium text-[#202124]">Backup Codes</h2>
          </div>
          <p className="text-sm text-[#5F6368] mb-4">
            Each code can be used once to sign in if you lose access to your authenticator app.
            Store them somewhere safe.
          </p>

          {codesLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((bc, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-[#F8F9FA] border border-[#DADCE0] px-3 py-2 font-mono text-sm text-[#202124] text-center"
                  >
                    {bc.code}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyCodes}
                  className="flex items-center gap-1.5 h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
                >
                  {copied ? <Check size={14} className="text-[#188038]" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy codes"}
                </button>
              </div>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-[#DADCE0] flex items-center justify-between">
            <p className="text-sm text-[#5F6368]">
              <CheckCircle size={16} className="inline mr-1 text-[#188038]" />
              2-Step verification is enabled
            </p>
            <a
              href="/account/mfa"
              className="text-sm font-medium text-[#1A73E8] hover:underline"
            >
              Back to settings
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>
          2-Step Verification
        </h1>
        <p className="mt-1 text-sm text-[#5F6368]">
          Add an extra layer of security to your account.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
          <p className="text-sm text-[#D93025]">{error}</p>
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
          <p className="text-sm text-[#D93025] flex items-center gap-1.5"><AlertCircle size={16} /> {actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <div className="rounded-lg border border-[#C6E9C3] bg-[#E6F4EA] p-3">
          <p className="text-sm text-[#188038] flex items-center gap-1.5"><CheckCircle size={16} /> {actionSuccess}</p>
        </div>
      )}

      <div className="rounded-xl border border-[#DADCE0] bg-white p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
              enabled ? "bg-[#E6F4EA]" : "bg-[#F1F3F4]"
            }`}>
              {enabled ? (
                <ShieldCheck size={24} className="text-[#188038]" />
              ) : (
                <ShieldOff size={24} className="text-[#5F6368]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-medium text-[#202124]">
                Authenticator App
              </h2>
              <p className="text-sm text-[#5F6368] mt-1">
                {enabled
                  ? "Two-step verification is active. Use your authenticator app to generate codes."
                  : "Use an authenticator app to generate one-time codes for sign-in."}
              </p>
              {enabled && (
                <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-[#E6F4EA] px-2.5 py-0.5 text-xs font-medium text-[#188038]">
                  <CheckCircle size={12} /> Enabled
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {enabled ? (
              <button
                onClick={() => setDisableConfirm(true)}
                disabled={disabling}
                className="flex items-center gap-2 h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#D93025] hover:bg-[#FDEDED] hover:border-[#F5C6CB] transition-colors disabled:opacity-50"
              >
                {disabling ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
                Disable
              </button>
            ) : (
              <button
                onClick={handleSetup}
                className="flex items-center gap-2 h-10 rounded-lg bg-[#1A73E8] px-4 text-sm font-medium text-white hover:bg-[#1769d2] transition-colors"
              >
                <Smartphone size={16} />
                Set up
              </button>
            )}
          </div>
        </div>
      </div>

      {enabled && (
        <>
          <div className="rounded-xl border border-[#DADCE0] bg-white p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1F3F4] text-[#5F6368]">
                  <Key size={18} />
                </div>
                <div>
                  <h2 className="text-base font-medium text-[#202124]">Backup Codes</h2>
                  <p className="text-sm text-[#5F6368] mt-1">
                    {availableCodes.length} unused codes remaining.
                  </p>
                  {codesRevealed && (
                    <div className="mt-3 grid grid-cols-2 gap-2 max-w-xs">
                      {backupCodes.map((bc, i) => (
                        <div key={i} className="rounded bg-[#F8F9FA] border border-[#DADCE0] px-2.5 py-1.5 font-mono text-xs text-[#202124] text-center">
                          {bc.code}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setCodesRevealed(!codesRevealed)}
                  className="h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
                >
                  {codesRevealed ? "Hide codes" : "Show codes"}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-2 h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors disabled:opacity-50"
                >
                  {regenerating ? <Loader2 size={16} className="animate-spin" /> : null}
                  {regenerating ? "Regenerating..." : "Regenerate codes"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {disableConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDisableConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#202124]">Disable 2-Step Verification?</h3>
            <p className="text-sm text-[#5F6368] mt-2">
              Your account will lose the extra layer of security. You can re-enable it at any time.
            </p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setDisableConfirm(false)}
                className="h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="flex items-center gap-2 h-10 rounded-lg bg-[#D93025] px-4 text-sm font-medium text-white hover:bg-[#B3261E] transition-colors disabled:opacity-50"
              >
                {disabling && <Loader2 size={16} className="animate-spin" />}
                {disabling ? "Disabling..." : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
