"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResendButtonProps {
  onResend: () => Promise<void>;
  cooldown?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
  spinnerClassName?: string;
}

export function ResendButton({
  onResend,
  cooldown = 30,
  label = "Resend",
  className,
  disabled,
  spinnerClassName,
}: ResendButtonProps) {
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = useCallback((secs: number) => {
    setCountdown(secs);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const handleClick = useCallback(async () => {
    if (countdown > 0 || sending || disabled) return;
    setSending(true);
    try {
      await onResend();
      startCountdown(cooldown);
    } finally {
      setSending(false);
    }
  }, [onResend, countdown, sending, disabled, cooldown, startCountdown]);

  const isDisabled = disabled || sending || countdown > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      aria-live="polite"
    >
      {sending && (
        <span
          className={spinnerClassName || "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"}
          aria-hidden="true"
        />
      )}
      {countdown > 0 ? `${label} in ${countdown}s` : sending ? "Sending..." : label}
    </button>
  );
}
