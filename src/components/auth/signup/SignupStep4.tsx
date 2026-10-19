'use client';

import React from 'react';
import { ConsentCheck, PasswordField, PrimaryButton } from '../../ui/ig-ui';
import { validatePassword } from '../../../lib/validations';

interface SignupStep4Props {
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirm: boolean;
  setShowConfirm: (v: boolean) => void;
  consentTerms: boolean;
  setConsentTerms: (v: boolean) => void;
  setConsentPrivacy: (v: boolean) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  step4Complete: boolean;
  onSubmit: (e: React.FormEvent) => void;
  /** Cloudflare Turnstile widget, or null when no challenge is pending. */
  captcha?: React.ReactNode;
  /** A challenge is pending and hasn't been solved yet — block submit. */
  captchaPending?: boolean;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong', 'Very strong'];

/* The links are written inside the consent label, so a click on one must not
   also toggle the checkbox it sits in. */
const keepConsent = (e: React.MouseEvent) => e.stopPropagation();

export const SignupStep4: React.FC<SignupStep4Props> = ({
  password, setPassword, confirmPassword, setConfirmPassword,
  showPassword, setShowPassword, showConfirm, setShowConfirm, consentTerms, setConsentTerms,
  setConsentPrivacy, errors, touched, handleBlur,
  isSubmitting, step4Complete, onSubmit, captcha, captchaPending,
}) => {
  const showPasswordError = touched.password && errors.password;
  const showConfirmError = touched.confirmPassword && errors.confirmPassword;
  const strength = validatePassword(password).strength;

  return (
    <form className="signup-fields" onSubmit={onSubmit}>
      {/* Password with reveal toggle — the toggle rides inside the well rather
          than hanging off a hand-tuned top offset that breaks when the well
          grows. */}
      <div>
        <PasswordField
          label="Password"
          aria-label="Password"
          shown={showPassword}
          onToggleShown={() => setShowPassword(!showPassword)}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur('password')}
          placeholder="Create a strong password"
          autoComplete="new-password"
          error={showPasswordError ? errors.password : undefined}
        />

        {password && (
          <div className="pw-meter" data-level={strength} role="status">
            {[1, 2, 3, 4].map((level) => (
              <i key={level} className={level <= strength ? 'is-on' : undefined} />
            ))}
            <span>{STRENGTH_LABELS[strength]}</span>
          </div>
        )}
      </div>

      <PasswordField
        label="Confirm password"
        aria-label="Confirm password"
        shown={showConfirm}
        onToggleShown={() => setShowConfirm(!showConfirm)}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onBlur={() => handleBlur('confirmPassword')}
        placeholder="Confirm your password"
        autoComplete="new-password"
        error={showConfirmError ? errors.confirmPassword : undefined}
      />

      <ConsentCheck
        checked={consentTerms}
        onChange={(next) => { setConsentTerms(next); setConsentPrivacy(next); }}
        label={
          <>
            I agree to the{' '}
            <a href="https://tirbeo.com/terms" target="_blank" rel="noreferrer" onClick={keepConsent} className="tb-inline-link">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="https://tirbeo.com/privacy" target="_blank" rel="noreferrer" onClick={keepConsent} className="tb-inline-link">
              Privacy Policy
            </a>
          </>
        }
      />
      {touched.consentTerms && !consentTerms && (
        <p role="alert" className="tb-lede tb-error">
          You must accept the Terms of Service and Privacy Policy
        </p>
      )}

      {captcha}

      <PrimaryButton type="submit" disabled={!step4Complete || captchaPending} loading={isSubmitting}>
        Sign up
      </PrimaryButton>
    </form>
  );
};

SignupStep4.displayName = 'SignupStep4';
