import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export function createMiddlewareClient(request: Request) {
  const response = new Response();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") || "";
        const cookies: { name: string; value: string }[] = [];
        cookieHeader.split(";").forEach((cookie) => {
          const [name, ...rest] = cookie.split("=");
          if (name && rest.length > 0) {
            cookies.push({ name: name.trim(), value: rest.join("=").trim() });
          }
        });
        return cookies;
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, string> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const domain = cookieDomain ? `; Domain=${cookieDomain}` : "";
          const cookieString = `${name}=${value}; Path=${options?.path || "/"}; SameSite=Lax${domain}`;
          response.headers.append("Set-Cookie", cookieString);
        });
      },
    },
  });
  return { supabase, response };
}
