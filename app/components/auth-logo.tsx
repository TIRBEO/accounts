"use client";

import { useEffect, useState } from "react";
import { API } from "../lib/api";

interface Branding {
  logoUrl: string;
  brandName: string;
  brandTagline: string;
}

interface AuthLogoProps {
  className?: string;
  size?: number;
}

const DEFAULT_BRANDING: Branding = {
  logoUrl: "",
  brandName: "Tirbeo",
  brandTagline: "Premium Social Platform",
};

export function AuthLogo({ className = "", size = 36 }: AuthLogoProps) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch(`${API}/api/public/app-config?app=accounts`);
        if (res.ok) {
          const data = await res.json();
          const b = data?.branding || {};
          setBranding({
            logoUrl: b.logoUrl || "",
            brandName: b.brandName || "Tirbeo",
            brandTagline: b.brandTagline || "Premium Social Platform",
          });
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  // Show loading skeleton
  if (loading) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <div
          className="animate-pulse rounded-lg"
          style={{
            width: size,
            height: size,
            backgroundColor: "var(--bg-muted)",
          }}
        />
        <div
          className="animate-pulse rounded"
          style={{
            width: 80,
            height: 20,
            backgroundColor: "var(--bg-muted)",
          }}
        />
      </div>
    );
  }

  // If logo URL is provided, use image
  if (branding.logoUrl) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <img
          src={branding.logoUrl}
          alt={`${branding.brandName} logo`}
          width={size}
          height={size}
          className="object-contain"
          style={{ maxHeight: size }}
        />
        <span
          className="text-[18px] font-black uppercase tracking-tight"
          style={{ color: "var(--text)" }}
        >
          {branding.brandName}
        </span>
      </div>
    );
  }

  // Default SVG logo — brutalist mark in a yellow square, like the landing brand
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className="flex items-center justify-center border-2 border-[var(--color-border)] bg-nb-yellow shadow-brutal-sm"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          width={Math.round(size * 0.56)}
          height={Math.round(size * 0.56)}
          viewBox="0 0 36 36"
          fill="none"
          className="select-none"
        >
          <path
            d="M8 28L18 8L28 28"
            stroke="#17150f"
            strokeWidth="3.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <circle cx="18" cy="22" r="3" fill="#17150f" />
        </svg>
      </span>
      <span
        className="text-[18px] font-black uppercase tracking-tight"
        style={{ color: "var(--text)" }}
      >
        {branding.brandName}
      </span>
    </div>
  );
}
