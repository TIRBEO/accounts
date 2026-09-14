'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';
import { startOAuth, type OAuthProvider } from '../../../lib/oauth';
import type { LoginStep } from '../../../lib/validations';

interface LoginEmailProps {
  email: string;
  setEmail: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  isSubmitting: boolean;
  setLoginStep: (step: LoginStep) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPasskeyLogin: () => void;
  onMagicLink: () => void;
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: '44px',
  background: '#0095F6',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  boxShadow: 'none',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '48px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#FAFAFA',
  fontSize: '14.5px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 16px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
};

const oauthBtn: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '48px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  cursor: 'pointer',
  transition: 'all 150ms ease',
};

export const LoginEmail: React.FC<LoginEmailProps> = ({
  email, setEmail, errors, touched, handleBlur,
  loginProfile, isSubmitting, onSubmit, onMagicLink,
}) => {
  const showEmailError = touched.email && errors.email;

  return (
    <form
      className="auth-form"
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', fontWeight: 400, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '0 0 10px', lineHeight: 1.1 }}>
          Log <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#38BDF8' }}>in</em>
        </h2>
        <p style={{ fontSize: '14.5px', color: '#A1A1AA', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px', margin: 0 }}>
          Enter your email to sign in to your account.
        </p>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur('email')}
        placeholder="Email"
        autoComplete="email"
        style={{
          ...inputBase,
          borderColor: showEmailError ? '#f43f5e' : 'rgba(255,255,255,0.07)',
        }}
        onFocus={(e) => {
          if (!showEmailError) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = showEmailError ? '#f43f5e' : 'rgba(255,255,255,0.07)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {showEmailError && (
        <p style={{ fontSize: '14px', color: '#f43f5e', margin: '-8px 0 0', paddingLeft: '2px' }}>
          {errors.email}
        </p>
      )}

      <button
        type="submit"
        disabled={!email.includes('@') || isSubmitting}
        style={{
          ...primaryBtn,
          background: email.includes('@') && !isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.08)',
          color: email.includes('@') && !isSubmitting ? '#FFFFFF' : '#71717A',
          opacity: 1,
          cursor: email.includes('@') && !isSubmitting ? 'pointer' : 'not-allowed',
          boxShadow: email.includes('@') && !isSubmitting ? '0 4px 16px rgba(0,149,246,0.28)' : 'none',
          border: `1px solid ${email.includes('@') && !isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        {isSubmitting ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
            </svg>
            Continue
          </span>
        ) : 'Continue'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '4px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontSize: '12px', color: '#484848', fontWeight: 500, letterSpacing: '0.05em' }}>OR</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <div className="oauth-icon-row" style={{ display: 'flex', gap: '14px' }}>
        <button type="button" onClick={() => startOAuth('google')} disabled={isSubmitting} style={oauthBtn}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z" />
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z" />
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
          </svg>
        </button>
        <button type="button" onClick={() => startOAuth('github')} disabled={isSubmitting} style={oauthBtn}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FAFAFA">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </button>
        <button type="button" onClick={() => startOAuth('discord')} disabled={isSubmitting} style={oauthBtn}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#5865F2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </button>
      </div>
    </form>
  );
};

LoginEmail.displayName = 'LoginEmail';
