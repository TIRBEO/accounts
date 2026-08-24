import React from 'react';
import { Loader2 } from 'lucide-react';
import { GitHubIcon, GoogleIcon, DiscordIcon } from './SocialIcons';
import { startOAuth, type OAuthProvider } from '../lib/oauth';

interface SocialAuthButtonsProps {
  /**
   * stack — full-width buttons stacked vertically (default)
   * row   — three compact, equal-width buttons side by side
   */
  variant?: 'stack' | 'row';
  /** Shown before the provider name in `stack` variant. */
  verb?: string;
}

const PROVIDER_META: Record<OAuthProvider, { label: string; icon: React.ReactNode }> = {
  github: { label: 'GitHub', icon: <GitHubIcon className="w-5 h-5 text-white" /> },
  google: { label: 'Google', icon: <GoogleIcon className="w-5 h-5" /> },
  discord: { label: 'Discord', icon: <DiscordIcon className="w-5 h-5 text-[#5865F2]" /> },
};

/**
 * One-click social sign-in. Clicking navigates the whole tab straight to the
 * API's /auth/{provider} route — the fastest possible hand-off (no fetch,
 * no CORS, no intermediate screen). The clicked button keeps its spinner for
 * the ~300ms until the browser commits the navigation.
 */
export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ variant = 'stack', verb = 'Continue with' }) => {
  const [pending, setPending] = React.useState<OAuthProvider | null>(null);

  React.useEffect(() => {
    // Safety valve: if navigation is blocked (popup blocker edge cases), reset.
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 5000);
    return () => clearTimeout(t);
  }, [pending]);

  if (variant === 'row') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {(['github', 'google', 'discord'] as OAuthProvider[]).map((id) => (
          <button
            key={id}
            type="button"
            disabled={!!pending}
            onClick={() => { setPending(id); startOAuth(id); }}
            className="wave-oauth-btn !px-2 gap-2"
            aria-label={`${verb} ${PROVIDER_META[id].label}`}
            aria-busy={pending === id}
          >
            {pending === id ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin shrink-0" />
            ) : (
              PROVIDER_META[id].icon
            )}
            <span className="text-[13px] font-medium truncate">{PROVIDER_META[id].label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(['github', 'google', 'discord'] as OAuthProvider[]).map((id) => (
        <button
          key={id}
          type="button"
          disabled={!!pending}
          onClick={() => { setPending(id); startOAuth(id); }}
          className="wave-oauth-btn"
          aria-busy={pending === id}
        >
          {pending === id ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            PROVIDER_META[id].icon
          )}
          <span>
            {verb} {PROVIDER_META[id].label}
          </span>
        </button>
      ))}
    </div>
  );
};
