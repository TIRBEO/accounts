'use client';

import React, { useState } from 'react';
import { Field, OtpBoxes, PasswordField, PrimaryButton, TextButton } from '../../ui/ig-ui';

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
  onResend: () => void;
  onBack: () => void;
  onSubmitCode: (code: string) => void;
  onSubmitNewPassword: (password: string) => void;
  remainingSends: (method: string) => number;
}

export const LoginRecovery: React.FC<LoginRecoveryProps> = ({
  email, loginProfile, recoveryMethod, recoveryStage, recoveryCode, setRecoveryCode,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onBack,
  onSubmitCode, onSubmitNewPassword, remainingSends,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const methodLabel = recoveryMethod === 'magic-link' ? 'magic link' : 'reset code';
  const codeLength = 6;
  const cooldownKey = recoveryMethod === 'magic-link' ? 'magic-link' : recoveryMethod === 'recovery' ? 'recovery' : 'otp';
  const sendsRemaining = remainingSends(cooldownKey);

  if (recoveryStage === 'password') {
    const canSubmit = newPassword.length >= 8 && confirmPassword === newPassword && !isSubmitting;
    return (
      <div>
        <h2 className="tb-heading">Create new password</h2>
        <p className="tb-sub mt-1.5">
          Choose a strong password for <span className="text-white/60">{email}</span>.
        </p>

        <div className="mt-7 space-y-5">
          <PasswordField
            label="New password"
            shown={showPassword}
            onToggleShown={() => setShowPassword(!showPassword)}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm new password"
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

          <PrimaryButton
            type="button"
            onClick={() => onSubmitNewPassword(newPassword)}
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            Save new password
          </PrimaryButton>

          <div className="text-center">
            <TextButton onClick={onBack}>Back</TextButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="tb-heading">
        {recoveryMethod === 'magic-link' ? 'Check your email' : 'Enter verification code'}
      </h2>
      <p className="tb-sub mt-1.5">
        {recoveryMethod === 'magic-link' ? (
          <>We sent a magic link to <span className="text-white/60">{email}</span>.</>
        ) : recoveryMethod === 'recovery' ? (
          <>We sent a code to <span className="text-white/60">{loginProfile?.recoveryEmail || 'your recovery email'}</span>.</>
        ) : (
          <>We sent a code to <span className="text-white/60">{email}</span>.</>
        )}
      </p>

      <div className="mt-7 space-y-5">
        {recoveryMethod !== 'magic-link' && (
          <>
            <OtpBoxes label="Reset code" value={recoveryCode} onChange={setRecoveryCode} />

            {/* No quota meter — the limit only speaks when it is actually hit. */}
            <p className="text-center text-[14px] text-white/40">
              {isInCooldown(cooldownKey) ? (
                <>Resend in {getCooldownRemaining(cooldownKey)}s</>
              ) : (
                <TextButton onClick={onResend}>Resend {methodLabel}</TextButton>
              )}
              {sendsRemaining === 0 && (
                <span className="text-danger"> · limit reached</span>
              )}
            </p>

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
          <p className="text-center text-[14px] text-white/40">
            {isInCooldown(cooldownKey) ? (
              <>Resend in {getCooldownRemaining(cooldownKey)}s</>
            ) : (
              <TextButton onClick={onResend}>Resend magic link</TextButton>
            )}
          </p>
        )}

        <div className="text-center">
          <TextButton onClick={onBack}>Back to sign in</TextButton>
        </div>
      </div>
    </div>
  );
};

LoginRecovery.displayName = 'LoginRecovery';
