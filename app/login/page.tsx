"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@tirbeo/auth";
import { appUrl } from "@tirbeo/utils";

function LoginForm() {
  const searchParams = useSearchParams();
  const { signInWithPassword, signInWithOtp, signInWithGoogle, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const redirectTo = searchParams.get("redirect") || appUrl("dashboard");

  useEffect(() => {
    if (user && !isLoading) {
      window.location.href = redirectTo;
    }
  }, [user, isLoading, redirectTo]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await signInWithPassword(email, password);
    if (result.error) setError(result.error);
  };

  const handleOtpLogin = async () => {
    setError(null);
    const result = await signInWithOtp(email);
    if (result.error) {
      setError(result.error);
    } else {
      setOtpSent(true);
    }
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  if (isLoading) {
    return <p className="text-center text-tirbeo-dark-500">Loading...</p>;
  }

  if (otpSent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tirbeo-gold-100 text-tirbeo-gold-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-tirbeo-dark-500">
          We sent a one-time code to <strong>{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-tirbeo-crimson-600 text-lg font-bold text-white">
          T
        </div>
        <h1 className="mt-4 text-xl font-bold text-tirbeo-dark-950">Sign in to Tirbeo</h1>
        <p className="mt-1 text-sm text-tirbeo-dark-500">
          One account for all Tirbeo services
        </p>
      </div>

      <form onSubmit={handlePasswordLogin} className="mt-8 space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-tirbeo-dark-300 bg-white px-3 py-2 text-sm outline-none focus:border-tirbeo-crimson-400 focus:ring-1 focus:ring-tirbeo-crimson-400"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-tirbeo-dark-300 bg-white px-3 py-2 text-sm outline-none focus:border-tirbeo-crimson-400 focus:ring-1 focus:ring-tirbeo-crimson-400"
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-md bg-tirbeo-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-tirbeo-crimson-700"
        >
          Sign In
        </button>
      </form>

      <div className="mt-4 space-y-2">
        <button
          onClick={handleOtpLogin}
          className="w-full rounded-md border border-tirbeo-dark-300 px-4 py-2 text-sm text-tirbeo-dark-700 transition-colors hover:bg-tirbeo-dark-50"
        >
          Send one-time code
        </button>
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-tirbeo-dark-300 px-4 py-2 text-sm text-tirbeo-dark-700 transition-colors hover:bg-tirbeo-dark-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-tirbeo-dark-400">
        By signing in, you agree to the{" "}
        <a href="https://tirbeo.app" className="underline hover:text-tirbeo-crimson-600">
          Terms of Service
        </a>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Suspense fallback={<p className="text-center text-tirbeo-dark-500">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
