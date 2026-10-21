'use client';

import React from 'react';
import { FormNotice, OtpBoxes, PrimaryButton, TextButton } from '../../ui/ig-ui';

interface LoginOtpProps {
  email: string;
  loginOtpCode: string;
  setLoginOtpCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  loginPending2fa: boolean;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => Promise<void> | void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  remainingSends: (method: string) => number;
  loginNotice?: { msg: string; tone: 'error' | 'success' } | null;
}

export const LoginOtp: React.FC<LoginOtpProps> = ({
  email, loginOtpCode, setLoginOtpCode, errors, touched,
  loginPending2fa, isSubmitting, isInCooldown, getCooldownRemaining,
  onResend, onSubmit, onBack, remainingSends, loginNotice,
}) => {
  const showCodeError = touched.loginOtpCode && errors.loginOtpCode;
  const codeComplete = loginOtpCode.length === 6;
  const sendsRemaining = remainingSends('login-otp');
  const limitReached = sendsRemaining === 0;

  return (
    <form onSubmit={onSubmit}>
      <div className="otp-head">
        <h2 className="tb-heading">Check your email</h2>
        <p className="tb-sub mt-1.5">A 6-digit verification code is on its way to</p>
        <p className="otp-email">{email}</p>
        {loginPending2fa && (
          <p className="tb-sub mt-3">After verifying, you&apos;ll also need your 2FA code.</p>
        )}
      </div>

      <div className="signup-fields">
        <OtpBoxes
          label="Email verification code"
          value={loginOtpCode}
          onChange={setLoginOtpCode}
          error={Boolean(showCodeError)}
        />

        {showCodeError && (
          <p role="alert" className="tb-lede tb-error">{errors.loginOtpCode}</p>
        )}

        {/* The tap itself is the feedback: a send starts the 30s countdown, which
           replaces this button, so no separate in-flight spinner is needed. */}
        <div className="resend-row">
          {isInCooldown('login-otp') ? (
            <span>Resend in {getCooldownRemaining('login-otp')}s</span>
          ) : (
            <TextButton type="button" onClick={onResend}>Resend code</TextButton>
          )}
          <span className={limitReached ? 'resend-note is-limit' : 'resend-note'}>
            {limitReached ? 'limit reached' : `${sendsRemaining} left`}
          </span>
        </div>

        <FormNotice notice={loginNotice} />

        <PrimaryButton type="submit" loading={isSubmitting} disabled={!codeComplete}>
          Verify
        </PrimaryButton>
      </div>

      <div className="more-ways">
        <button type="button" className="more-ways-btn" onClick={onBack}>
          Back to sign in
        </button>
      </div>
    </form>
  );
};

LoginOtp.displayName = 'LoginOtp';
