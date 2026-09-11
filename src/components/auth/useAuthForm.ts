import { useState, useEffect, useCallback, useRef } from 'react';
import { checkEmailExists, checkUsernameExists, requestSignupOtp } from '../../lib/api';
import { validateEmail, validateName, validateUsername, validatePassword, validateConfirmPassword, validateVerificationCode, validateTwoFactorCode, validateDob } from '../../lib/validations';
import type { FormErrors, SignupStep, LoginStep } from '../../lib/validations';

// ═══ SHARED AUTH FORM STATE HOOK ═══
// Manages all state shared across signup + login forms. Individual form
// components read/write via this hook instead of prop-drilling.

export interface LoginProfile {
  email: string;
  exists: boolean;
  photoUrl?: string | null;
  name?: string | null;
  hasRecoveryEmail?: boolean;
  recoveryEmail?: string | null;
}

export function useAuthForm(onShowToast: (msg: string) => void) {
  // ─── Mode ───
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

  // ─── Per-method send limits (1 attempt each, persisted to localStorage, 15-min window) ───
  const SEND_LIMITS: Record<string, number> = {
    'login-otp': 1,
    'magic-link': 1,
    'otp': 1,
    'recovery': 1,
    'signup-otp': 3,
  };
  const WINDOW_MS = 15 * 60 * 1000;
  const STORAGE_KEY = 'tirbeo_auth_send_counts';

  const loadSendAttempts = (): Record<string, { count: number; windowStart: number }> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const now = Date.now();
      const cleaned: Record<string, { count: number; windowStart: number }> = {};
      for (const [k, v] of Object.entries(data)) {
        const entry = v as any;
        if (
          entry &&
          typeof entry.count === 'number' &&
          Number.isFinite(entry.count) &&
          typeof entry.windowStart === 'number' &&
          Number.isFinite(entry.windowStart) &&
          now - entry.windowStart < WINDOW_MS
        ) {
          cleaned[k] = { count: entry.count, windowStart: entry.windowStart };
        }
      }
      return cleaned;
    } catch { return {}; }
  };

  const [sendAttempts, setSendAttempts] = useState<Record<string, { count: number; windowStart: number }>>(loadSendAttempts);

  const getSendCount = (method: string) => {
    const entry = sendAttempts[method];
    if (!entry || Date.now() - entry.windowStart >= WINDOW_MS) return 0;
    return entry.count;
  };
  const getMaxSends = (method: string) => SEND_LIMITS[method] || 5;
  const canSend = (method: string) => getSendCount(method) < getMaxSends(method);
  const incrementSend = (method: string) => {
    setSendAttempts(prev => {
      const now = Date.now();
      const entry = prev[method];
      const windowStart = !entry || now - entry.windowStart >= WINDOW_MS ? now : entry.windowStart;
      const next = { ...prev, [method]: { count: ((entry && now - entry.windowStart < WINDOW_MS) ? entry.count : 0) + 1, windowStart } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const remainingSends = (method: string) => {
    const max = getMaxSends(method);
    const used = getSendCount(method);
    if (!Number.isFinite(max) || !Number.isFinite(used)) return 0;
    return Math.max(0, max - used);
  };

  // ─── Per-method cooldown timers (30s between sends) ───
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const COOLDOWN_SECONDS = 30;
  const isInCooldown = (key: string) => (cooldowns[key] || 0) > 0;
  const getCooldownRemaining = (key: string) => cooldowns[key] || 0;
  const startCooldown = (key: string) => {
    setCooldowns(prev => ({ ...prev, [key]: COOLDOWN_SECONDS }));
  };

  useEffect(() => {
    const active = Object.entries(cooldowns).filter(([, v]) => v > 0);
    if (active.length === 0) return;
    const timer = setInterval(() => {
      setCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [k, v] of Object.entries(next)) {
          if (v > 0) { next[k] = v - 1; changed = true; }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [Object.keys(cooldowns).length]);

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

  // Cleanup username check timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
    };
  }, []);

  // ─── SEND OTP WHEN ENTERING STEP 3 ───
  useEffect(() => {
    const sendOtpForVerification = async () => {
      if (mode === 'signup' && signupStep === 3 && email) {
        const result = await requestSignupOtp(email);
        if (!result.ok) {
          if (result.status === 429) {
            incrementSend('signup-otp');
          }
          onShowToast(result.status === 409 ? 'An account with this email already exists' : 'Error sending verification code');
        } else {
          incrementSend('signup-otp');
          onShowToast('Verification code sent to ' + email);
          startCooldown('signup-otp');
        }
      }
    };
    sendOtpForVerification();
  }, [signupStep, mode, email]);

  // ─── PRE-FETCH LOGIN PROFILE ───
  useEffect(() => {
    if (mode !== 'login' || loginStep !== 'email' || !email || !email.includes('@')) return;
    if (loginProfile?.email === email) return;

    const timer = setTimeout(() => {
      checkEmailExists(email)
        .then((res) => {
          if (res.ok && res.data?.exists) {
            setLoginProfile({
              email,
              exists: true,
              photoUrl: res.data.photoUrl,
              name: res.data.name,
              hasRecoveryEmail: !!res.data.hasRecoveryEmail,
              recoveryEmail: res.data.recoveryEmail,
            });
          } else {
            setLoginProfile({ email, exists: false });
          }
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [mode, loginStep, email]);

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
      setEmailCheckStatus(emailError ? 'idle' : 'idle');
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
        emailAvailable: false,
        usernameAvailable: false,
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

    const timer = setTimeout(() => {
      void checkSignupAvailability(email, username);
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, signupStep, email, username, checkSignupAvailability]);
  const generateSuggestions = useCallback(async (base: string): Promise<string[]> => {
    const suggestions: string[] = [];
    for (let i = 1; i <= 5 && suggestions.length < 3; i++) {
      const candidate = `${base}${i}`;
      const res = await checkUsernameExists(candidate);
      if (res.ok && res.data?.valid && !res.data?.exists && !res.data?.reserved) {
        suggestions.push(candidate);
      }
    }
    return suggestions;
  }, []);

  // ─── Generate username suggestions ───
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
    }, 300);
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
      // Trigger immediate server checks on blur (skip debounce)
      if (mode === 'signup' && signupStep === 1) {
        if (field === 'email' && value && !validateEmail(value)) {
          lastCheckedEmailRef.current = '';
          setEmailCheckStatus('checking');
          checkEmailExists(value)
            .then((res) => {
              setEmailCheckStatus(res.ok && res.data?.exists ? 'taken' : 'available');
            })
            .catch(() => setEmailCheckStatus('idle'));
        }
        if (field === 'username' && value && value.length >= 3 && !validateUsername(value)) {
          if (usernameCheckTimeoutRef.current) clearTimeout(usernameCheckTimeoutRef.current);
          checkUsername(value);
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
        const [emailRes, usernameRes] = await Promise.all([
          checkEmailExists(email),
          checkUsernameExists(username),
        ]);

        if (emailRes.ok && emailRes.data?.exists) {
          newErrors.email = 'An account with this email already exists';
          isValid = false;
        }

        if (usernameRes.ok && (usernameRes.data?.exists || usernameRes.data?.reserved)) {
          newErrors.username = usernameRes.data?.reserved ? 'This username is reserved' : 'This username is already taken';
          isValid = false;
          setUsernameStatus('taken');
          setUsernameMessage(newErrors.username);
          setUsernameSuggestions(await generateSuggestions(username));
        } else if (usernameRes.ok && usernameRes.data?.valid && !usernameRes.data?.exists) {
          setUsernameStatus('available');
          setUsernameMessage(`${username} is available`);
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

  return {
    // Mode
    mode, setMode, switchMode,
    signupStep, setSignupStep,
    loginStep, setLoginStep,
    // Signup fields
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
    // Cooldown / send limits
    cooldowns, setCooldowns, isInCooldown, getCooldownRemaining, startCooldown,
    canSend, incrementSend, remainingSends,
    // Validation
    errors, setErrors,
    touched, setTouched,
    validateField, handleBlur, getFieldValue, validateStep,
    // Username
    usernameStatus, setUsernameStatus,
    usernameMessage, setUsernameMessage,
    usernameSuggestions, setUsernameSuggestions,
    checkUsername,
    // Email
    emailCheckStatus, setEmailCheckStatus,
    // Reset
    resetToHome, clearValidation, resetLoginPassword, resetRecovery,
  };
}
