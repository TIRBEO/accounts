declare function isValidNepaliPhone(phone: string): boolean;
declare function formatNepaliPhone(phone: string): string;
declare function getPhoneType(phone: string): "mobile" | "landline" | "invalid";

type BsDate = {
    year: number;
    month: number;
    day: number;
};
declare function adToBs(date: Date): BsDate;
declare function bsToAd(bsDate: BsDate): Date;
declare function getCurrentBsDate(): BsDate;
declare function formatBsDate(bsDate: BsDate, format?: "full" | "short"): string;
declare function getBsMonthName(month: number): string;
declare function getDaysInBsMonth(year: number, month: number): number;

type Subdomain = "www" | "accounts" | "dashboard" | "chat" | "admin" | "support" | "api";
declare function appDomain(subdomain?: Subdomain): string;
declare function appUrl(subdomain: Subdomain, path?: string): string;
declare function loginUrl(redirectTo?: string): string;
declare function isCurrentSubdomain(subdomain: Subdomain): boolean;
declare function redirectToSubdomain(subdomain: Subdomain, path?: string): string | null;
declare function getCookieDomain(): string;

/** Cache a value for `ttl` seconds */
declare function setCache(key: string, value: string, ttl?: number): Promise<void>;
/** Retrieve a cached value (or null) */
declare function getCache(key: string): Promise<string | null>;
/** Simple helper to delete a key */
declare function delCache(key: string): Promise<void>;

export { type Subdomain, adToBs, appDomain, appUrl, bsToAd, delCache, formatBsDate, formatNepaliPhone, getBsMonthName, getCache, getCookieDomain, getCurrentBsDate, getDaysInBsMonth, getPhoneType, isCurrentSubdomain, isValidNepaliPhone, loginUrl, redirectToSubdomain, setCache };
