import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { checkEmailExists, checkUsernameExists, requestSignupOtp } from '../../lib/api';
import { validateEmail, validateName, validateUsername, validatePassword, validateConfirmPassword, validateVerificationCode, validateTwoFactorCode, validateDob } from '../../lib/validations';
import type { FormErrors, SignupStep, LoginStep } from '../../lib/validations';

const COOLDOWN_SECONDS = 30;
const WINDOW_MS = 15 * 60 * 1000;
const SYNC_DEBOUNCE_MS = 2000;
const LIMITS_SYNC_MS = 30_000;

export interface LoginProfile {
  email: string;
  exists: boolean;
  photoUrl?: string | null;
  name?: string | null;
  hasRecoveryEmail?: boolean;
  recoveryEmail?: string | null;
}

const DEFAULT_SEND_LIMITS: Record<string, number> = {
  'login-otp': 5,
  'magic-link': 3,
  'otp': 5,
  'recovery': 5,
  'signup-otp': 5,
  'global-email': 5,
  'global-ip': 20,
};

export function useAuthForm(onShowToast: (msg: string) => void) {
  const [mode, setMode] = useState<'login' | 'signup'>(() =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/login') ? 'login' : 'signup',
  );
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [loginStep, setLoginStep] = useState<LoginStep>('email');

  const switchMode = useCallback((next: 'login' | 'signup') => {
    setMode(next);
    const url = next === 'login' ? '/login' : '/signup';
    if (typeof window !== 'undefined' && window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (path.startsWith('/login')) setMode('login');
      else setMode('signup');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ─── Signup form state ───
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [username, setUsername] = useState('');
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // ─── Profile picture ───
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Login state ───
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loginTempToken, setLoginTempToken] = useState('');
  const [loginPending2fa, setLoginPending2fa] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loginWithBackup, setLoginWithBackup] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'code' | 'magic-link' | 'recovery' | null>(null);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [recoveryStage, setRecoveryStage] = useState<'code' | 'password'>('code');
  const [loginProfile, setLoginProfile] = useState<LoginProfile | null>(null);

  // ─── Consent state ───
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Server-synced limits ───
  const [sendLimits, setSendLimits] = useState<Record<string, number>>(DEFAULT_SEND_LIMITS);
  const limitsSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLimitsSyncRef = useRef<number>(0);

  const fetchLimits = useCallback(async (forceInit = false) => {
    try {
      // skip when unauthenticated — endpoint 401s without session and spam is noisy
      if (typeof document !== 'undefined' && !document.cookie.includes('__session=')) return;
      const base = (import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');
      if (forceInit) {
        await fetch(`${base.replace(/\/$/, '')}/api/auth/limits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'init' }),
        }).catch(()=>{});
      }
      const res = await fetch(`${base.replace(/\/$/, '')}/api/auth/limits`, { credentials: 'include' });
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json();
        if (data?.limits && typeof data.limits === 'object') {
          setSendLimits(prev => ({ ...prev, ...data.limits }));
        }
      }
    } catch {}
  }, []);

  // Only sync limits periodically (not on every render)
  useEffect(() => {
    const now = Date.now();
    if (now - lastLimitsSyncRef.current < LIMITS_SYNC_MS) return;
    lastLimitsSyncRef.current = now;
    fetchLimits(true);
    limitsSyncTimerRef.current = setTimeout(() => { lastLimitsSyncRef.current = 0; }, LIMITS_SYNC_MS);
  }, [fetchLimits]);

  // (removed duplicate init — covered by periodic sync above)

  // ─── Send attempts tracking ───
  const [sendAttempts, setSendAttempts] = useState<Record<string, { count: number; windowStart: number }>>({});

  // Sync from DB — so frontend shows real remaining, not just in-memory numbers
  const syncFromDb = useCallback(async () => {
    if (!email || !email.includes('@')) return;
    try {
      const base = (import.meta.env.VITE_API_URL as string | undefined) || (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');
      const res = await fetch(`${base.replace(/\/$/, '')}/api/auth/remaining?email=${encodeURIComponent(email)}`, { credentials: 'include' });
      if (!res.ok) return;
      const data: any = await res.json();
      const rem = data.remaining || {};
      const now = Date.now();
      const next: Record<string, { count: number; windowStart: number }> = {};
      const nextResets: Record<string, number> = {};
      for (const [m, info] of Object.entries(rem as Record<string, any>)) {
        const max = info.max ?? sendLimits[m] ?? DEFAULT_SEND_LIMITS[m] ?? 3;
        const remaining = info.remaining ?? max;
        const used = Math.max(0, max - remaining);
        next[m] = { count: used, windowStart: now };
        if (info.resetAt && remaining <= 0) nextResets[m] = info.resetAt;
      }
      if (Object.keys(next).length) setSendAttempts(prev => ({ ...prev, ...next }));
      if (Object.keys(nextResets).length) setWindowResetsAt(prev => ({ ...prev, ...nextResets }));
    } catch {}
  }, [email, sendLimits]);

  const debouncedSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (debouncedSyncRef.current) clearTimeout(debouncedSyncRef.current);
    debouncedSyncRef.current = setTimeout(() => { syncFromDb(); }, SYNC_DEBOUNCE_MS);
    return () => { if (debouncedSyncRef.current) clearTimeout(debouncedSyncRef.current); };
  }, [syncFromDb, mode, email, loginStep]);
  // Periodic sync every 30s for cross-tab consistency
  useEffect(() => {
    periodicSyncRef.current = setInterval(syncFromDb, 30000);
    return () => { if (periodicSyncRef.current) clearInterval(periodicSyncRef.current); };
  }, [syncFromDb]);

  const getSendCount = (method: string) => {
    const entry = sendAttempts[method];
    if (!entry || Date.now() - entry.windowStart >= WINDOW_MS) return 0;
    return entry.count;
  };
  const getMaxSends = (method: string) => sendLimits[method] ?? DEFAULT_SEND_LIMITS[method] ?? 3;
  const canSend = (method: string) => getSendCount(method) < getMaxSends(method);
  const incrementSend = (method: string) => {
    setSendAttempts(prev => {
      const now = Date.now();
      const entry = prev[method];
      const windowStart = !entry || now - entry.windowStart >= WINDOW_MS ? now : entry.windowStart;
      const next = { ...prev, [method]: { count: ((entry && now - entry.windowStart < WINDOW_MS) ? entry.count : 0) + 1, windowStart } };
      return next;
    });
  };
  const remainingSends = (method: string) => {
    const max = getMaxSends(method);
    const used = getSendCount(method);
    return Math.max(0, max - used);
  };

  /** Immediate /api/auth/remaining sync — used by the more-options screen so
   *  badges show fresh per-method counts on open (not the debounced sync). */
  const refreshRemaining = useCallback(async () => {
    await syncFromDb();
  }, [syncFromDb]);

  // ─── Server-reported window resets (epoch ms per method) ───
  // Populated from 429 payloads (resetsAt / remaining[x].resetAt) and the
  // /api/auth/remaining sync. When set and in the future, the UI shows
  // "Limit reached — resets at HH:MM" straight from server data instead of a
  // locally guessed 30s cooldown.
  const [windowResetsAt, setWindowResetsAt] = useState<Record<string, number>>({});
  const setResetAt = useCallback((method: string, resetsAt?: number) => {
    if (!resetsAt || resetsAt <= Date.now()) return;
    setWindowResetsAt(prev => (prev[method] === resetsAt ? prev : { ...prev, [method]: resetsAt }));
  }, []);
  const getResetAt = useCallback(
    (method: string) => {
      const at = windowResetsAt[method];
      return at && at > Date.now() ? at : 0;
    },
    [windowResetsAt],
  );

  // ─── Per-method cooldown timers ───
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const cooldownRef = useRef<Record<string, number>>({});

  const isInCooldown = (key: string) => (cooldowns[key] || 0) > 0 || (cooldownRef.current[key] || 0) > Date.now();
  const getCooldownRemaining = (key: string) => {
    if ((cooldownRef.current[key] || 0) > Date.now()) return Math.ceil((cooldownRef.current[key] - Date.now()) / 1000);
    return cooldowns[key] || 0;
  };
  const startCooldown = useCallback((key: string) => {
    cooldownRef.current[key] = Date.now() + COOLDOWN_SECONDS * 1000;
    setCooldowns(prev => ({ ...prev, [key]: COOLDOWN_SECONDS }));
  }, []);

  // Cooldown ticker — single interval (clears ref when expired)
  useEffect(() => {
    const active = Object.entries(cooldowns).filter(([, v]) => v > 0);
    if (active.length === 0) return;
    const timer = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [k, v] of Object.entries(next)) {
          if (v > 0) {
            const nv = Math.max(0, v - 1);
            next[k] = nv;
            if (nv === 0) delete cooldownRef.current[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [Object.keys(cooldowns).filter(k => cooldowns[k] > 0).join(',')]);

  // ─── Validation state ───
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ─── Username availability state ───
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Signup email availability state ───
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const signupAvailabilityRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
    };
  }, []);

  // ─── SEND OTP WHEN ENTERING STEP 3 (with rate limit guard) ───
  const otpAutoSentRef = useRef<string>('');
  useEffect(() => {
    if (mode !== 'signup' || signupStep !== 3 || !email || email === otpAutoSentRef.current) return;
    if (!canSend('signup-otp') || isInCooldown('signup-otp')) return;
    otpAutoSentRef.current = email;

    let cancelled = false;
    const sendOtpForVerification = async () => {
      if (!canSend('signup-otp')) return;
      incrementSend('signup-otp');
      startCooldown('signup-otp');
      try {
        const result = await requestSignupOtp(email);
        if (cancelled) return;
        if (!result.ok) {
          if (result.status === 429) {
            const retryAfter = (result as any)?.data?.retryAfterMs ? Math.ceil((result as any).data.retryAfterMs / 1000) : COOLDOWN_SECONDS;
            setCooldowns(prev => ({ ...prev, 'signup-otp': retryAfter }));
            onShowToast(result.error || 'Please wait before requesting another code');
          } else {
            onShowToast(result.status === 409 ? 'An account with this email already exists' : 'Error sending verification code');
          }
        } else {
          onShowToast('Verification code sent to ' + email);
        }
      } catch {}
    };
    void sendOtpForVerification();
    return () => { cancelled = true; };
  }, [signupStep, mode, email]);

  // ─── PRE-FETCH LOGIN PROFILE ───
  useEffect(() => {
    if (mode !== 'login' || loginStep !== 'email' || !email || !email.includes('@')) return;
    if (loginProfile?.email === email) return;

    const timer = setTimeout(() => {
      checkEmailExists(email)
        .then((res) => {
          if (res.ok && res.data?.exists) {
            setLoginProfile({ email, exists: true, photoUrl: res.data.photoUrl, name: res.data.name, hasRecoveryEmail: !!res.data.hasRecoveryEmail, recoveryEmail: res.data.recoveryEmail });
          } else {
            setLoginProfile({ email, exists: false });
          }
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [mode, loginStep, email]);

  // ─── Generate username suggestions ───
  const generateSuggestions = useCallback(async (base: string): Promise<string[]> => {
    const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
    const randNum = () => String(Math.floor(10 + Math.random() * 90));
    const randLetters = (n = 2) => Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
    const words = ['nova','prime','vibe','flux','spark','orbit','apex','wave','forge','nest','drift','bloom','crest','verse','craft','grid','pulse','mint'];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    const a = pick(), b = pick(), c = pick(), d = pick();
    const pool = [
      `${clean}_${a}`,
      `${a}_${clean}`,
      `${clean}${b}`,
      `${b}${clean}`,
      `${clean}_${c}${randNum()}`,
      `${clean}__${randLetters(3)}`,
      `${clean}x${d}`,
      `${a}${clean}${randNum().slice(0,1)}`,
      `${clean}_${randLetters(3)}${randNum().slice(0,1)}`,
      `the_${clean}_${a}`,
      `${clean}__${a}`,
      `${a}__${clean}`,
    ].filter((v, i, arr) => arr.indexOf(v) === i && v.length >= 3 && v.length <= 30 && /^[a-z0-9_]+$/.test(v));

    // shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const suggestions: string[] = [];
    // batched parallel checks (3 at a time) to cut 4.7s sequential -> ~1.2s
    for (let i = 0; i < pool.length && suggestions.length < 4; i += 3) {
      const batch = pool.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(async (c) => {
          try {
            const r = await checkUsernameExists(c);
            return { c, r };
          } catch {
            return { c, r: { ok: false } as any };
          }
        }),
      );
      for (const { c, r } of results) {
        if (suggestions.length >= 4) break;
        if (r.ok && r.data?.valid && !r.data?.exists && !r.data?.reserved) suggestions.push(c);
      }
    }
    // fallback: more distinct variants if still <4 (also batched)
    const extras = ['nova','pulse','grid','mint','flux'];
    let n = 0;
    while (suggestions.length < 4 && n < 20) {
      const w = extras[n % extras.length];
      const cand = n % 2 === 0 ? `${clean}_${w}${randNum().slice(0,1)}` : `${w}_${clean}${randLetters(1)}`;
      if (!pool.includes(cand) && !suggestions.includes(cand) && cand.length >= 3 && cand.length <= 30) {
        const res = await checkUsernameExists(cand);
        if (res.ok && res.data?.valid && !res.data?.exists && !res.data?.reserved) suggestions.push(cand);
      }
      n++;
    }
    return suggestions.slice(0, 4);
  }, []);

  // ─── SIGNUP: check email and username together ───
  const checkSignupAvailability = useCallback(async (
    nextEmail = email,
    nextUsername = username,
  ): Promise<{
    emailAvailable: boolean;
    usernameAvailable: boolean;
    emailError?: string;
    usernameError?: string;
  }> => {
    const requestId = ++signupAvailabilityRequestRef.current;
    const emailError = validateEmail(nextEmail);
    const usernameError = validateUsername(nextUsername);

    if (emailError || usernameError) {
      setEmailCheckStatus('idle');
      setUsernameStatus(usernameError ? 'error' : 'idle');
      setUsernameMessage(usernameError || '');
      return { emailAvailable: false, usernameAvailable: false, emailError, usernameError };
    }

    setEmailCheckStatus('checking');
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    try {
      const [emailResult, usernameResult] = await Promise.all([
        checkEmailExists(nextEmail),
        checkUsernameExists(nextUsername),
      ]);

      if (requestId !== signupAvailabilityRequestRef.current) {
        return { emailAvailable: false, usernameAvailable: false };
      }

      const emailTaken = Boolean(emailResult.data?.exists);
      const usernameTaken = Boolean(usernameResult.data?.exists || usernameResult.data?.reserved);
      const emailAvailable = emailResult.ok && !emailTaken;
      const usernameAvailable = usernameResult.ok && Boolean(usernameResult.data?.valid) && !usernameTaken;

      setEmailCheckStatus(emailResult.ok ? (emailTaken ? 'taken' : 'available') : 'error');
      if (usernameResult.ok && usernameResult.data?.reserved) {
        setUsernameStatus('taken');
        setUsernameMessage('This username is reserved');
        setUsernameSuggestions(await generateSuggestions(nextUsername));
      } else if (usernameResult.ok && usernameResult.data?.exists) {
        setUsernameStatus('taken');
        setUsernameMessage('This username is already taken');
        setUsernameSuggestions(await generateSuggestions(nextUsername));
      } else if (usernameAvailable) {
        setUsernameStatus('available');
        setUsernameMessage(`${nextUsername} is available`);
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('error');
        setUsernameMessage('Unable to check username availability');
        setUsernameSuggestions([]);
      }

      return {
        emailAvailable,
        usernameAvailable,
        emailError: emailAvailable ? undefined : (emailTaken ? 'An account with this email already exists' : 'Unable to check email availability'),
        usernameError: usernameAvailable ? undefined : (usernameResult.data?.reserved ? 'This username is reserved' : usernameTaken ? 'This username is already taken' : 'Unable to check username availability'),
      };
    } catch {
      if (requestId !== signupAvailabilityRequestRef.current) {
        return { emailAvailable: false, usernameAvailable: false };
      }
      setEmailCheckStatus('error');
      setUsernameStatus('error');
      setUsernameMessage('Unable to check availability');
      setUsernameSuggestions([]);
      return {
        emailAvailable: false, usernameAvailable: false,
        emailError: 'Unable to check email availability',
        usernameError: 'Unable to check username availability',
      };
    }
  }, [email, username, generateSuggestions]);

  useEffect(() => {
    if (mode !== 'signup' || signupStep !== 1 || !email || !username || validateEmail(email) || validateUsername(username)) {
      setEmailCheckStatus('idle');
      if (!username || validateUsername(username)) {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
      return;
    }
    const timer = setTimeout(() => { void checkSignupAvailability(email, username); }, 700);
    return () => clearTimeout(timer);
  }, [mode, signupStep, email, username, checkSignupAvailability]);

  // ─── Check username ───
  const checkUsername = useCallback(async (value: string) => {
    if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
    if (!value || value.length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }
    const localError = validateUsername(value);
    if (localError) {
      setUsernameStatus('error');
      setUsernameMessage(localError);
      return;
    }
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');
    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameExists(value);
        if (!result.ok) {
          setUsernameStatus('error');
          setUsernameMessage('Unable to check availability');
          setUsernameSuggestions([]);
          return;
        }
        if (result.data?.reserved) {
          setUsernameStatus('taken');
          setUsernameMessage('This username is reserved');
          setUsernameSuggestions(await generateSuggestions(value));
          return;
        }
        if (result.data?.exists) {
          setUsernameStatus('taken');
          setUsernameMessage('This username is already taken');
          setUsernameSuggestions(await generateSuggestions(value));
          return;
        }
        setUsernameStatus('available');
        setUsernameMessage(`${value} is available`);
        setUsernameSuggestions([]);
      } catch {
        setUsernameStatus('error');
        setUsernameMessage('Unable to check availability');
        setUsernameSuggestions([]);
      }
    }, 600);
  }, [generateSuggestions]);

  // ─── REAL-TIME VALIDATION ───
  const validateField = useCallback((field: string, value: string) => {
    let error: string | undefined;
    switch (field) {
      case 'firstName':
        error = value.trim() ? validateName(value, 'First name') : 'First name is required';
        break;
      case 'lastName':
        error = validateName(value, 'Last name');
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'username':
        error = validateUsername(value);
        break;
      case 'password': {
        const { error: pwError } = validatePassword(value);
        error = pwError;
        break;
      }
      case 'confirmPassword':
        error = validateConfirmPassword(password, value);
        break;
      case 'verificationCode':
        error = validateVerificationCode(value);
        break;
      case 'twoFactorCode':
        error = validateTwoFactorCode(value);
        break;
      case 'loginOtpCode':
        error = validateVerificationCode(value);
        break;
      case 'recoveryCode':
        error = validateVerificationCode(value);
        break;
      case 'dob':
        error = validateDob(value);
        break;
      case 'gender':
        error = value ? undefined : 'Gender is required';
        break;
      case 'occupation':
      case 'company':
      case 'role':
        if (value.length > 200) error = `${field.charAt(0).toUpperCase() + field.slice(1)} must be 200 characters or less`;
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  }, [password]);

  const handleBlur = (field: string) => {
    try {
      setTouched(prev => ({ ...prev, [field]: true }));
      const value = getFieldValue(field);
      if (!value) return;
      validateField(field, value);
      if (mode === 'signup' && signupStep === 1 && (field === 'email' || field === 'username')) {
        const nextEmail = field === 'email' ? value : email;
        const nextUsername = field === 'username' ? value : username;
        if (!validateEmail(nextEmail) && !validateUsername(nextUsername)) {
          void checkSignupAvailability(nextEmail, nextUsername);
        }
      }
    } catch {}
  };

  const getFieldValue = (field: string): string => {
    switch (field) {
      case 'firstName': return firstName;
      case 'lastName': return lastName;
      case 'email': return email;
      case 'username': return username;
      case 'password': return password;
      case 'confirmPassword': return confirmPassword;
      case 'verificationCode': return verificationCode;
      case 'twoFactorCode': return twoFactorCode;
      case 'loginOtpCode': return loginOtpCode;
      case 'recoveryCode': return recoveryCode;
      case 'dob': return dob;
      case 'gender': return gender;
      case 'occupation': return occupation;
      case 'company': return company;
      case 'role': return role;
      default: return '';
    }
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (step === 1) {
      const firstNameError = firstName.trim() ? validateName(firstName, 'First name') : 'First name is required';
      const lastNameError = lastName.trim() ? validateName(lastName, 'Last name') : 'Last name is required';
      const emailError = validateEmail(email);
      const usernameError = validateUsername(username);
      if (firstNameError) { newErrors.firstName = firstNameError; isValid = false; }
      if (lastNameError) { newErrors.lastName = lastNameError; isValid = false; }
      if (emailError) { newErrors.email = emailError; isValid = false; }
      if (usernameError) { newErrors.username = usernameError; isValid = false; }
      if (isValid) {
        const availability = await checkSignupAvailability(email, username);
        if (!availability.emailAvailable) {
          newErrors.email = availability.emailError || 'An account with this email already exists';
          isValid = false;
        }
        if (!availability.usernameAvailable) {
          newErrors.username = availability.usernameError || 'This username is already taken';
          isValid = false;
        }
      }
    } else if (step === 2) {
      const genderError = gender ? undefined : 'Gender is required';
      const dobError = validateDob(dob);
      if (genderError) { newErrors.gender = genderError; isValid = false; }
      if (dobError) { newErrors.dob = dobError; isValid = false; }
    } else if (step === 3) {
      const codeError = validateVerificationCode(verificationCode);
      if (codeError) { newErrors.verificationCode = codeError; isValid = false; }
    } else if (step === 4) {
      const { error: pwError } = validatePassword(password);
      const confirmError = validateConfirmPassword(password, confirmPassword);
      if (pwError) { newErrors.password = pwError; isValid = false; }
      if (confirmError) { newErrors.confirmPassword = confirmError; isValid = false; }
      if (!consentTerms) { newErrors.consentTerms = 'You must accept the Terms of Service'; isValid = false; }
      if (!consentPrivacy) { newErrors.consentPrivacy = 'You must acknowledge the Privacy Policy'; isValid = false; }
    }

    setErrors(newErrors);
    setTouched(Object.keys(newErrors).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return isValid;
  };

  // ─── Reset helpers ───
  const resetToHome = useCallback(() => {
    setSignupStep(1);
    setLoginStep('email');
    setLoginProfile(null);
    setErrors({});
    setTouched({});
    otpAutoSentRef.current = '';
  }, []);

  const clearValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const resetLoginPassword = useCallback(() => {
    setPassword('');
    setLoginProfile(null);
    setErrors({});
    setTouched({});
  }, []);

  const resetRecovery = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setRecoveryStage('code');
    setErrors({});
    setTouched({});
  }, []);

  // ─── Shared send helper with rate limit enforcement ───
  const sendWithRateLimit = useCallback(async (
    method: string,
    sendFn: () => Promise<any>,
    opts?: { cooldownKey?: string; requireGlobal?: boolean }
  ): Promise<{ ok: boolean; status?: number; data?: any; error?: string; retryAfterMs?: number; block?: any }> => {
    const key = opts?.cooldownKey || method;
    if (opts?.requireGlobal && (!canSend('global-email') || !canSend('global-ip'))) {
      return { ok: false, status: 429, error: 'Too many verification attempts. Please try again later.' };
    }
    if (!canSend(method)) {
      return { ok: false, status: 429, error: 'Maximum sends reached. Please try again later.' };
    }
    if (isInCooldown(key)) {
      return { ok: false, status: 429, error: `Please wait ${getCooldownRemaining(key)}s before sending again.` };
    }

    incrementSend(method);
    startCooldown(key);

    try {
      const result = await sendFn();
      if (!result.ok && result.status === 429) {
        const retryAfterMs = (result as any)?.data?.retryAfterMs ?? (result as any)?.retryAfterMs;
        const retrySec = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : COOLDOWN_SECONDS;
        setCooldowns(prev => ({ ...prev, [key]: retrySec }));
        cooldownRef.current[key] = Date.now() + retrySec * 1000;
        // Server-reported reset (resetsAt or remaining[key].resetAt) wins over
        // the locally guessed retryAfter — the UI can show real HH:MM copy.
        const payload = (result as any)?.data || {};
        const exceeded = payload.exceeded as string | undefined;
        const resetsAt =
          (exceeded && payload.remaining?.[exceeded]?.resetAt) ||
          payload.remaining?.[method]?.resetAt ||
          (result as any)?.resetsAt ||
          (retryAfterMs ? Date.now() + retryAfterMs : undefined);
        if (resetsAt) setResetAt(method, resetsAt);
        // mark window as exhausted so next click is blocked locally without 5s server hit
        const max = getMaxSends(method);
        setSendAttempts(prev => ({ ...prev, [method]: { count: max, windowStart: Date.now() } }));
      }
      return result;
    } catch {
      return { ok: false, status: 500, error: 'Network error' };
    }
  }, [canSend, isInCooldown, getCooldownRemaining, incrementSend, startCooldown, setResetAt, getMaxSends]);

  return {
    // Mode
    mode, setMode, switchMode,
    signupStep, setSignupStep,
    loginStep, setLoginStep,
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    gender, setGender,
    dob, setDob,
    username, setUsername,
    occupation, setOccupation,
    company, setCompany,
    role, setRole,
    verificationCode, setVerificationCode,
    // Profile picture
    profilePic, setProfilePic,
    showImageEditor, setShowImageEditor,
    tempImageUrl, setTempImageUrl,
    fileInputRef,
    // Login state
    twoFactorCode, setTwoFactorCode,
    loginTempToken, setLoginTempToken,
    loginPending2fa, setLoginPending2fa,
    loginOtpCode, setLoginOtpCode,
    backupCode, setBackupCode,
    loginWithBackup, setLoginWithBackup,
    recoveryMethod, setRecoveryMethod,
    recoveryCode, setRecoveryCode,
    resetToken, setResetToken,
    recoveryStage, setRecoveryStage,
    loginProfile, setLoginProfile,
    // Consent
    consentTerms, setConsentTerms,
    consentPrivacy, setConsentPrivacy,
    // Submit
    isSubmitting, setIsSubmitting,
    // Rate limiting / cooldowns
    cooldowns, setCooldowns,
    isInCooldown,
    getCooldownRemaining,
    startCooldown,
    canSend,
    incrementSend,
    remainingSends,
    getMaxSends,
    refreshRemaining,
    sendLimits,
    // Server-reported window resets (epoch ms per method)
    getResetAt,
    setResetAt,
    // Validation
    errors, setErrors,
    touched, setTouched,
    validateField,
    handleBlur,
    getFieldValue,
    validateStep,
    // Username
    usernameStatus, setUsernameStatus,
    usernameMessage, setUsernameMessage,
    usernameSuggestions, setUsernameSuggestions,
    checkUsername,
    // Email
    emailCheckStatus, setEmailCheckStatus,
    // Shared send helper
    sendWithRateLimit,
    // Reset
    resetToHome,
    clearValidation,
    resetLoginPassword,
    resetRecovery,
  };
}
