'use client';

import React from 'react';
// LoginEmail — email entry step (OAuth + email continue)
import type { LoginStep } from '../../../lib/validations';
import { Field, OAuthRow, OrDivider, PrimaryButton } from '../../ui/ig-ui';
import { PasskeyRow } from './PasskeyRow';

interface LoginEmailProps {
  email: string;
  setEmail: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  isSubmitting: boolean;
  setLoginStep: (step: LoginStep) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMagicLink: () => void;
  onPasskeySignIn: () => void;
  passkeyLoading?: boolean;
  noAccountEmail?: string | null;
  onCreateAccount?: () => void;
}

export const LoginEmail: React.FC<LoginEmailProps> = ({
  email, setEmail, errors, touched, handleBlur,
  isSubmitting, onSubmit, onPasskeySignIn, passkeyLoading,
  noAccountEmail, onCreateAccount,
}) => {
  const showEmailError = touched.email && errors.email;
  const showNoAccount = !!noAccountEmail && noAccountEmail === email;

  return (
    <form onSubmit={onSubmit}>
      <h2 className="tb-heading">Log in</h2>
      <p className="tb-sub mt-1.5">
        Enter your email to sign in to your account.
      </p>

      <div className="mt-7 space-y-5">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur('email')}
          placeholder="you@example.com"
          autoComplete="email"
          error={showEmailError ? errors.email : undefined}
        />

      {showNoAccount && (
        <div
          role="status"
          className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5"
        >
          <p className="text-[14px] leading-relaxed text-white/70">
            There&apos;s no account with{' '}
            <span className="font-semibold text-white">{email}</span>. If that
            address is yours,{' '}
            <button
              type="button"
              onClick={onCreateAccount}
              className="inline-flex min-h-11 items-center rounded-xl font-bold text-white underline decoration-white/40 decoration-2 underline-offset-[5px] transition-colors hover:decoration-white focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.45)]"
            >
              create an account
            </button>
            .
          </p>
        </div>
      )}

        <PrimaryButton type="submit" loading={isSubmitting} disabled={!email.includes('@')}>
          Continue
        </PrimaryButton>

        <OrDivider label="or" />

        <OAuthRow disabled={isSubmitting} />

        <PasskeyRow
          onPasskeySignIn={onPasskeySignIn}
          disabled={isSubmitting}
          loading={passkeyLoading}
        />
      </div>
    </form>
  );
};

LoginEmail.displayName = 'LoginEmail';
export default LoginEmail;
