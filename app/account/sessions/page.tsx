"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Monitor, Smartphone, Globe, Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Session {
  id: string;
  device?: string;
  browser?: string;
  location?: string;
  ip?: string;
  isCurrent?: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ type: "single" | "all"; id?: string } | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiGet("security/sessions");
      setSessions(Array.isArray(data) ? data : data?.sessions || []);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleRevokeSingle = useCallback(async () => {
    if (!confirmDialog || confirmDialog.type !== "single" || !confirmDialog.id) return;
    const id = confirmDialog.id;
    setConfirmDialog(null);
    setRevokingId(id);
    setActionError("");
    setActionSuccess("");
    try {
      await apiPost(`security/sessions/${id}`, undefined);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActionSuccess("Session revoked.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  }, [confirmDialog]);

  const handleRevokeAll = useCallback(async () => {
    setConfirmDialog(null);
    setRevokingAll(true);
    setActionError("");
    setActionSuccess("");
    try {
      await apiPost("security/sessions", undefined);
      await loadSessions();
      setActionSuccess("All other sessions signed out.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to revoke sessions.");
    } finally {
      setRevokingAll(false);
    }
  }, [loadSessions]);

  const getDeviceIcon = (session: Session) => {
    const device = (session.device || "").toLowerCase();
    const ua = (session.browser || "").toLowerCase();
    if (device.includes("mobile") || device.includes("iphone") || device.includes("android")) {
      return <Smartphone size={18} />;
    }
    if (ua.includes("mobile")) return <Smartphone size={18} />;
    return <Monitor size={18} />;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>Sessions</h1>
          <p className="mt-1 text-sm text-[#5F6368]">Manage your active sessions across devices.</p>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={() => setConfirmDialog({ type: "all" })}
            disabled={revokingAll}
            className="flex items-center gap-2 h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] transition-colors hover:bg-[#F1F3F4] hover:text-[#202124] disabled:opacity-50"
          >
            {revokingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Sign out all other sessions
          </button>
        )}
      </div>

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

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-[#DADCE0] bg-white p-12 text-center">
          <Monitor size={32} className="mx-auto text-[#5F6368] mb-3" />
          <h3 className="text-base font-medium text-[#202124]">No active sessions</h3>
          <p className="text-sm text-[#5F6368] mt-1">Sign in to create a session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-[#DADCE0] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1F3F4] text-[#5F6368]">
                    {getDeviceIcon(session)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#202124]">
                        {session.device || session.browser || "Unknown device"}
                      </p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-[#E8F0FE] px-2 py-0.5 text-xs font-medium text-[#1A73E8]">
                          Current session
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5F6368] mt-1">
                      {session.browser && `${session.browser}`}
                      {session.location && ` · ${session.location}`}
                      {session.ip && ` · ${session.ip}`}
                    </p>
                    <p className="text-xs text-[#5F6368] mt-0.5">
                      Active {timeAgo(session.lastActiveAt)} · Created {formatDate(session.createdAt)}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => setConfirmDialog({ type: "single", id: session.id })}
                    disabled={revokingId === session.id}
                    className="flex items-center gap-1.5 h-9 rounded-lg border border-[#DADCE0] bg-white px-3 text-xs font-medium text-[#5F6368] transition-colors hover:bg-[#FDEDED] hover:text-[#D93025] hover:border-[#F5C6CB] disabled:opacity-50 flex-shrink-0"
                  >
                    {revokingId === session.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setConfirmDialog(null)}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-[#202124]">
                {confirmDialog.type === "all" ? "Sign out all other sessions?" : "Revoke session?"}
              </h3>
              <p className="text-sm text-[#5F6368] mt-2">
                {confirmDialog.type === "all"
                  ? "This will sign out all sessions except your current one. You may need to sign in again on other devices."
                  : "This will sign this device out of your account."}
              </p>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.type === "all" ? handleRevokeAll : handleRevokeSingle}
                  className="h-10 rounded-lg bg-[#D93025] px-4 text-sm font-medium text-white hover:bg-[#B3261E] transition-colors"
                >
                  {confirmDialog.type === "all" ? "Sign out" : "Revoke"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
