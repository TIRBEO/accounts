'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface SignupStep4Props {
  email: string;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
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

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  height: '56px',
  background: '#111111',
  border: `1px solid ${hasError ? '#ed4956' : '#2a2a2a'}`,
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '16px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 48px 0 24px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
});

const confirmInputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  height: '56px',
  background: '#111111',
  border: `1px solid ${hasError ? '#ed4956' : '#2a2a2a'}`,
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '16px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 24px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
});

const labelStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 500,
  color: '#a0a0a0',
  marginBottom: '4px',
};

const errorStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#ed4956',
  marginTop: '-8px',
};

const gradientBtnStyle = (enabled: boolean): React.CSSProperties => ({
  width: '100%',
  height: '56px',
  background: '#0095f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '14px',
  fontSize: '17px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: enabled ? 'pointer' : 'not-allowed',
  transition: 'opacity 150ms ease',
  opacity: enabled ? 1 : 0.5,
});

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
}

function getStrengthColor(level: number): string {
  switch (level) {
    case 1: return '#ed4956';
    case 2: return '#f5a623';
    case 3: return '#58c322';
    case 4: return '#0095f6';
    default: return '#2a2a2a';
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
  showPassword, setShowPassword, consentTerms, setConsentTerms,
  consentPrivacy, setConsentPrivacy, errors, touched, handleBlur,
  setErrors, isSubmitting, step4Complete, onOpenLegalModal, onSubmit,
}) => {
  const showPasswordError = touched.password && errors.password;
  const showConfirmError = touched.confirmPassword && errors.confirmPassword;

  const progressDots = [1, 2, 3, 4];

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f5f5f5', marginBottom: '12px', fontFamily: TYPOGRAPHY.fontFamily }}>
          Create a password
        </h2>
        <p style={{ fontSize: '16px', color: '#707070', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '24px' }}>
          Choose a strong password with at least 8 characters. Use a mix of letters, numbers, and symbols for best security.
        </p>
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>Password <span style={{ color: '#ed4956' }}>*</span></label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            placeholder="Create a strong password"
            autoComplete="new-password"
            style={inputStyle(!!showPasswordError)}
            onFocus={(e) => {
              if (!showPasswordError) {
                e.currentTarget.style.borderColor = '#3a3a3a';
              }
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = showPasswordError ? '#ed4956' : '#2a2a2a';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#707070',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {showPasswordError && (
          <p style={errorStyle}>{errors.password}</p>
        )}

        {/* Password strength indicator */}
        {password && (
          <div style={{ marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: level <= getPasswordStrength(password) ? getStrengthColor(level) : '#2a2a2a',
                  transition: 'background 300ms ease',
                }}
              />
            ))}
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#707070',
              marginLeft: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {getStrengthLabel(getPasswordStrength(password))}
            </span>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>Confirm Password <span style={{ color: '#ed4956' }}>*</span></label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => handleBlur('confirmPassword')}
          placeholder="Confirm your password"
          autoComplete="new-password"
          style={confirmInputStyle(!!showConfirmError)}
          onFocus={(e) => {
            if (!showConfirmError) {
              e.currentTarget.style.borderColor = '#3a3a3a';
            }
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = showConfirmError ? '#ed4956' : '#2a2a2a';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {showConfirmError && (
          <p style={errorStyle}>{errors.confirmPassword}</p>
        )}
      </div>

      {/* Terms & Privacy checkbox */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={consentTerms}
            onChange={(e) => { setConsentTerms(e.target.checked); setConsentPrivacy(e.target.checked); }}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '5px',
              border: `1.5px solid ${consentTerms ? '#0095f6' : '#2a2a2a'}`,
              background: consentTerms ? '#0095f6' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              appearance: 'none',
              marginTop: '1px',
            }}
          />
          <span style={{ fontSize: '15px', color: '#a0a0a0', lineHeight: '22px' }}>
            I agree to the{' '}
            <button type="button" onClick={() => onOpenLegalModal('terms')} style={{ color: '#0095f6', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" onClick={() => onOpenLegalModal('privacy')} style={{ color: '#0095f6', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              Privacy Policy
            </button>
          </span>
        </label>
        {touched.consentTerms && !consentTerms && (
          <p style={{ fontSize: '14px', color: '#ed4956', marginLeft: '30px' }}>You must accept the Terms of Service and Privacy Policy</p>
        )}
      </div>

      {/* Submit */}
      <div style={{ marginTop: '8px' }}>
        <button
          type="submit"
          disabled={!step4Complete || isSubmitting}
          style={gradientBtnStyle(step4Complete && !isSubmitting)}
        >
          {isSubmitting ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
              </svg>
              Creating account...
            </span>
          ) : 'Sign up'}
        </button>
      </div>
    </form>
  );
};

SignupStep4.displayName = 'SignupStep4';
