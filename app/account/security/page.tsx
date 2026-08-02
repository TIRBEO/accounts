"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Globe, Laptop, Smartphone, Shield } from "lucide-react";
import { PasswordStrength } from "@tirbeo/ui";

interface SecurityEvent {
  id: string;
  event: string;
  details?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export default function SecurityPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const eventsData = await apiGet("security/events");
        const eventList = Array.isArray(eventsData) ? eventsData : eventsData?.events || [];
        setEvents(eventList.slice(0, 10));
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
      } finally {
        setLoading(false);
        setEventsLoading(false);
      }
    }
    load();
  }, [router]);

  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);

    if (!currentPassword) { setPassError("Current password is required."); return; }
    if (newPassword.length < 8) { setPassError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPassError("Passwords do not match."); return; }

    setPassLoading(true);
    try {
      await apiPost("security/password", {
        currentPassword,
        newPassword,
      });
      setPassSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: unknown) {
      setPassError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setPassLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleRecoveryEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess(false);

    if (!recoveryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      setRecoveryError("Please enter a valid email address.");
      return;
    }

    setRecoveryLoading(true);
    try {
      await apiPost("security/recovery-email", { email: recoveryEmail });
      setRecoverySuccess(true);
      setTimeout(() => setRecoverySuccess(false), 4000);
    } catch (err: unknown) {
      setRecoveryError(err instanceof ApiError ? err.message : "Failed to set recovery email.");
    } finally {
      setRecoveryLoading(false);
    }
  }, [recoveryEmail]);

  const getEventIcon = useCallback((event: string) => {
    const t = event.toLowerCase();
    if (t.includes("login") || t.includes("signin")) return <Laptop size={16} />;
    if (t.includes("password")) return <Shield size={16} />;
    if (t.includes("mfa") || t.includes("2fa") || t.includes("totp")) return <Smartphone size={16} />;
    return <Globe size={16} />;
  }, []);

  const getEventColor = useCallback((event: string) => {
    const t = event.toLowerCase();
    if (t.includes("login") || t.includes("signin")) return "text-[#1A73E8]";
    if (t.includes("password")) return "text-[#EA8600]";
    if (t.includes("mfa") || t.includes("2fa") || t.includes("totp")) return "text-[#188038]";
    return "text-[#5F6368]";
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>Security</h1>
        <p className="mt-1 text-sm text-[#5F6368]">Manage your password, recovery options, and security activity.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
          <p className="text-sm text-[#D93025]">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-[#DADCE0] bg-white">
        <div className="grid gap-6 p-6 sm:p-7 md:grid-cols-2 md:gap-10">
          <div>
            <h2 className="text-base font-medium text-[#202124]">Change Password</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">
              Use a strong password that you don&apos;t use for any other account. It must be at least 8 characters long.
            </p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="relative">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[#202124] mb-1.5">Current password</label>
              <input
                id="currentPassword" type={showCurrent ? "text" : "password"} value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password" autoComplete="current-password"
                className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 pr-11 text-base text-[#202124] placeholder-[#80868B] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-[34px] text-[#5F6368] hover:text-[#202124]" tabIndex={-1} aria-label={showCurrent ? "Hide password" : "Show password"}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <label htmlFor="newPassword" className="block text-sm font-medium text-[#202124] mb-1.5">New password</label>
              <input
                id="newPassword" type={showNew ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password" autoComplete="new-password"
                className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 pr-11 text-base text-[#202124] placeholder-[#80868B] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-[34px] text-[#5F6368] hover:text-[#202124]" tabIndex={-1} aria-label={showNew ? "Hide password" : "Show password"}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
            <div className="relative">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#202124] mb-1.5">Confirm new password</label>
              <input
                id="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password" autoComplete="new-password"
                className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 pr-11 text-base text-[#202124] placeholder-[#80868B] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-[34px] text-[#5F6368] hover:text-[#202124]" tabIndex={-1} aria-label={showConfirm ? "Hide password" : "Show password"}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passError && (
              <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
                <p className="text-sm text-[#D93025]">{passError}</p>
              </div>
            )}
            {passSuccess && (
              <div className="rounded-lg border border-[#C6E9C3] bg-[#E6F4EA] p-3">
                <p className="text-sm text-[#188038] flex items-center gap-1.5"><CheckCircle size={16} /> Password changed successfully.</p>
              </div>
            )}
            <button type="submit" disabled={passLoading || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center justify-center gap-2 h-12 rounded-lg bg-[#1A73E8] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1769d2] disabled:opacity-50">
              {passLoading && <Loader2 size={16} className="animate-spin" />}
              {passLoading ? "Changing..." : "Change password"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-[#DADCE0] bg-white">
        <div className="grid gap-6 p-6 sm:p-7 md:grid-cols-2 md:gap-10">
          <div>
            <h2 className="text-base font-medium text-[#202124]">Recovery Email</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">
              A recovery email can be used to regain access to your account if you forget your password or lose access to your device.
            </p>
          </div>
          <form onSubmit={handleRecoveryEmail} className="space-y-4">
            <div>
              <label htmlFor="recoveryEmail" className="block text-sm font-medium text-[#202124] mb-1.5">Recovery email</label>
              <input
                id="recoveryEmail" type="email" value={recoveryEmail}
                onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryError(""); }}
                placeholder="recovery@example.com" autoComplete="email"
                className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 text-base text-[#202124] placeholder-[#80868B] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
              />
            </div>
            {recoveryError && (
              <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
                <p className="text-sm text-[#D93025]">{recoveryError}</p>
              </div>
            )}
            {recoverySuccess && (
              <div className="rounded-lg border border-[#C6E9C3] bg-[#E6F4EA] p-3">
                <p className="text-sm text-[#188038] flex items-center gap-1.5"><CheckCircle size={16} /> Recovery email updated.</p>
              </div>
            )}
            <button type="submit" disabled={recoveryLoading || !recoveryEmail}
              className="flex items-center justify-center gap-2 h-12 rounded-lg bg-[#1A73E8] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1769d2] disabled:opacity-50">
              {recoveryLoading && <Loader2 size={16} className="animate-spin" />}
              {recoveryLoading ? "Saving..." : "Save recovery email"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-[#DADCE0] bg-white">
        <div className="flex items-center gap-2 border-b border-[#DADCE0] px-4 py-4">
          <Shield size={16} className="text-[#5F6368]" />
          <h2 className="text-sm font-medium text-[#202124]">Recent Security Activity</h2>
        </div>
        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#5F6368]">No security events recorded.</div>
        ) : (
          <div className="divide-y divide-[#DADCE0]">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 px-4 py-3.5">
                <div className={`mt-0.5 ${getEventColor(event.event)}`}>{getEventIcon(event.event)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#202124]">{event.event}</p>
                  {event.details && <p className="text-xs text-[#5F6368] mt-0.5">{event.details}</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-[#5F6368]">{formatDate(event.createdAt)}</p>
                  {event.ip && <p className="text-xs text-[#5F6368]">{event.ip}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
