'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadTurnstile, TURNSTILE_HUMAN_ERROR } from '../../lib/turnstile';

interface TurnstileCaptchaProps {
  /**
   * Site key to render with. Prefers the key the API handed back in its 403
   * (request-time, always current) and falls back to the build-time env var.
   */
  siteKey?: string | null;
  /** Receives the token, or `null` when the challenge expires/fails. */
  onToken: (token: string | null) => void;
  /** Fired when the widget itself errors so the form can show copy. */
  onError?: () => void;
  /**
   * Bump this to clear the current token and re-arm the widget — a Turnstile
   * token is single-use, so every failed submit needs a fresh one.
   */
  resetSignal?: number;
  className?: string;
}

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing without a site key. Everything else — script injection,
 * explicit rendering, teardown, reset — is handled here so callers only deal
 * with `onToken`.
 */
export const TurnstileCaptcha: React.FC<TurnstileCaptchaProps> = ({
  siteKey,
  onToken,
  onError,
  resetSignal,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Keep the callbacks in refs: the widget is rendered once by the script, but
  // React re-renders this component whenever the parent state changes. Without
  // this the widget would keep calling a stale closure.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  useEffect(() => {
    if (!siteKey) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: siteKey,
          theme: 'dark',
          size: 'flexible',
          retry: 'auto',
          appearance: 'always',
          callback: (token: string) => {
            setFailed(false);
            onTokenRef.current(token);
          },
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => {
            setFailed(true);
            onTokenRef.current(null);
            onErrorRef.current?.();
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        onTokenRef.current(null);
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      // `remove` (not just `reset`) so a re-render with a new site key mounts
      // a fresh widget instead of reusing a dead one.
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* widget already gone */
        }
      }
    };
  }, [siteKey]);

  /** Clear the current token so the next submit is challenged again. */
  useEffect(() => {
    const el = containerRef.current;
    const id = widgetIdRef.current;
    if (el && id && window.turnstile) window.turnstile.reset(id);
  }, [resetSignal]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {failed ? (
        <p className="mt-2 text-[12px] leading-relaxed text-amber-400/90" role="alert">
          {TURNSTILE_HUMAN_ERROR}
        </p>
      ) : null}
    </div>
  );
};
