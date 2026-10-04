'use client';

import React from 'react';
import type { LoginStep } from '../../../lib/validations';
import { IdentityCard, PasswordField, PrimaryButton, SecondaryButton } from '../../ui/ig-ui';

interface LoginPasswordProps {
  email: string;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  isSubmitting: boolean;
  setLoginStep: (step: LoginStep) => void;
  onSwitchAccount: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onMoreOptions: () => void;
}

export const LoginPassword: React.FC<LoginPasswordProps> = ({
  email, password, setPassword, showPassword, setShowPassword,
  errors, touched, handleBlur, loginProfile, isSubmitting,
  onSwitchAccount, onSubmit, onMoreOptions,
}) => {
  const showPasswordError = touched.password && errors.password;
  const photoUrl = loginProfile?.photoUrl;

  return (
    <form onSubmit={onSubmit}>
      <h2 className="tb-heading">Welcome back</h2>
      <p className="tb-sub mt-1.5">Enter your password to continue.</p>

      <div className="mt-7 space-y-5">
        <IdentityCard
          name={loginProfile?.name}
          email={email}
          photoUrl={photoUrl}
          onSwitch={onSwitchAccount}
        />

        <PasswordField
          label="Password"
          shown={showPassword}
          onToggleShown={() => setShowPassword(!showPassword)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur('password')}
          autoComplete="current-password"
          error={showPasswordError ? errors.password : undefined}
        />

        <PrimaryButton type="submit" loading={isSubmitting} disabled={!password}>
          Log in
        </PrimaryButton>

        <SecondaryButton onClick={onMoreOptions} disabled={isSubmitting}>
          More ways to verify
        </SecondaryButton>
      </div>
    </form>
  );
};

LoginPassword.displayName = 'LoginPassword';
export default LoginPassword;
