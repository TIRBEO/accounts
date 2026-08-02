"use client";

import { useEffect, useState, useRef } from "react";
import { AuthShell } from "../components/auth-shell";
import { apiPost } from "../lib/api";
import { appUrl } from "@tirbeo/utils";
import { img } from "../components/ui-constants";

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
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#dadce0] border-t-[#1A73E8]" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Signed out" subtitle="You have been signed out of your account.">
      <div className="mt-6 space-y-4">
        <img src={img("account-logout")} alt="Signed out"
          className="w-full max-w-[300px] mx-auto rounded-xl border border-[#e8eaed] shadow-sm" />
        <p className="text-sm text-center text-[#5f6368]">You will be redirected to the sign in page shortly.</p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => window.location.href = "/login"}
            className="w-full h-9 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors">
            Sign in again
          </button>
          <button type="button" onClick={() => window.location.href = appUrl("dashboard", "/")}
            className="w-full h-9 rounded-[7px] border border-[#dadce0] bg-white text-[#5f6368] text-[14px] font-medium hover:bg-[#f8f9fa] hover:text-[#202124] transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
