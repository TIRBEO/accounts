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

// src/server-client.ts
var server_client_exports = {};
__export(server_client_exports, {
  createServerSideClient: () => createServerSideClient
});
module.exports = __toCommonJS(server_client_exports);
var import_ssr = require("@supabase/ssr");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createServerSideClient(cookieStore) {
  return (0, import_ssr.createServerClient)(supabaseUrl, supabaseAnonKey, {
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
              ...cookieDomain && { domain: cookieDomain }
            });
          } catch {
          }
        });
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createServerSideClient
});
//# sourceMappingURL=server-client.js.map