'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, ArrowLeft, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { requestMagicLink } from '../../lib/api';
import { TYPOGRAPHY } from '../../lib/design';

export const MagicLinkSentPage: React.FC = () => {
  const email = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') || '' : '';
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [maxSends, setMaxSends] = useState(3);
  const [retryAfter, setRetryAfter] = useState(0);
  const [sendError, setSendError] = useState('');
  const [limitResetAt, setLimitResetAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRemaining = useCallback(async () => {
    if (!email) return;
    try {
      const base = (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app')).replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/remaining?email=${encodeURIComponent(email)}&method=magic-link`, { credentials: 'include' });
      if (res.ok) {
        const d: any = await res.json();
        const rem = d?.remaining?.['magic-link'];
        if (rem) {
          setRemaining(rem.remaining);
          setMaxSends(rem.max);
          // Server says exhausted → show "Limit reached — resets at HH:MM".
          setLimitResetAt(rem.remaining <= 0 && rem.resetAt ? rem.resetAt : 0);
        }
      }
    } catch {}
    setLoading(false);
  }, [email]);

  // fast sync: 8s + focus + immediate after resend
  useEffect(() => {
    fetchRemaining();
    const t = setInterval(fetchRemaining, 8000);
    const onFocus = () => fetchRemaining();
    const onVis = () => { if (document.visibilityState === 'visible') fetchRemaining(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchRemaining]);

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => setCooldown(v => { if (v <= 1) { clearInterval(cooldownRef.current!); return 0; } return v - 1; }), 1000);
      return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
    }
  }, [cooldown]);

  useEffect(() => {
    if (retryAfter > 0) {
      retryRef.current = setInterval(() => setRetryAfter(v => { if (v <= 1) { clearInterval(retryRef.current!); return 0; } return v - 1; }), 1000);
      return () => { if (retryRef.current) clearInterval(retryRef.current); };
    }
  }, [retryAfter]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || remaining <= 0) return;
    setSending(true);
    setSendError('');
    try {
      const res = await requestMagicLink(email);
      if (res.ok) {
        setRemaining(v => Math.max(0, v - 1));
        setCooldown(30);
        setTimeout(fetchRemaining, 600); // sync real value fast
      } else if (res.status === 429) {
        const resetsAt = res.resetsAt || (res.retryAfterMs ? Date.now() + res.retryAfterMs : 0);
        const retrySec = Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000));
        setRetryAfter(retrySec); setCooldown(retrySec);
        if (resetsAt) setLimitResetAt(resetsAt);
        setSendError(
          resetsAt
            ? `Limit reached — resets at ${new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            : res.error || `Please wait ${retrySec}s before requesting again.`,
        );
        setTimeout(fetchRemaining, 600);
      } else {
        // Never swallow failures — show them inline.
        setSendError(res.error || 'Could not resend the link. Please try again.');
      }
    } catch {
      setSendError('Could not reach the server. Please try again.');
    }
    setSending(false);
  };

  const handleBack = () => { window.location.href = '/login'; };

  if (!email) return null;
  const isLocked = cooldown > 0 || retryAfter > 0 || (limitResetAt > 0 && Date.now() < limitResetAt);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
  const pct = maxSends > 0 ? (remaining / maxSends) * 100 : 0;

  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: 'calc(100vh - 67px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ width: '100%', maxWidth: isMobile ? 'min(520px,100vw - 24px)' : '480px' }}>
        {/* card - website theme: obsidian glass */}
        <div
          style={{
            background: 'rgba(16,16,18,0.94)',
            backdropFilter: 'blur(24px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.15)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: isMobile ? 20 : 24,
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 60px rgba(0,0,0,0.55)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '58%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />

          {/* top */}
          <div style={{ padding: isMobile ? '28px 22px 22px' : '32px 28px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#0095F6', boxShadow: '0 0 8px rgba(0,149,246,0.4)' }} />
              <span style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA' }}>One-time link</span>
              <ShieldCheck size={10} color="#71717A" />
            </div>

            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 16px', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
              <Mail size={28} color="#09090B" strokeWidth={1.9} />
              <span style={{ position: 'absolute', right: -5, bottom: -5, width: 20, height: 20, borderRadius: 999, background: '#0095F6', display: 'grid', placeItems: 'center', border: '2px solid #fff', boxShadow: '0 2px 10px rgba(0,149,246,0.35)' }}>
                <Sparkles size={10} color="#fff" />
              </span>
            </div>

            <h1 style={{ fontFamily: "'Google Sans', sans-serif", fontSize: isMobile ? 24 : 28, fontWeight: 700, letterSpacing: '-0.04em', color: '#FAFAFA', margin: 0, lineHeight: 1.1 }}>
              Check your email
            </h1>
            <p style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 13.5, color: '#71717A', margin: '8px 0 0', lineHeight: 1.5 }}>
              One-time magic link — expires in 15 min
            </p>
          </div>

          {/* email */}
          <div style={{ margin: '0 22px', padding: '14px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Mail size={14} color="#A1A1AA" />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#52525B', margin: 0 }}>Sent to</p>
              <p style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 14, fontWeight: 600, color: '#FAFAFA', margin: '2px 0 0', wordBreak: 'break-all', letterSpacing: '-0.01em' }}>{email}</p>
            </div>
            <span style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 999, background: loading ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.10)', border: `1px solid ${loading ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.18)'}`, fontFamily: TYPOGRAPHY.fontFamily, fontSize: 11, fontWeight: 700, color: loading ? '#71717A' : '#10B981', whiteSpace: 'nowrap' }}>
              {loading ? 'Syncing…' : `${remaining} left`}
            </span>
          </div>

          {/* meta */}
          <div style={{ margin: '14px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: TYPOGRAPHY.fontFamily, fontSize: 12, fontWeight: 500, color: '#71717A' }}>
              <Clock size={12} /> {maxSends - remaining} used · {remaining} left
            </span>
            <span style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#52525B' }}>15 min · one-time</span>
          </div>
          <div style={{ margin: '10px 22px 0', height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: remaining === 0 ? '#71717A' : '#0095F6', borderRadius: 999, transition: 'width 400ms ease' }} />
          </div>

          {/* actions */}
          <div style={{ display: 'flex', gap: 10, padding: '18px 22px 22px' }}>
            <button type="button" onClick={handleBack} style={{ height: 46, padding: '0 16px', borderRadius: 11, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA', fontFamily: TYPOGRAPHY.fontFamily, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <ArrowLeft size={13} /> Back
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isLocked || sending || remaining <= 0}
              style={{
                flex: 1, height: 46, borderRadius: 11,
                background: isLocked || remaining <= 0 ? 'rgba(255,255,255,0.06)' : '#0095F6',
                color: isLocked || remaining <= 0 ? '#71717A' : '#fff',
                border: `1px solid ${isLocked || remaining <= 0 ? 'rgba(255,255,255,0.06)' : '#0095F6'}`,
                fontFamily: TYPOGRAPHY.fontFamily, fontSize: 14, fontWeight: 700, cursor: isLocked || sending || remaining <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: isLocked || remaining <= 0 ? 'none' : '0 6px 16px rgba(0,149,246,0.24)',
                opacity: remaining <= 0 ? 0.9 : 1,
              }}
            >
              {remaining <= 0 ? 'No sends left' : retryAfter > 0 ? `Retry in ${retryAfter}s` : cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend link'}
            </button>
          </div>

          {sendError && (
            <p role="alert" style={{ textAlign: 'center', fontFamily: TYPOGRAPHY.fontFamily, fontSize: 12.5, fontWeight: 600, color: '#f43f5e', margin: '10px 22px 0', padding: '8px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 10, lineHeight: 1.45 }}>
              {sendError}
            </p>
          )}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 22px' }} />
          <p style={{ textAlign: 'center', fontFamily: TYPOGRAPHY.fontFamily, fontSize: 12, color: '#52525B', margin: 0, padding: '14px 22px', lineHeight: 1.5 }}>
            Didn&apos;t get it? Check spam · <button onClick={handleResend} disabled={isLocked} style={{ background: 'none', border: 'none', padding: 0, color: isLocked ? '#52525B' : '#A1A1AA', fontFamily: TYPOGRAPHY.fontFamily, fontSize: 12, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2, cursor: isLocked ? 'not-allowed' : 'pointer' }}>try again</button> · expires in 15 min
          </p>
        </div>

        <p style={{ textAlign: 'center', fontFamily: TYPOGRAPHY.fontFamily, fontSize: 11, color: '#52525B', marginTop: 14 }}>
          Protected by Tirbeo · <a href="/privacy" style={{ color: '#71717A', textDecoration: 'underline', textUnderlineOffset: 2 }}>Privacy</a> · <a href="/terms" style={{ color: '#71717A', textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms</a>
        </p>
      </div>
    </div>
  );
};
