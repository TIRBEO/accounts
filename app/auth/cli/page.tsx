"use client";

import { useState, useCallback } from "react";
import { AuthShell } from "../../components/auth-shell";
import { apiPost, ApiError } from "../../lib/api";
import { Terminal, Copy, Check } from "lucide-react";

export default function CliAuthPage() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const handleAuthorize = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("auth/cli-token");
      setToken(data.token || data.code || "");
      setAuthorized(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to generate CLI token.");
    }
    setLoading(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [token]);

  if (authorized && token) {
    return (
      <AuthShell title="CLI authorized" subtitle="Use this code to authenticate your CLI.">
        <div className="mt-8 space-y-5 text-center">
          <div className="flex justify-center">
            <Terminal className="w-10 h-10 text-[#1A73E8]" />
          </div>
          <div className="rounded-[7px] border border-[#dadce0] bg-[#f8f9fa] p-4">
            <p className="text-xs font-medium text-[#5f6368] uppercase tracking-wide mb-2">Your verification code</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono font-medium text-[#202124] tracking-wider select-all">{token}</code>
              <button type="button" onClick={handleCopy}
                className="p-1.5 rounded-[7px] text-[#5f6368] hover:text-[#202124] hover:bg-[#e8f0fe] transition-colors"
                aria-label={copied ? "Copied" : "Copy to clipboard"}>
                {copied ? <Check className="w-4 h-4 text-[#188038]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-sm text-[#5f6368]">Enter this code in your terminal to complete authorization.</p>
          <p className="text-xs text-[#5f6368]">This code expires in 5 minutes.</p>
          <a href="/login"
            className="inline-block text-sm font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
            Back to sign in
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Authorize CLI access" subtitle="Generate a token to authenticate your terminal.">
      <div className="mt-8 space-y-5 text-center">
        <div className="flex justify-center">
          <Terminal className="w-12 h-12 text-[#5f6368]" />
        </div>
        <p className="text-sm text-[#5f6368]">
          This will grant a CLI session access to your Tirbeo account.
        </p>
        {error && <p className="text-[13px] text-[#d93025]">{error}</p>}
        <div className="flex justify-center">
          <button type="button" onClick={handleAuthorize} disabled={loading}
            className="h-9 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[14px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Authorize CLI
          </button>
        </div>
        <p className="text-center">
          <a href="/login" className="text-sm font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">Cancel</a>
        </p>
      </div>
    </AuthShell>
  );
}
