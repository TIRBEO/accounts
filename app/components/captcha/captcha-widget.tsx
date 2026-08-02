'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API } from '../../lib/api';

interface CaptchaChallenge {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challengeType: string;
  question: string;
  options?: string[];
  imageUrl?: string | null;
  rayId: string;
  attempts: number;
  token: string;
}

interface BehaviorSample {
  t: number;
  x: number;
  y: number;
}

interface BehaviorKey {
  t: number;
  hold: number;
  gap: number;
}

interface BehaviorData {
  startedAt?: number;
  submittedAt?: number;
  samples?: BehaviorSample[];
  keys?: BehaviorKey[];
  scrollCount?: number;
  focusBlurs?: number;
  clicks?: number;
  screen?: string;
  dpr?: number;
  jsEnabled?: boolean;
  reducedMotion?: boolean;
  touch?: boolean;
}

interface CaptchaWidgetProps {
  onSuccess?: (rayId: string) => void;
  onBlocked?: (rayId: string, reason: string, expiresAt?: string) => void;
  requiredDifficulty?: string;
  forceShow?: boolean;
  apiBase?: string;
  autoShow?: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0;
  let out = '';
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
    out += (h & 0xff).toString(16);
  }
  return out.padEnd(64, '0');
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function buildFingerprintSource(): string {
  return [
    navigator.userAgent,
    navigator.language,
    (navigator as any).platform || '',
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    window.devicePixelRatio || 1,
    'ontouchstart' in window,
  ].join('|');
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'border-green-300 bg-green-50/70',
  medium: 'border-yellow-300 bg-yellow-50/70',
  hard: 'border-red-300 bg-red-50/70',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'text-green-700',
  medium: 'text-yellow-700',
  hard: 'text-red-700',
};

