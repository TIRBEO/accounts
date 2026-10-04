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
import { PrimaryButton, SecondaryButton } from '../ui/ig-ui';

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

  const load = React.useCallback(async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch (err) {
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
      haptic('success');
      onShowToast('Passkey added to this device');
      setDeviceName('');
      await load();
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : new PasskeyError('Could not add a passkey.');
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
      await deletePasskey(passkey.id);
      haptic('success');
      onShowToast('Passkey removed');
      await load();
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : new PasskeyError('Could not remove that passkey.');
      haptic('error');
      captureException(err);
      onShowToast(failure.message);
    } finally {
      setPendingId(null);
    }
  };

  if (!supported) {
    return (
      <section className="mt-6 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-white">
          <KeyRound size={17} className="text-white/45" aria-hidden />
          Passkeys
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-white/50">
          This browser does not support passkeys. Use Chrome, Safari, Edge or Firefox on a device
          with Touch ID, Windows Hello or a screen lock.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-white">
        <KeyRound size={17} className="text-white/45" aria-hidden />
        Passkeys
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
        Sign in with Face ID, Touch ID or your screen lock instead of a password.
        {platform ? ' This device supports it.' : ''}
      </p>

      <ul className="mt-4 space-y-2">
        {passkeys === null ? (
          <li className="text-[14px] text-white/40">Loading passkeys…</li>
        ) : passkeys.length === 0 ? (
          <li className="text-[14px] text-white/40">No passkeys on this account yet.</li>
        ) : (
          passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3"
            >
              <Fingerprint size={18} className="shrink-0 text-white/45" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white">
                  {passkey.deviceName || 'This device'}
                </p>
                <p className="truncate text-[12px] text-white/45">
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
                className="grid size-10 shrink-0 place-items-center rounded-xl text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 size={17} aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="mt-4">
        <label htmlFor="passkey-device-name" className="tb-label">
          Name this device
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="passkey-device-name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. MacBook Pro"
            maxLength={60}
            className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 text-[16px] text-white placeholder:text-white/35 focus:border-white focus:outline-none"
          />
          <PrimaryButton
            type="button"
            onClick={handleAdd}
            loading={adding}
            disabled={busy}
            className="h-12 shrink-0 px-4"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={17} aria-hidden />
              Add
            </span>
          </PrimaryButton>
        </div>
      </div>

      {passkeys && passkeys.length > 1 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-white/40">
          Keep at least one other way in. Removing your last passkey means signing in with your
          password.
        </p>
      ) : null}

      <SecondaryButton
        type="button"
        onClick={load}
        disabled={busy}
        className="mt-4 h-11"
      >
        Refresh list
      </SecondaryButton>
    </section>
  );
}

PasskeyManager.displayName = 'PasskeyManager';
export default PasskeyManager;