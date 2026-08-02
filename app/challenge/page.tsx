"use client";

import { AuthShell } from "../components/auth-shell";
import { Fingerprint, Smartphone, Key, ShieldQuestion } from "lucide-react";

const methods = [
  { id: "passkey", label: "Use a passkey", icon: Fingerprint, desc: "Fingerprint, face, or security key" },
  { id: "totp", label: "Use authenticator app", icon: Smartphone, desc: "Enter a code from your authenticator" },
  { id: "recovery", label: "Use recovery code", icon: Key, desc: "Enter a one-time recovery code" },
  { id: "suspicious", label: "Confirm suspicious login", icon: ShieldQuestion, desc: "Verify an unrecognized sign-in" },
];

export default function ChallengePage() {
  return (
    <AuthShell title="Choose another way" subtitle="Select a verification method.">
      <div className="mb-5 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FE]">
          <ShieldQuestion className="h-7 w-7 text-[#1A73E8]" />
        </div>
      </div>
      <div className="space-y-2.5">
        {methods.map(m => {
          const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
          const tempToken = params.get("tempToken") || "";
          const redirectTo = params.get("redirect_to") || "";
          let href = "";
          if (m.id === "passkey") {
            href = `/passkey?redirect_to=${encodeURIComponent(redirectTo)}`;
          } else if (m.id === "suspicious") {
            const token = params.get("token") || "";
            const device = params.get("device") || "";
            const location = params.get("location") || "";
            const browser = params.get("browser") || "";
            href = `/suspicious-login?token=${encodeURIComponent(token)}&redirect_to=${encodeURIComponent(redirectTo)}`;
          } else {
            href = `/mfa?method=${m.id}&tempToken=${encodeURIComponent(tempToken)}&redirect_to=${encodeURIComponent(redirectTo)}`;
          }
          return (
            <a key={m.id} href={href}
              className="flex items-center gap-3.5 p-3.5 rounded-[7px] border border-[#dadce0] bg-white transition-colors hover:bg-[#f8f9fa] hover:border-[#1A73E8]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[#e8f0fe]">
                <m.icon className="w-4 h-4 text-[#1A73E8]" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[13px] font-medium text-[#202124] truncate">{m.label}</p>
                <p className="text-xs text-[#5f6368] mt-0.5 truncate">{m.desc}</p>
              </div>
            </a>
          );
        })}
      </div>
    </AuthShell>
  );
}
