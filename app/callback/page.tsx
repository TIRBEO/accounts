"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@tirbeo/database/client";
import { appUrl } from "@tirbeo/utils";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(error.message);
        } else {
          const redirect = searchParams.get("redirect") || appUrl("dashboard");
          router.push(redirect);
        }
      });
    } else {
      setError("No authorization code provided");
    }
  }, []);

  if (error) {
    return <p className="text-red-600">Authentication failed: {error}</p>;
  }

  return <p className="text-tirbeo-dark-500">Completing sign in...</p>;
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<p className="text-tirbeo-dark-500">Loading...</p>}>
        <CallbackHandler />
      </Suspense>
    </main>
  );
}
