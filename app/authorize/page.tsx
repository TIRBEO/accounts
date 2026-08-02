"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  profile: "View your profile info (name, picture)",
  email: "View your email address",
};

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [client, setClient] = useState<{ name: string; icon?: string } | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const scopeParam = searchParams.get("scope") || "openid";

  useEffect(() => {
    if (clientId) {
      apiPost("auth/oauth/authorize", {
        clientId, redirectUri,
        scopes: scopeParam.split(" "),
        responseType: "code", state,
      }).then(data => {
        if (data.loginRequired) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
        if (data.clientName) setClient({ name: data.clientName, icon: data.clientIcon });
      }).catch(() => {});
    }
  }, [clientId, redirectUri, scopeParam, state, router]);

  const displayScopes = scopeParam.split(" ").filter(s => s && s !== "openid");

  const handleAuthorize = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("auth/oauth/authorize", {
        clientId, redirectUri,
        scopes: scopeParam.split(" "),
        responseType: "code", state,
      });
      setAuthorized(true);
      setTimeout(() => { window.location.href = data.redirectUrl; }, 1200);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Authorization failed. Please try again.");
    }
    setLoading(false);
  }, [clientId, redirectUri, scopeParam, state]);

  const handleDeny = useCallback(() => {
    try {
      const u = new URL(redirectUri);
      const host = u.hostname;
      const allowed = host.endsWith('.tirbeo.app') || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';
      if (!allowed) throw new Error('disallowed');
      u.searchParams.set('error', 'access_denied');
      if (state) u.searchParams.set('state', state);
      window.location.href = u.toString();
    } catch {
      window.location.href = '/login?error=access_denied';
    }
  }, [redirectUri, state]);

  if (!clientId) {
    return (
      <AuthShell title="Authorization required">
        <p className="text-[13px] text-[#d93025] mt-8 text-center">Missing client_id parameter.</p>
      </AuthShell>
    );
  }

  if (authorized) {
    return (
      <AuthShell title="Access granted">
        <div className="mt-8 space-y-4 text-center">
          <p className="text-sm text-[#5f6368]">Returning to {client?.name || clientId}...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Authorize application">
      <div className="mt-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1A73E8] text-lg font-semibold">
            {client?.name?.[0] || "A"}
          </div>
          <h2 className="text-xl font-semibold text-[#202124]">{client?.name || "Application"}</h2>
          <p className="mt-1 text-sm text-[#5f6368]">Tirbeo application</p>
        </div>
        <p className="text-center text-sm text-[#5f6368]">{client?.name || "This application"} wants to use your Tirbeo Account.</p>

        <div className="rounded-[7px] border border-[#dadce0] bg-[#f8f9fa] p-4">
          <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-3">This app will be able to:</p>
          <ul className="space-y-2">
            {displayScopes.length === 0 ? (
              <li className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[10px] text-[#1A73E8]">✓</span>
                <span className="text-[#202124]">Verify your identity</span>
              </li>
            ) : (
              displayScopes.map(scope => (
                <li key={scope} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[10px] text-[#1A73E8]">✓</span>
                  <span className="text-[#202124]">{SCOPE_LABELS[scope] || scope}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-[7px] border border-[#dadce0] bg-white p-4">
          <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-3">It will NOT be able to:</p>
          <ul className="space-y-2">
            {["Change your password", "Access your security settings", "Delete your account"].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-[#d93025] text-base leading-none">×</span>
                <span className="text-[#5f6368]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="text-[13px] text-[#d93025] text-center">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={handleDeny}
            className="flex-1 h-9 rounded-[7px] border border-[#dadce0] bg-white text-[#5f6368] text-[14px] font-medium hover:bg-[#f8f9fa] hover:text-[#202124] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleAuthorize} disabled={loading}
            className="flex-1 h-9 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
            {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Allow
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <AuthorizeContent />
    </Suspense>
  );
}
