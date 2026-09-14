import React from "react";
import { GitHubIcon, GoogleIcon, DiscordIcon } from "./SocialIcons";
import { startOAuth, type OAuthProvider } from "../lib/oauth";
import { GoogleOneTap } from "./auth/GoogleOneTap";

interface SocialAuthButtonsProps {
  variant?: "stack" | "row";
  verb?: string;
  onSuccessAuth?: (email: string, provider: "google") => void;
}

interface ProviderMeta {
  label: string;
  icon: React.ReactNode;
}

const PROVIDER_META: Record<OAuthProvider, ProviderMeta> = {
  github: { label: "GitHub", icon: <GitHubIcon className="h-5 w-5" /> },
  google: { label: "Google", icon: <GoogleIcon className="h-5 w-5" /> },
  discord: { label: "Discord", icon: <DiscordIcon className="h-5 w-5 text-[#5865F2]" /> },
};

const PROVIDERS: OAuthProvider[] = ["github", "google", "discord"];

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  variant = "stack",
  verb = "Continue with",
  onSuccessAuth,
}) => {
  const [pending, setPending] = React.useState<OAuthProvider | null>(null);

  React.useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  const handleOAuth = (provider: OAuthProvider) => {
    if (pending) return;
    setPending(provider);
    startOAuth(provider);
  };

  const baseStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    minHeight: '44px',
    height: '44px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    padding: '0 16px',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
    backdropFilter: 'blur(12px)',
    boxSizing: 'border-box' as const,
  };

  const googleStyles: React.CSSProperties = {
    ...baseStyles,
    background: '#FFFFFF',
    color: '#1F1F1F',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  };

  const githubStyles: React.CSSProperties = {
    ...baseStyles,
    background: 'rgba(255,255,255,0.06)',
    color: '#FAFAFA',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  const discordStyles: React.CSSProperties = {
    ...baseStyles,
    background: '#5865F2',
    color: '#FFFFFF',
    border: '1px solid rgba(88,101,242,0.40)',
    boxShadow: '0 4px 16px rgba(88,101,242,0.20)',
  };

  const baseStackStyles: React.CSSProperties = {
    ...baseStyles,
    background: 'rgba(255,255,255,0.05)',
    color: '#FAFAFA',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset',
  };

  if (variant === "row") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {onSuccessAuth && <GoogleOneTap onSuccessAuth={onSuccessAuth} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }} role="group" aria-label="Social sign in">
          {PROVIDERS.map((provider) => {
            const meta = PROVIDER_META[provider];
            const isPending = pending === provider;
            const isDisabled = pending !== null || isPending;
            const styles = provider === 'google' ? googleStyles : provider === 'github' ? githubStyles : discordStyles;
            return (
              <button
                key={provider}
                type="button"
                disabled={isDisabled}
                onClick={() => handleOAuth(provider)}
                aria-label={`${verb} ${meta.label}`}
                aria-busy={isPending}
                style={{
                  ...styles,
                  opacity: isDisabled ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
                onMouseOver={(e) => {
                  if (!isDisabled) {
                    if (provider === 'google') e.currentTarget.style.background = '#F5F5F5';
                    else if (provider === 'github') e.currentTarget.style.background = '#2A2A2A';
                    else if (provider === 'discord') e.currentTarget.style.background = '#4752C4';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDisabled) {
                    if (provider === 'google') e.currentTarget.style.background = '#FFFFFF';
                    else if (provider === 'github') e.currentTarget.style.background = '#1F1F1F';
                    else if (provider === 'discord') e.currentTarget.style.background = '#5865F2';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {meta.icon}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  {verb} {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {onSuccessAuth && <GoogleOneTap onSuccessAuth={onSuccessAuth} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} role="group" aria-label="Social sign in">
        {PROVIDERS.map((provider) => {
          const meta = PROVIDER_META[provider];
          const isPending = pending === provider;
          const isDisabled = pending !== null || isPending;
          const styles = provider === 'google' ? googleStyles : provider === 'github' ? githubStyles : provider === 'discord' ? discordStyles : baseStackStyles;
          return (
            <button
              key={provider}
              type="button"
              disabled={isDisabled}
              onClick={() => handleOAuth(provider)}
              aria-label={`${verb} ${meta.label}`}
              aria-busy={isPending}
              style={{
                ...baseStackStyles,
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
              onMouseOver={(e) => {
                if (!isDisabled) {
                  if (provider === 'google') e.currentTarget.style.background = '#F5F5F5';
                  else if (provider === 'github') e.currentTarget.style.background = '#2A2A2A';
                  else if (provider === 'discord') e.currentTarget.style.background = '#4752C4';
                  else e.currentTarget.style.background = '#1F1F1F';
                }
              }}
              onMouseOut={(e) => {
                if (!isDisabled) {
                  if (provider === 'google') e.currentTarget.style.background = '#FFFFFF';
                  else if (provider === 'github') e.currentTarget.style.background = '#1F1F1F';
                  else if (provider === 'discord') e.currentTarget.style.background = '#5865F2';
                  else e.currentTarget.style.background = '#0D0D0D';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {meta.icon}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                {verb} {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SocialAuthButtons;