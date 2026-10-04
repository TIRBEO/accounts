'use client';

import React from 'react';
import { OtpBoxes, PrimaryButton, TextButton } from '../../ui/ig-ui';

interface SignupStep3Props {
  email: string;
  verificationCode: string;
  setVerificationCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  remainingSends: (method: string) => number;
}

export const SignupStep3: React.FC<SignupStep3Props> = ({
  email, verificationCode, setVerificationCode, errors, touched, handleBlur,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onSubmit, remainingSends,
}) => {
  const showCodeError = touched.verificationCode && errors.verificationCode;
  const codeComplete = verificationCode.length === 6;
  const limitReached = remainingSends('signup-otp') === 0;

  const sendsBadge = (
    <span
      className={`rounded-xl px-1.5 py-1 text-[15px] ${
        limitReached ? 'text-danger' : 'text-white/45'
      }`}
    >
      {limitReached ? 'limit reached' : `${remainingSends('signup-otp')} left`}
    </span>
  );

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <p className="text-center text-[16px] leading-relaxed text-white/50">
          We sent a code to <span className="text-white/75">{email}</span>.
        </p>
      </div>

      <OtpBoxes
        label="Verification code"
        value={verificationCode}
        onChange={setVerificationCode}
        error={Boolean(showCodeError)}
      />

      {showCodeError && (
        <p role="alert" className="text-center text-[16px] leading-snug text-danger">
          {errors.verificationCode}
        </p>
      )}

      <div className="text-center">
        {isInCooldown('signup-otp') ? (
          <span className="inline-flex items-center justify-center gap-2 text-[16px] text-white/50">
            Resend in {getCooldownRemaining('signup-otp')}s
            {sendsBadge}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-3">
            <TextButton type="button" onClick={onResend}>
              Resend code
            </TextButton>
            {sendsBadge}
          </span>
        )}
      </div>

      <PrimaryButton type="submit" disabled={!codeComplete} loading={isSubmitting}>
        {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
      </PrimaryButton>
    </form>
  );
};

SignupStep3.displayName = 'SignupStep3';
