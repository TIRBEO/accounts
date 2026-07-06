import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    ...(cookieDomain && {
      cookieOptions: {
        domain: cookieDomain,
      },
    }),
  });
}
