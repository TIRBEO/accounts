'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';
import type { LoginStep } from '../../../lib/validations';

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

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: '56px',
  background: '#0095f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '14px',
  fontSize: '17px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'opacity 150ms ease',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '56px',
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '16px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 24px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
};

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  height: '48px',
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  color: '#a0a0a0',
  fontSize: '15px',
  fontWeight: 600,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
};

export const LoginPassword: React.FC<LoginPasswordProps> = ({
  email, password, setPassword, showPassword, setShowPassword,
  errors, touched, handleBlur, loginProfile, isSubmitting,
  onSwitchAccount, onSubmit, onMoreOptions,
}) => {
  const showPasswordError = touched.password && errors.password;
  const displayName = loginProfile?.name || loginProfile?.email?.split('@')[0] || 'there';
  const photoUrl = loginProfile?.photoUrl;

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#111111',
          border: '2px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          overflow: 'hidden',
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#484848', fontFamily: TYPOGRAPHY.fontFamily }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f5f5f5', marginBottom: '8px', fontFamily: TYPOGRAPHY.fontFamily }}>
          Hi, {displayName}
        </h2>
        <p style={{ fontSize: '15px', color: '#707070', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px' }}>
          Enter your password to continue.
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur('password')}
          placeholder="Password"
          autoComplete="current-password"
          style={{
            ...inputBase,
            borderColor: showPasswordError ? '#ed4956' : '#2a2a2a',
          }}
          onFocus={(e) => {
            if (!showPasswordError) e.currentTarget.style.borderColor = '#3a3a3a';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = showPasswordError ? '#ed4956' : '#2a2a2a';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {password.length > 0 && (
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
        )}
      </div>
      {showPasswordError && (
        <p style={{ fontSize: '14px', color: '#ed4956', margin: '-8px 0 0', paddingLeft: '2px' }}>
          {errors.password}
        </p>
      )}

      <button
        type="submit"
        disabled={!password || isSubmitting}
        style={{
          ...primaryBtn,
          opacity: password && !isSubmitting ? 1 : 0.5,
          cursor: password && !isSubmitting ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
            </svg>
            Log in
          </span>
        ) : 'Log in'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
        <button type="button" onClick={onMoreOptions} disabled={isSubmitting}
          style={{
            ...secondaryBtn,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
          }}
          onMouseOver={e => { if (!isSubmitting) { e.currentTarget.style.background = '#161616'; e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#f5f5f5'; } }}
          onMouseOut={e => { if (!isSubmitting) { e.currentTarget.style.background = '#111111'; e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a0a0a0'; } }}
        >
          More ways to verify
        </button>

        <button type="button" onClick={onSwitchAccount}
          style={{
            background: 'none',
            border: 'none',
            color: '#707070',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: TYPOGRAPHY.fontFamily,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'color 150ms ease, background 150ms ease',
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseOut={e => { e.currentTarget.style.color = '#707070'; e.currentTarget.style.background = 'transparent'; }}
        >
          Switch account
        </button>
      </div>
    </form>
  );
};

LoginPassword.displayName = 'LoginPassword';
