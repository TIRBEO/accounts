"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowRight, LogOut } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { apiPost } from "../lib/api";
import { appUrl } from "@tirbeo/utils";

export default function LogoutPage() {
  const [done, setDone] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    async function doLogout() {
      try { await apiPost("auth/logout"); } catch {}
      setDone(true);
    }
    doLogout();
  }, []);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => { window.location.href = "/login"; }, 3000);
      return () => clearTimeout(timer);
    }
  }, [done]);

  if (!done) {
    return (
      <AuthShell title="Signing out...">
        <div className="flex justify-center py-6">
          <span className="spinner" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Signed out" subtitle="You have been signed out of your account.">
      <div className="mt-2 space-y-4">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
          style={{ borderColor: "var(--border)", background: "var(--bg-muted)", color: "var(--text)" }}
        >
          <LogOut className="h-6 w-6" />
        </div>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          You will be redirected to the sign in page shortly.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => window.location.href = "/login"} className="btn-primary w-full">
            Sign in again <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => window.location.href = appUrl("dashboard", "/")}
            className="btn-secondary w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
