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
          className="text-[18px] font-semibold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          {branding.brandName}
        </span>
      </div>
    );
  }

  // Default SVG logo
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
        className="select-none"
        style={{ color: "var(--text)" }}
      >
        {/* Simple geometric mark */}
        <path
          d="M8 28L18 8L28 28"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="22" r="2" fill="currentColor" />
      </svg>
      <span
        className="text-[18px] font-semibold tracking-tight"
        style={{ color: "var(--text)" }}
      >
        {branding.brandName}
      </span>
    </div>
  );
}
