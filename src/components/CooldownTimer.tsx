import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface CooldownTimerProps {
  lockedUntil: string;
  className?: string;
  showDetails?: boolean;
  onAvailable?: (username: string) => void;
  username?: string;
}

export const CooldownTimer: React.FC<CooldownTimerProps> = ({
  lockedUntil,
  className = '',
  showDetails = false,
  onAvailable,
  username,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  const [justBecameAvailable, setJustBecameAvailable] = useState(false);
  const wasLockedRef = useRef(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const lockDate = new Date(lockedUntil);
      const now = new Date();
      const diff = lockDate.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds, total: diff };
    };

    const updateTimer = () => {
      const newTimeLeft = calculateTimeLeft();
      const wasLocked = wasLockedRef.current;
      const isNowLocked = newTimeLeft.total > 0;

      // Detect transition from locked to available
      if (wasLocked && !isNowLocked && username) {
        setJustBecameAvailable(true);
        onAvailable?.(username);
        
        // Hide the notification after 10 seconds
        setTimeout(() => {
          setJustBecameAvailable(false);
        }, 10000);
      }

      wasLockedRef.current = isNowLocked;
      setTimeLeft(newTimeLeft);
    };

    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [lockedUntil, username, onAvailable]);

  const isLocked = timeLeft.total > 0;

  // Show "just became available" notification
  if (justBecameAvailable) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.8, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`inline-flex items-center gap-1.5 text-xs text-[var(--wave-success)] bg-[var(--wave-success-container)] px-2.5 py-1 rounded-md border border-[var(--wave-success)]/40 ${className}`}
      >
        <motion.span
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.span>
        <span className="font-medium">Just became available!</span>
      </motion.span>
    );
  }

  if (!isLocked) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-[var(--wave-success)] bg-[var(--wave-success-container)] px-2 py-1 rounded ${className}`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Available
      </span>
    );
  }

  if (showDetails) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <div className="text-center">
            <div className="text-lg font-semibold text-[var(--wave-text)] tabular-nums">
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-[var(--wave-on-surface-variant)] uppercase">Days</div>
          </div>
          <span className="text-[var(--wave-text)] text-lg font-light">:</span>
          <div className="text-center">
            <div className="text-lg font-semibold text-[var(--wave-text)] tabular-nums">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-[var(--wave-on-surface-variant)] uppercase">Hrs</div>
          </div>
          <span className="text-[var(--wave-text)] text-lg font-light">:</span>
          <div className="text-center">
            <div className="text-lg font-semibold text-[var(--wave-text)] tabular-nums">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-[var(--wave-on-surface-variant)] uppercase">Min</div>
          </div>
          <span className="text-[var(--wave-text)] text-lg font-light">:</span>
          <div className="text-center">
            <div className="text-lg font-semibold text-[var(--wave-text)] tabular-nums">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-[var(--wave-on-surface-variant)] uppercase">Sec</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 text-xs text-[var(--wave-text)] bg-[var(--wave-surface-container)] px-2 py-1 rounded ${className}`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    </motion.span>
  );
};

export default CooldownTimer;
