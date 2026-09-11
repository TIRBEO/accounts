import React from 'react';
import { motion } from 'motion/react';
import zxcvbn from 'zxcvbn';

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong'];
const STRENGTH_COLORS = [
  'var(--tb-error)',
  'var(--tb-error)',
  'var(--tb-warning)',
  'var(--tb-success)',
  'var(--tb-success)',
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
    <div className="mt-2">
      <div className="flex gap-1.5 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full overflow-hidden"
            style={{ background: 'var(--tb-outline-variant)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: score >= i ? '100%' : '0%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color }}>
        {label}
      </p>
      {score > 0 && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--tb-on-surface-variant)' }}>
          Crack time: {formatCrackTime(crackTime)}
        </p>
      )}
    </div>
  );
};
