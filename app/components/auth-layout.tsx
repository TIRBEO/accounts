"use client";

import { ReactNode } from "react";
import { Check, X } from "lucide-react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-5 sm:px-6 lg:px-10">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

export function Brand() {
  return (
    <a
      href="/"
      className="group inline-flex items-center gap-3 border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 shadow-brutal-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
      style={{ color: "var(--color-text)" }}
      aria-label="Tirbeo home"
    >
      <span className="flex size-5 items-center justify-center bg-nb-yellow text-[10px] font-black" aria-hidden="true" style={{ color: "#17150f" }}>
        T
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.3em]">
        Tirbeo Inc.
      </span>
    </a>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs" style={{ color: "var(--error)" }} role="alert">{children}</p>;
}

export function FieldStatus({ valid, invalid }: { valid: boolean; invalid: boolean }) {
  if (!valid && !invalid) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center border-2"
      style={{ background: invalid ? "var(--error)" : "var(--success, #22c55e)", borderColor: invalid ? "var(--error)" : "var(--success, #22c55e)", color: "var(--background)" }}
    >
      {invalid ? <X size={15} strokeWidth={3} /> : <Check size={15} strokeWidth={3} />}
    </span>
  );
}

export function SecurityFooter() {
  return (
    <div className="auth-security-footer">
      <span>Secured by </span>
      <a href="https://tirbeo.app" target="_blank" rel="noopener noreferrer" className="auth-link" style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "3px" }}>
        tirbeo.app
      </a>
    </div>
  );
}
