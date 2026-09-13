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
    <div style={{ position: 'relative', zIndex: 10, minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 40px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* card */}
          <div style={{
          background: 'rgba(20,20,22,0.92)',
          backdropFilter: 'blur(20px) saturate(1.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '40px 36px 28px',
          boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 60px rgba(0,0,0,0.60)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* top glow line */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '62%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }} />

          {/* icon */}
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#FFFFFF', display: 'grid', placeItems: 'center', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(255,255,255,0.10)', position: 'relative' }}>
            <Mail size={22} color="#09090B" />
            <span style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', border: '2px solid #141416', display: 'grid', placeItems: 'center' }}>
              <Sparkles size={9} color="#fff" />
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 9px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA' }}>
              <ShieldCheck size={11} /> One-time link
            </p>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '26px', fontWeight: 400, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '12px 0 0', lineHeight: 1.15 }}>
              Check your <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#E4E4E7' }}>email</em>
            </h1>
            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#A1A1AA', margin: '10px 0 0' }}>
              We sent a magic link to <span style={{ color: '#FAFAFA', fontWeight: 600, wordBreak: 'break-all' }}>{email}</span>
            </p>
            <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: '#71717A', margin: '6px 0 0' }}>
              Tap the link to sign in — no password needed. Expires in 15 minutes.
            </p>
          </div>

          {/* progress meta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '20px', padding: '11px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 600, color: '#A1A1AA' }}>
              <Clock size={13} color="#71717A" />
              {loading ? 'Syncing…' : `${remaining}/${maxSends} sends left`}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#52525B' }}>15 min · one-time</span>
          </div>

          {/* progress bar */}
          <div style={{ marginTop: '10px', height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(remaining / maxSends) * 100}%`, background: remaining > 1 ? '#FFFFFF' : remaining === 1 ? '#F59E0B' : '#71717A', borderRadius: '999px', transition: 'width 300ms ease, background 300ms ease' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button type="button" onClick={handleBack} style={{ flex: '0 0 auto', height: '44px', padding: '0 16px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
              <ArrowLeft size={15} /> Back
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={isLocked || sending}
              style={{
                flex: 1, height: '48px', borderRadius: '12px',
                background: isLocked ? 'rgba(255,255,255,0.06)' : '#0095F6',
                color: isLocked ? '#71717A' : '#FFFFFF',
                border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : '#0095F6'}`,
                fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em',
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
