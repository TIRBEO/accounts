import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export function createServerSideClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async getAll() {
        const store = await cookieStore;
        return store.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            const store = cookieStore as unknown as {
              set: (name: string, value: string, options: CookieOptions) => void;
            };
            store.set(name, value, {
              ...options,
              ...(cookieDomain && { domain: cookieDomain }),
            });
          } catch {}
        });
      },
    },
  });
}
