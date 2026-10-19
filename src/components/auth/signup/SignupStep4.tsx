'use client';

import React from 'react';
import { ConsentCheck, PasswordField, PrimaryButton } from '../../ui/ig-ui';
import { validatePassword } from '../../../lib/validations';

interface SignupStep4Props {
  email: string;
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
  consentPrivacy: boolean;
  setConsentPrivacy: (v: boolean) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  setErrors: (e: Record<string, string | undefined>) => void;
  isSubmitting: boolean;
  step4Complete: boolean;
  onSubmit: (e: React.FormEvent) => void;
  /** Cloudflare Turnstile widget, or null when no challenge is pending. */
  captcha?: React.ReactNode;
  /** A challenge is pending and hasn't been solved yet — block submit. */
  captchaPending?: boolean;
}

function getStrengthBarClass(level: number): string {
  switch (level) {
    case 1: return 'bg-danger';
    case 2: return 'bg-[var(--warn)]';
    case 3: return 'bg-[var(--success)]';
    case 4: return 'bg-success';
    default: return 'bg-hover';
  }
}

function getStrengthLabel(strength: number): string {
  switch (strength) {
    case 0: return '';
    case 1: return 'Weak';
    case 2: return 'Fair';
    case 3: return 'Strong';
    case 4: return 'Very strong';
    default: return '';
  }
}

export const SignupStep4: React.FC<SignupStep4Props> = ({
  email, password, setPassword, confirmPassword, setConfirmPassword,
  showPassword, setShowPassword, showConfirm, setShowConfirm, consentTerms, setConsentTerms,
  consentPrivacy, setConsentPrivacy, errors, touched, handleBlur,
  setErrors, isSubmitting, step4Complete, onSubmit, captcha, captchaPending,
}) => {
  const showPasswordError = touched.password && errors.password;
  const showConfirmError = touched.confirmPassword && errors.confirmPassword;
  const strength = validatePassword(password).strength;

  return (
    <form className="signup-fields" onSubmit={onSubmit}>
      <div className="space-y-5 text-left">
      <p className="text-center text-[16px] leading-relaxed text-text-4">
        Choose a strong password with at least 8 characters. Use a mix of letters, numbers, and symbols for best security.
      </p>

      {/* Password with reveal toggle — the toggle rides inside the well rather
          than hanging off a hand-tuned top offset that breaks when the well
          grows. */}
      <div>
        <PasswordField
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

        {/* Password strength indicator */}
        {password && (
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1.5 rounded-full flex-1 transition-colors ${level <= strength ? getStrengthBarClass(level) : 'bg-hover'}`}
              />
            ))}
            <span className="ml-1 text-[15px] text-text-3">
              {getStrengthLabel(strength)}
            </span>
          </div>
        )}
      </div>

      <PasswordField
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

      {/* Terms & Privacy consent */}
      <div className="space-y-3 pt-1">
        <ConsentCheck
          checked={consentTerms}
          onChange={(next) => { setConsentTerms(next); setConsentPrivacy(next); }}
          label={
            <>
              I agree to the{' '}
              <a
                href="https://tirbeo.com/terms"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-2 underline decoration-text-4 underline-offset-2 hover:text-fg"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="https://tirbeo.com/privacy"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-2 underline decoration-text-4 underline-offset-2 hover:text-fg"
              >
                Privacy Policy
              </a>
            </>
          }
        />
        {touched.consentTerms && !consentTerms && (
          <p role="alert" className="text-[16px] leading-snug text-danger-text">
            You must accept the Terms of Service and Privacy Policy
          </p>
        )}
      </div>

      {captcha}

      <PrimaryButton
        type="submit"
        disabled={!step4Complete || captchaPending}
        loading={isSubmitting}
      >
        {isSubmitting ? 'Creating account…' : 'Sign up'}
      </PrimaryButton>
      </div>
    </form>
  );
};

SignupStep4.displayName = 'SignupStep4';
