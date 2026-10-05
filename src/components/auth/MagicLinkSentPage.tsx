'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { requestMagicLink, API_BASE_URL } from '../../lib/api';
import { AuthShell, Field, PrimaryButton, TextButton } from '../ui/ig-ui';
import { validateEmail } from '../../lib/validations';

/* The one hard fact about a magic link: it is short-lived and single-use. It
   is said once, in the subtitle — the page is wordmark, heading, one line, the
   address, and a resend. Nothing else. */
const LINK_LIFETIME = '15 minutes';

export const MagicLinkSentPage: React.FC = () => {
  const email = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') || '' : '';
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  /* -1 until the server answers, so nothing renders a number we are not sure
     of. The page is a confirmation, not a quota meter — it never blocks on
     this. */
  const [remaining, setRemaining] = useState(-1);
  const [retryAfter, setRetryAfter] = useState(0);
  const [sendError, setSendError] = useState('');
  const [limitResetAt, setLimitResetAt] = useState(0);
  /* The no-address fallback below is the one state where the reader names the
     address themselves, so it carries its own little form's worth of state. */
  const [manualEmail, setManualEmail] = useState('');
  const [manualSending, setManualSending] = useState(false);
  const [manualError, setManualError] = useState('');
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRemaining = useCallback(async () => {
    if (!email) return;
    try {
      const base = API_BASE_URL;
      const res = await fetch(`${base}/api/auth/remaining?email=${encodeURIComponent(email)}&method=magic-link`, { credentials: 'include' });
      if (res.ok) {
        const d: any = await res.json();
        const rem = d?.remaining?.['magic-link'];
        if (rem) {
          setRemaining(rem.remaining);
          setLimitResetAt(rem.remaining <= 0 && rem.resetAt ? rem.resetAt : 0);
        }
      }
    } catch {
      /* Rate-limit info is a nicety. If it cannot be read, the page still works
         — resend stays enabled and the server is the one that decides. */
    }
  }, [email]);

  /* Once on arrival, again whenever the tab comes back (a phone spends most of
     its time in another app while someone opens their mail), and after every
     resend. The old 8s poll fired forever on a page that has nothing to update,
     which is how a confirmation screen ends up generating traffic on its own. */
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

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown(v => {
        if (v <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [cooldown]);

  const resendLocked = cooldown > 0 || retryAfter > 0 || (limitResetAt > 0 && Date.now() < limitResetAt) || remaining === 0;
  const resendLabel = sending
    ? 'Sending…'
    : retryAfter > 0
      ? `Resend in ${retryAfter}s`
      : cooldown > 0
        ? `Resend in ${cooldown}s`
        : remaining === 0
          ? 'No sends left'
          : 'Resend';

  const handleResend = async () => {
    if (!email || resendLocked) return;
    setSending(true);
    setSendError('');
    try {
      const res = await requestMagicLink(email);
      if (res.ok) {
        setRemaining(v => (v > 0 ? v - 1 : v));
        setCooldown(30);
        setTimeout(() => { void fetchRemaining(); }, 600);
      } else if (res.status === 429) {
        const resetsAt = res.resetsAt || (res.retryAfterMs ? Date.now() + res.retryAfterMs : 0);
        const retrySec = Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000));
        setRetryAfter(retrySec);
        setCooldown(retrySec);
        if (resetsAt) setLimitResetAt(resetsAt);
        setSendError(
          resetsAt
            ? `Too many requests — you can try again at ${new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            : res.error || `Please wait ${retrySec}s before requesting again.`,
        );
        setTimeout(() => { void fetchRemaining(); }, 600);
      } else {
        // Never swallow failures — show them inline.
        setSendError(res.error || 'Could not resend the link. Please try again.');
      }
    } catch {
      setSendError('Could not reach the server. Please try again.');
    }
    setSending(false);
  };

  /* "/" is the app root — there is no /login route to go back to. */
  const handleBack = () => { window.location.href = '/'; };

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
        // Hand off to the same screen a normal request lands on, now that the
        // address is known and the resend controls have something to work with.
        window.location.href = `/magic-sent?email=${encodeURIComponent(addr)}`;
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
      <AuthShell title="Check your email" subtitle={`Your one-time sign-in link expires in ${LINK_LIFETIME}.`}>
        <div className="w-full">
          <p className="flex items-start gap-2.5 text-left text-[16px] leading-relaxed text-white/70">
            <Mail size={18} className="mt-[3px] shrink-0 text-white/50" aria-hidden="true" />
            <span>
              This link arrived without the address it was sent to — usually
              because it was shortened, forwarded, or the browser dropped the
              query string. Enter your email and we&apos;ll send a fresh one.
            </span>
          </p>

          <form
            className="mt-6"
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

            <div className="mt-5">
              <PrimaryButton type="submit" loading={manualSending} disabled={manualSending}>
                {manualSending ? 'Sending…' : 'Send a new link'}
              </PrimaryButton>
            </div>
          </form>

          <div className="mt-2 text-center">
            <TextButton type="button" onClick={handleBack} className="inline-flex items-center gap-1.5">
              <ArrowLeft size={13} /> Back to sign in
            </TextButton>
          </div>

          <p className="mt-4 text-center text-[16px] text-muted">
            Protected by Tirbeo ·{' '}
            <a href="/privacy" className="text-link hover:underline">Privacy</a> ·{' '}
            <a href="/terms" className="text-link hover:underline">Terms</a>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={`Your one-time sign-in link expires in ${LINK_LIFETIME}. Check your spam folder if it hasn't arrived.`}
      footer={
        <>
          Protected by Tirbeo ·{' '}
          <a href="/privacy" className="text-link hover:underline">Privacy</a> ·{' '}
          <a href="/terms" className="text-link hover:underline">Terms</a>
        </>
      }
    >
      <div className="w-full">
        {/* Where it went — a plain muted line. This is the only thing the
            visitor needs to read; everything else supports it. */}
        <p className="truncate rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center text-[16px] text-muted">
          {email}
        </p>

        {/* Resend is a recovery action, not the point of the page — a text
            line, not a button competing with the confirmation above. */}
        <div className="mt-2 text-center">
          <TextButton
            type="button"
            onClick={handleResend}
            disabled={resendLocked || sending}
            aria-busy={sending || undefined}
          >
            {resendLabel}
          </TextButton>
        </div>

        {/* Limits stay invisible until actually hit — then they are named. */}
        {sendError && (
          <p role="alert" className="mt-4 rounded-xl border border-danger/30 p-2.5 text-center text-[15px] leading-snug text-danger">
            {sendError}
          </p>
        )}
      </div>
    </AuthShell>
  );
};