export function CaptchaWidget({
  onSuccess,
  onBlocked,
  requiredDifficulty,
  forceShow = false,
  apiBase = `${API}/api/captcha`,
  autoShow = true,
}: CaptchaWidgetProps) {
  const [state, setState] = useState<'checking' | 'hidden' | 'ready' | 'solved' | 'blocked'>('checking');
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [risk, setRisk] = useState<{ score: number; level: string } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [typed, setTyped] = useState('');

  const fingerprintRef = useRef<string>('');
  const behaviorRef = useRef<BehaviorData>({ startedAt: Date.now(), samples: [], keys: [], scrollCount: 0, focusBlurs: 0, clicks: 0 });
  const keyDownAtRef = useRef(0);
  const onSuccessRef = useRef(onSuccess);
  const onBlockedRef = useRef(onBlocked);
  onSuccessRef.current = onSuccess;
  onBlockedRef.current = onBlocked;

  const finalizeBehavior = useCallback((): BehaviorData => {
    const b = behaviorRef.current;
    return { ...b, submittedAt: Date.now() };
  }, []);

  const startBehaviorCapture = useCallback(() => {
    const b = behaviorRef.current;
    b.samples = [];
    b.keys = [];
    b.scrollCount = 0;
    b.focusBlurs = 0;
    b.clicks = 0;
    b.startedAt = Date.now();
    b.screen = `${screen.width}x${screen.height}`;
    b.dpr = window.devicePixelRatio || 1;
    b.jsEnabled = true;
    b.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    b.touch = 'ontouchstart' in window;

    const onMove = (e: PointerEvent) => {
      const samples = behaviorRef.current.samples;
      if (!samples || samples.length > 120) return;
      const now = Date.now();
      const last = samples[samples.length - 1];
      if (last && now - last.t < 40) return;
      samples.push({ t: now, x: e.clientX, y: e.clientY });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      keyDownAtRef.current = Date.now();
    };
    const onKeyUp = () => {
      const keys = behaviorRef.current.keys;
      if (!keys || keys.length > 80) return;
      const now = Date.now();
      const last = keys[keys.length - 1];
      keys.push({
        t: now,
        hold: keyDownAtRef.current ? Math.max(0, now - keyDownAtRef.current) : 0,
        gap: last ? now - last.t : 0,
      });
    };
    const onScroll = () => {
      behaviorRef.current.scrollCount = (behaviorRef.current.scrollCount || 0) + 1;
    };
    const onBlur = () => {
      behaviorRef.current.focusBlurs = (behaviorRef.current.focusBlurs || 0) + 1;
    };
    const onClick = () => {
      behaviorRef.current.clicks = (behaviorRef.current.clicks || 0) + 1;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('keyup', onKeyUp, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', onBlur);
    document.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('click', onClick);
    };
  }, []);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setError('');
    setImageFailed(false);
    try {
      const headers: Record<string, string> = {};
      if (fingerprintRef.current) headers['x-device-fingerprint'] = fingerprintRef.current;
      const res = await fetch(`${apiBase}/challenge`, { credentials: 'include', headers });
      const data = await res.json();
      if (data.blocked) {
        setState('blocked');
        onBlockedRef.current?.(data.rayId, data.reason || 'blocked', data.expiresAt);
        return;
      }
      if (!data.challenge) {
        setError(data.error || 'Failed to load CAPTCHA');
        setState('hidden');
        return;
      }
      setChallenge(data.challenge);
      setSelectedAnswer('');
      setRisk(data.risk ? { score: data.risk.score, level: data.risk.level } : null);
      setState('ready');
    } catch (err: any) {
      setError(err?.message || 'Failed to load CAPTCHA');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    let cancelled = false;
    let stopCapture = () => {};
    (async () => {
      const cookieFp = getCookie('__dfp');
      const fp = cookieFp || (await sha256Hex(buildFingerprintSource()));
      fingerprintRef.current = fp;
      if (!cookieFp && typeof document !== 'undefined') {
        document.cookie = `__dfp=${encodeURIComponent(fp)}; path=/; max-age=2592000; SameSite=Lax`;
      }
      stopCapture = startBehaviorCapture();

      if (!autoShow && !forceShow) {
        setState('hidden');
        setLoading(false);
        return;
      }
      if (forceShow) {
        await loadChallenge();
        return;
      }
      try {
        const statusRes = await fetch(`${apiBase}/status`, { credentials: 'include' });
        const status = await statusRes.json();
        if (cancelled) return;
        if (status.error) throw new Error(status.error);
        if (status.blocked) {
          setState('blocked');
          onBlockedRef.current?.(status.rayId || '', status.reason || 'blocked', status.expiresAt);
          return;
        }
        const forcedDifficulty = requiredDifficulty ? requiredDifficulty !== 'easy' : false;
        if (!status.captchaEnabled && !forcedDifficulty) {
          setState('hidden');
          onSuccessRef.current?.('');
          return;
        }
        if (!status.requireCaptcha && !forcedDifficulty) {
          setState('hidden');
          onSuccessRef.current?.('');
          return;
        }
        await loadChallenge();
      } catch {
        await loadChallenge();
      }
    })();
    return () => {
      cancelled = true;
      stopCapture();
    };
  }, [autoShow, forceShow, requiredDifficulty, apiBase, loadChallenge, startBehaviorCapture]);

  useEffect(() => {
    if (!challenge || state !== 'ready') return;
    setTyped('');
    let i = 0;
    const timer = window.setInterval(() => {
      i += 2;
      setTyped(challenge.question.slice(0, i));
      if (i >= challenge.question.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [challenge, state]);

  const handleVerify = async () => {
    if (!challenge || !selectedAnswer) return;
    setVerifying(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-fingerprint': fingerprintRef.current },
        credentials: 'include',
        body: JSON.stringify({
          challengeId: challenge.id,
          answer: selectedAnswer,
          token: challenge.token,
          behavior: finalizeBehavior(),
          fingerprint: fingerprintRef.current,
        }),
      });
      const data = await res.json();
      if (data.blocked) {
        setState('blocked');
        onBlockedRef.current?.(data.rayId, data.reason || 'blocked');
        return;
      }
      if (data.valid) {
        if (data.nextRequired) {
          setSelectedAnswer('');
          await loadChallenge();
          return;
        }
        setState('solved');
        onSuccessRef.current?.(data.rayId);
      } else {
        setError(data.reason || 'Incorrect answer. Please try again.');
        setSelectedAnswer('');
        if (data.reason && /expired|token|mismatch|already used/i.test(data.reason)) {
          await loadChallenge();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (state === 'checking' || (state !== 'hidden' && loading && !challenge)) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
      </div>
    );
  }

  if (state === 'hidden') return null;

  if (state === 'blocked') {
    return (
      <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/70 text-sm">
        <p className="font-medium text-[#d93025]">Access temporarily blocked</p>
        <p className="text-[13px] text-[#5f6368] mt-1">{error || 'Too many failed attempts. Please try again later.'}</p>
        <a href="/captcha/blocked" className="text-[13px] text-[#1A73E8] underline mt-2 inline-block">
          Learn more
        </a>
      </div>
    );
  }

  if (state === 'solved') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-green-200 bg-green-50/70 text-sm">
        <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="font-medium text-green-700">Verification complete</span>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-4 text-sm text-[#d93025]">
        {error || 'Failed to load CAPTCHA'}
        <button onClick={loadChallenge} className="ml-2 text-[#1A73E8] underline">
          Retry
        </button>
      </div>
    );
  }

  const difficultyStyle = DIFFICULTY_STYLES[challenge.difficulty] || DIFFICULTY_STYLES.easy;
  const difficultyLabelStyle = DIFFICULTY_LABEL[challenge.difficulty] || DIFFICULTY_LABEL.easy;
  const imageUrl = challenge.imageUrl ? `${API}${challenge.imageUrl}` : null;

  return (
    <div className={`p-4 rounded-xl border-2 ${difficultyStyle}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium uppercase tracking-wider ${difficultyLabelStyle}`}>
            {challenge.difficulty} verification
          </span>
          {risk && (
            <span className="text-[11px] text-[#5f6368]">
              risk {risk.score}/100 · {risk.level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5f6368]">attempts {challenge.attempts}/3</span>
          <button
            onClick={loadChallenge}
            disabled={verifying}
            className="text-xs text-[#1A73E8] hover:text-[#1769d2] underline disabled:opacity-50"
          >
            New challenge
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 mb-4">
        {imageUrl && !imageFailed && (
          <div className="flex justify-center mb-3">
            <img
              src={imageUrl}
              alt="Captcha challenge"
              className="rounded-lg border border-[#e8eaed] select-none"
              draggable={false}
              onError={() => setImageFailed(true)}
            />
          </div>
        )}
        <p className="text-[15px] font-medium text-center text-[#202124] min-h-[20px]">
          {typed || challenge.question}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {(challenge.options || []).map((option: string, idx: number) => (
          <button
            key={idx}
            onClick={() => setSelectedAnswer(option)}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedAnswer === option
                ? 'border-[#1A73E8] bg-[#e8f0fe]'
                : 'border-[#e8eaed] bg-white hover:border-[#1A73E8]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-[#d93025]">
          {error}
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={!selectedAnswer || verifying}
        className="w-full px-4 py-2 bg-[#1A73E8] text-white rounded-lg hover:bg-[#1769d2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {verifying ? 'Verifying...' : 'Verify'}
      </button>

      <p className="text-[11px] text-center mt-2 text-[#80868b]">
        Ray ID: {challenge.rayId.slice(0, 16)}...
      </p>
    </div>
  );
}
