import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface ResendCounterProps {
  remaining: number;
  maxSends: number;
  cooldownSeconds: number;
  onResend: () => void;
  disabled?: boolean;
  label?: string;
}

export const ResendCounter: React.FC<ResendCounterProps> = ({
  remaining,
  maxSends,
  cooldownSeconds,
  onResend,
  disabled = false,
  label = 'Resend code',
}) => {
  const isInCooldown = cooldownSeconds > 0;
  const canResend = remaining > 0 && !isInCooldown && !disabled;
  const progress = (remaining / maxSends) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', backdropFilter: 'blur(12px)' }}>
      {/* Progress bar — amber */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            style={{
              height: '100%',
              borderRadius: '999px',
              background: remaining > 1 ? '#0095F6' : remaining === 1 ? '#0095F6' : '#F43F5E',
              boxShadow: remaining > 0 ? `0 0 10px ${remaining > 1 ? 'rgba(0,149,246,0.30)' : 'rgba(0,149,246,0.25)'}` : 'none',
            }}
          />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: remaining > 1 ? '#7DD3FC' : remaining === 1 ? '#0095F6' : '#F43F5E', whiteSpace: 'nowrap' }}>
          {remaining}/{maxSends} left
        </span>
      </div>

      {/* Resend button/label */}
      {remaining > 0 ? (
        isInCooldown ? (
          <p style={{ fontSize: '15px', color: '#71717A', textAlign: 'center', margin: 0, fontWeight: 500 }}>
            Next send in {cooldownSeconds}s
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={!canResend}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em', color: canResend ? '#0095F6' : '#52525B', background: canResend ? 'rgba(0,149,246,0.08)' : 'transparent', border: `1px solid ${canResend ? 'rgba(0,149,246,0.14)' : 'transparent'}`, borderRadius: '999px', padding: '6px 12px', cursor: canResend ? 'pointer' : 'not-allowed', opacity: canResend ? 1 : 0.5, transition: 'all 150ms ease' }}
          >
            <RefreshCw size={12} />
            {label}
          </button>
        )
      ) : (
        <p style={{ fontSize: '15px', color: '#F43F5E', textAlign: 'center', margin: 0, fontWeight: 600 }}>
          No more sends available. Please try again later.
        </p>
      )}
    </div>
  );
};
