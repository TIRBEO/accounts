"use client";

import { type ReactNode } from "react";
import { LoginIllustration } from "./login-illustration";

interface AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  leftContent?: ReactNode;
  variant?: "split" | "centered";
}

export function AuthShell({ children, title, subtitle, footer, leftContent }: AuthShellProps) {
  return (
    <main className="auth-page min-h-screen w-full bg-white text-[#202124]">
      <div className="auth-layout min-h-screen md:grid md:grid-cols-[43%_57%]">
        <aside className="auth-visual relative hidden min-h-screen overflow-hidden md:flex">
          <div className="absolute inset-0 bg-[#1769d2]" />
          <div className="auth-visual-glow absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="auth-visual-glow absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-[#67a7ff]/20 blur-3xl" />

          <div className="relative z-10 flex min-h-screen w-full flex-col px-8 py-8 lg:px-12 lg:py-10">
            <div className="text-[21px] font-semibold tracking-[-0.03em] text-white select-none">TIRBEO</div>

            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-[520px] px-2 lg:px-6">
                {leftContent ?? <LoginIllustration />}
              </div>
            </div>

            <p className="text-sm font-medium text-white/70">Secure access to your TIRBEO account.</p>
          </div>
        </aside>

        <section className="relative flex min-h-screen flex-col bg-white">
          <div className="px-6 pt-7 md:hidden">
            <span className="text-[21px] font-semibold tracking-[-0.03em] text-[#1769d2] select-none">TIRBEO</span>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
            <div className="w-full max-w-[460px]">
              {title && <h1 className="text-3xl font-semibold tracking-[-0.025em] text-[#202124]">{title}</h1>}
              {subtitle && <p className="mt-2 text-[15px] leading-6 text-[#5f6368]">{subtitle}</p>}
              <div className={title || subtitle ? "mt-8" : ""}>{children}</div>
            </div>
          </div>

          {footer && (
            <footer className="flex items-center justify-center gap-5 px-6 pb-7 text-xs text-[#80868b]">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
