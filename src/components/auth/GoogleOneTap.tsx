import React, { useEffect, useCallback, useState } from "react";
import { GoogleIcon } from "../SocialIcons";
import { apiPost } from "../../lib/api";

interface GoogleOneTapProps {
  onSuccessAuth: (email: string, provider: "google") => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: (callback?: (notification: { isDisplayed: () => boolean }) => void) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export const GoogleOneTap: React.FC<GoogleOneTapProps> = ({ onSuccessAuth }) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      if (processing) return;
      setProcessing(true);
      try {
        const result = await apiPost<{ email?: string }>(
          "/api/auth/google/onetap",
          { credential: response.credential }
        );
        if (result.ok && result.data?.email) {
          onSuccessAuth(result.data.email, "google");
        }
      } catch {
        // Silently fail — user can fall back to the button
      } finally {
        setProcessing(false);
      }
    },
    [processing, onSuccessAuth]
  );

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setScriptError(true);
      return;
    }

    // If the script is already on the page, just initialize
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });
      window.google.accounts.id.prompt();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setScriptLoaded(true);
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
        });
        window.google.accounts.id.prompt();
      }
    };

    script.onerror = () => {
      setScriptError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Clean up: remove the script tag on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [handleCredential]);

  // If script failed to load or One Tap didn't appear, show the fallback button
  if (scriptError || !scriptLoaded) {
    return null;
  }

  return (
    <div
      className="
        flex
        h-12
        w-full
        items-center
        justify-center
        gap-3
        rounded-2xl
        border
        border-white/[0.08]
        bg-white/[0.035]
        px-4
        text-sm
        font-medium
        text-white/85
        shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]
      "
      aria-label="Google One Tap sign in"
    >
      <GoogleIcon className="h-5 w-5" />
      <span>{processing ? "Signing in with Google..." : "Google One Tap"}</span>
    </div>
  );
};

export default GoogleOneTap;
