'use client';

import React from 'react';
import { OtpBoxes, PrimaryButton, TextButton } from '../../ui/ig-ui';

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
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  remainingSends: (method: string) => number;
}

export const LoginOtp: React.FC<LoginOtpProps> = ({
  email, loginOtpCode, setLoginOtpCode, errors, touched, handleBlur,
  loginPending2fa, isSubmitting, isInCooldown, getCooldownRemaining,
  onResend, onSubmit, onBack, remainingSends,
}) => {
  const showCodeError = touched.loginOtpCode && errors.loginOtpCode;
  const codeComplete = loginOtpCode.length === 6;
  const sendsRemaining = remainingSends('login-otp');

  return (
    <form onSubmit={onSubmit}>
      <h2 className="tb-heading">Check your email</h2>
      <p className="tb-sub mt-1.5">
        We sent a 6-digit code to <span className="text-white/60">{email}</span>.
      </p>
      {loginPending2fa && (
        <p className="tb-sub mt-1.5">
          After verifying, you&apos;ll need your 2FA code.
        </p>
      )}

      <div className="mt-7 space-y-5">
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
          <p role="alert" className="text-center text-[14px] text-danger">
            {errors.loginOtpCode}
          </p>
        )}

        {/* No quota meter — the limit only speaks when it is actually hit. */}
        <p className="text-center text-[14px] text-white/40">
          {isInCooldown('login-otp') ? (
            <>Resend in {getCooldownRemaining('login-otp')}s</>
          ) : (
            <TextButton onClick={onResend}>Resend code</TextButton>
          )}
          {sendsRemaining === 0 && (
            <span className="text-danger"> · limit reached</span>
          )}
        </p>

        <PrimaryButton type="submit" loading={isSubmitting} disabled={!codeComplete}>
          Verify
        </PrimaryButton>

        <div className="text-center">
          <TextButton onClick={onBack}>Back to sign in</TextButton>
        </div>
      </div>
    </form>
  );
};

LoginOtp.displayName = 'LoginOtp';
