'use client';

import React from 'react';
import type { LoginStep } from '../../../lib/validations';
import { Field, OtpBoxes, PrimaryButton, Segmented, TextButton } from '../../ui/ig-ui';

interface Login2FAProps {
  twoFactorCode: string;
  setTwoFactorCode: (v: string) => void;
  backupCode: string;
  setBackupCode: (v: string) => void;
  loginWithBackup: boolean;
  setLoginWithBackup: (v: boolean) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  setRecoveryMethod: (method: 'code' | 'magic-link' | 'recovery' | null) => void;
  setLoginStep: (step: LoginStep) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export const Login2FA: React.FC<Login2FAProps> = ({
  twoFactorCode, setTwoFactorCode, backupCode, setBackupCode,
  loginWithBackup, setLoginWithBackup, errors, touched, handleBlur,
  isSubmitting, onSubmit, onBack,
}) => {
  const showCodeError = touched.twoFactorCode && errors.twoFactorCode;
  const showBackupError = touched.backupCode && errors.backupCode;

  return (
    <form onSubmit={onSubmit}>
      <h2 className="tb-heading">Two-factor authentication</h2>
      <p className="tb-sub mt-1.5">
        {loginWithBackup
          ? 'Enter one of your 8-character backup codes.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>

      <div className="mt-7 space-y-5">
        <Segmented
          value={loginWithBackup ? 'backup' : 'code'}
          onChange={(next) => {
            if (next === 'code') {
              setLoginWithBackup(false);
              setTwoFactorCode('');
            } else {
              setLoginWithBackup(true);
              setBackupCode('');
            }
          }}
          options={[
            { value: 'code', label: 'Authenticator app' },
            { value: 'backup', label: 'Backup code' },
          ]}
        />

        {!loginWithBackup && (
          <OtpBoxes
            label="Authenticator code"
            value={twoFactorCode}
            onChange={setTwoFactorCode}
            error={Boolean(showCodeError)}
          />
        )}

        {!loginWithBackup && showCodeError && (
          <p role="alert" className="text-center text-[14px] text-danger">
            {errors.twoFactorCode}
          </p>
        )}

        {loginWithBackup && (
          <Field
            label="Backup code"
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onBlur={() => handleBlur('backupCode')}
            maxLength={8}
            error={showBackupError ? errors.backupCode : undefined}
            hint="Codes are 8 characters, letters and numbers."
          />
        )}

        <PrimaryButton
          type="submit"
          loading={isSubmitting}
          disabled={
            (!loginWithBackup && twoFactorCode.length !== 6) ||
            (loginWithBackup && !backupCode)
          }
        >
          Verify
        </PrimaryButton>

        <div className="flex flex-col items-center gap-3">
          {!loginWithBackup && (
            <TextButton onClick={() => setLoginWithBackup(true)}>
              Use backup code instead
            </TextButton>
          )}
          <TextButton onClick={onBack}>Back</TextButton>
        </div>
      </div>
    </form>
  );
};

Login2FA.displayName = 'Login2FA';
