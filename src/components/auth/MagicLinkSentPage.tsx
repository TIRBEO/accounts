'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requestMagicLink, getRemainingLimits } from '../../lib/api';
import { trackEvent } from '../../lib/telemetry';
import { AuthShell, Field, PrimaryButton, TextButton } from '../ui/ig-ui';
import { validateEmail } from '../../lib/validations';

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
      const res = await getRemainingLimits(email, 'magic-link');
      const rem = res.ok ? res.data?.remaining?.['magic-link'] : undefined;
      if (rem) {
        setRemaining(rem.remaining);
        setLimitResetAt(rem.remaining <= 0 && rem.resetAt ? rem.resetAt : 0);
      }
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

  /* A missing ptr is not fatal: the server only demands one while a send flow
     is live for this address. Resend anyway — the reply (or a 403 notice)
     tells the truth. */
  const resendLocked = cooldown > 0 || retryAfter > 0 || (limitResetAt > 0 && Date.now() < limitResetAt) || remaining === 0;
  const resendLabel = sending
    ? 'Sending…'
    : retryAfter > 0
      ? `Resend in ${retryAfter}s`
      : cooldown > 0
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
                Send a new link
              </PrimaryButton>
            </div>
          </form>
          <div className="mt-2 text-center">
            <TextButton type="button" onClick={handleBack} className="inline-flex items-center gap-1.5">
              <ArrowLeft size={13} /> Back to sign in
            </TextButton>
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
          <div className="space-y-5 text-left">
            <Field
              label="Sent to"
              type="email"
              value={email}
              readOnly
              hint="Resends are locked to the device that started sign-in."
              trailing={
                <span className="ms-chip" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
                    <path d="m3.5 7 7.4 5.4a2 2 0 0 0 2.2 0L20.5 7" />
                  </svg>
                </span>
              }
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
