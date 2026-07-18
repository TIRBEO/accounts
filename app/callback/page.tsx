"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { appUrl } from "@tirbeo/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirbeo.app";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const magicToken = searchParams.get("magic_token");
    const code = searchParams.get("code");
    const redirectTo = searchParams.get("redirect") || appUrl("dashboard");

    // Validate redirect URL
    const validatedRedirect = (() => {
      try {
        const url = new URL(redirectTo);
        if (url.hostname.endsWith('tirbeo.app') || url.hostname === 'localhost') return redirectTo;
      } catch {}
      return appUrl('dashboard');
    })();

    if (magicToken) {
      // Magic link verification
      fetch(`${API}/api/auth/magic-link/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: magicToken }),
      })
        .then(async (res) => {
          if (res.ok) {
            window.location.href = validatedRedirect;
          } else {
            const text = await res.text();
            setError(text || "Magic link expired or invalid");
            setLoading(false);
          }
        })
        .catch(() => {
          setError("Failed to verify magic link");
          setLoading(false);
        });
    } else if (code) {
      // OAuth callback — API already set the cookie, just redirect
      window.location.href = validatedRedirect;
    } else {
      setError("No authorization token provided");
      setLoading(false);
    }
  }, [searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6" style={{ background: "#0A0A0B" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E45D5D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-white/80 font-medium">Authentication failed</p>
          <p className="text-white/40 text-sm mt-1">{error}</p>
          <a href="/login" className="inline-block mt-4 text-sm text-purple-secondary/80 hover:text-purple-secondary transition-colors">
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: "#0A0A0B" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-primary/20 border-t-purple-primary rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm mt-4">Completing sign in...</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center" style={{ background: "#0A0A0B" }}>
        <div className="w-8 h-8 border-2 border-purple-primary/20 border-t-purple-primary rounded-full animate-spin" />
      </main>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
