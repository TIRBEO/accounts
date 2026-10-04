'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { ConsentCheck, PasswordField, PrimaryButton } from '../../ui/ig-ui';

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
  onOpenLegalModal: (type: 'terms' | 'privacy') => void;
  onSubmit: (e: React.FormEvent) => void;
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
}

function getStrengthBarClass(level: number): string {
  switch (level) {
    case 1: return 'bg-danger';
    case 2: return 'bg-[var(--warn)]';
    case 3: return 'bg-[var(--success)]';
    case 4: return 'bg-success';
    default: return 'bg-white/[0.12]';
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
  setErrors, isSubmitting, step4Complete, onOpenLegalModal, onSubmit,
}) => {
  const showPasswordError = touched.password && errors.password;
  const showConfirmError = touched.confirmPassword && errors.confirmPassword;
  const strength = getPasswordStrength(password);

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <p className="text-center text-[16px] leading-relaxed text-white/50">
        Choose a strong password with at least 8 characters. Use a mix of letters, numbers, and symbols for best security.
      </p>

      {/* Password with reveal toggle — the toggle rides inside the well rather
          than hanging off a hand-tuned top offset that breaks when the well
          grows. */}
      <div>
        <PasswordField
          label="Password *"
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
                className={`h-1.5 rounded-full flex-1 transition-colors ${level <= strength ? getStrengthBarClass(level) : 'bg-white/[0.12]'}`}
              />
            ))}
            <span className="ml-1 text-[15px] text-white/55">
              {getStrengthLabel(strength)}
            </span>
          </div>
        )}
      </div>

      <PasswordField
        label="Confirm password *"
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
              <button
                type="button"
                onClick={() => onOpenLegalModal('terms')}
                className="text-white/90 underline decoration-white/25 underline-offset-2 hover:text-white"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => onOpenLegalModal('privacy')}
                className="text-white/90 underline decoration-white/25 underline-offset-2 hover:text-white"
              >
                Privacy Policy
              </button>
            </>
          }
        />
        {touched.consentTerms && !consentTerms && (
          <p role="alert" className="text-[16px] leading-snug text-danger">
            You must accept the Terms of Service and Privacy Policy
          </p>
        )}
      </div>

      <PrimaryButton type="submit" disabled={!step4Complete} loading={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Sign up'}
      </PrimaryButton>
    </form>
  );
};

SignupStep4.displayName = 'SignupStep4';
