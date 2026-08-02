"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { apiPost, apiFetch, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const magicToken = searchParams.get("magic_token");
    const code = searchParams.get("code");
    const oauthState = searchParams.get("state");
    const token = searchParams.get("token");

    async function handleCallback() {
      try {
        let token: string | null = null;
        const urlToken = searchParams.get("token");

        if (magicToken) {
          const data = await apiPost("auth/magic-link/verify", { token: magicToken });
          token = data.token || null;
        } else if (urlToken) {
          const data = await apiPost("auth/verify", { token: urlToken });
          token = data.token || null;
        } else {
          try {
            const me = await apiFetch('/api/users/me');
            if (me.ok) {
              const redirectUrl = getRedirectUrl();
              setTimeout(() => { window.location.href = redirectUrl; }, 1000);
              setState("success");
              return;
            }
          } catch {}
          setState("error");
          setError("Invalid callback parameters.");
          return;
        }
        setState("success");
        const redirectUrl = getRedirectUrl();
        if (token) {
          const url = new URL(redirectUrl);
          url.searchParams.set('token', token);
          setTimeout(() => { window.location.href = url.toString(); }, 1500);
        } else {
          setTimeout(() => { window.location.href = redirectUrl; }, 1500);
        }
      } catch (err: unknown) {
        setState("error");
        if (err instanceof ApiError) setError(err.message);
        else setError("Authentication failed. The link may have expired.");
      }
    }
    handleCallback();
  }, [searchParams]);

  if (state === "loading") {
    return (
      <AuthShell title="Signing you in...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    );
  }

  if (state === "success") {
    return (
      <AuthShell title="Signed in">
        <div className="mt-8 space-y-5 text-center">
          <p className="text-sm text-[#5f6368]">You have been signed in. Redirecting...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Authentication failed">
      <div className="mt-8 space-y-5">
        <p className="text-[13px] text-[#d93025] text-center">{error}</p>
        <div className="flex justify-center">
          <a href={`/login?redirect_to=${encodeURIComponent(getRedirectUrl())}`}
            className="h-9 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors inline-flex items-center justify-center">
            Back to sign in
          </a>
        </div>
      </div>
    </AuthShell>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <CallbackContent />
    </Suspense>
  );
}
