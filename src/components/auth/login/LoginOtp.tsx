'use client';

import React from 'react';
import { FormNotice, OtpBoxes, PrimaryButton, Spinner, TextButton } from '../../ui/ig-ui';

interface LoginOtpProps {
  email: string;
  loginOtpCode: string;
  setLoginOtpCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
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
  email, loginOtpCode, setLoginOtpCode, errors, touched, handleBlur,
  loginPending2fa, isSubmitting, isInCooldown, getCooldownRemaining,
  onResend, onSubmit, onBack, remainingSends, loginNotice,
}) => {
  const showCodeError = touched.loginOtpCode && errors.loginOtpCode;
  const codeComplete = loginOtpCode.length === 6;
  const sendsRemaining = remainingSends('login-otp');

  const [resending, setResending] = React.useState(false);
  const doResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

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
        <div className="space-y-5 text-left">
        <OtpBoxes
          label="Email verification code"
          value={loginOtpCode}
          onChange={setLoginOtpCode}
          error={Boolean(showCodeError)}
        />

        {/* Keeps the code field's blur validation wired (same as before). */}
        <input
          type="hidden"
          value={loginOtpCode}
          onChange={(e) => setLoginOtpCode(e.target.value)}
          onBlur={() => handleBlur('loginOtpCode')}
        />

        {showCodeError && (
          <p role="alert" className="text-center text-[14px] text-danger-text">
            {errors.loginOtpCode}
          </p>
        )}

        {/* No quota meter — the limit only speaks when it is actually hit. */}
        <p className="text-center text-[14px] text-text-4">
          {isInCooldown('login-otp') ? (
            <>Resend in {getCooldownRemaining('login-otp')}s</>
          ) : (
            <TextButton onClick={doResend} disabled={resending}>
              {resending && <Spinner size={14} className="text-accent-text" />}
              Resend code
            </TextButton>
          )}
          {sendsRemaining === 0 && (
            <span className="text-danger-text"> · limit reached</span>
          )}
        </p>

        <FormNotice notice={loginNotice} />

        <PrimaryButton type="submit" loading={isSubmitting} disabled={!codeComplete}>
          Verify
        </PrimaryButton>
        </div>
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
