'use client';

import React from 'react';
import type { LoginStep } from '../../../lib/validations';
import { Field, FormNotice, OtpBoxes, PrimaryButton, Segmented, TextButton } from '../../ui/ig-ui';

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
  loginNotice?: { msg: string; tone: 'error' | 'success' } | null;
}

export const Login2FA: React.FC<Login2FAProps> = ({
  twoFactorCode, setTwoFactorCode, backupCode, setBackupCode,
  loginWithBackup, setLoginWithBackup, errors, touched, handleBlur,
  isSubmitting, onSubmit, onBack, loginNotice,
}) => {
  const showCodeError = touched.twoFactorCode && errors.twoFactorCode;
  const showBackupError = touched.backupCode && errors.backupCode;

  return (
    <form onSubmit={onSubmit}>
      <div className="otp-head">
        <h2 className="tb-heading">Two-factor authentication</h2>
        <p className="tb-sub mt-1.5">
          {loginWithBackup
            ? 'Enter one of your 8-character backup codes.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>
      </div>

      <div className="signup-fields">
        <div className="space-y-5 text-left">
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
          <p role="alert" className="text-center text-[14px] text-danger-text">
            {errors.twoFactorCode}
          </p>
        )}

        {loginWithBackup && (
          <Field
            placeholder="Backup code" aria-label="Backup code"
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onBlur={() => handleBlur('backupCode')}
            maxLength={8}
            error={showBackupError ? errors.backupCode : undefined}
            hint="Codes are 8 characters, letters and numbers."
          />
        )}

        <FormNotice notice={loginNotice} />

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

        {!loginWithBackup && (
          <div className="text-center">
            <TextButton onClick={() => setLoginWithBackup(true)}>
              Use backup code instead
            </TextButton>
          </div>
        )}
        </div>
      </div>

      <div className="more-ways">
        <button type="button" className="more-ways-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </form>
  );
};

Login2FA.displayName = 'Login2FA';
