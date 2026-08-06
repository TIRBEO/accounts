"use client";

import { type ReactNode } from "react";
import { AuthLogo } from "./auth-logo";

interface AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  leftContent?: ReactNode;
  variant?: "split" | "centered";
}

export function AuthShell({ children, title, subtitle, footer }: AuthShellProps) {
  return (
    <main className="auth-shell min-h-screen w-full" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="w-full max-w-[440px]">
        <div className="auth-card">
          <div className="mb-8">
            <AuthLogo size={32} />
          </div>
          {title && <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>}
          {subtitle && (
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          )}
          <div className={title || subtitle ? "mt-8" : "mt-4"}>{children}</div>
        </div>
        {footer && (
          <footer className="mt-6 flex items-center justify-center gap-5 text-xs" style={{ color: "var(--text-muted)" }}>
            {footer}
          </footer>
        )}
      </div>
    </main>
  );
}
