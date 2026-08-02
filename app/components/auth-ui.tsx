"use client";

import { AlertCircle } from "lucide-react";

export const inputClass =
  "h-12 w-full rounded-[10px] border border-[#d9dde3] bg-white px-3.5 text-[15px] text-[#202124] placeholder:text-[#9aa0a6] outline-none transition-all duration-150 hover:border-[#b9c0c9] focus:border-[#1a73e8] focus:ring-[3px] focus:ring-[#1a73e8]/12";
export const inputErrorClass =
  "border-[#d93025] hover:border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/10";
export const labelClass = "mb-2 block text-sm font-medium text-[#3c4043]";
export const errorTextClass = "mt-1.5 flex items-center gap-1 text-xs text-[#d93025]";

export const primaryBtn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-[#1a73e8] px-5 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all duration-150 hover:bg-[#1769d2] active:bg-[#1558b0] disabled:cursor-not-allowed disabled:bg-[#9fc5f4] disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/35 focus-visible:ring-offset-2";
export const secondaryBtn =
  "inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-[#d9dde3] bg-white px-4 text-sm font-medium text-[#3c4043] transition-all duration-150 hover:border-[#b9c0c9] hover:bg-[#f8f9fa] active:bg-[#f1f3f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/25 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";
export const textLink =
  "font-medium text-[#1a73e8] transition-colors hover:text-[#1558b0] hover:underline hover:underline-offset-2";
export const backLink =
  "inline-flex items-center gap-1 text-sm font-medium text-[#5f6368] transition-colors hover:text-[#202124]";

export const spinnerLight =
  "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent";
export const spinnerDark =
  "inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1a73e8]/25 border-t-[#1a73e8]";

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className={errorTextClass}>
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-[10px] border border-[#f4c7c3] bg-[#fce8e6] px-3.5 py-3 text-sm leading-relaxed text-[#c5221f]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#e8eaed]" />
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#80868b]">{label}</span>
      </div>
    </div>
  );
}

export function AuthFooterLinks({ privacy, terms, help }: { privacy: string; terms: string; help: string }) {
  return (
    <>
      <a href={privacy} className="transition-colors hover:text-[#5f6368]">Privacy</a>
      <span aria-hidden="true">·</span>
      <a href={terms} className="transition-colors hover:text-[#5f6368]">Terms</a>
      <span aria-hidden="true">·</span>
      <a href={help} className="transition-colors hover:text-[#5f6368]">Help</a>
    </>
  );
}
