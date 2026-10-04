'use client';

import React from 'react';
import { Fingerprint } from 'lucide-react';
import { isPasskeySupported } from '../../../lib/passkeys';

/**
 * "Sign in with a passkey" — a fourth way in alongside email and OAuth.
 *
 * Rendered only where the browser actually exposes WebAuthn, so nobody is
 * offered a button that cannot work. The row matches OAuthRow's boxed recipe so
 * the four options read as one group rather than three buttons and a stranger.
 */
interface PasskeyRowProps {
  onPasskeySignIn: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PasskeyRow: React.FC<PasskeyRowProps> = ({
  onPasskeySignIn,
  disabled = false,
  loading = false,
}) => {
  /* Checked during render, not in an effect. An effect meant the row was
     missing from the first paint and then popped in — on a phone that reads as
     the page still loading, and the button slid the layout after every
     hydration. WebAuthn support is a property of the browser, known before
     anything renders, so there is nothing to wait for. */
  const supported = isPasskeySupported();

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onPasskeySignIn}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        // Identical box to OAuthRow: same 52px, same hairline, same fill. A
        // passkey that looks different from the buttons above it reads as a
        // link, and people do not press things they are unsure about.
        'group flex h-[52px] w-full items-center justify-center gap-3 rounded-xl',
        'border border-white/[0.16] bg-white/[0.04] text-[15px] font-semibold text-white/90',
        'transition-all duration-150 hover:border-white/35 hover:bg-white/[0.08] hover:text-white',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:border-white/70 focus-visible:bg-white/[0.08]',
        'focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.45)]',
        'disabled:pointer-events-none disabled:opacity-40',
      ].join(' ')}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-[22px] shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      ) : (
        <Fingerprint className="size-[22px] shrink-0" aria-hidden />
      )}
      <span className="truncate tracking-[-0.01em]">
        {loading ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
      </span>
    </button>
  );
};

PasskeyRow.displayName = 'PasskeyRow';
export default PasskeyRow;