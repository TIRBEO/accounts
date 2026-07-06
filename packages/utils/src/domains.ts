export type Subdomain = "www" | "accounts" | "dashboard" | "chat" | "admin" | "support" | "api";

const SUBDOMAIN_MAP: Record<Subdomain, string> = {
  www: "",
  accounts: "accounts",
  dashboard: "dashboard",
  chat: "chat",
  admin: "admin",
  support: "support",
  api: "api",
};

function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || "tirbeo.app";
}

function getCurrentSubdomain(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  const base = getBaseDomain();
  if (host === base || host === `www.${base}`) return "";
  return host.replace(`.${base}`, "");
}

export function appDomain(subdomain?: Subdomain): string {
  const base = getBaseDomain();
  if (!subdomain || subdomain === "www") return base;
  return `${SUBDOMAIN_MAP[subdomain]}.${base}`;
}

export function appUrl(subdomain: Subdomain, path = "/"): string {
  const domain = appDomain(subdomain);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `https://${domain}${cleanPath}`;
}

export function loginUrl(redirectTo?: string): string {
  const base = appUrl("accounts", "/login");
  if (!redirectTo) return base;
  return `${base}?redirect=${encodeURIComponent(redirectTo)}`;
}

export function isCurrentSubdomain(subdomain: Subdomain): boolean {
  const current = getCurrentSubdomain();
  if (subdomain === "www") return current === "";
  return current === SUBDOMAIN_MAP[subdomain];
}

export function redirectToSubdomain(subdomain: Subdomain, path = "/"): string | null {
  if (isCurrentSubdomain(subdomain)) return null;
  return appUrl(subdomain, path);
}

export function getCookieDomain(): string {
  return `.${getBaseDomain()}`;
}
