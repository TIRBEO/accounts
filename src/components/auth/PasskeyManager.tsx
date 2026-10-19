'use client';

import React from 'react';
import { Fingerprint, KeyRound, Plus, Trash2 } from 'lucide-react';
import {
  PasskeyError,
  deletePasskey,
  hasPlatformAuthenticator,
  isPasskeySupported,
  listPasskeys,
  registerPasskey,
  type PasskeySummary,
} from '../../lib/passkeys';
import { haptic } from '../../lib/haptics';
import { captureException } from '../../lib/sentry';
import { trackEvent, trackError } from '../../lib/telemetry';
import {
  needsReauth,
  offeredMethods,
  proofError,
  type ReauthMethod,
  type ReauthProof,
} from '../../lib/reauth';
import { Field, PrimaryButton, TextButton } from '../ui/ig-ui';
import { ReauthSheet } from './ReauthSheet';

interface PasskeyManagerProps {
  /** Toast sink, same one the rest of the auth UI uses. */
  onShowToast: (message: string) => void;
}

/**
 * Passkey security panel for the accounts app.
 *
 * Add / list / remove the passkeys on this account. The list is loaded on mount
 * and only re-read after a change, so the panel never shows a stale device after
 * one is removed. Everything here needs a live session — which is exactly the
 * state this panel is only ever rendered in.
 */
export function PasskeyManager({ onShowToast }: PasskeyManagerProps): React.ReactElement | null {
  const [supported, setSupported] = React.useState(false);
  const [platform, setPlatform] = React.useState(false);
  const [passkeys, setPasskeys] = React.useState<PasskeySummary[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [deviceName, setDeviceName] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  // The passkey awaiting an identity proof, and the doors the server offered.
  const [reauthPasskey, setReauthPasskey] = React.useState<PasskeySummary | null>(null);
  const [reauthMethods, setReauthMethods] = React.useState<ReauthMethod[]>(['password', 'code']);

  const load = React.useCallback(async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch (err) {
      trackError('passkey:list', err);
      captureException(err);
      setPasskeys([]);
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    const ok = isPasskeySupported();
    setSupported(ok);
    if (!ok) return;
    void hasPlatformAuthenticator().then((value) => {
      if (alive) setPlatform(value);
    });
    void load();
    return () => {
      alive = false;
    };
  }, [load]);

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    setAdding(true);
    try {
      await registerPasskey(deviceName);
      trackEvent('auth.passkey_registered', { metadata: { named: Boolean(deviceName.trim()) } });
      haptic('success');
      onShowToast('Passkey added to this device');
      setDeviceName('');
      await load();
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : new PasskeyError('Could not add a passkey.');
      trackEvent('auth.passkey_failed', {
        detail: failure.message,
        metadata: { stage: 'register', cancelled: Boolean(failure.cancelled) },
      });
      if (!failure.cancelled) {
        haptic('error');
        captureException(err);
        onShowToast(failure.message);
      }
    } finally {
      setBusy(false);
      setAdding(false);
    }
  };

  const handleRemove = async (passkey: PasskeySummary) => {
    if (busy || pendingId) return;
    setPendingId(passkey.id);
    try {
      // No proof first: an account with a second factor is refused with a 403
      // REAUTH_REQUIRED, which we turn into a prompt rather than a failure.
      await deletePasskey(passkey.id);
      trackEvent('auth.passkey_removed');
      haptic('success');
      onShowToast('Passkey removed');
      await load();
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : null;
      if (failure?.result && needsReauth(failure.result)) {
        setReauthMethods(offeredMethods(failure.result));
        setReauthPasskey(passkey);
      } else {
        trackError('passkey:remove', err);
        haptic('error');
        captureException(err);
        onShowToast(failure?.message || 'Could not remove that passkey.');
      }
    } finally {
      setPendingId(null);
    }
  };

  // Called by the sheet with a collected proof. Only removes when the server
  // accepts it; a wrong/expired/rate-limited proof stays open with the line the
  // server sent, so the owner can correct it.
  const proveReauth = async (proof: ReauthProof): Promise<{ ok: boolean; error?: string }> => {
    const target = reauthPasskey;
    if (!target) return { ok: false, error: 'Nothing to remove.' };
    setBusy(true);
    try {
      await deletePasskey(target.id, proof);
      trackEvent('auth.passkey_removed');
      haptic('success');
      onShowToast('Passkey removed');
      await load();
      return { ok: true };
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : null;
      if (failure?.result) return { ok: false, error: proofError(failure.result) };
      trackError('passkey:remove', err);
      captureException(err);
      haptic('error');
      return { ok: false, error: failure?.message || 'Could not remove that passkey.' };
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return (
      <section className="mt-5 w-full rounded-xl border border-border bg-card p-5 text-left">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
          <KeyRound size={17} className="text-text-4" aria-hidden />
          Passkeys
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-text-3">
          This browser does not support passkeys. Use Chrome, Safari, Edge or Firefox on a device
          with Touch ID, Windows Hello or a screen lock.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 w-full rounded-xl border border-border bg-card p-5 text-left">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
        <KeyRound size={17} className="text-text-4" aria-hidden />
        Passkeys
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">
        Sign in with Face ID, Touch ID or your screen lock instead of a password.
        {platform ? ' This device supports it.' : ''}
      </p>

      <ul className="mt-4 space-y-2">
        {passkeys === null ? (
          <li className="text-[14px] text-text-4">Loading passkeys…</li>
        ) : passkeys.length === 0 ? (
          <li className="text-[14px] text-text-4">No passkeys on this account yet.</li>
        ) : (
          passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-field px-3.5 py-3"
            >
              <Fingerprint size={18} className="shrink-0 text-text-4" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-fg">
                  {passkey.deviceName || 'This device'}
                </p>
                <p className="truncate text-[12px] text-text-4">
                  {passkey.lastUsedAt
                    ? `Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`
                    : `Added ${new Date(passkey.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(passkey)}
                disabled={busy || pendingId !== null}
                aria-label={`Remove passkey ${passkey.deviceName || 'this device'}`}
                className="grid size-10 shrink-0 place-items-center rounded-full text-text-4 transition-colors hover:bg-danger/10 hover:text-danger-text disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 size={17} aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>

      <Field
        id="passkey-device-name"
        label="Name this device"
        containerClassName="mt-4"
        value={deviceName}
        onChange={(e) => setDeviceName(e.target.value)}
        placeholder="e.g. MacBook Pro"
        maxLength={60}
      />

      {/* One action per row: the field and its CTA stack, the way every other
          screen here does it. Side by side, a content-width button next to a
          stretching input is a width fight the input loses. */}
      <PrimaryButton
        type="button"
        onClick={handleAdd}
        loading={adding}
        disabled={busy}
        className="mt-3"
      >
        <Plus size={17} aria-hidden />
        Add passkey
      </PrimaryButton>

      {passkeys && passkeys.length > 1 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-text-4">
          Keep at least one other way in. Removing your last passkey means signing in with your
          password.
        </p>
      ) : null}

      <TextButton type="button" onClick={load} disabled={busy} className="mt-3">
        Refresh list
      </TextButton>

      <ReauthSheet
        open={reauthPasskey !== null}
        methods={reauthMethods}
        title="Confirm it’s you"
        description={
          reauthPasskey
            ? `Removing “${reauthPasskey.deviceName || 'this passkey'}” is a security change, so verify your identity first.`
            : 'Removing a passkey is a security change, so verify your identity first.'
        }
        onProve={proveReauth}
        onClose={() => setReauthPasskey(null)}
      />
    </section>
  );
}

PasskeyManager.displayName = 'PasskeyManager';
