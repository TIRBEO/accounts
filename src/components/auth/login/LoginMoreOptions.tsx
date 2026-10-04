'use client';

import React from 'react';
import { HelpCircle, KeyRound, Link2, LifeBuoy, Mail } from 'lucide-react';
import { IdentityCard, Group, Row, TextButton } from '../../ui/ig-ui';

interface LoginMoreOptionsProps {
  email: string;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
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
  onRequestCode: () => void;
  onRequestMagicLink: () => void;
  onRequestForgotPassword: () => void;
  onRequestRecoveryEmail: () => void;
  onBack: () => void;
}

type OptionConfig = {
  id: string;
  label: string;
  detail: string;
  sends: number | null;
  max: number | null;
  disabled: boolean;
  cooldownRemaining: number;
  resetsAt: number;
  onClick: () => void;
};

const icons: Record<string, React.ReactNode> = {
  code: <Mail className="size-4" />,
  magic: <Link2 className="size-4" />,
  forgot: <HelpCircle className="size-4" />,
  recovery: <LifeBuoy className="size-4" />,
};

const OptionRow = ({ option }: { option: OptionConfig }) => {
  const sends = Number(option.sends) || 0;
  const cooldown = Number(option.cooldownRemaining) || 0;

  /* No quota meter on the rows — title, one line, chevron. The limit only
     gets to speak when the user actually hits it. */
  const sub =
    sends === 0 && option.resetsAt > 0
      ? `Limit reached — resets at ${new Date(option.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : option.disabled && sends === 0
        ? 'Maximum attempts reached'
        : cooldown > 0
          ? `Wait ${cooldown}s`
          : option.detail;

  return (
    <Row
      icon={icons[option.id] ?? icons.code}
      label={option.label}
      sub={sub}
      onClick={option.disabled ? undefined : option.onClick}
    />
  );
};

export const LoginMoreOptions: React.FC<LoginMoreOptionsProps> = ({
  email, loginProfile, isSubmitting, canSend, remainingSends, getMaxSends, refreshRemaining, getResetAt,
  isInCooldown, getCooldownRemaining,
  onRequestCode, onRequestMagicLink, onRequestForgotPassword, onRequestRecoveryEmail, onBack,
}) => {
  // Fresh counts on open — the debounced sync may lag behind other tabs/sends.
  React.useEffect(() => {
    void refreshRemaining();
  }, [refreshRemaining]);

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

  const photoUrl = loginProfile?.photoUrl;

  const codeCooldownRemaining = isInCooldown('login-otp') ? getCooldownRemaining('login-otp') : 0;
  const magicCooldownRemaining = isInCooldown('magic-link') ? getCooldownRemaining('magic-link') : 0;
  const forgotCooldownRemaining = isInCooldown('otp') ? getCooldownRemaining('otp') : 0;
  const recoveryCooldownRemaining = isInCooldown('recovery') ? getCooldownRemaining('recovery') : 0;

  const options: OptionConfig[] = [
    { id: 'code', label: 'One-time code', detail: '6-digit code sent to your inbox', sends: codeSends, max: getMaxSends('login-otp'), disabled: !canCode, cooldownRemaining: codeCooldownRemaining, resetsAt: getResetAt('login-otp'), onClick: onRequestCode },
    { id: 'magic', label: 'Magic link', detail: 'Sign-in link sent to your email', sends: magicLinkSends, max: getMaxSends('magic-link'), disabled: !canMagic, cooldownRemaining: magicCooldownRemaining, resetsAt: getResetAt('magic-link'), onClick: onRequestMagicLink },
    { id: 'forgot', label: 'Forgot password?', detail: 'Reset password via email', sends: forgotSends, max: getMaxSends('otp'), disabled: !canForgot, cooldownRemaining: forgotCooldownRemaining, resetsAt: getResetAt('otp'), onClick: onRequestForgotPassword },
  ];

  if (loginProfile?.hasRecoveryEmail) {
    options.push({
      id: 'recovery',
      label: 'Recovery email',
      detail: `Code to ${loginProfile.recoveryEmail || 'backup email'}`,
      sends: recoverySends,
      max: getMaxSends('recovery'),
      disabled: !canRecovery,
      cooldownRemaining: recoveryCooldownRemaining,
      resetsAt: getResetAt('recovery'),
      onClick: onRequestRecoveryEmail,
    });
  }

  return (
    <div>
      <h2 className="tb-heading">More ways to sign in</h2>
      <p className="tb-sub mt-1.5">Pick another way to verify it&apos;s you.</p>

      <div className="mt-7 space-y-5">
        <IdentityCard
          name={loginProfile?.name}
          email={email}
          photoUrl={photoUrl}
          onSwitch={onBack}
        />

        <Group>
          {options.map((opt) => (
            <OptionRow key={opt.id} option={opt} />
          ))}
        </Group>

        <a
          href="/security"
          className="flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-3 text-[14px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:border-white"
        >
          <KeyRound size={17} className="shrink-0 text-white/40" aria-hidden />
          Security &amp; passkeys
          <span className="ml-auto text-[13px] font-medium text-white/35">Manage</span>
        </a>

        <div className="text-center">
          <TextButton onClick={onBack}>Back to sign in</TextButton>
        </div>
      </div>
    </div>
  );
};

LoginMoreOptions.displayName = 'LoginMoreOptions';
