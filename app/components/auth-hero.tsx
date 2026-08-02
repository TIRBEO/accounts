"use client";

import { BrandLogo } from "./brand-logo";

interface AuthHeroProps {
  image?: string;
  title?: string;
  description?: string;
  badgeIcon?: React.ReactNode;
  badgeLabel?: string;
}

const TRUST_ITEMS = [
  { icon: "shield", label: "Secure authentication" },
  { icon: "users", label: "One account across TIRBEO" },
  { icon: "lock", label: "Protected sessions" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

const icons = {
  shield: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  lock: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
} as const;

export function AuthHero({ title, description }: AuthHeroProps) {
  return (
    <div className="flex flex-col justify-center h-full relative overflow-hidden">
      <div className="relative flex-1 flex flex-col justify-center max-w-[600px] mx-auto w-full px-10 lg:px-14 py-10">
        <BrandLogo textClassName="text-[28px] leading-tight font-semibold tracking-tight text-[#202124] mb-8 block" height={34} />
        <h2 className="text-[34px] leading-[1.15] font-semibold tracking-tight text-[#202124] mb-5">
          {title || "Everything you need, in one workspace."}
        </h2>
        <p className="text-[15px] leading-relaxed text-[#5f6368] mb-9">
          {description || "Manage your work, collaborate with your team, and access your TIRBEO apps from one secure account."}
        </p>
        <ul className="space-y-3.5 mb-10">
          {TRUST_ITEMS.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-[#3c4043] text-sm font-medium">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#E8F0FE] border border-[#D2E3FC] text-[#1A73E8]">
                {icons[item.icon]}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
        <img
          src="/auth-sign-in-portal.svg"
          alt="Illustration of a person securely signing in to their TIRBEO workspace"
          className="w-full max-w-[540px] h-auto select-none"
          width={560}
          height={420}
        />
      </div>
      <div className="px-10 lg:px-14 pb-8 text-[#80868b] text-sm font-medium">
        &copy; {CURRENT_YEAR} TIRBEO. All rights reserved.
      </div>
    </div>
  );
}
