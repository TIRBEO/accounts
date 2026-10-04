import React, { useState } from 'react';
import { ArrowRight, LogOut } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { getRedirectTarget } from '../../lib/redirect';
import { AuthShell, SecondaryButton } from '../ui/ig-ui';
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
    return null;
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
        <div className="w-full text-center">
          {user.photoUrl && !photoBroken ? (
            <img
              src={user.photoUrl}
              alt={user.name || user.email}
              referrerPolicy="no-referrer"
              className="mx-auto mb-6 size-16 rounded-3xl border object-cover"
              onError={() => setPhotoBroken(true)}
            />
          ) : photoBroken ? (
            <span className="mx-auto mb-6 grid size-16 place-items-center overflow-hidden rounded-3xl border border-white/12">
              <RandomAvatar seed={user.email || user.name || 'tirbeo'} className="size-full" />
            </span>
          ) : (
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-3xl border border-white/12 text-[22px] text-white/85">
              {initials}
            </div>
          )}

          <p className="mb-2 text-[14px] font-medium text-white/45">
            Signed in as
          </p>
          <p className="truncate text-[20px] font-medium text-white/90">{user.email}</p>
          {user.name && <p className="mt-1.5 text-[15px] text-white/55">{user.name}</p>}

          <div className="mt-9 flex flex-col gap-2.5">
            <a
              href={dashboardUrl}
              className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ig text-white transition-colors hover:bg-ig-hover active:scale-[0.97] disabled:pointer-events-none disabled:bg-white/[0.12] disabled:text-white/40 text-[15px]"
            >
              Continue to dashboard
              <ArrowRight size={13} className="text-white/50" />
            </a>

            <SecondaryButton onClick={signOut}>
              <span className="inline-flex items-center justify-center gap-2">
                <LogOut size={13} className="text-white/45" />
                Sign out
              </span>
            </SecondaryButton>

            {onShowToast ? <PasskeyManager onShowToast={onShowToast} /> : null}
          </div>
        </div>
      </AuthShell>
    );
  }

  return <>{children}</>;
}
