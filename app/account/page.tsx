"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import {
  Shield,
  Monitor,
  Puzzle,
  Clock,
  Smartphone,
  Globe,
  Laptop,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt?: string;
}

interface SecurityEvent {
  id: string;
  event: string;
  details?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export default function AccountOverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState({ sessions: 0, apps: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [userData, sessionsData, appsData, eventsData] = await Promise.all([
          apiGet("users/me"),
          apiGet("security/sessions").catch(() => []),
          apiGet("activity").catch(() => []),
          apiGet("security/events").catch(() => []),
        ]);

        if (cancelled) return;

        setUser(userData);
        setStats({
          sessions: Array.isArray(sessionsData) ? sessionsData.length : sessionsData?.sessions?.length || 0,
          apps: Array.isArray(appsData) ? appsData.filter((a: any) => a.type === "oauth").length : 0,
        });
        const eventList = Array.isArray(eventsData) ? eventsData : eventsData?.events || [];
        setEvents(eventList.slice(0, 5));
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError("Failed to load account data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [router]);

  const getEventIcon = useCallback((event: string) => {
    const type = event.toLowerCase();
    if (type.includes("login") || type.includes("signin")) return <Laptop size={16} />;
    if (type.includes("password")) return <Shield size={16} />;
    if (type.includes("mfa") || type.includes("2fa") || type.includes("totp")) return <Smartphone size={16} />;
    return <Globe size={16} />;
  }, []);

  const getEventColor = useCallback((event: string) => {
    const type = event.toLowerCase();
    if (type.includes("login") || type.includes("signin")) return "text-[#1A73E8]";
    if (type.includes("password")) return "text-[#EA8600]";
    if (type.includes("mfa") || type.includes("2fa") || type.includes("totp")) return "text-[#188038]";
    return "text-[#5F6368]";
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#DADCE0] bg-white p-12 text-center">
        <p className="text-[#D93025]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1769d2] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>
          Welcome{user?.displayName ? `, ${user?.displayName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-[#5F6368]">
          Manage your account settings and security preferences.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#DADCE0] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F0FE]">
              <Shield size={20} className="text-[#1A73E8]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#202124]">-</p>
              <p className="text-xs text-[#5F6368]">Security Score</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#DADCE0] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F0FE]">
              <Monitor size={20} className="text-[#1A73E8]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#202124]">{stats.sessions}</p>
              <p className="text-xs text-[#5F6368]">Active Sessions</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[#DADCE0] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F0FE]">
              <Puzzle size={20} className="text-[#1A73E8]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#202124]">{stats.apps}</p>
              <p className="text-xs text-[#5F6368]">Connected Apps</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#DADCE0] bg-white">
        <div className="flex items-center gap-2 border-b border-[#DADCE0] px-4 py-4">
          <Clock size={16} className="text-[#5F6368]" />
          <h2 className="text-sm font-medium text-[#202124]">Recent Security Activity</h2>
        </div>
        {events.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#5F6368]">
            No recent security events.
          </div>
        ) : (
          <div className="divide-y divide-[#DADCE0]">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 px-4 py-3.5">
                <div className={`mt-0.5 ${getEventColor(event.event)}`}>
                  {getEventIcon(event.event)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#202124]">{event.event}</p>
                  {event.details && (
                    <p className="text-xs text-[#5F6368] mt-0.5">{event.details}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-[#5F6368]">{formatDate(event.createdAt)}</p>
                  {event.ip && <p className="text-xs text-[#5F6368]">{event.ip}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
