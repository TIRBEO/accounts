"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Key, Pencil, Trash2, Plus, AlertCircle, CheckCircle, Loader2, Fingerprint } from "lucide-react";

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export default function PasskeysPage() {
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingLoading, setRenamingLoading] = useState(false);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadPasskeys = useCallback(async () => {
    try {
      const data = await apiGet("passkey/list");
      setPasskeys(Array.isArray(data) ? data : data?.passkeys || []);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      }
      setError("Failed to load passkeys.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadPasskeys(); }, [loadPasskeys]);

  const handleAddPasskey = useCallback(async () => {
    setAdding(true);
    setAddError("");
    try {
      const options = await apiPost("passkey/register/options");
      const { startRegistration } = await import("@simplewebauthn/browser");
      const cred = await startRegistration({ optionsJSON: options });
      await apiPost("passkey/register/verify", cred);
      await loadPasskeys();
      setActionSuccess("Passkey added successfully.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "SecurityError" || err.message?.includes("cancel")) {
          setAddError("Registration was cancelled.");
        } else {
          setAddError(err instanceof ApiError ? err.message : "Failed to add passkey.");
        }
      } else {
        setAddError("Failed to add passkey.");
      }
    } finally {
      setAdding(false);
    }
  }, [loadPasskeys]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    setDeletingId(id);
    setActionError("");
    try {
      await apiPost(`passkey/${id}`, undefined);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setActionSuccess("Passkey deleted.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete passkey.");
    } finally {
      setDeletingId(null);
    }
  }, [deleteConfirmId]);

  const handleRename = useCallback(async (id: string) => {
    if (!renameValue.trim()) return;
    setRenamingLoading(true);
    setActionError("");
    try {
      await apiPost(`passkey/${id}`, { name: renameValue.trim() });
      setPasskeys((prev) => prev.map((p) => (p.id === id ? { ...p, name: renameValue.trim() } : p)));
      setRenamingId(null);
      setRenameValue("");
      setActionSuccess("Passkey renamed.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to rename passkey.");
    } finally {
      setRenamingLoading(false);
    }
  }, [renameValue]);

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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>Passkeys</h1>
          <p className="mt-1 text-sm text-[#5F6368]">Add or remove passkeys for passwordless sign-in.</p>
        </div>
        <button
          onClick={handleAddPasskey}
          disabled={adding}
          className="flex items-center gap-2 h-12 rounded-lg bg-[#1A73E8] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1769d2] disabled:opacity-50"
        >
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {adding ? "Adding..." : "Add passkey"}
        </button>
      </div>

      {addError && (
        <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
          <p className="text-sm text-[#D93025] flex items-center gap-1.5"><AlertCircle size={16} /> {addError}</p>
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

      {passkeys.length === 0 ? (
        <div className="rounded-xl border border-[#DADCE0] bg-white p-12 text-center">
          <Fingerprint size={32} className="mx-auto text-[#5F6368] mb-3" />
          <h3 className="text-base font-medium text-[#202124]">No passkeys yet</h3>
          <p className="text-sm text-[#5F6368] mt-1">Add a passkey for quick, secure sign-in.</p>
          <button
            onClick={handleAddPasskey}
            disabled={adding}
            className="mt-4 inline-flex items-center gap-2 h-10 rounded-lg bg-[#1A73E8] px-4 text-sm font-medium text-white hover:bg-[#1769d2] transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {adding ? "Adding..." : "Add passkey"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div key={passkey.id} className="rounded-xl border border-[#DADCE0] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
                    <Key size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {renamingId === passkey.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(passkey.id);
                            if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                          }}
                          className="h-9 rounded-lg border border-[#DADCE0] bg-white px-3 text-sm text-[#202124] outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
                        />
                        <button
                          onClick={() => handleRename(passkey.id)}
                          disabled={renamingLoading || !renameValue.trim()}
                          className="h-9 rounded-lg bg-[#1A73E8] px-3 text-xs font-medium text-white hover:bg-[#1769d2] transition-colors disabled:opacity-50"
                        >
                          {renamingLoading ? "..." : "Save"}
                        </button>
                        <button
                          onClick={() => { setRenamingId(null); setRenameValue(""); }}
                          className="h-9 rounded-lg border border-[#DADCE0] bg-white px-3 text-xs font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-[#202124]">{passkey.name}</p>
                    )}
                    <p className="text-xs text-[#5F6368] mt-1">
                      Created {formatDate(passkey.createdAt)} · Last used {timeAgo(passkey.lastUsedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { setRenamingId(passkey.id); setRenameValue(passkey.name); }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DADCE0] bg-white text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
                    aria-label="Rename passkey"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(passkey.id)}
                    disabled={deletingId === passkey.id}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DADCE0] bg-white text-[#5F6368] hover:bg-[#FDEDED] hover:text-[#D93025] hover:border-[#F5C6CB] transition-colors disabled:opacity-50"
                    aria-label="Delete passkey"
                  >
                    {deletingId === passkey.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#202124]">Delete passkey?</h3>
            <p className="text-sm text-[#5F6368] mt-2">
              This passkey will be removed from your account and can no longer be used for sign-in.
            </p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="h-10 rounded-lg border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="h-10 rounded-lg bg-[#D93025] px-4 text-sm font-medium text-white hover:bg-[#B3261E] transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
