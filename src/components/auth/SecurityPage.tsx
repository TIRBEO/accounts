'use client';

import React from 'react';
import { ArrowLeft, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { getCurrentUser } from '../../lib/api';
import type { CurrentUserData } from '../../lib/api';
import { captureException } from '../../lib/sentry';
import { AuthShell, PrimaryButton, SecondaryButton } from '../ui/ig-ui';
import { RandomAvatar } from '../ui/random-avatar';
import { PasskeyManager } from './PasskeyManager';
import { TwoFactorManager } from './TwoFactorManager';

interface SecurityPageProps {
  onShowToast: (message: string) => void;
}

/**
 * `/security` — the accounts app's security section.
 *
 * It exists as its own route because every other page here bounces a signed-in
 * visitor straight to the dashboard, so passkey management had nowhere to live:
 * the login screen cannot register a passkey (registration needs a session) and
 * the dashboard is a different app. This route is exempt from that redirect,
 * asks for a session, and sends anyone without one back to sign in.
 */
export function SecurityPage({ onShowToast }: SecurityPageProps): React.ReactElement {
  const { signOut } = useSession();
  // Use the API's own shape rather than a hand-copied subset, so a change to
  // CurrentUserData can't silently drift out of sync with getCurrentUser().
  const [user, setUser] = React.useState<CurrentUserData | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'guest'>('loading');
  // A blocked provider photo paints as a black circle — the seeded face takes over.
  const [photoBroken, setPhotoBroken] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    getCurrentUser().then((res) => {
      if (!alive) return;
      if (res.ok && res.data) {
        setUser(res.data);
        setState('ready');
      } else {
        setState('guest');
      }
    }).catch((err) => {
      captureException(err);
      if (alive) setState('guest');
    });
    return () => {
      alive = false;
    };
  }, []);

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    // signOut() revokes the session, clears browser state and navigates to
    // /login itself — a second navigation here would race (and win over) it.
    await signOut();
  };

  return (
    <AuthShell>
      <div className="w-full">
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to sign in
        </a>

        <div className="flex items-center gap-3.5">
          {state === 'ready' && user?.photoUrl && !photoBroken ? (
            <img
              src={user.photoUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-15 shrink-0 rounded-2xl border border-white/10 object-cover"
              onError={() => setPhotoBroken(true)}
            />
          ) : state === 'ready' && user?.photoUrl && photoBroken ? (
            <span className="grid size-15 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10">
              <RandomAvatar seed={user?.email || user?.name || 'tirbeo'} className="size-full" />
            </span>
          ) : (
            <div className="grid size-15 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[18px] font-bold text-white/70">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[18px] font-semibold text-white">
              {user?.name || 'Your account'}
            </p>
            {user?.email ? (
              <p className="truncate text-[14px] text-white/50">{user.email}</p>
            ) : null}
          </div>
        </div>

        {state === 'loading' ? (
          <p className="mt-8 text-center text-[14px] text-white/45">Checking your session…</p>
        ) : state === 'guest' ? (
          <div className="mt-8 text-center">
            <ShieldCheck size={30} className="mx-auto text-white/30" aria-hidden />
            <p className="mt-4 text-[15px] font-semibold text-white">Sign in to manage your passkeys</p>
            <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed text-white/50">
              Passkeys are tied to your account, so we need to know who you are before we add or
              remove one.
            </p>
            <PrimaryButton type="button" onClick={() => { window.location.href = '/'; }} className="mt-6">
              Go to sign in
            </PrimaryButton>
          </div>
        ) : (
          <>
            <TwoFactorManager onShowToast={onShowToast} />

            <PasskeyManager onShowToast={onShowToast} />

            <div className="mt-5">
              <SecondaryButton type="button" onClick={handleSignOut} className="h-[52px]">
                <span className="inline-flex items-center justify-center gap-2">
                  <LogOut size={15} className="text-white/45" aria-hidden />
                  Sign out
                </span>
              </SecondaryButton>
            </div>
          </>
        )}

        <p className="mt-7 flex items-center justify-center gap-1.5 text-[13px] text-white/35">
          <KeyRound size={14} aria-hidden />
          Passkeys never leave your device
        </p>
      </div>
    </AuthShell>
  );
}

SecurityPage.displayName = 'SecurityPage';
export default SecurityPage;