// src/server-client.ts
import { createServerClient } from "@supabase/ssr";
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createServerSideClient(cookieStore) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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

export {
  createServerSideClient
};
//# sourceMappingURL=chunk-CNGUZM45.mjs.map