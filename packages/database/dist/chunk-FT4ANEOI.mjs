// src/client.ts
import { createBrowserClient } from "@supabase/ssr";
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    ...cookieDomain && {
      cookieOptions: {
        domain: cookieDomain
      }
    }
  });
}

export {
  createClient
};
//# sourceMappingURL=chunk-FT4ANEOI.mjs.map