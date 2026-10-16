'use client';

import React from 'react';
import { HelpCircle, Link2, LifeBuoy, Mail } from 'lucide-react';
import { checkEmailExists } from '../../../lib/api';
import { Field, FormNotice, PrimaryButton, Spinner } from '../../ui/ig-ui';
import { validateEmail } from '../../../lib/validations';

interface LoginProfile {
  email: string;
  exists: boolean;
  photoUrl?: string | null;
  name?: string | null;
  hasRecoveryEmail?: boolean;
  recoveryEmail?: string | null;
}

interface LoginMoreOptionsProps {
  email: string;
  setEmail: (v: string) => void;
  setLoginProfile: (p: LoginProfile | null) => void;
  loginProfile: LoginProfile | null;
  isSubmitting: boolean;
  canSend: (method: string) => boolean;
  remainingSends: (method: string) => number;
  /** DB-configured max for a method (from /api/auth/limits + defaults). */
  getMaxSends: (method: string) => number;
  /** Immediate /api/auth/remaining sync (fresh used/remaining/resetAt). */
  refreshRemaining: () => Promise<void>;
  /** Server-reported window reset (epoch ms) for a method, 0 when none. */
  getResetAt: (method: string) => number;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onRequestCode: () => Promise<void> | void;
  onRequestMagicLink: () => Promise<void> | void;
  onRequestForgotPassword: () => Promise<void> | void;
  onRequestRecoveryEmail: () => Promise<void> | void;
  onBack: () => void;
  loginNotice?: { msg: string; tone: 'error' | 'success' } | null;
}

type OptionConfig = {
  id: string;
  label: string;
  detail: string;
  action: string;
  sends: number | null;
  disabled: boolean;
  cooldownRemaining: number;
  resetsAt: number;
  onClick: () => Promise<void> | void;
};

const icons: Record<string, React.ReactNode> = {
  code: <Mail className="size-[18px]" />,
  magic: <Link2 className="size-[18px]" />,
  forgot: <HelpCircle className="size-[18px]" />,
  recovery: <LifeBuoy className="size-[18px]" />,
};

