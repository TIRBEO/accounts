"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Puzzle, Trash2, AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react";

interface ConnectedApp {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  permissions?: string[];
  connectedAt: string;
  lastUsedAt?: string;
  website?: string;
}

export default function ConnectedAppsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadApps = useCallback(async () => {
    try {
      const data = await apiGet("activity");
      const appsList = Array.isArray(data)
        ? data.filter((a: any) => a.type === "oauth" || a.type === "app")
        : data?.apps || data?.connectedApps || [];
      setApps(appsList);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError("Failed to load connected apps.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadApps(); }, [loadApps]);

  const handleRevoke = useCallback(async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setRevokingId(id);
    setActionError("");
    setActionSuccess("");
    try {
      await apiPost(`oauth/consent/${id}`, undefined);
      setApps((prev) => prev.filter((a) => a.id !== id));
      setActionSuccess("App access revoked.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to revoke access.");
    } finally {
      setRevokingId(null);
    }
  }, [confirmId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "Never";
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
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Connected apps</h1>
        <p className="mt-1 text-sm text-gray-500">Apps and services with access to your account.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AlertCircle size={15} className="text-gray-400 flex-shrink-0" />
          {error}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AlertCircle size={15} className="text-gray-400 flex-shrink-0" />
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle size={15} className="text-gray-400 flex-shrink-0" />
          {actionSuccess}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="py-16 text-center">
          <Puzzle size={22} className="mx-auto text-gray-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-900">No connected apps</p>
          <p className="text-sm text-gray-400 mt-1">
            Apps you connect to your Tirbeo account will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {apps.map((app) => (
            <div key={app.id} className="py-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 overflow-hidden">
                  {app.icon ? (
                    <img src={app.icon} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Puzzle size={15} className="text-gray-400" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900">{app.name}</p>
                    {app.website && (
                      <a
                        href={app.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-gray-600 transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  {app.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{app.description}</p>
                  )}
                  {app.permissions && app.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {app.permissions.map((perm, i) => (
                        <span
                          key={i}
                          className="text-xs text-gray-500 bg-gray-50 rounded px-1.5 py-0.5"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    Connected {formatDate(app.connectedAt)} · Last used {timeAgo(app.lastUsedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmId(app.id)}
                disabled={revokingId === app.id}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50 flex-shrink-0 py-1"
              >
                {revokingId === app.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setConfirmId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-medium text-gray-900">Revoke access?</h3>
            <p className="text-sm text-gray-500 mt-1.5">
              This app will no longer have access to your account. You may lose functionality in the app.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmId(null)}
                className="h-9 rounded-lg px-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                className="h-9 rounded-lg bg-gray-900 px-3.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
