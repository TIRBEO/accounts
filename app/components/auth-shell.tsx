"use client";

import { type ReactNode } from "react";

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
    <main
      className="auth-soft min-h-screen px-4 py-6 sm:px-6 sm:py-10"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[520px] items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <section className="w-full">
          <div
            className="overflow-hidden rounded-[26px] border shadow-[0_20px_70px_rgba(0,0,0,0.14)]"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-surface, var(--bg))",
            }}
          >
            <div
              className="h-1 w-full"
              style={{ background: "var(--text)" }}
            />

            <div className="p-6 sm:p-8">
              {title && (
                <header className="mb-7">
                  <p
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Tirbeo account
                  </p>

                  <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[34px]">
                    {title}
                  </h1>

                  {subtitle && (
                    <p
                      className="mt-2 text-sm leading-6"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {subtitle}
                    </p>
                  )}
                </header>
              )}

              <div className={title || subtitle ? "" : "mt-4"}>{children}</div>
            </div>
          </div>

          {footer && (
            <footer
              className="mt-5 text-center text-[11px] leading-5"
              style={{ color: "var(--text-muted)" }}
            >
              {footer}
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
