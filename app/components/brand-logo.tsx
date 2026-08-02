"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";

interface Branding {
  logoUrl?: string;
  brandName?: string;
  brandTagline?: string;
}

const DEFAULTS: Branding = { logoUrl: "", brandName: "Tirbeo" };

let cached: Branding | null = null;

export function BrandLogo({
  className = "",
  textClassName = "",
  height = 32,
}: {
  className?: string;
  textClassName?: string;
  height?: number;
}) {
  const [branding, setBranding] = useState<Branding>(cached || DEFAULTS);

  useEffect(() => {
    if (cached) return;
    let active = true;
    fetch(`${API}/api/public/app-config?app=brand`)
      .then(r => r.json())
      .then((data: { branding?: Branding }) => {
        if (!active) return;
        const next = {
          logoUrl: data?.branding?.logoUrl || "",
          brandName: data?.branding?.brandName || "Tirbeo",
          brandTagline: data?.branding?.brandTagline || "",
        };
        cached = next;
        setBranding(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const name = branding.brandName || "Tirbeo";

  if (branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={name}
        height={height}
        className={className || "h-8 w-auto"}
        referrerPolicy="no-referrer"
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <span className={textClassName || "select-none text-[21px] font-medium text-[#5f6368] tracking-[-0.01em]"}>
      {name}
    </span>
  );
}
