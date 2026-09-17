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
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
    const dashboardUrl = getRedirectTarget();
    const initials = (user.name || user.email || '?')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '19px' : '24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: isMobile ? 'min(504px, 100vw - 38px)' : '504px',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(29px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? '19px' : '24px',
            padding: isMobile ? '29px' : '58px 48px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name || user.email}
              style={{ width: '77px', height: '77px', borderRadius: '50%', margin: '0 auto 19px', objectFit: 'cover', border: '2px solid #2a2a2a' }}
            />
          ) : (
            <div style={{
              width: '77px',
              height: '77px',
              borderRadius: '50%',
              margin: '0 auto 19px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#111111',
              border: '2px solid #2a2a2a',
              color: '#f5f5f5',
              fontSize: '26px',
              fontWeight: 600,
              fontFamily: TYPOGRAPHY.fontFamily,
            }}>
              {initials}
            </div>
          )}

          <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#606060', marginBottom: '10px', fontFamily: TYPOGRAPHY.fontFamily }}>
            Signed in as
          </p>
          <p style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 600, color: '#f5f5f5', marginBottom: '5px', fontFamily: TYPOGRAPHY.fontFamily, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </p>
          {user.name && (
            <p style={{ fontSize: isMobile ? '16px' : '17px', color: '#707070', marginBottom: isMobile ? '24px' : '38px', fontFamily: TYPOGRAPHY.fontFamily }}>
              {user.name}
            </p>
          )}
          {!user.name && <div style={{ marginBottom: isMobile ? '24px' : '38px' }} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <a
              href={dashboardUrl}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '17px',
                borderRadius: '14px',
                background: '#0095F6',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: TYPOGRAPHY.fontFamily,
                textDecoration: 'none',
                transition: 'opacity 150ms',
                boxShadow: '0 4px 16px rgba(0,149,246,0.28)',
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
                gap: '10px',
                width: '100%',
                padding: '17px',
                borderRadius: '14px',
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: '#707070',
                fontSize: '18px',
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
