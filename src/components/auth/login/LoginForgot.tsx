'use client';

import React from 'react';
import { Field, FormNotice, PrimaryButton } from '../../ui/ig-ui';
import { validateEmail } from '../../../lib/validations';
import { MISSING_COPY } from '../useAuthForm';

interface LoginForgotProps {
  email: string;
  setEmail: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  /** A confirmed "no account" from the address lookup, already on file. */
  accountMissing?: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onBack: () => void;
  loginNotice?: { msg: string; tone: 'error' | 'success' } | null;
}

export const LoginForgot: React.FC<LoginForgotProps> = ({
  email, setEmail, errors, touched, handleBlur, isSubmitting, accountMissing, onSubmit, onBack, loginNotice,
}) => {
  const showEmailError = touched.email && errors.email;

  return (
    <form onSubmit={onSubmit}>
      <div className="otp-head">
        <h2 className="tb-heading">Reset your password</h2>
        <p className="tb-sub mt-1.5">
          Enter your account email and we&apos;ll send you a reset code.
        </p>
      </div>

      <div className="signup-fields">
        <Field
          aria-label="Email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur('email')}
          placeholder="you@example.com"
          autoComplete="email"
          error={accountMissing ? MISSING_COPY : showEmailError ? errors.email : undefined}
        />

        <FormNotice notice={loginNotice} />

        {/* The lookup has already answered for this address — a button that
            would only ask again is a dead end, not a choice. */}
        <PrimaryButton
          type="submit"
          loading={isSubmitting}
          disabled={!!validateEmail(email) || !!accountMissing}
        >
          Send reset code
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

LoginForgot.displayName = 'LoginForgot';
