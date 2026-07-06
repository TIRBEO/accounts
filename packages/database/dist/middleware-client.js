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

// src/middleware-client.ts
var middleware_client_exports = {};
__export(middleware_client_exports, {
  createMiddlewareClient: () => createMiddlewareClient
});
module.exports = __toCommonJS(middleware_client_exports);
var import_ssr = require("@supabase/ssr");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createMiddlewareClient(request) {
  const response = new Response();
  const supabase = (0, import_ssr.createServerClient)(supabaseUrl, supabaseAnonKey, {
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
          const domain = cookieDomain ? `; Domain=${cookieDomain}` : "";
          const cookieString = `${name}=${value}; Path=${options?.path || "/"}; SameSite=Lax${domain}`;
          response.headers.append("Set-Cookie", cookieString);
        });
      }
    }
  });
  return { supabase, response };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMiddlewareClient
});
//# sourceMappingURL=middleware-client.js.map