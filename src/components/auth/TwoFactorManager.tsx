'use client';

import React from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import {
  confirmSetup,
  disableAuthenticator,
  readTwoFactor,
  saveTwoFactorPrefs,
  startSetup,
  type TwoFactorState,
} from '../../lib/two-factor';
import { haptic } from '../../lib/haptics';
import { captureException } from '../../lib/sentry';
import {
  CardToggle,
  Field,
  Group,
  OtpBoxes,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  Spinner,
  TextButton,
} from '../ui/ig-ui';
import { TotpQr } from './TotpQr';

interface TwoFactorManagerProps {
  onShowToast: (message: string) => void;
}

/** The setup steps, one screen at a time inside the card. */
type Step = 'idle' | 'password' | 'qr' | 'verify' | 'codes' | 'disable';

/** "JBSWY3DP…" → "JBSW Y3DP …" — the spacing authenticator apps show. */
function formatKey(secret: string): string {
  return secret.toUpperCase().replace(/[\s=-]/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function secretFromUri(uri: string): string {
  try {
    return (new URL(uri).searchParams.get('secret') ?? '').toUpperCase();
  } catch {
    return '';
  }
}

/**
 * Two-factor security panel for the accounts app.
 *
 * The same flow the settings app runs, against the same brain endpoints:
 * authorise with the password, scan the QR, spend a live code to switch it on
 * (which hands back one set of backup codes, shown once), and a live code plus
 * the password to switch it off. The two "Extra security" switches ride on the
 * account's own settings.
 */
export function TwoFactorManager({ onShowToast }: TwoFactorManagerProps): React.ReactElement | null {
  const [state, setState] = React.useState<TwoFactorState | null>(null);
  const [step, setStep] = React.useState<Step>('idle');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Collected during a run; each lives only until the step that consumes it.
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [uri, setUri] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [disableCode, setDisableCode] = React.useState('');
  const [disableUseBackup, setDisableUseBackup] = React.useState(false);
  const [disableBackup, setDisableBackup] = React.useState('');
  const [codes, setCodes] = React.useState<string[]>([]);
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setState(await readTwoFactor());
    } catch (err) {
      captureException(err);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function reset(next: Step = 'idle') {
    setStep(next);
    setError(null);
    setPassword('');
    setCode('');
    setDisableCode('');
    setDisableUseBackup(false);
    setDisableBackup('');
    setUri(null);
    setCopied(false);
  }

  /* ── Enable: password → QR → verify → codes ─────────────────── */

  async function beginSetup() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startSetup(password || undefined);
      if (res.ok) {
        setUri(res.uri);
        setPassword('');
        reset('qr');
      } else if (res.needsProof) {
        setStep('password');
        setError(res.error);
      } else {
        haptic('error');
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function authorizeSetup() {
    if (busy || password.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startSetup(password);
      if (res.ok) {
        setUri(res.uri);
        setPassword('');
        reset('qr');
      } else {
        setError(res.error);
        if (!res.needsProof) haptic('error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await confirmSetup(code);
      if (res.ok) {
        setCodes(res.backupCodes);
        reset('codes');
        void load();
      } else {
        haptic('error');
        setError(res.error);
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  }

  /* ── Disable: password + live code ──────────────────────────── */

  async function confirmDisable() {
    if (busy || password.length === 0) return;
    const ready = disableUseBackup ? disableBackup.trim().length > 0 : disableCode.length === 6;
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const factor = disableUseBackup
        ? { backupCode: disableBackup.trim() }
        : { code: disableCode };
      const res = await disableAuthenticator(password, factor);
      if (res.ok) {
        haptic('success');
        onShowToast('Two-factor turned off');
        reset('idle');
        void load();
      } else {
        haptic('error');
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  /* ── Extra-security switches ────────────────────────────────── */

  async function togglePref(key: 'requireForActions' | 'alertSuspicious', value: boolean) {
    if (!state) return;
    if (key === 'requireForActions' && value && !state.authenticator) {
      onShowToast('Turn on the authenticator app before requiring it.');
      return;
    }
    const prev = state;
    setState({ ...prev, [key]: value });
    const res = await saveTwoFactorPrefs({ [key]: value });
    if (!res.ok) {
      setState(prev);
      onShowToast(res.error);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
    } catch {
      /* clipboard blocked — the codes are still readable on screen */
    }
  }

  if (!state) {
    return (
      <section className="mt-6 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
        <p className="flex items-center gap-2 text-[14px] text-white/45">
          <Spinner size={14} /> Loading two-factor settings…
        </p>
      </section>
    );
  }

  const on = state.authenticator;

  return (
    <section className="mt-6 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-white">
        <ShieldCheck size={17} className="text-white/45" aria-hidden />
        Two-factor authentication
        <span
          className={cnStatus(on)}
          aria-hidden
        >
          {on ? 'On' : 'Off'}
        </span>
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
        A 6-digit code from an app like Google Authenticator, plus a set of backup codes.
      </p>

      {/* ── The one control, or the step it is running through ── */}
      {step === 'idle' ? (
        <div className="mt-4">
          <CardToggle
            label="Authenticator app"
            sub={
              on
                ? state.codes.remaining
                  ? `${state.codes.remaining} of ${state.codes.total} backup codes unused.`
                  : 'Every backup code in the current set is spent.'
                : 'Turn this on to get a code-based second step.'
            }
            checked={on}
            onChange={(next) => {
              if (next) reset('password');
              else reset('disable');
            }}
          />
        </div>
      ) : null}

      {step === 'password' ? (
        <div className="mt-4 space-y-3">
          <p className="text-[14px] leading-relaxed text-white/70">
            Confirm it&apos;s you before a new authenticator is attached to the account.
          </p>
          <PasswordField
            label="Your password"
            value={password}
            shown={showPw}
            onToggleShown={() => setShowPw((v) => !v)}
            onChange={(e) => {
              setError(null);
              setPassword(e.target.value);
            }}
            autoComplete="current-password"
            autoFocus
            error={error ?? undefined}
          />
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => reset('idle')} className="h-12 flex-1">
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={authorizeSetup}
              loading={busy}
              disabled={password.length === 0}
              className="h-12 flex-1"
            >
              Continue
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 'qr' && uri ? (
        <div className="mt-5 space-y-4">
          <TotpQr value={uri} />
          <div>
            <p className="tb-label">Or type this key by hand</p>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3">
              <span className="min-w-0 flex-1 break-all font-mono text-[14px] font-semibold tracking-[0.08em] text-white">
                {formatKey(secretFromUri(uri))}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secretFromUri(uri));
                    setCopied(true);
                  } catch {
                    /* ignore */
                  }
                }}
                aria-label="Copy setup key"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-white/50">
            Scan with your app, then tap Next and enter the 6-digit code it shows.
          </p>
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => reset('idle')} className="h-12 flex-1">
              Cancel
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => reset('verify')} className="h-12 flex-1">
              Next
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 'verify' ? (
        <div className="mt-5 space-y-4">
          <p className="text-[14px] leading-relaxed text-white/70">
            Type the 6-digit code your app is showing right now. It refreshes every 30 seconds.
          </p>
          <OtpBoxes
            label="Authenticator code"
            value={code}
            onChange={(v) => {
              setError(null);
              setCode(v.replace(/\D/g, '').slice(0, 6));
            }}
            error={!!error}
          />
          {error ? (
            <p role="alert" className="text-center text-[13px] text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => reset('qr')} className="h-12 flex-1">
              Back
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={verifyCode}
              loading={busy}
              disabled={code.length !== 6}
              className="h-12 flex-1"
            >
              Confirm
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 'codes' ? (
        <div className="mt-5 space-y-4">
          <p className="text-[14px] font-semibold text-white">Two-factor is on.</p>
          <p className="text-[13px] leading-relaxed text-white/60">
            Save these backup codes somewhere safe. Each works once if you lose your app — they
            won&apos;t be shown again.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-4">
            {codes.map((c) => (
              <span key={c} className="font-mono text-[15px] tracking-[0.1em] text-white tabular-nums">
                {c}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={copyCodes} className="h-12 flex-1">
              {copied ? 'Copied' : 'Copy codes'}
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => {
                haptic('success');
                onShowToast('Two-factor is on');
                reset('idle');
              }}
              className="h-12 flex-1"
            >
              Done
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === 'disable' ? (
        <div className="mt-4 space-y-3">
          <p className="text-[14px] leading-relaxed text-white/70">
            Turning two-factor off also retires your backup codes. Enter your password and a current
            code from the app — or one of your backup codes — to confirm.
          </p>
          <PasswordField
            label="Your password"
            value={password}
            shown={showPw}
            onToggleShown={() => setShowPw((v) => !v)}
            onChange={(e) => {
              setError(null);
              setPassword(e.target.value);
            }}
            autoComplete="current-password"
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="tb-label">{disableUseBackup ? 'Backup code' : 'Code from your app'}</span>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDisableUseBackup((v) => !v);
                }}
                className="text-[12.5px] font-medium text-white/60 hover:text-white"
              >
                {disableUseBackup ? 'Use app code' : 'Use a backup code'}
              </button>
            </div>
            {disableUseBackup ? (
              <Field
                label="Backup code"
                value={disableBackup}
                onChange={(e) => {
                  setError(null);
                  setDisableBackup(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                }}
                autoComplete="one-time-code"
                placeholder="8-character backup code"
                maxLength={8}
                className="font-mono tracking-[0.15em]"
              />
            ) : (
              <Field
                label="Code from your app"
                value={disableCode}
                onChange={(e) => {
                  setError(null);
                  setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                className="font-mono tracking-[0.15em]"
              />
            )}
          </div>
          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => reset('idle')} className="h-12 flex-1">
              Keep it on
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={confirmDisable}
              loading={busy}
              disabled={
                password.length === 0 ||
                (disableUseBackup ? disableBackup.trim().length === 0 : disableCode.length !== 6)
              }
              className="h-12 flex-1"
            >
              Turn off
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {/* ── Extra security ── */}
      <div className="mt-6">
        <p className="tb-label mb-1">Extra security</p>
        <Group>
          <CardToggle
            label="Require 2FA for sensitive actions"
            sub="Ask for a code before changing password, email or payouts."
            checked={state.requireForActions}
            onChange={(v) => void togglePref('requireForActions', v)}
          />
          <CardToggle
            label="Alert on suspicious sign-in"
            sub="Email me if a sign-in looks unusual."
            checked={state.alertSuspicious}
            onChange={(v) => void togglePref('alertSuspicious', v)}
          />
        </Group>
        {!on && state.requireForActions === false ? (
          <p className="mt-2 text-[12px] leading-relaxed text-white/40">
            Turn on the authenticator app first — requiring it without a factor enrolled would lock
            you out.
          </p>
        ) : null}
      </div>

      <TextButton type="button" onClick={() => void load()} className="mt-4">
        Refresh status
      </TextButton>
    </section>
  );
}

function cnStatus(on: boolean): string {
  return [
    'ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
    on ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/45',
  ].join(' ');
}

TwoFactorManager.displayName = 'TwoFactorManager';
export default TwoFactorManager;
