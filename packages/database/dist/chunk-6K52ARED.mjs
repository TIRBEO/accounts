// src/middleware-client.ts
import { createServerClient } from "@supabase/ssr";
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
function createMiddlewareClient(request) {
  const response = new Response();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

export {
  createMiddlewareClient
};
//# sourceMappingURL=chunk-6K52ARED.mjs.map