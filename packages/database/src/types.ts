export type District = {
  id: number;
  name: string;
  province: number;
};

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  district_id: number | null;
  bio: string | null;
  is_verified: boolean;
  karma_points: number;
  updated_at: string;
  created_at: string;
};

export type AdminRole = "super_admin" | "moderator" | "editor";

export type AdminUser = {
  user_id: string;
  role: AdminRole;
  assigned_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at" | "karma_points" | "is_verified">;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;

export const ADMIN_ROLES = ["super_admin", "moderator", "editor"] as const;

export const PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;
