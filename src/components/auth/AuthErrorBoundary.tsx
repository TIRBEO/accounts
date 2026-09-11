import React from 'react';
import { Sentry } from '../../lib/sentry';
import { TYPOGRAPHY } from '../../lib/design';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AuthErrorBoundaryInner extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#0d0d0d',
            border: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ed4956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5f5f5', marginBottom: '8px', fontFamily: TYPOGRAPHY.fontFamily }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '14px', color: '#707070', marginBottom: '28px', maxWidth: '360px', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '20px' }}>
            An unexpected error occurred. Please try again or use a different browser.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0095f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: TYPOGRAPHY.fontFamily,
              padding: '12px 24px',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AuthErrorBoundary: React.FC<Props> = ({ children }) => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: '#0d0d0d',
          border: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ed4956" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5f5f5', marginBottom: '8px', fontFamily: TYPOGRAPHY.fontFamily }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '14px', color: '#707070', marginBottom: '28px', maxWidth: '360px', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '20px' }}>
          An unexpected error occurred. Please try again or use a different browser.
        </p>
        <button
          onClick={resetError}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0095f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: TYPOGRAPHY.fontFamily,
            padding: '12px 24px',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Try again
        </button>
      </div>
    )}
  >
    {children}
  </Sentry.ErrorBoundary>
);
