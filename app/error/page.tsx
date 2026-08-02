"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { img } from "../components/ui-constants";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  access_denied: { title: "Access denied", message: "You denied the authorization request." },
  expired_link: { title: "Link expired", message: "This link has expired. Request a new one." },
  invalid_request: { title: "Invalid request", message: "We couldn't complete that request." },
  server_error: { title: "Something went wrong", message: "An unexpected error occurred. Please try again." },
  session_expired: { title: "Session expired", message: "Your session has expired. Sign in to continue." },
};

const ERROR_IMAGES: Record<string, string> = {
  access_denied: img("access-denied"),
  expired_link: img("session-revoked"),
  session_expired: img("session-revoked"),
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || searchParams.get("error") || "server_error";
  const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES.server_error;
  const errorImage = ERROR_IMAGES[code] || img("access-denied");

  return (
    <AuthShell title={errorInfo.title} subtitle={errorInfo.message}>
      <div className="mt-6 space-y-5">
        <img src={errorImage} alt={errorInfo.title}
          className="w-full max-w-[340px] mx-auto rounded-xl border border-[#e8eaed] shadow-sm" />
        <div className="flex gap-3">
          <a href="/login"
            className="flex-1 flex items-center justify-center h-9 rounded-[7px] border border-[#dadce0] bg-white text-[14px] font-medium text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124] transition-colors">
            Sign in
          </a>
          <button type="button" onClick={() => window.location.reload()}
            className="flex-1 h-9 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors">
            Try again
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Error">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <ErrorContent />
    </Suspense>
  );
}
