'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { requestMagicLink, getRemainingLimits } from '../../lib/api';
import { trackEvent } from '../../lib/telemetry';
import { AuthShell, Field, PrimaryButton } from '../ui/ig-ui';
import { validateEmail } from '../../lib/validations';
import { COOLDOWN_SECONDS } from './useAuthForm';

/* The one hard fact about a magic link: it is short-lived and single-use.
   The page is a charcoal plate naming the inbox, one resend action, and a
   way back. The resend carries the server-issued `ptr` — a device-bound
   proof key from the URL — so this page cannot be replayed from another
   device or hammered by a script. */
const LINK_LIFETIME = '15 minutes';

interface MagicLinkSentPageProps {
  /* Rendered inline in the login flow these come from the parent; opened as a
     standalone /magic-sent URL (deep link, refresh) they come from the query
     string instead. */
  email?: string;
  ptr?: string;
  onClose?: () => void;
}

export const MagicLinkSentPage: React.FC<MagicLinkSentPageProps> = ({ email: emailProp, ptr: ptrProp, onClose }) => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const email = emailProp || params?.get('email') || '';
  const [ptr, setPtr] = useState(() => ptrProp || params?.get('ptr') || '');
  const [sending, setSending] = useState(false);
  /* -1 until the server answers, so nothing renders a number we are not sure
     of. The page is a confirmation, not a quota meter — it never blocks on
     this. */
  const [remaining, setRemaining] = useState(-1);
  const [sendError, setSendError] = useState('');
  /* One deadline, whatever set it: a send's own cooldown or a 429's server-side
     window reset. A second countdown state would only disagree with this one. */
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  /* The no-address fallback below is the one state where the reader names the
     address themselves, so it carries its own little form's worth of state. */
  const [manualEmail, setManualEmail] = useState('');
  const [manualSending, setManualSending] = useState(false);
  const [manualError, setManualError] = useState('');

  const fetchRemaining = useCallback(async () => {
    if (!email) return;
    try {
      const res = await getRemainingLimits(email, 'magic-link');
      const rem = res.ok ? res.data?.remaining?.['magic-link'] : undefined;
      if (rem) setRemaining(rem.remaining);
    } catch {
      /* Rate-limit info is a nicety. If it cannot be read, the page still works
         — resend stays enabled and the server is the one that decides. */
    }
  }, [email]);

  /* Once on arrival, again whenever the tab comes back (a phone spends most of
     its time in another app while someone opens their mail), and after every
     resend. */
  useEffect(() => {
    void fetchRemaining();
    const refresh = () => { if (document.visibilityState === 'visible') void fetchRemaining(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [fetchRemaining]);

  // One interval per send, and it stops when the deadline passes.
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const cooldown = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  /* Starting a deadline also starts the clock it counts down against — setting
     only the deadline would render the first second from a stale `now`. */
  const lockUntil = (until: number) => {
    setNow(Date.now());
    setLockedUntil(until);
  };

  /* A missing ptr is not fatal: the server only demands one while a send flow
     is live for this address. Resend anyway — the reply (or a 403 notice)
     tells the truth. */
  const resendLocked = cooldown > 0 || remaining === 0;
  const resendLabel = cooldown > 0
    ? `Resend in ${cooldown}s`
    : remaining === 0
      ? 'No sends left'
      : 'Resend sign-in link';

  const handleResend = async () => {
    if (!email || resendLocked) return;
    setSending(true);
    setSendError('');
    try {
      const res = await requestMagicLink(email, { ptr });
      if (res.ok) {
        trackEvent('auth.magic_link_requested', { metadata: { purpose: 'resend' } });
        // The server rotates the key every send — keep the URL honest so a
        // refresh still works from this device.
        if (res.ptr) {
          setPtr(res.ptr);
          try {
            if (window.location.pathname === '/magic-sent') {
              const q = new URLSearchParams(window.location.search);
              q.set('ptr', res.ptr);
              window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
            }
          } catch {}
        }
        setRemaining(v => (v > 0 ? v - 1 : v));
        lockUntil(Date.now() + COOLDOWN_SECONDS * 1000);
        setTimeout(() => { void fetchRemaining(); }, 600);
      } else if (res.status === 429) {
        const resetsAt = res.resetsAt || (res.retryAfterMs ? Date.now() + res.retryAfterMs : 0);
        const until = resetsAt || Date.now() + COOLDOWN_SECONDS * 1000;
        lockUntil(until);
        setSendError(
          resetsAt
            ? `Too many requests — you can try again at ${new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            : res.error || `Please wait ${Math.ceil((until - Date.now()) / 1000)}s before requesting again.`,
        );
        setTimeout(() => { void fetchRemaining(); }, 600);
      } else {
        // Never swallow failures — show them inline. A 403 here means the
        // key is stale or this is not the device that started the flow.
        setSendError(res.error || 'Could not resend the link. Please try again.');
      }
    } catch {
      setSendError('Could not reach the server. Please try again.');
    }
    setSending(false);
  };

  /* SPA push — a full reload here repaints the whole shell for no reason. */
  const handleBack = () => {
    if (onClose) { onClose(); return; }
    try {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.href = '/login';
    }
  };

  /* Opened without an address — a shared link, a stripped query string, a
     refresh after the browser cleaned the URL. A blank page reads as a broken
     app: this says what happened, and lets the reader name the address here
     instead of making them retype it on the sign-in screen. */
  const handleManualRequest = async () => {
    const addr = manualEmail.trim();
    const invalid = validateEmail(addr);
    if (invalid) {
      setManualError(invalid);
      return;
    }
    setManualSending(true);
    setManualError('');
    try {
      const res = await requestMagicLink(addr);
      if (res.ok) {
        trackEvent('auth.magic_link_requested', { metadata: { purpose: 'manual' } });
        // Hand off to the same screen a normal request lands on, carrying the
        // fresh key so resend works here too.
        const q = new URLSearchParams({ email: addr });
        if (res.ptr) q.set('ptr', res.ptr);
        window.location.href = `/magic-sent?${q.toString()}`;
        return;
      }
      setManualError(res.error || 'Could not send the link. Please try again.');
    } catch {
      setManualError('Could not reach the server. Please try again.');
    }
    setManualSending(false);
  };

  if (!email) {
    return (
      <AuthShell>
        <div>
          <div className="otp-head">
            <h1 className="tb-heading">Check your email</h1>
            <p className="tb-sub mt-1.5">
              This page lost the address the link was sent to. Enter it below
              and we&apos;ll send a fresh link — they expire in {LINK_LIFETIME}.
            </p>
          </div>
          <form
            className="signup-fields"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void handleManualRequest();
            }}
          >
            <Field
              label="Email"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={manualEmail}
              error={manualError || undefined}
              onChange={(e) => {
                setManualEmail(e.target.value);
                if (manualError) setManualError('');
              }}
            />
            <PrimaryButton type="submit" loading={manualSending} disabled={manualSending}>
              Send a new link
            </PrimaryButton>
          </form>
          <div className="more-ways">
            <button type="button" className="more-ways-btn" onClick={handleBack}>
              Back to sign in
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div>
        <div className="otp-head">
          <h1 className="tb-heading">Check your email</h1>
          <p className="tb-sub mt-1.5">
            Your one-time sign-in link expires in {LINK_LIFETIME}. Check your
            spam folder if it hasn&apos;t arrived.
          </p>
        </div>

        <div className="signup-fields">
          <Field
            label="Sent to"
            type="email"
            value={email}
            readOnly
            hint="Resends are locked to the device that started sign-in."
          />

          <PrimaryButton
            type="button"
            onClick={() => void handleResend()}
            loading={sending}
            disabled={resendLocked}
          >
            {resendLabel}
          </PrimaryButton>

          {sendError && (
            <p role="alert" className="form-notice form-notice-error">{sendError}</p>
          )}
        </div>

        <div className="more-ways">
          <button type="button" className="more-ways-btn" onClick={handleBack}>
            Back to sign in
          </button>
        </div>
      </div>
    </AuthShell>
  );
};
