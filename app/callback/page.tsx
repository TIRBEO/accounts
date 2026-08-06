"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { apiPost, apiFetch, ApiError } from "../lib/api";
import { getRedirectUrl } from "../lib/redirect";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        const magicToken = searchParams.get("magic_token");
        const urlToken = searchParams.get("token");

        let token: string | null = null;
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
              setState("success");
              setTimeout(() => { window.location.href = getRedirectUrl(); }, 1000);
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
          <span className="spinner" />
        </div>
      </AuthShell>
    );
  }

  if (state === "success") {
    return (
      <AuthShell title="Signed in">
        <div className="mt-2 space-y-5 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--success-surface)" }}
          >
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            You have been signed in. Redirecting...
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Authentication failed">
      <div className="mt-2 space-y-5">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--error)", color: "var(--error)", background: "var(--error-surface)" }}
        >
          <XCircle className="h-7 w-7" />
        </div>
        <p className="text-center text-sm" style={{ color: "var(--error)" }}>{error}</p>
        <a
          href={`/login?redirect_to=${encodeURIComponent(getRedirectUrl())}`}
          className="btn-primary w-full"
        >
          Back to sign in <ArrowRight size={16} />
        </a>
      </div>
    </AuthShell>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<AuthShell title="Loading..."><div className="flex justify-center py-6"><span className="spinner" /></div></AuthShell>}>
      <CallbackContent />
    </Suspense>
  );
}
