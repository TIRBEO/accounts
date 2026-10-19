'use client';

import React from 'react';
import { OtpBoxes, PrimaryButton, TextButton } from '../../ui/ig-ui';

interface SignupStep3Props {
  email: string;
  verificationCode: string;
  setVerificationCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  remainingSends: (method: string) => number;
}

export const SignupStep3: React.FC<SignupStep3Props> = ({
  email, verificationCode, setVerificationCode, errors, touched,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onSubmit, remainingSends,
}) => {
  const showCodeError = touched.verificationCode && errors.verificationCode;
  const codeComplete = verificationCode.length === 6;
  const limitReached = remainingSends('signup-otp') === 0;

  return (
    <form className="signup-fields" onSubmit={onSubmit}>
      <p className="tb-lede">
        We sent a code to <b>{email}</b>.
      </p>

      <OtpBoxes
        label="Verification code"
        value={verificationCode}
        onChange={setVerificationCode}
        error={Boolean(showCodeError)}
      />

      {showCodeError && (
        <p role="alert" className="tb-lede tb-error">{errors.verificationCode}</p>
      )}

      {/* One line: the way to get another code, and how many are left. */}
      <div className="resend-row">
        {isInCooldown('signup-otp')
          ? <span>Resend in {getCooldownRemaining('signup-otp')}s</span>
          : <TextButton type="button" onClick={onResend}>Resend code</TextButton>}
        <span className={limitReached ? 'resend-note is-limit' : 'resend-note'}>
          {limitReached ? 'limit reached' : `${remainingSends('signup-otp')} left`}
        </span>
      </div>

      <PrimaryButton type="submit" disabled={!codeComplete} loading={isSubmitting}>
        Verify &amp; Continue
      </PrimaryButton>
    </form>
  );
};

SignupStep3.displayName = 'SignupStep3';
