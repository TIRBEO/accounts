type District = {
    id: number;
    name: string;
    province: number;
};
type Profile = {
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
type AdminRole = "super_admin" | "moderator" | "editor";
type AdminUser = {
    user_id: string;
    role: AdminRole;
    assigned_at: string;
};
type AuditLog = {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
};
type ProfileInsert = Omit<Profile, "created_at" | "updated_at" | "karma_points" | "is_verified">;
type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;
declare const ADMIN_ROLES: readonly ["super_admin", "moderator", "editor"];
declare const PROVINCES: readonly ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];

export { ADMIN_ROLES, type AdminRole, type AdminUser, type AuditLog, type District, PROVINCES, type Profile, type ProfileInsert, type ProfileUpdate };
