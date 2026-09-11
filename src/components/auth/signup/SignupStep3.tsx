'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface SignupStep3Props {
  email: string;
  verificationCode: string;
  setVerificationCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  remainingSends: (method: string) => number;
}

const codeInputStyle: React.CSSProperties = {
  width: '52px',
  height: '60px',
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '28px',
  fontWeight: 700,
  fontFamily: "'SF Mono',ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
  textAlign: 'center',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  caretColor: 'transparent',
};

const gradientBtn = (enabled: boolean): React.CSSProperties => ({
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

export const SignupStep3: React.FC<SignupStep3Props> = ({
  email, verificationCode, setVerificationCode, errors, touched, handleBlur,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onSubmit, remainingSends,
}) => {
  const showCodeError = touched.verificationCode && errors.verificationCode;
  const codeComplete = verificationCode.length === 6;

  const progressDots = [1, 2, 3, 4];

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f5f5f5', marginBottom: '12px', fontFamily: TYPOGRAPHY.fontFamily }}>
          Verify your email
        </h2>
        <p style={{ fontSize: '15px', color: '#707070', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px' }}>
          We sent a code to <span style={{ color: '#a0a0a0' }}>{email}</span>.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {[...Array(6)].map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={verificationCode[i] || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              const nextCode = verificationCode.split('');
              nextCode[i] = value;
              setVerificationCode(nextCode.join(''));
              if (i < 5 && value) {
                const nextInput = document.querySelector(`input[data-code-index="${i + 1}"]`) as HTMLInputElement | null;
                nextInput?.focus();
              } else if (i > 0 && !value) {
                const prevInput = document.querySelector(`input[data-code-index="${i - 1}"]`) as HTMLInputElement | null;
                prevInput?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
                const prevInput = document.querySelector(`input[data-code-index="${i - 1}"]`) as HTMLInputElement | null;
                prevInput?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
              if (pasted.length === 6) {
                setVerificationCode(pasted);
              }
            }}
            style={{
              ...codeInputStyle,
              borderColor: showCodeError ? '#ed4956' : verificationCode[i] ? '#3a3a3a' : '#2a2a2a',
            }}
            data-code-index={i}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0095f6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = showCodeError ? '#ed4956' : verificationCode[i] ? '#3a3a3a' : '#2a2a2a';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        ))}
      </div>

      <input type="hidden" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} onBlur={() => handleBlur('verificationCode')} />

      {showCodeError && (
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#ed4956', marginTop: '-12px' }}>{errors.verificationCode}</p>
      )}

      <div style={{ textAlign: 'center' }}>
        {isInCooldown('signup-otp') ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#707070', fontSize: '14px', fontFamily: TYPOGRAPHY.fontFamily }}>
            <span>Resend in {getCooldownRemaining('signup-otp')}s</span>
            <span style={{
              padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
              background: remainingSends('signup-otp') === 0 ? 'rgba(237,73,86,0.1)' : '#1a1a1a',
              color: remainingSends('signup-otp') === 0 ? '#ed4956' : '#a0a0a0',
              border: `1px solid ${remainingSends('signup-otp') === 0 ? 'rgba(237,73,86,0.2)' : '#2a2a2a'}`,
            }}>
              {remainingSends('signup-otp') === 0 ? 'limit reached' : `${remainingSends('signup-otp')} left`}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button type="button" onClick={onResend}
              style={{
                background: 'none', border: 'none', color: '#707070', fontSize: '14px',
                fontFamily: TYPOGRAPHY.fontFamily, cursor: 'pointer', padding: 0,
                transition: 'color 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#a0a0a0'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#707070'; }}
            >
              Resend code
            </button>
            <span style={{
              padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
              background: remainingSends('signup-otp') === 0 ? 'rgba(237,73,86,0.1)' : '#1a1a1a',
              color: remainingSends('signup-otp') === 0 ? '#ed4956' : '#a0a0a0',
              border: `1px solid ${remainingSends('signup-otp') === 0 ? 'rgba(237,73,86,0.2)' : '#2a2a2a'}`,
            }}>
              {remainingSends('signup-otp') === 0 ? 'limit reached' : `${remainingSends('signup-otp')} left`}
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>
        <button
          type="submit"
          disabled={!codeComplete || isSubmitting}
          style={gradientBtn(codeComplete && !isSubmitting)}
        >
          {isSubmitting ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
              </svg>
              Verifying...
            </span>
          ) : 'Verify & Continue'}
        </button>
      </div>
    </form>
  );
};

SignupStep3.displayName = 'SignupStep3';
