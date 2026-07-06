// src/phone.ts
var NEPALI_PHONE_REGEX = /^(?:\+977[- ]?)?(?:98\d{8}|97\d{8}|96\d{8}|0[1-9]\d{7,8})$/;
function isValidNepaliPhone(phone) {
  return NEPALI_PHONE_REGEX.test(phone.replace(/\s/g, ""));
}
function formatNepaliPhone(phone) {
  const cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.startsWith("+977")) {
    const number = cleaned.slice(4);
    if (number.length === 10) {
      return `+977-${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`;
    }
  }
  if (cleaned.length === 10 && /^9[876]\d{8}$/.test(cleaned)) {
    return `+977-${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return cleaned;
}
function getPhoneType(phone) {
  const cleaned = phone.replace(/[\s-]/g, "").replace(/^\+977/, "");
  if (/^9[876]\d{8}$/.test(cleaned)) return "mobile";
  if (/^0[1-9]\d{7,8}$/.test(cleaned)) return "landline";
  return "invalid";
}

// src/bikram-sambat.ts
var BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashad",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra"
];
var BS_MONTHS_DAYS = {
  2e3: [30, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 29, 30, 30, 29, 30],
  2004: [31, 32, 31, 32, 31, 30, 30, 29, 30, 30, 29, 30],
  2005: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  2006: [31, 31, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  2007: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 29],
  2008: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 29],
  2009: [31, 32, 31, 32, 31, 30, 30, 29, 30, 30, 30, 29]
};
var BS_EPOCH_YEAR = 2e3;
var AD_EPOCH = new Date(1943, 3, 14);
function adToBs(date) {
  const target = new Date(date);
  let bsYear = BS_EPOCH_YEAR;
  let diff = Math.floor((target.getTime() - AD_EPOCH.getTime()) / (1e3 * 60 * 60 * 24));
  let monthIndex = 0;
  while (diff > 0) {
    const yearDays = BS_MONTHS_DAYS[bsYear];
    if (!yearDays) {
      bsYear++;
      continue;
    }
    for (let m = 0; m < 12; m++) {
      if (diff <= yearDays[m]) {
        monthIndex = m;
        return { year: bsYear, month: m + 1, day: diff };
      }
      diff -= yearDays[m];
    }
    bsYear++;
  }
  return { year: bsYear, month: 1, day: 1 };
}
function bsToAd(bsDate) {
  let totalDays = 0;
  for (let y = BS_EPOCH_YEAR; y < bsDate.year; y++) {
    const yearDays2 = BS_MONTHS_DAYS[y];
    if (yearDays2) {
      totalDays += yearDays2.reduce((a, b) => a + b, 0);
    }
  }
  const yearDays = BS_MONTHS_DAYS[bsDate.year];
  if (yearDays) {
    for (let m = 0; m < bsDate.month - 1; m++) {
      totalDays += yearDays[m];
    }
  }
  totalDays += bsDate.day - 1;
  return new Date(AD_EPOCH.getTime() + totalDays * 864e5);
}
function getCurrentBsDate() {
  return adToBs(/* @__PURE__ */ new Date());
}
function formatBsDate(bsDate, format = "full") {
  if (format === "short") {
    return `${bsDate.year}/${String(bsDate.month).padStart(2, "0")}/${String(bsDate.day).padStart(2, "0")}`;
  }
  return `${BS_MONTHS[bsDate.month - 1]} ${bsDate.day}, ${bsDate.year}`;
}
function getBsMonthName(month) {
  return BS_MONTHS[month - 1] || "";
}
function getDaysInBsMonth(year, month) {
  const yearDays = BS_MONTHS_DAYS[year];
  if (!yearDays) return 30;
  return yearDays[month - 1] || 30;
}

// src/domains.ts
var SUBDOMAIN_MAP = {
  www: "",
  accounts: "accounts",
  dashboard: "dashboard",
  chat: "chat",
  admin: "admin",
  support: "support",
  api: "api"
};
function getBaseDomain() {
  return process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.NEXT_PUBLIC_SITE_DOMAIN || "tirbeo.app";
}
function getCurrentSubdomain() {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  const base = getBaseDomain();
  if (host === base || host === `www.${base}`) return "";
  return host.replace(`.${base}`, "");
}
function appDomain(subdomain) {
  const base = getBaseDomain();
  if (!subdomain || subdomain === "www") return base;
  return `${SUBDOMAIN_MAP[subdomain]}.${base}`;
}
function appUrl(subdomain, path = "/") {
  const domain = appDomain(subdomain);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `https://${domain}${cleanPath}`;
}
function loginUrl(redirectTo) {
  const base = appUrl("accounts", "/login");
  if (!redirectTo) return base;
  return `${base}?redirect=${encodeURIComponent(redirectTo)}`;
}
function isCurrentSubdomain(subdomain) {
  const current = getCurrentSubdomain();
  if (subdomain === "www") return current === "";
  return current === SUBDOMAIN_MAP[subdomain];
}
function redirectToSubdomain(subdomain, path = "/") {
  if (isCurrentSubdomain(subdomain)) return null;
  return appUrl(subdomain, path);
}
function getCookieDomain() {
  return `.${getBaseDomain()}`;
}

// src/redis.ts
var store = /* @__PURE__ */ new Map();
async function setCache(key, value, ttl = 300) {
  const expiresAt = Date.now() + ttl * 1e3;
  store.set(key, { value, expiresAt });
}
async function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}
async function delCache(key) {
  store.delete(key);
}
export {
  adToBs,
  appDomain,
  appUrl,
  bsToAd,
  delCache,
  formatBsDate,
  formatNepaliPhone,
  getBsMonthName,
  getCache,
  getCookieDomain,
  getCurrentBsDate,
  getDaysInBsMonth,
  getPhoneType,
  isCurrentSubdomain,
  isValidNepaliPhone,
  loginUrl,
  redirectToSubdomain,
  setCache
};
//# sourceMappingURL=index.mjs.map