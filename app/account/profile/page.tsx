"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { User, CheckCircle, Camera, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  emailVerified?: boolean;
}

const timezones = Intl.supportedValuesOf?.("timeZone") || [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Berlin",
  "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata",
  "Australia/Sydney", "Pacific/Auckland",
];

const locales = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState("en-US");
  const [timezone, setTimezone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("users/me")
      .then((data: UserProfile) => {
        setProfile(data);
        setDisplayName(data.displayName || "");
        setLocale(data.locale || "en-US");
        setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      })
      .catch((err: ApiError) => {
        if (err.status === 401) router.push("/login");
        else setError("Failed to load profile.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiPost("users/me", { displayName: displayName.trim(), locale, timezone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }, [displayName, locale, timezone]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-normal text-[#202124]" style={{ letterSpacing: "-0.02em" }}>Profile</h1>
        <p className="mt-1 text-sm text-[#5F6368]">Manage your personal information and preferences.</p>
      </div>

      <div className="rounded-xl border border-[#DADCE0] bg-white p-6 sm:p-7">
        <div className="flex items-center gap-5 pb-6 mb-6 border-b border-[#DADCE0]">
          <div className="relative group">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F0FE] text-xl font-medium text-[#1A73E8]">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={28} />
              )}
            </div>
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Upload avatar"
            >
              <Camera size={18} className="text-white" />
            </button>
          </div>
          <div>
            <p className="text-base font-medium text-[#202124]">{profile?.displayName || "User"}</p>
            <p className="text-sm text-[#5F6368]">Upload a new avatar</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-[#202124] mb-1.5">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
              placeholder="Your name"
              autoComplete="name"
              className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 text-base text-[#202124] placeholder-[#80868B] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202124] mb-1.5">Email</label>
            <div className="flex items-center gap-2.5 h-12 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-4">
              <span className="text-base text-[#5F6368]">{profile?.email || ""}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-xs font-medium text-[#188038]">
                <CheckCircle size={12} /> Verified
              </span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="locale" className="block text-sm font-medium text-[#202124] mb-1.5">Language</label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 text-base text-[#202124] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235F6368%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10"
              >
                {locales.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-[#202124] mb-1.5">Timezone</label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="block w-full h-12 rounded-lg border border-[#DADCE0] bg-white px-4 text-base text-[#202124] outline-none transition-colors focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235F6368%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#F5C6CB] bg-[#FDEDED] p-3">
              <p className="text-sm text-[#D93025]">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 h-12 rounded-lg bg-[#1A73E8] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1769d2] disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-[#188038]">
                <CheckCircle size={16} /> Changes saved
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
