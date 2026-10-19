import React, { useState } from 'react';
import { ArrowRight, LogOut } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { getRedirectTarget } from '../../lib/redirect';
import { AuthCardSkeleton, AuthShell, SecondaryButton } from '../ui/ig-ui';
import { RandomAvatar } from '../ui/random-avatar';
import { PasskeyManager } from './PasskeyManager';

interface SessionGateProps {
  children: React.ReactNode;
  /** Toast sink so the passkey panel can report without its own provider. */
  onShowToast?: (message: string) => void;
}

export function SessionGate({ children, onShowToast }: SessionGateProps) {
  const { user, loading, isAuthenticated, signOut } = useSession();
  // A blocked provider photo paints as a black circle — the seeded face takes over.
  const [photoBroken, setPhotoBroken] = useState(false);

  if (loading) {
    // The card that's coming, already plated — a probe in flight is a
    // waiting card, not a blank canvas.
    return <AuthCardSkeleton />;
  }

  if (isAuthenticated && user) {
    const dashboardUrl = getRedirectTarget();
    const initials = (user.name || user.email || '?')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <AuthShell>
        <div className="w-full">
          <div className="text-center">
            <h1 className="tb-heading">You&apos;re signed in</h1>
            <p className="tb-sub mt-2">
              Continue to your workspace, or review the security on this account.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 text-left">
            {user.photoUrl && !photoBroken ? (
              <img
                src={user.photoUrl}
                alt={user.name || user.email}
                referrerPolicy="no-referrer"
                className="size-14 shrink-0 rounded-2xl border border-border object-cover"
                onError={() => setPhotoBroken(true)}
              />
            ) : photoBroken ? (
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-field">
                <RandomAvatar seed={user.email || user.name || 'tirbeo'} className="size-full" />
              </span>
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-field text-[18px] font-semibold text-text-2">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-fg">{user.email}</p>
              {user.name ? (
                <p className="mt-0.5 truncate text-[13.5px] text-text-3">{user.name}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {/* Same plate as PrimaryButton — the site's CTA recipe, because a
                navigation link cannot be a <button> and still be middle-clickable. */}
            <a href={dashboardUrl} className="btn btn-primary btn-block">
              Continue to dashboard
              <ArrowRight size={15} className="opacity-70" aria-hidden />
            </a>

            <SecondaryButton onClick={signOut}>
              <span className="inline-flex items-center justify-center gap-2">
                <LogOut size={15} className="text-text-3" />
                Sign out
              </span>
            </SecondaryButton>
          </div>

          {onShowToast ? <PasskeyManager onShowToast={onShowToast} /> : null}
        </div>
      </AuthShell>
    );
  }

  return <>{children}</>;
}
