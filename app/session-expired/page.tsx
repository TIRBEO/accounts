"use client";

import { AuthShell } from "../components/auth-shell";
import { img } from "../components/ui-constants";

export default function SessionExpiredPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const redirectTo = params.get("redirect_to") || "";
  const loginLink = `/login${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <AuthShell title="Session expired" subtitle="Your session has expired. Sign in to continue.">
      <div className="mt-6 space-y-6">
        <img src={img("session-revoked")} alt="Session expired"
          className="w-full max-w-[340px] mx-auto rounded-xl border border-[#e8eaed] shadow-sm" />
        <div className="flex justify-center">
          <a href={loginLink}
            className="h-9 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors inline-flex items-center justify-center">
            Sign in
          </a>
        </div>
      </div>
    </AuthShell>
  );
}
