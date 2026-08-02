"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "../components/auth-shell";
import { apiPost, ApiError } from "../lib/api";
import { img } from "../components/ui-constants";

function VerifyContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");

  const redirectTo = searchParams.get("redirect_to") || "";
  const verifyLink = `/login${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ""}`;

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type") || "email";

    if (!token) {
      setStatus("error");
      setMessage("Verification link is missing or invalid.");
      return;
    }

    async function verify() {
      try {
        if (type === "email") {
          await apiPost("auth/email-otp/verify", { token });
        } else if (type === "magic") {
          await apiPost("auth/magic-link/verify", { token });
        } else {
          await apiPost("auth/verify", { token, type });
        }
        setStatus("success");
        setMessage("Your email has been verified.");
      } catch (err: unknown) {
        setStatus("error");
        if (err instanceof ApiError) setMessage(err.message);
        else setMessage("This link has expired or is invalid.");
      }
    }
    verify();
  }, [searchParams]);

  if (status === "verifying") {
    return (
      <AuthShell title="Verifying...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={status === "success" ? "Email verified" : "Verification failed"}>
      <div className="mt-6 space-y-5">
        <img src={img(status === "success" ? "email-verified" : "access-denied")}
          alt={status === "success" ? "Email verified" : "Verification failed"}
          className="w-full max-w-[320px] mx-auto rounded-xl border border-[#e8eaed] shadow-sm" />
        {status === "success" ? (
          <p className="text-sm text-center text-[#188038]">{message}</p>
        ) : (
          <p className="text-sm text-center text-[#d93025]">{message}</p>
        )}
        <div className="flex justify-center">
          <a href={verifyLink}
            className="h-9 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors inline-flex items-center justify-center">
            {status === "success" ? "Continue to sign in" : "Back to sign in"}
          </a>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading...">
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    }>
      <VerifyContent />
    </Suspense>
  );
}
