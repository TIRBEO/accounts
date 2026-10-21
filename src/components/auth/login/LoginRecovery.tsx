'use client';

import React, { useState } from 'react';
import { FormNotice, OtpBoxes, PasswordField, PrimaryButton, TextButton } from '../../ui/ig-ui';
import { validatePassword } from '../../../lib/validations';

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong', 'Very strong'];

interface LoginRecoveryProps {
  email: string;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  recoveryMethod: 'code' | 'recovery' | null;
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

  /* A reset code is only ever sent by the 'otp' or 'recovery' method — the
     magic-link route lands on its own sent-screen, not here. */
  const cooldownKey = recoveryMethod === 'recovery' ? 'recovery' : 'otp';
  const sendsRemaining = remainingSends(cooldownKey);
  const limitReached = sendsRemaining === 0;
  const strength = validatePassword(newPassword).strength;

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
          <div>
            <PasswordField
              label="New password"
              placeholder="New password" aria-label="New password"
              shown={showPassword}
              onToggleShown={() => setShowPassword(!showPassword)}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />

            {newPassword && (
              <div className="pw-meter" data-level={strength} role="status">
                {[1, 2, 3, 4].map((level) => (
                  <i key={level} className={level <= strength ? 'is-on' : undefined} />
                ))}
                <span>{STRENGTH_LABELS[strength]}</span>
              </div>
            )}
          </div>

          <PasswordField
            label="Confirm new password"
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
        <h2 className="tb-heading">Enter verification code</h2>
        <p className="tb-sub mt-1.5">
          We sent a 6-digit reset code to
        </p>
        <p className="otp-email">{codeAddress}</p>
      </div>

      <div className="signup-fields">
        <OtpBoxes label="Reset code" value={recoveryCode} onChange={setRecoveryCode} />

        <div className="resend-row">
          {isInCooldown(cooldownKey) ? (
            <span>Resend in {getCooldownRemaining(cooldownKey)}s</span>
          ) : (
            <TextButton type="button" onClick={onResend}>Resend reset code</TextButton>
          )}
          <span className={limitReached ? 'resend-note is-limit' : 'resend-note'}>
            {limitReached ? 'limit reached' : `${sendsRemaining} left`}
          </span>
        </div>

        <FormNotice notice={loginNotice} />

        <PrimaryButton
          type="button"
          onClick={() => onSubmitCode(recoveryCode)}
          disabled={recoveryCode.length !== 6}
          loading={isSubmitting}
        >
          Verify &amp; Continue
        </PrimaryButton>
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
