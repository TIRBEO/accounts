'use client';

import React, { useState } from 'react';
import { Field, FormNotice, OtpBoxes, PasswordField, PrimaryButton, Spinner, TextButton } from '../../ui/ig-ui';

interface LoginRecoveryProps {
  email: string;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  recoveryMethod: 'code' | 'magic-link' | 'recovery' | null;
  recoveryStage: 'code' | 'password';
  recoveryCode: string;
  setRecoveryCode: (value: string) => void;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => Promise<void> | void;
  onBack: () => void;
  onSubmitCode: (code: string) => void;
  onSubmitNewPassword: (password: string) => void;
  remainingSends: (method: string) => number;
  loginNotice?: { msg: string; tone: 'error' | 'success' } | null;
}

export const LoginRecovery: React.FC<LoginRecoveryProps> = ({
  email, loginProfile, recoveryMethod, recoveryStage, recoveryCode, setRecoveryCode,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onBack,
  onSubmitCode, onSubmitNewPassword, remainingSends, loginNotice,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  const doResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  const methodLabel = recoveryMethod === 'magic-link' ? 'magic link' : 'reset code';
  const codeLength = 6;
  const cooldownKey = recoveryMethod === 'magic-link' ? 'magic-link' : recoveryMethod === 'recovery' ? 'recovery' : 'otp';
  const sendsRemaining = remainingSends(cooldownKey);

  const codeAddress =
    recoveryMethod === 'recovery'
      ? loginProfile?.recoveryEmail || 'your recovery email'
      : email;

  if (recoveryStage === 'password') {
    const canSubmit = newPassword.length >= 8 && confirmPassword === newPassword && !isSubmitting;
    return (
      <div>
        <div className="otp-head">
          <h2 className="tb-heading">Create new password</h2>
          <p className="tb-sub mt-1.5">Choose a strong password for your account.</p>
          {email && <p className="otp-email">{email}</p>}
        </div>

        <div className="signup-fields">
          <div className="space-y-5 text-left">
          <PasswordField
            placeholder="New password" aria-label="New password"
            shown={showPassword}
            onToggleShown={() => setShowPassword(!showPassword)}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />

          <PasswordField
            placeholder="Confirm new password" aria-label="Confirm new password"
            shown={showConfirm}
            onToggleShown={() => setShowConfirm(!showConfirm)}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={
              confirmPassword && newPassword !== confirmPassword
                ? "Passwords don't match"
                : undefined
            }
          />

          <FormNotice notice={loginNotice} />

          <PrimaryButton
            type="button"
            onClick={() => onSubmitNewPassword(newPassword)}
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            Save new password
          </PrimaryButton>
          </div>
        </div>

        <div className="more-ways">
          <button type="button" className="more-ways-btn" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="otp-head">
        <h2 className="tb-heading">
          {recoveryMethod === 'magic-link' ? 'Check your email' : 'Enter verification code'}
        </h2>
        <p className="tb-sub mt-1.5">
          {recoveryMethod === 'magic-link'
            ? 'We sent a sign-in magic link to'
            : 'We sent a 6-digit reset code to'}
        </p>
        <p className="otp-email">{codeAddress}</p>
      </div>

      <div className="signup-fields">
        <div className="space-y-5 text-left">
        {recoveryMethod !== 'magic-link' && (
          <>
            <OtpBoxes label="Reset code" value={recoveryCode} onChange={setRecoveryCode} />

            {/* No quota meter — the limit only speaks when it is actually hit. */}
            <p className="text-center text-[14px] text-text-4">
              {isInCooldown(cooldownKey) ? (
                <>Resend in {getCooldownRemaining(cooldownKey)}s</>
              ) : (
                <TextButton onClick={doResend} disabled={resending}>
                  {resending && <Spinner size={14} className="text-accent-text" />}
                  Resend {methodLabel}
                </TextButton>
              )}
              {sendsRemaining === 0 && (
                <span className="text-danger-text"> · limit reached</span>
              )}
            </p>

            <FormNotice notice={loginNotice} />

            <PrimaryButton
              type="button"
              onClick={() => onSubmitCode(recoveryCode)}
              disabled={recoveryCode.length !== codeLength}
              loading={isSubmitting}
            >
              Verify &amp; Continue
            </PrimaryButton>
          </>
        )}

        {recoveryMethod === 'magic-link' && (
          <>
            <p className="text-center text-[14px] text-text-4">
              {isInCooldown(cooldownKey) ? (
                <>Resend in {getCooldownRemaining(cooldownKey)}s</>
              ) : (
                <TextButton onClick={doResend} disabled={resending}>
                  {resending && <Spinner size={14} className="text-accent-text" />}
                  Resend magic link
                </TextButton>
              )}
            </p>
            <FormNotice notice={loginNotice} />
          </>
        )}
        </div>
      </div>

      <div className="more-ways">
        <button type="button" className="more-ways-btn" onClick={onBack}>
          Back to sign in
        </button>
      </div>
    </div>
  );
};

LoginRecovery.displayName = 'LoginRecovery';
