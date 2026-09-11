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
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--tb-outline-variant)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full rounded-full"
            style={{
              background: remaining > 1 ? 'var(--tb-primary)' : remaining === 1 ? 'var(--tb-warning)' : 'var(--tb-error)',
            }}
          />
        </div>
        <span className="text-xs text-[var(--tb-on-surface-variant)] whitespace-nowrap">
          {remaining}/{maxSends} remaining
        </span>
      </div>

      {/* Resend button/label */}
      {remaining > 0 ? (
        isInCooldown ? (
          <p className="text-xs text-[var(--tb-on-surface-variant)] text-center">
            Next send in {cooldownSeconds}s
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={!canResend}
            className="flex items-center gap-1.5 mx-auto text-xs font-medium text-[var(--tb-primary)] hover:text-[var(--tb-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3 h-3" />
            {label}
          </button>
        )
      ) : (
        <p className="text-xs text-[var(--tb-error)] text-center">
          No more sends available. Please try again later.
        </p>
      )}
    </div>
  );
};
