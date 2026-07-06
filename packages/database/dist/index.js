"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ADMIN_ROLES: () => ADMIN_ROLES,
  PROVINCES: () => PROVINCES,
  createClient: () => createClient,
  createMiddlewareClient: () => createMiddlewareClient,
  createServerSideClient: () => createServerSideClient
});
module.exports = __toCommonJS(src_exports);

// src/client.ts
var import_ssr = require("@supabase/ssr");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createClient() {
  return (0, import_ssr.createBrowserClient)(supabaseUrl, supabaseAnonKey, {
    ...cookieDomain && {
      cookieOptions: {
        domain: cookieDomain
      }
    }
  });
}

// src/server-client.ts
var import_ssr2 = require("@supabase/ssr");
var supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain2 = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createServerSideClient(cookieStore) {
  return (0, import_ssr2.createServerClient)(supabaseUrl2, supabaseAnonKey2, {
    cookies: {
      async getAll() {
        const store = await cookieStore;
        return store.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            const store = cookieStore;
            store.set(name, value, {
              ...options,
              ...cookieDomain2 && { domain: cookieDomain2 }
            });
          } catch {
          }
        });
      }
    }
  });
}

// src/middleware-client.ts
var import_ssr3 = require("@supabase/ssr");
var supabaseUrl3 = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey3 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain3 = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createMiddlewareClient(request) {
  const response = new Response();
  const supabase = (0, import_ssr3.createServerClient)(supabaseUrl3, supabaseAnonKey3, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") || "";
        const cookies = [];
        cookieHeader.split(";").forEach((cookie) => {
          const [name, ...rest] = cookie.split("=");
          if (name && rest.length > 0) {
            cookies.push({ name: name.trim(), value: rest.join("=").trim() });
          }
        });
        return cookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const domain = cookieDomain3 ? `; Domain=${cookieDomain3}` : "";
          const cookieString = `${name}=${value}; Path=${options?.path || "/"}; SameSite=Lax${domain}`;
          response.headers.append("Set-Cookie", cookieString);
        });
      }
    }
  });
  return { supabase, response };
}

// src/types.ts
var ADMIN_ROLES = ["super_admin", "moderator", "editor"];
var PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ADMIN_ROLES,
  PROVINCES,
  createClient,
  createMiddlewareClient,
  createServerSideClient
});
//# sourceMappingURL=index.js.map