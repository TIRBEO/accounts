"use client";

import { appUrl } from "@tirbeo/utils";

export function getRedirectUrl(fallbackSubdomain: "dashboard" | "forms" | "support" = "dashboard"): string {
  if (typeof window === "undefined") return appUrl(fallbackSubdomain, "/");
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect_to") || params.get("redirect");
  if (redirectTo) {
    try {
      const u = new URL(redirectTo);
      if (u.hostname.endsWith(".tirbeo.app") || u.hostname.endsWith(".vercel.app") || u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return redirectTo;
      }
    } catch {}
  }
  return appUrl(fallbackSubdomain, "/");
}
