import React from 'react';
import { motion } from 'motion/react';
import zxcvbn from 'zxcvbn';

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong'];
const STRENGTH_COLORS = [
  '#F43F5E',
  '#F43F5E',
  '#F59E0B',
  '#38BDF8',
  '#0095F6',
];

function formatCrackTime(seconds: number): string {
  if (seconds < 1) return 'instantly';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  return `${Math.round(seconds / 31536000)} years`;
}

export const PasswordStrengthMeter: React.FC<{
  password: string;
  show?: boolean;
}> = ({ password, show = true }) => {
  if (!show || !password) return null;

  const score = password.length > 0 ? zxcvbn(password).score : 0;
  const crackTime = password.length > 0 ? Number(zxcvbn(password).crack_times_display.offline_slow_hashing_1e4_per_second) : 0;
  const label = STRENGTH_LABELS[score] || '';
  const color = STRENGTH_COLORS[score] || 'var(--tb-outline)';

  return (
    <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{ flex: 1, height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: score >= i ? '100%' : '0%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as any }}
              style={{ height: '100%', borderRadius: '999px', background: color, boxShadow: score >= i ? `0 0 8px ${color}40` : 'none' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color }}>
          {label}
        </p>
        {score > 0 && (
          <p style={{ fontSize: '11px', color: '#71717A' }}>
            Crack: {formatCrackTime(crackTime)}
          </p>
        )}
      </div>
    </div>
  );
};
