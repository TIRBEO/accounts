"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, ApiError, API } from "@/lib/api";
import { DashboardShell, type NavSection, type AppLink } from "@tirbeo/ui";
import {
  LayoutDashboard,
  User,
  Shield,
  Monitor,
  Key,
  ShieldCheck,
  Puzzle,
  LogOut,
} from "lucide-react";

interface UserData {
  id: string;
  displayName?: string;
  email?: string;
  avatar?: string;
}

interface AppConfig {
  brand: { name: string; logo: string; logoHref: string };
  navbar: { links: { label: string; href: string }[]; signup: { label: string; href: string }; login: { label: string; href: string } };
  footer: { tagline: string; rights: string; columns: { title: string; links: { label: string; href: string }[] }[] };
}

const DEFAULT_CONFIG: AppConfig = {
  brand: { name: "Tirbeo", logo: "", logoHref: "/account" },
  navbar: { links: [], signup: { label: "Sign Up", href: "/signup" }, login: { label: "Log In", href: "/login" } },
  footer: { tagline: "", rights: "", columns: [] },
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Account",
    items: [
      { href: "/account", label: "Account Overview", icon: LayoutDashboard },
      { href: "/account/profile", label: "Profile", icon: User },
      { href: "/account/security", label: "Security", icon: Shield },
      { href: "/account/sessions", label: "Sessions", icon: Monitor },
      { href: "/account/passkeys", label: "Passkeys", icon: Key },
      { href: "/account/mfa", label: "2-Step Verification", icon: ShieldCheck },
      { href: "/account/connected-apps", label: "Connected Apps", icon: Puzzle },
    ],
  },
];

const APPS: AppLink[] = [
  { id: "dashboard", name: "Dashboard", href: "https://dashboard.tirbeo.app" },
  { id: "forms", name: "Forms", href: "https://forms.tirbeo.app" },
  { id: "admin", name: "Admin", href: "https://admin.tirbeo.app" },
  { id: "support", name: "Support", href: "https://support.tirbeo.app" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    apiGet("users/me")
      .then((data: UserData) => setUser(data))
      .catch((err: ApiError) => {
        if (err.status === 401) {
          router.push("/login");
        }
      });
  }, [router]);

  useEffect(() => {
    fetch(`${API}/api/public/app-config?app=accounts`)
      .then(r => r.json())
      .then(data => {
        if (data?.config) {
          setConfig({
            brand: {
              ...DEFAULT_CONFIG.brand,
              ...(data.config.brand || {}),
              name: data?.branding?.brandName || data.config.brand?.name || DEFAULT_CONFIG.brand.name,
              logo: data?.branding?.logoUrl || data.config.brand?.logo || DEFAULT_CONFIG.brand.logo,
            },
            navbar: { ...DEFAULT_CONFIG.navbar, ...(data.config.navbar || {}) },
            footer: { ...DEFAULT_CONFIG.footer, ...(data.config.footer || {}) },
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiGet("notifications?limit=8")
      .then((d: any) => {
        const list = (d?.notifications || []).map((n: any) => ({
          id: n.id,
          title: n.title || n.message || 'Notification',
          body: n.body || '',
          time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '',
          unread: !n.read,
          href: n.href || '/account/activity',
        }));
        setNotifications(list);
      })
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(() => {
    window.location.href = "/logout";
  }, []);

  return (
    <DashboardShell
      navSections={NAV_SECTIONS}
      apps={APPS}
      brand={{ name: config.brand.name, logo: config.brand.logo }}
      user={user ? { name: user.displayName, email: user.email } : null}
      onLogout={handleLogout}
      onNavigate={href => router.push(href)}
      currentPath={pathname}
      onSearch={query => { if (query.trim()) router.push(`/account?search=${encodeURIComponent(query)}`); }}
      searchPlaceholder="Search account, settings, activity..."
      searchGroups={NAV_SECTIONS.map(section => ({ label: section.label, items: section.items.map(item => ({ label: item.label, href: item.href, icon: item.icon })) }))}
      notifications={notifications}
      onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
    >
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          </div>
        ) : (
          children
        )}
      </div>
    </DashboardShell>
  );
}
