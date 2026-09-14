'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, ArrowLeft, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { requestMagicLink } from '../../lib/api';

export const MagicLinkSentPage: React.FC = () => {
  const email = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') || '' : '';
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [maxSends, setMaxSends] = useState(3);
  const [retryAfter, setRetryAfter] = useState(0);
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
        if (rem) { setRemaining(rem.remaining); setMaxSends(rem.max); }
      }
    } catch {}
    setLoading(false);
  }, [email]);

  useEffect(() => {
    fetchRemaining();
    const t = setInterval(fetchRemaining, 30000);
    return () => clearInterval(t);
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
    try {
      const res = await requestMagicLink(email);
      if (res.ok) { setRemaining(v => Math.max(0, v - 1)); setCooldown(30); }
      else if (res.status === 429) {
        const retryMs = res.retryAfterMs || 30000;
        const retrySec = Math.ceil(retryMs / 1000);
        setRetryAfter(retrySec); setCooldown(retrySec); fetchRemaining();
      }
    } catch {}
    setSending(false);
  };

  const handleBack = () => { window.location.href = '/login'; };

  if (!email) return null;
  const isLocked = cooldown > 0 || retryAfter > 0;

  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px' }}>
      <div style={{ width: '100%', maxWidth: '580px' }}>
        {/* card — infinite big glass 760 28 sky-blue */}
          <div style={{
          background: 'rgba(18,18,20,0.88)',
          backdropFilter: 'blur(28px) saturate(1.25)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '22px',
          boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset, 0 32px 80px rgba(0,0,0,0.60), 0 0 40px rgba(56,189,248,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* top glow line — sky blue */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '68%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.20), transparent)' }} />

          {/* icon */}
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FFFFFF', display: 'grid', placeItems: 'center', margin: '0 auto 20px', boxShadow: '0 4px 18px rgba(255,255,255,0.10), 0 0 20px rgba(56,189,248,0.10)', position: 'relative' }}>
            <Mail size={24} color="#09090B" />
            <span style={{ position: 'absolute', right: '-6px', bottom: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#0095F6', border: '2px solid rgba(18,18,20,0.88)', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(0,149,246,0.30)' }}>
              <Sparkles size={10} color="#fff" />
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '999px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.14)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7DD3FC' }}>
              <ShieldCheck size={11} /> One-time link
            </p>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', fontWeight: 400, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '14px 0 0', lineHeight: 1.1 }}>
              Check your <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#38BDF8' }}>email</em>
            </h1>
            <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: '#A1A1AA', margin: '12px 0 0' }}>
              We sent a magic link to <span style={{ color: '#FAFAFA', fontWeight: 600, wordBreak: 'break-all' }}>{email}</span>
            </p>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#71717A', margin: '8px 0 0' }}>
              Tap the link to sign in — no password needed. Expires in 15 minutes.
            </p>
          </div>

          {/* progress meta — glass 28 sky-blue */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '14px', padding: '14px 16px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.10)', borderRadius: '20px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 600, color: '#7DD3FC' }}>
              <Clock size={13} color="#38BDF8" />
              {loading ? 'Syncing…' : `${remaining}/${maxSends} sends left`}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#38BDF8' }}>15 min · one-time</span>
          </div>

          {/* progress bar — sky blue */}
          <div style={{ marginTop: '12px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(remaining / maxSends) * 100}%`, background: remaining > 1 ? '#0095F6' : remaining === 1 ? '#38BDF8' : '#71717A', borderRadius: '999px', transition: 'width 300ms ease, background 300ms ease', boxShadow: remaining > 0 ? '0 0 8px rgba(0,149,246,0.25)' : 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
            <button type="button" onClick={handleBack} style={{ flex: '0 0 auto', height: '44px', padding: '0 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px', transition: 'all 150ms ease' }}>
              <ArrowLeft size={15} /> Back
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isLocked || sending}
              style={{
                flex: 1, height: '44px', borderRadius: '12px',
                background: isLocked ? 'rgba(255,255,255,0.06)' : '#0095F6',
                color: isLocked ? '#71717A' : '#FFFFFF',
                border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : '#0095F6'}`,
                fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked ? 1 : 1,
                boxShadow: isLocked ? 'none' : '0 4px 16px rgba(0,149,246,0.28)',
                transition: 'all 160ms ease',
              }}
            >
              {retryAfter > 0 ? `Retry in ${retryAfter}s` : cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend link'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#52525B', margin: '14px 0 0', lineHeight: 1.5 }}>
            Didn&apos;t get it? Check spam or <button onClick={handleResend} style={{ background: 'none', border: 'none', padding: 0, color: '#A1A1AA', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', fontSize: '11px' }}>try again</button>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#52525B', marginTop: '14px' }}>
          Protected by Tirbeo · <a href="/privacy" style={{ color: '#71717A', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Privacy</a> · <a href="/terms" style={{ color: '#71717A', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Terms</a>
        </p>
      </div>
    </div>
  );
};
