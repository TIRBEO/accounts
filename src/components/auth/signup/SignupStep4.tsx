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
  height: '48px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: `1px solid ${hasError ? '#f43f5e' : 'rgba(255,255,255,0.07)'}`,
  borderRadius: '12px',
  color: '#FAFAFA',
  fontSize: '14.5px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 48px 0 16px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
});

const confirmInputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  height: '48px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: `1px solid ${hasError ? '#f43f5e' : 'rgba(255,255,255,0.07)'}`,
  borderRadius: '12px',
  color: '#FAFAFA',
  fontSize: '14.5px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 16px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
});

const labelStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 500,
  color: '#A1A1AA',
  marginBottom: '4px',
};

const errorStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#f43f5e',
  marginTop: '-8px',
};

const gradientBtnStyle = (enabled: boolean): React.CSSProperties => ({
  width: '100%',
  height: '44px',
  background: enabled ? '#0095F6' : 'rgba(255,255,255,0.08)',
  color: enabled ? '#FFFFFF' : '#71717A',
  border: `1px solid ${enabled ? '#0095F6' : 'rgba(255,255,255,0.06)'}`,
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: enabled ? 'pointer' : 'not-allowed',
  transition: 'all 150ms ease',
  opacity: 1,
  boxShadow: enabled ? '0 4px 16px rgba(0,149,246,0.28)' : 'none',
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
    case 1: return '#f43f5e';
    case 2: return '#fbbf24';
    case 3: return '#34d399';
    case 4: return '#FFFFFF';
    default: return 'rgba(255,255,255,0.07)';
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

  return (
    <form
      className="auth-form"
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', fontWeight: 400, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '0 0 10px', lineHeight: 1.1 }}>
          Create a <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#38BDF8' }}>password</em>
        </h2>
        <p style={{ fontSize: '14.5px', color: '#A1A1AA', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px', margin: 0 }}>
          Choose a strong password with at least 8 characters. Use a mix of letters, numbers, and symbols for best security.
        </p>
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>Password <span style={{ color: '#f43f5e' }}>*</span></label>
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
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
              }
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = showPasswordError ? '#f43f5e' : 'rgba(255,255,255,0.07)';
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
              color: '#71717A',
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
                  background: level <= getPasswordStrength(password) ? getStrengthColor(level) : 'rgba(255,255,255,0.07)',
                  transition: 'background 300ms ease',
                }}
              />
            ))}
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#71717A',
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
        <label style={labelStyle}>Confirm Password <span style={{ color: '#f43f5e' }}>*</span></label>
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
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
            }
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = showConfirmError ? '#f43f5e' : 'rgba(255,255,255,0.07)';
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
              border: `1.5px solid ${consentTerms ? '#FFFFFF' : 'rgba(255,255,255,0.07)'}`,
              background: consentTerms ? '#FFFFFF' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              appearance: 'none',
              marginTop: '1px',
            }}
          />
          <span style={{ fontSize: '15px', color: '#A1A1AA', lineHeight: '22px' }}>
            I agree to the{' '}
            <button type="button" onClick={() => onOpenLegalModal('terms')} style={{ color: '#FFFFFF', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" onClick={() => onOpenLegalModal('privacy')} style={{ color: '#FFFFFF', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              Privacy Policy
            </button>
          </span>
        </label>
        {touched.consentTerms && !consentTerms && (
          <p style={{ fontSize: '14px', color: '#f43f5e', marginLeft: '20px' }}>You must accept the Terms of Service and Privacy Policy</p>
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
