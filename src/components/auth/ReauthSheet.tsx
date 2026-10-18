'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Fingerprint, KeyRound, ShieldCheck, X } from 'lucide-react';
import {
  PrimaryButton,
  SecondaryButton,
  PasswordField,
  OtpBoxes,
  Segmented,
  TextButton,
  FormNotice,
  Spinner,
} from '../ui/ig-ui';
import { getReauthToken, PasskeyError } from '../../lib/passkeys';
import { sendReauthCode, type ReauthMethod, type ReauthProof } from '../../lib/reauth';

interface ReauthSheetProps {
  open: boolean;
  /** Only the doors the server said this account can open. */
  methods: ReauthMethod[];
  title?: string;
  description?: string;
  /** Attempt the action with the collected proof. `ok:false` keeps the sheet
   *  open and shows `error` inline (wrong password/code, expiry, rate limit). */
  onProve: (proof: ReauthProof) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

const LABELS: Record<ReauthMethod, string> = {
  passkey: 'Passkey',
  password: 'Password',
  totp: 'Authenticator',
  code: 'Email code',
};

const ORDER: ReauthMethod[] = ['passkey', 'password', 'totp', 'code'];

export const ReauthSheet: React.FC<ReauthSheetProps> = ({
  open,
  methods,
  title = 'Confirm it’s you',
  description = 'Removing a passkey is a security change, so verify your identity first.',
  onProve,
  onClose,
}) => {
  const choices = ORDER.filter((m) => methods.includes(m));
  const [active, setActive] = useState<ReauthMethod>(choices[0] ?? 'password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone: 'error' | 'success' } | null>(null);

  // Reset every field each time the sheet opens, so a stale proof never lingers.
  useEffect(() => {
    if (!open) return;
    const first = ORDER.filter((m) => methods.includes(m))[0] ?? 'password';
    setActive(first);
    setPassword('');
    setShowPassword(false);
    setTotp('');
    setEmailCode('');
    setSentTo('');
    setBusy(false);
    setSendingCode(false);
    setNotice(null);
  }, [open, methods]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleSendCode = async () => {
    if (sendingCode) return;
    setSendingCode(true);
    setNotice(null);
    const res = await sendReauthCode();
    if (res.ok) {
      setSentTo(res.email || 'your email');
      setNotice({ msg: res.message || 'A code is on its way.', tone: 'success' });
    } else {
      setNotice({ msg: res.error || 'Could not send a code.', tone: 'error' });
    }
    setSendingCode(false);
  };

  const buildProof = async (): Promise<ReauthProof | null> => {
    if (active === 'password') return password ? { password } : null;
    if (active === 'totp') return totp.length === 6 ? { code: totp } : null;
    if (active === 'code') return emailCode.length === 6 ? { reauthCode: emailCode } : null;
    if (active === 'passkey') {
      // Runs the WebAuthn ceremony to mint a reauthToken.
      setBusy(true);
      try {
        const token = await getReauthToken();
        return { reauthToken: token };
      } catch (err) {
        const failure = err instanceof PasskeyError ? err : new PasskeyError('Could not use that passkey.');
        if (!failure.cancelled) setNotice({ msg: failure.message, tone: 'error' });
        return null;
      } finally {
        setBusy(false);
      }
    }
    return null;
  };

  const handleConfirm = async () => {
    if (busy) return;
    setNotice(null);
    const proof = await buildProof();
    if (!proof) return;
    setBusy(true);
    const res = await onProve(proof);
    setBusy(false);
    if (!res.ok) {
      // Wrong password / code / expiry / rate limit — stay open, let them fix it.
      setNotice({ msg: res.error || 'That did not match. Please try again.', tone: 'error' });
      // A code is single-use: clear it so a spent code is never resent.
      if (active === 'code') setEmailCode('');
      if (active === 'passkey') { /* token is fresh each try */ }
      return;
    }
    onClose();
  };

  const canSubmit =
    !busy &&
    (active === 'passkey' ||
      (active === 'password' && !!password) ||
      (active === 'totp' && totp.length === 6) ||
      (active === 'code' && emailCode.length === 6));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reauth-title"
        >
          <motion.button
            type="button"
            aria-label="Cancel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-scrim backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl glass text-fg sm:rounded-3xl"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-divider px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-field text-text-3">
                  <ShieldCheck className="size-[18px]" />
                </div>
                <h2 id="reauth-title" className="truncate text-[20px] text-fg">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted transition-colors hover:bg-hover hover:text-fg"
              >
                <X className="size-[18px]" />
              </button>
            </header>

            <div className="px-5 py-5 sm:px-6">
              <p className="mb-4 text-[15px] leading-relaxed text-text-3">{description}</p>

              {choices.length > 1 && (
                <div className="mb-5">
                  <Segmented<ReauthMethod>
                    value={active}
                    onChange={(v) => { setActive(v); setNotice(null); }}
                    options={choices.map((m) => ({ value: m, label: LABELS[m] }))}
                    label="Choose a way to verify"
                  />
                </div>
              )}

              {active === 'password' && (
                <PasswordField
                  aria-label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  shown={showPassword}
                  onToggleShown={() => setShowPassword((v) => !v)}
                />
              )}

              {active === 'totp' && (
                <div className="space-y-2">
                  <OtpBoxes label="Authenticator code" value={totp} onChange={setTotp} />
                  <p className="text-center text-[13px] text-text-4">The 6-digit code from your authenticator app.</p>
                </div>
              )}

              {active === 'code' && (
                <div className="space-y-4">
                  {sentTo ? (
                    <p className="text-center text-[14px] text-text-3">
                      We emailed a code to <span className="font-semibold text-fg">{sentTo}</span>.{' '}
                      <TextButton onClick={handleSendCode} disabled={sendingCode}>
                        {sendingCode ? 'Sending…' : 'Resend'}
                      </TextButton>
                    </p>
                  ) : (
                    <SecondaryButton type="button" onClick={handleSendCode} disabled={sendingCode}>
                      <span className="inline-flex items-center justify-center gap-2">
                        {sendingCode ? <Spinner size={16} /> : <KeyRound size={16} />}
                        Email me a code
                      </span>
                    </SecondaryButton>
                  )}
                  <OtpBoxes label="Emailed code" value={emailCode} onChange={setEmailCode} />
                </div>
              )}

              {active === 'passkey' && (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <div className="grid size-14 place-items-center rounded-2xl bg-field text-text-3">
                    <Fingerprint className="size-6" />
                  </div>
                  <p className="text-[14px] leading-relaxed text-text-3">
                    Confirm with the passkey on this device to continue.
                  </p>
                </div>
              )}

              <FormNotice notice={notice} />

              <div className="mt-5">
                <PrimaryButton type="button" onClick={handleConfirm} loading={busy} disabled={!canSubmit}>
                  {active === 'passkey' ? 'Verify with passkey' : 'Confirm'}
                </PrimaryButton>
              </div>
              <div className="mt-2 text-center">
                <TextButton onClick={onClose} disabled={busy}>Cancel</TextButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

ReauthSheet.displayName = 'ReauthSheet';
