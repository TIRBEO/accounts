import React from 'react';
import { motion } from 'motion/react';
import { useSession } from '../../hooks/useSession';
import { getRedirectTarget } from '../../lib/redirect';
import { TYPOGRAPHY } from '../../lib/design';

interface SessionGateProps {
  children: React.ReactNode;
}

export function SessionGate({ children }: SessionGateProps) {
  const { user, loading, isAuthenticated, signOut } = useSession();

  if (loading) {
    return null;
  }

  if (isAuthenticated && user) {
    const dashboardUrl = getRedirectTarget();
    const initials = (user.name || user.email || '?')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '420px',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '48px 40px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name || user.email}
              style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px', objectFit: 'cover', border: '2px solid #2a2a2a' }}
            />
          ) : (
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#111111',
              border: '2px solid #2a2a2a',
              color: '#f5f5f5',
              fontSize: '22px',
              fontWeight: 600,
              fontFamily: TYPOGRAPHY.fontFamily,
            }}>
              {initials}
            </div>
          )}

          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#606060', marginBottom: '8px', fontFamily: TYPOGRAPHY.fontFamily }}>
            Signed in as
          </p>
          <p style={{ fontSize: '17px', fontWeight: 600, color: '#f5f5f5', marginBottom: '4px', fontFamily: TYPOGRAPHY.fontFamily, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </p>
          {user.name && (
            <p style={{ fontSize: '14px', color: '#707070', marginBottom: '32px', fontFamily: TYPOGRAPHY.fontFamily }}>
              {user.name}
            </p>
          )}
          {!user.name && <div style={{ marginBottom: '32px' }} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href={dashboardUrl}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#0095f6',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: TYPOGRAPHY.fontFamily,
                textDecoration: 'none',
                transition: 'opacity 150ms',
              }}
            >
              Continue to dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </a>

            <button
              onClick={signOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#707070',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: TYPOGRAPHY.fontFamily,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#f5f5f5'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#707070'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
