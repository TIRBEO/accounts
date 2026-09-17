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
  height: '53px',
  background: '#0095F6',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '12px',
  fontSize: '17px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  boxShadow: 'none',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '70px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#FAFAFA',
  fontSize: '17px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 16px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
};

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  height: '53px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#A1A1AA',
  fontSize: '17px',
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
      className="auth-form"
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{
          width: '88px',
          height: '88px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          overflow: 'hidden',
          boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px rgba(0,0,0,0.35)',
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#71717A', fontFamily: TYPOGRAPHY.fontFamily }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <h2 style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color: '#FAFAFA', margin: '0 0 8px', lineHeight: 1.1 }}>
          Hi, <em style={{ fontStyle: 'normal', fontWeight: 700, color: '#0095F6' }}>{displayName}</em>
        </h2>
        <p style={{ fontSize: '17px', color: '#A1A1AA', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px', margin: 0 }}>
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
            borderColor: showPasswordError ? '#f43f5e' : 'rgba(255,255,255,0.07)',
          }}
          onFocus={(e) => {
            if (!showPasswordError) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = showPasswordError ? '#f43f5e' : 'rgba(255,255,255,0.07)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {password.length > 0 && (
           <button
             type="button"
             onClick={() => setShowPassword(!showPassword)}
             aria-label={showPassword ? 'Hide password' : 'Show password'}
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
        )}
      </div>
      {showPasswordError && (
        <p style={{ fontSize: '17px', color: '#f43f5e', margin: '-8px 0 0', paddingLeft: '2px' }}>
          {errors.password}
        </p>
      )}

      <button
        type="submit"
        disabled={!password || isSubmitting}
        style={{
          ...primaryBtn,
          background: password && !isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.08)',
          color: password && !isSubmitting ? '#FFFFFF' : '#71717A',
          opacity: 1,
          cursor: password && !isSubmitting ? 'pointer' : 'not-allowed',
          boxShadow: password && !isSubmitting ? '0 4px 16px rgba(0,149,246,0.28)' : 'none',
          border: `1px solid ${password && !isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.06)'}`,
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
        <button type="button" onClick={onMoreOptions} disabled={isSubmitting}
          style={{
            ...secondaryBtn,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
          }}
          onMouseOver={e => { if (!isSubmitting) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#FAFAFA'; } }}
          onMouseOut={e => { if (!isSubmitting) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#A1A1AA'; } }}
        >
          More ways to verify
        </button>

        <button type="button" onClick={onSwitchAccount}
          style={{
            background: 'none',
            border: 'none',
            color: '#71717A',
            fontSize: '17px',
            fontWeight: 500,
            fontFamily: TYPOGRAPHY.fontFamily,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'color 150ms ease, background 150ms ease',
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseOut={e => { e.currentTarget.style.color = '#71717A'; e.currentTarget.style.background = 'transparent'; }}
        >
          Switch account
        </button>
      </div>
    </form>
  );
};

LoginPassword.displayName = 'LoginPassword';