export const LoginMoreOptions: React.FC<LoginMoreOptionsProps> = ({
  email, setEmail, setLoginProfile, loginProfile, isSubmitting, canSend, remainingSends, getMaxSends, refreshRemaining, getResetAt,
  isInCooldown, getCooldownRemaining,
  onRequestCode, onRequestMagicLink, onRequestForgotPassword, onRequestRecoveryEmail, onBack, loginNotice,
}) => {
  // Fresh counts on open — the debounced sync may lag behind other tabs/sends.
  React.useEffect(() => {
    void refreshRemaining();
  }, [refreshRemaining]);

  /* Every option delivers to an inbox, so the address is asked for first —
     the list only unlocks once one is entered. */
  const [unlocked, setUnlocked] = React.useState(() => !validateEmail(email));
  /* One send at a time — the clicked row shows a spinner on its right and
     the rest lock until the request settles. Declared before any early
     return: a hook after a conditional return crashes the tree on unlock. */
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const emailOk = !validateEmail(email);

  /* Look the address up so the recovery-email option appears only when the
     account actually has one. */
  React.useEffect(() => {
    if (!emailOk || (loginProfile && loginProfile.email === email)) return;
    let cancelled = false;
    void (async () => {
      const res = await checkEmailExists(email);
      if (cancelled || !res.ok || !res.data) return;
      setLoginProfile({
        email,
        exists: !!res.data.exists,
        photoUrl: res.data.photoUrl,
        name: res.data.name,
        hasRecoveryEmail: !!res.data.hasRecoveryEmail,
        recoveryEmail: res.data.recoveryEmail,
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, emailOk]);

  if (!unlocked || !emailOk) {
    return (
      <div>
        <div className="otp-head">
          <h2 className="tb-heading">More ways to sign in</h2>
          <p className="tb-sub mt-1.5">
            Enter your account email first — every option below is delivered to it.
          </p>
        </div>

        <form
          className="signup-fields"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (emailOk) setUnlocked(true);
          }}
        >
          <div className="space-y-5 text-left">
          <Field
            aria-label="Email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />

          <PrimaryButton type="submit" disabled={!emailOk}>
            Continue
          </PrimaryButton>
          </div>

          <div className="more-ways">
            <button type="button" className="more-ways-btn" onClick={onBack}>
              Back to sign in
            </button>
          </div>
        </form>
      </div>
    );
  }

  const magicLinkSends = remainingSends('magic-link');
  const codeSends = remainingSends('login-otp');
  const forgotSends = remainingSends('otp');
  const recoverySends = loginProfile?.hasRecoveryEmail ? remainingSends('recovery') : 0;
  const magicLinkCooldown = isInCooldown('magic-link');
  const codeCooldown = isInCooldown('login-otp');
  const recoveryCooldown = isInCooldown('recovery');
  const forgotCooldown = isInCooldown('otp');

  const canCode = canSend('login-otp') && !codeCooldown && !isSubmitting;
  const canMagic = canSend('magic-link') && !magicLinkCooldown && !isSubmitting;
  const canForgot = canSend('otp') && !forgotCooldown && !isSubmitting;
  const canRecovery = loginProfile?.hasRecoveryEmail && canSend('recovery') && !recoveryCooldown && !isSubmitting;

  const codeCooldownRemaining = isInCooldown('login-otp') ? getCooldownRemaining('login-otp') : 0;
  const magicCooldownRemaining = isInCooldown('magic-link') ? getCooldownRemaining('magic-link') : 0;
  const forgotCooldownRemaining = isInCooldown('otp') ? getCooldownRemaining('otp') : 0;
  const recoveryCooldownRemaining = isInCooldown('recovery') ? getCooldownRemaining('recovery') : 0;

  const options: OptionConfig[] = [
    { id: 'code', label: 'One-time code', detail: 'A 6-digit code sent to your inbox', action: 'Send code', sends: codeSends, disabled: !canCode, cooldownRemaining: codeCooldownRemaining, resetsAt: getResetAt('login-otp'), onClick: onRequestCode },
    { id: 'magic', label: 'Magic link', detail: 'A sign-in link that logs you in directly', action: 'Send link', sends: magicLinkSends, disabled: !canMagic, cooldownRemaining: magicCooldownRemaining, resetsAt: getResetAt('magic-link'), onClick: onRequestMagicLink },
    { id: 'forgot', label: 'Forgot password?', detail: 'Reset your password via email', action: 'Reset', sends: forgotSends, disabled: !canForgot, cooldownRemaining: forgotCooldownRemaining, resetsAt: getResetAt('otp'), onClick: onRequestForgotPassword },
  ];

  if (loginProfile?.hasRecoveryEmail) {
    options.push({
      id: 'recovery',
      label: 'Recovery email',
      detail: `Code to ${loginProfile.recoveryEmail || 'your backup email'}`,
      action: 'Send code',
      sends: recoverySends,
      disabled: !canRecovery,
      cooldownRemaining: recoveryCooldownRemaining,
      resetsAt: getResetAt('recovery'),
      onClick: onRequestRecoveryEmail,
    });
  }

  /* runOption drives the per-row spinner (pendingId declared at the top). */
  const runOption = async (opt: OptionConfig) => {
    if (pendingId || opt.disabled) return;
    setPendingId(opt.id);
    try {
      await opt.onClick();
    } finally {
      setPendingId(null);
    }
  };

  const rowSub = (opt: OptionConfig) => {
    const sends = Number(opt.sends) || 0;
    if (sends === 0 && opt.resetsAt > 0) {
      return `Limit reached — resets at ${new Date(opt.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (opt.disabled && sends === 0) return 'Maximum attempts reached';
    if (opt.cooldownRemaining > 0) return `Wait ${opt.cooldownRemaining}s`;
    return opt.detail;
  };

  return (
    <div>
      <div className="otp-head">
        <h2 className="tb-heading">More ways to sign in</h2>
        <p className="tb-sub mt-1.5">
          You&apos;re signing in as <span className="mwo-mail">{email}</span>{' '}
          <button type="button" className="mwo-change" onClick={() => setUnlocked(false)}>
            Change
          </button>
        </p>
      </div>

      <div className="mwo-list">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="mwo-line"
            disabled={opt.disabled || pendingId !== null}
            onClick={() => void runOption(opt)}
          >
            <span className="mwo-ico" aria-hidden="true">{icons[opt.id] ?? icons.code}</span>
            <span className="mwo-line-text">
              <span className="mwo-line-label">{opt.label}</span>
              <span className="mwo-line-sub">{rowSub(opt)}</span>
            </span>
            {pendingId === opt.id ? (
              <Spinner size={16} className="mwo-spin" />
            ) : (
              <span className="mwo-line-action">{opt.action}</span>
            )}
          </button>
        ))}
      </div>

      <FormNotice notice={loginNotice} />

      <div className="more-ways">
        <button type="button" className="more-ways-btn" onClick={onBack}>
          Back to sign in
        </button>
      </div>
    </div>
  );
};

LoginMoreOptions.displayName = 'LoginMoreOptions';
