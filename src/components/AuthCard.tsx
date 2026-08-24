import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Loader2, 
  Mail, Lock, Camera, Shield, CheckCircle2,
  Key, Smartphone, Link2, AlertTriangle,
  Eye, EyeOff, RefreshCw, AlertCircle
} from 'lucide-react';
import { SocialAuthButtons } from './SocialAuthButtons';
import { ImageCropEditor } from './ImageCropEditor';
import { uploadAvatar } from '../lib/supabase';
import { login, verify2FA, recovery2FA, requestLoginOtp, verifyLoginOtp, checkEmailExists, checkUsernameExists, requestSignupOtp, verifySignupOtp, signup, updateProfile, requestPasswordReset, requestMagicLink, verifyPasswordReset, confirmPasswordReset } from '../lib/api';

interface AuthCardProps {
  onSuccessAuth: (email: string, provider: string) => void;
  onOpenLegalModal: (type: 'terms' | 'privacy') => void;
  onShowToast: (msg: string) => void;
}

type SignupStep = 1 | 2 | 3 | 4;
type LoginStep = 'email' | 'password' | 'otp' | '2fa' | 'recovery';

// ═══ VALIDATION TYPES ═══
interface FormErrors {
  [key: string]: string | undefined;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  verificationCode?: string;
  twoFactorCode?: string;
  loginOtpCode?: string;
  recoveryCode?: string;
  dob?: string;
  gender?: string;
  occupation?: string;
  company?: string;
  role?: string;
  consentTerms?: string;
  consentPrivacy?: string;
}

// ═══ VALIDATION UTILITIES ═══
const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  if (email.length > 254) return 'Email is too long';
  return undefined;
};

const validatePassword = (password: string): { error?: string; strength: number } => {
  if (!password) return { error: 'Password is required', strength: 0 };
  if (password.length < 8) return { error: 'Password must be at least 8 characters', strength: 1 };
  if (password.length > 128) return { error: 'Password is too long (max 128 characters)', strength: 1 };
  
  let strength = 1;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  
  if (strength < 3) {
    return { error: 'Password is too weak. Add uppercase, numbers, or symbols', strength };
  }
  return { strength: Math.min(strength, 4) };
};

const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return undefined;
};

const validateUsername = (username: string): string | undefined => {
  if (!username.trim()) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Only letters, numbers, hyphens, and underscores allowed';
  if (/^[-_]/.test(username)) return 'Username cannot start with a hyphen or underscore';
  return undefined;
};

const validateName = (name: string, field: string): string | undefined => {
  if (name && name.length > 100) return `${field} must be 100 characters or less`;
  if (name && /\d/.test(name)) return `${field} cannot contain numbers`;
  return undefined;
};

const validateVerificationCode = (code: string): string | undefined => {
  if (!code) return 'Verification code is required';
  if (code.length !== 6) return 'Code must be 6 digits';
  if (!/^\d{6}$/.test(code)) return 'Code must contain only numbers';
  return undefined;
};

const validateTwoFactorCode = (code: string): string | undefined => {
  if (!code) return '2FA code is required';
  if (code.length !== 6) return 'Code must be 6 digits';
  if (!/^\d{6}$/.test(code)) return 'Code must contain only numbers';
  return undefined;
};

const validateDob = (dob: string): string | undefined => {
  if (!dob) return 'Date of birth is required';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 13) return 'You must be at least 13 years old';
  if (age > 150) return 'Please enter a valid date of birth';
  return undefined;
};

// ═══ ERROR MESSAGE COMPONENT (module scope — stable identity keeps inputs mounted) ═══
const ErrorMessage: React.FC<{ error?: string; field: string; touched: Record<string, boolean> }> = ({ error, field, touched }) => {
  if (!error || !touched[field]) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-[#EF4444] mt-1.5 flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3" />
      {error}
    </motion.p>
  );
};

// ═══ INPUT WRAPPER COMPONENT (module scope) ═══
const InputWrapper: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  field: string;
  touched: Record<string, boolean>;
}> = ({ label, required, children, error, field, touched }) => (
  <div>
    <label className="wave-label">
      {label} {required && <span className="text-[#F5F5F5]">*</span>}
    </label>
    {children}
    <ErrorMessage error={error} field={field} touched={touched} />
  </div>
);

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccessAuth,
  onOpenLegalModal,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(() =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/login') ? 'login' : 'signup',
  );
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [loginStep, setLoginStep] = useState<LoginStep>('email');

  // ─── URL routing: /signup and /login map to the auth sections ───
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  const [loginProfile, setLoginProfile] = useState<{ email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null>(null);

  // ─── Consent state ───
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ─── Validation state ───
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ─── Username availability state ───
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameCheckTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Signup email availability state (blocks progress when registered) ───
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // ─── Resend cooldown timer ───
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Cleanup username check timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, []);

  // ─── SEND OTP WHEN ENTERING STEP 3 (mandatory, part of the path) ───
  useEffect(() => {
    const sendOtpForVerification = async () => {
      if (mode === 'signup' && signupStep === 3 && email) {
        const result = await requestSignupOtp(email);
        if (!result.ok) {
          console.error('Error sending OTP:', result.error);
          onShowToast(result.status === 409 ? 'An account with this email already exists' : 'Error sending verification code');
        } else {
          onShowToast('Verification code sent to ' + email);
          setResendCooldown(60);
        }
      }
    };

    sendOtpForVerification();
  }, [signupStep, mode, email]);

  // ─── PRE-FETCH LOGIN PROFILE (photo/name) WHILE TYPING EMAIL, SO IT'S READY INSTANTLY ───
  useEffect(() => {
    if (mode !== 'login' || loginStep !== 'email' || !email || !email.includes('@')) {
      return;
    }
    if (loginProfile?.email !== email) setLoginProfile(null);

    const timer = setTimeout(() => {
      checkEmailExists(email)
        .then((res) => {
          if (res.ok && res.data) {
            setLoginProfile({
              email,
              exists: !!res.data.exists,
              photoUrl: res.data.photoUrl,
              name: res.data.name,
              hasRecoveryEmail: !!res.data.hasRecoveryEmail,
              recoveryEmail: res.data.recoveryEmail,
            });
          }
        })
        .catch(() => {});
    }, 250);

    return () => clearTimeout(timer);
  }, [mode, loginStep, email]);

  // ─── SIGNUP: real-time "email already registered" check ───
  // Runs while typing on signup step 1; a registered email flips the status to
  // 'taken', which blocks Continue and offers a one-click switch to sign-in.
  useEffect(() => {
    if (mode !== 'signup' || signupStep !== 1 || !email || validateEmail(email)) {
      setEmailCheckStatus('idle');
      return;
    }
    setEmailCheckStatus('checking');
    const timer = setTimeout(() => {
      checkEmailExists(email)
        .then((res) => {
          setEmailCheckStatus(res.ok && res.data?.exists ? 'taken' : 'available');
        })
        .catch(() => setEmailCheckStatus('idle'));
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, signupStep, email]);

  // ─── Generate username suggestions using the API availability check ───
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

  // ─── DEBOUNCED USERNAME CHECK (API-backed) ───
  const checkUsername = useCallback(async (value: string) => {
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }

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
    }, 500);
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
      case 'password':
        const { error: pwError } = validatePassword(value);
        error = pwError;
        break;
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

  // Handle field blur (mark as touched).
  // Defer "required" errors until submit: blurring an empty field injects an
  // error message that shifts the layout mid-click and swallows button clicks.
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = getFieldValue(field);
    if (!value) return;
    validateField(field, value);
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

  // Validate current signup step
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
      // Backup for the real-time check — never let a registered email through.
      if (!emailError && emailCheckStatus === 'taken') {
        newErrors.email = 'An account with this email already exists';
        isValid = false;
      }

      // Check email + username availability against the API DB
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
          newErrors.username = usernameRes.data?.reserved
            ? 'This username is reserved'
            : 'This username is already taken';
          isValid = false;
          setUsernameStatus('taken');
          setUsernameMessage(newErrors.username);
          setUsernameSuggestions(await generateSuggestions(username));
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

  // ═══ SIGNUP HANDLERS ═══
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validateStep(signupStep))) {
      onShowToast('Please fix the errors before continuing');
      return;
    }

    setIsSubmitting(true);

    try {
      if (signupStep === 1 || signupStep === 2) {
        // Local step transitions (OTP is sent when entering step 3)
        setSignupStep((signupStep + 1) as SignupStep);
        setIsSubmitting(false);
      } else if (signupStep === 3) {
        // Verify the OTP via the API (non-consuming — the same code is
        // presented again at account creation).
        const result = await verifySignupOtp(email, verificationCode);
        if (!result.ok) {
          onShowToast(result.error || 'Invalid verification code');
          setIsSubmitting(false);
          return;
        }
        setSignupStep(4 as SignupStep);
        setIsSubmitting(false);
      } else if (signupStep === 4) {
        // Final step — create the account through the API. The verified OTP
        // is included so the account is created with emailVerified=true.
        const result = await signup({
          email,
          password,
          firstName,
          lastName,
          username,
          gender: gender || undefined,
          dob: dob || undefined,
          occupation: occupation || undefined,
          companyName: company || undefined,
          role: role || undefined,
          policyAccepted: consentTerms && consentPrivacy,
          otpCode: verificationCode,
        });

        if (!result.ok) {
          onShowToast(result.error || 'Error creating account');
          setIsSubmitting(false);
          return;
        }

        // Upload avatar if one was selected (avatar lives in Supabase Storage),
        // then attach the public URL to the account profile (best-effort).
        const userId = result.data?.id;
        if (userId && profilePic) {
          try {
            // Pass credentials so uploadAvatar can fall back to Supabase Auth
            // sign-in if the RLS policy still requires an authenticated session.
            const { url, error: uploadErr } = await uploadAvatar(userId, profilePic, { email, password });
            if (url) {
              await updateProfile({ photoUrl: url }).catch(() => {});
            } else if (uploadErr) {
              console.warn('Avatar upload error:', uploadErr);
            }
          } catch (err) {
            console.warn('Avatar upload after signup failed:', err);
          }
        }

        onSuccessAuth(email, 'Email Registration');
      }
    } catch (err) {
      onShowToast('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  // ═══ LOGIN HANDLERS (API-backed) ═══
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the current login step
    if (loginStep === 'email') {
      const emailError = validateEmail(email);
      if (emailError) {
        setErrors({ email: emailError });
        setTouched({ email: true });
        onShowToast('Please enter a valid email');
        return;
      }
    } else if (loginStep === 'password') {
      if (!password.trim()) {
        setErrors({ password: 'Password is required' });
        setTouched({ password: true });
        onShowToast('Please enter your password');
        return;
      }
    } else if (loginStep === 'otp') {
      const codeError = validateVerificationCode(loginOtpCode);
      if (codeError) {
        setErrors({ loginOtpCode: codeError });
        setTouched({ loginOtpCode: true });
        onShowToast('Please enter the 6-digit code from your email');
        return;
      }
    } else if (loginStep === '2fa') {
      if (loginWithBackup) {
        if (!backupCode.trim()) {
          setErrors({ twoFactorCode: 'Backup code is required' });
          setTouched({ twoFactorCode: true });
          onShowToast('Please enter your backup code');
          return;
        }
      } else {
        const codeError = validateTwoFactorCode(twoFactorCode);
        if (codeError) {
          setErrors({ twoFactorCode: codeError });
          setTouched({ twoFactorCode: true });
          onShowToast('Please enter a valid 6-digit code');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      if (loginStep === 'email') {
        if (loginProfile?.email === email) {
          if (!loginProfile.exists) {
            setErrors({ email: 'No account found with this email' });
            setTouched({ email: true });
            onShowToast('No account found with this email');
            setIsSubmitting(false);
            return;
          }
          setLoginStep('password');
          setIsSubmitting(false);
          return;
        }
        const res = await checkEmailExists(email);
        if (!res.ok || !res.data?.exists) {
          setLoginProfile(null);
          setErrors({ email: 'No account found with this email' });
          setTouched({ email: true });
          onShowToast('No account found with this email');
          setIsSubmitting(false);
          return;
        }
        setLoginProfile({
          email,
          exists: true,
          photoUrl: res.data.photoUrl,
          name: res.data.name,
          hasRecoveryEmail: !!res.data.hasRecoveryEmail,
          recoveryEmail: res.data.recoveryEmail,
        });
        setLoginStep('password');
        setIsSubmitting(false);
      } else if (loginStep === 'password') {
        const result = await login(email, password);

        if (!result.ok) {
          onShowToast(result.error || 'Invalid email or password');
          setIsSubmitting(false);
          return;
        }

        // Suspicious IP/device — an email OTP is required before a session is
        // issued. When 2FA is also enabled (OTP + 2FA), verifyLoginOtp chains
        // into the 2FA step automatically via requiresMfa.
        if (result.data?.needsOtp) {
          const otpRes = await requestLoginOtp(email);
          if (otpRes.ok) {
            setLoginOtpCode('');
            setLoginStep('otp');
            setLoginPending2fa(!!result.data?.needs2FA);
            setIsSubmitting(false);
            onShowToast('A verification code has been sent to your email');
          } else {
            setIsSubmitting(false);
            onShowToast(otpRes.error || 'Failed to send verification code');
          }
          return;
        }

        // 2FA required — hold the temp token until the code is verified
        if (result.data?.needs2FA && result.data?.tempToken) {
          setLoginTempToken(result.data.tempToken);
          setLoginStep('2fa');
          setIsSubmitting(false);
          onShowToast('Please enter your 2FA code');
          return;
        }

        onSuccessAuth(email, 'Email & Password');
        setIsSubmitting(false);
      } else if (loginStep === 'otp') {
        const result = await verifyLoginOtp(email, loginOtpCode);

        if (!result.ok) {
          onShowToast(result.error || 'Invalid or expired code');
          setIsSubmitting(false);
          return;
        }

        // 2FA required on top of the email OTP
        if (result.data?.requiresMfa && result.data?.tempToken) {
          setLoginTempToken(result.data.tempToken);
          setLoginStep('2fa');
          setLoginPending2fa(false);
          setIsSubmitting(false);
          onShowToast('Please enter your 2FA code');
          return;
        }

        onSuccessAuth(email, 'Email & Password');
        setLoginPending2fa(false);
        setIsSubmitting(false);
      } else if (loginStep === '2fa') {
        if (!loginTempToken) {
          onShowToast('Session error. Please try again.');
          setLoginStep('email');
          setIsSubmitting(false);
          return;
        }

        let result;
        if (loginWithBackup) {
          result = await recovery2FA(loginTempToken, backupCode);
        } else {
          result = await verify2FA(loginTempToken, twoFactorCode);
        }

        if (!result.ok) {
          onShowToast(result.error || (loginWithBackup ? 'Invalid backup code' : 'Invalid 2FA code'));
          setIsSubmitting(false);
          return;
        }

        onSuccessAuth(email, 'Email & Password');
        setIsSubmitting(false);
      }
    } catch (err) {
      onShowToast('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleLoginOtpResend = async () => {
    if (!email) return;
    setIsSubmitting(true);
    const result = await requestLoginOtp(email);
    setIsSubmitting(false);
    if (result.ok) {
      onShowToast('Verification code resent to ' + email);
    } else {
      onShowToast(result.error || 'Failed to resend code');
    }
  };

  // ═══ PROFILE PICTURE HANDLERS ═══
  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      onShowToast('File is empty. Please select a valid image.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onShowToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      onShowToast('Image must be less than 5MB');
      return;
    }

    const minSize = 100;
    if (file.size < minSize) {
      onShowToast('File appears to be corrupted or too small');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;

      if (!imageUrl || imageUrl.length < 100) {
        onShowToast('Failed to read image file. It may be corrupted.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (img.width === 0 || img.height === 0) {
          onShowToast('Image has invalid dimensions');
          return;
        }
        setTempImageUrl(imageUrl);
        setShowImageEditor(true);
      };
      img.onerror = () => {
        onShowToast('Failed to load image. The file may be corrupted.');
      };
      img.src = imageUrl;
    };
    reader.onerror = () => {
      onShowToast('Failed to read file');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropImage = async (croppedImageUrl: string) => {
    setProfilePic(croppedImageUrl);
    setShowImageEditor(false);
    setTempImageUrl(null);
    onShowToast('Profile photo set');
  };

  const handleRemoveProfilePic = async () => {
    setProfilePic(null);
    setTempImageUrl(null);
    setShowImageEditor(false);
    onShowToast('Profile photo removed');
  };

  const handleCancelImageEditor = () => {
    setTempImageUrl(null);
    setShowImageEditor(false);
  };

  // ═══ RECOVERY FLOW (API-backed) ═══
  const handleRequestRecovery = async (method: 'code' | 'magic-link' | 'recovery') => {
    if (!email) {
      onShowToast('Please enter your email first');
      return;
    }

    setIsSubmitting(true);

    if (method === 'code') {
      const result = await requestPasswordReset(email, 'otp');
      setIsSubmitting(false);
      if (!result.ok) {
        onShowToast(result.error || 'Failed to send recovery code');
        return;
      }
      onShowToast('Recovery code sent to ' + email);
    } else if (method === 'recovery') {
      const result = await requestPasswordReset(email, 'recovery');
      setIsSubmitting(false);
      if (!result.ok) {
        onShowToast(result.error || 'Failed to send recovery code');
        return;
      }
      onShowToast('Recovery code sent to ' + (loginProfile?.recoveryEmail || 'your recovery email'));
    } else {
      const result = await requestMagicLink(email);
      setIsSubmitting(false);
      if (!result.ok) {
        onShowToast(result.error || 'Failed to send magic link');
        return;
      }
      onShowToast('Magic link sent to ' + email);
    }

    setRecoveryMethod(method);
    setLoginStep('recovery');
    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setRecoveryStage('code');
    setErrors({});
    setTouched({});
  };

  const handleResendRecoveryCode = async () => {
    if (!email) {
      onShowToast('Please enter your email first');
      return;
    }

    setIsSubmitting(true);

    if (recoveryMethod === 'magic-link') {
      const result = await requestMagicLink(email);
      setIsSubmitting(false);
      if (!result.ok) {
        onShowToast(result.error || 'Failed to resend magic link');
        return;
      }
      onShowToast('Magic link resent to ' + email);
    } else {
      const result = await requestPasswordReset(email, recoveryMethod === 'recovery' ? 'recovery' : 'otp');
      setIsSubmitting(false);
      if (!result.ok) {
        onShowToast(result.error || 'Failed to resend recovery code');
        return;
      }
      onShowToast(recoveryMethod === 'recovery'
        ? 'Recovery code resent to ' + (loginProfile?.recoveryEmail || 'your recovery email')
        : 'Recovery code resent to ' + email);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      const result = await requestSignupOtp(email);
      if (!result.ok) {
        onShowToast(result.error || 'Error sending verification code');
        return;
      }
      setResendCooldown(60);
      onShowToast('Verification code resent to ' + email);
    } catch (err) {
      onShowToast('Error sending verification code');
    }
  };

  // ═══ RECOVERY CODE VERIFY + NEW PASSWORD (API-backed) ═══
  const handleRecoveryCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryMethod !== 'code' && recoveryMethod !== 'recovery') return;

    const codeError = validateVerificationCode(recoveryCode);
    if (codeError) {
      setErrors({ recoveryCode: codeError });
      setTouched({ recoveryCode: true });
      onShowToast('Please enter the 6-digit code from your email');
      return;
    }

    setIsSubmitting(true);
    const result = await verifyPasswordReset(email, recoveryCode);
    setIsSubmitting(false);
    if (!result.ok) {
      onShowToast(result.error || 'Invalid or expired code');
      return;
    }
    setResetToken(result.data?.resetToken || '');
    setRecoveryStage('password');
    onShowToast('Code verified. Choose a new password.');
  };

  const handleRecoveryNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error: pwError } = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);
    if (pwError || confirmError) {
      onShowToast(pwError || confirmError || 'Passwords do not match');
      return;
    }
    if (!resetToken) {
      onShowToast('Session expired. Please request a new code.');
      setRecoveryStage('code');
      return;
    }

    setIsSubmitting(true);
    const result = await confirmPasswordReset(resetToken, password);
    setIsSubmitting(false);
    if (!result.ok) {
      onShowToast(result.error || 'Failed to reset password');
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setRecoveryStage('code');
    setResetToken('');
    setLoginStep('password');
    onShowToast('Password reset. Sign in with your new password.');
  };

  const handleResetToHome = () => {
    switchMode('signup');
    setSignupStep(1 as SignupStep);
    setLoginStep('email');
    setLoginProfile(null);
    setErrors({});
    setTouched({});
  };

  const goBack = () => {
    setErrors({});
    setTouched({});
    if (mode === 'signup' && signupStep > 1) {
      setSignupStep((signupStep - 1) as SignupStep);
    } else if (mode === 'login') {
      if (loginStep === 'password') { setLoginStep('email'); setLoginProfile(null); }
      else if (loginStep === 'otp') { setLoginStep('password'); setLoginPending2fa(false); }
      else if (loginStep === '2fa') setLoginStep('password');
      else if (loginStep === 'recovery') setLoginStep('password');
    }
  };

  const getProviderDisplayName = () => {
    if (email.includes('@gmail.com')) return 'Google';
    if (email.includes('@outlook.com') || email.includes('@hotmail.com')) return 'Microsoft';
    if (email.includes('@yahoo.com')) return 'Yahoo';
    return 'Email';
  };

  // Get input error class
  const getInputClass = (field: string, baseClass: string = 'wave-input') => {
    if (errors[field] && touched[field]) {
      return `${baseClass} border-[#EF4444] focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]`;
    }
    return baseClass;
  };

  // ═══ STEP INDICATOR (progress segments, no numbers) ═══
  const stepLabels = ['Basics', 'Details', 'Verify', 'Create'];

  // ═══ STEP COMPLETION GATES (Continue stays disabled until requirements are met) ═══
  const step1Complete = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    !validateEmail(email) &&
    validateUsername(username) === undefined &&
    usernameStatus === 'available' &&
    (emailCheckStatus === 'available' || emailCheckStatus === 'idle')
  );
  const step2Complete = Boolean(gender && dob && !validateDob(dob));
  const step4Complete = Boolean(
    password &&
    !validatePassword(password).error &&
    confirmPassword === password &&
    consentTerms &&
    consentPrivacy
  );

  return (
    <div className="relative z-10 min-h-screen flex flex-col select-none">
      {/* ── Top bar ── */}
      <header className="flex items-center px-6 sm:px-8 h-20 shrink-0">
        <button
          onClick={handleResetToHome}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
        >
          <img src="/logo.png" alt="Tirbeo" className="h-8 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-white">Tirbeo</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="wave-card w-[92%] sm:w-[76%] lg:w-[60%] p-6 sm:p-10 lg:p-14"
        >
          <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-16 items-center">
            {/* Left — heading zone */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl lg:text-[34px] font-bold tracking-tight leading-tight text-white mb-2">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-[#8A8A90]">
                {mode === 'signup' ? (
                  signupStep === 3 || signupStep === 4 ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Signing up with <span className="text-white font-medium">{getProviderDisplayName()}</span>
                    </span>
                  ) : (
                    <span>
                      Already have an account?{' '}
                      <button
                        onClick={() => { switchMode('login'); setLoginStep('email'); }}
                        className="text-white hover:text-[#BFBFC6] font-medium cursor-pointer transition-colors"
                      >
                        Sign in
                      </button>
                    </span>
                  )
                ) : (
                  <span>
                    Need an account?{' '}
                    <button
                      onClick={() => { switchMode('signup'); setSignupStep(1 as SignupStep); }}
                      className="text-white hover:text-[#BFBFC6] font-medium cursor-pointer transition-colors"
                    >
                      Sign up for free
                    </button>
                  </span>
                )}
              </p>

              {/* Signup progress */}
              {mode === 'signup' && (
                <div className="mt-6 mx-auto lg:mx-0 max-w-[220px] flex items-center gap-1.5">
                  {stepLabels.map((label, idx) => {
                    const n = idx + 1;
                    return (
                      <span
                        key={label}
                        className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                          n < signupStep ? 'bg-white' : n === signupStep ? 'bg-[rgba(255,255,255,0.45)]' : 'bg-[rgba(255,255,255,0.1)]'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right — form zone */}
            <div>
          <AnimatePresence mode="wait">
            {/* ═══ SIGNUP STEP 1: BASICS ═══ */}
            {mode === 'signup' && signupStep === 1 && (
              <motion.form
                key="signup-step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignupSubmit}
                className="space-y-5"
              >
                <InputWrapper label="Username" required error={errors.username} field="username" touched={touched}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6063] text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                        setUsername(val);
                        checkUsername(val);
                      }}
                      onBlur={() => handleBlur('username')}
                      placeholder="john-doe"
                      maxLength={30}
                      autoFocus
                      className={`${getInputClass('username')} pl-7 pr-8`}
                    />
                    {username.length >= 3 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus === 'checking' && (
                          <Loader2 className="w-4 h-4 text-[#858589] animate-spin" />
                        )}
                        {usernameStatus === 'available' && (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        )}
                        {usernameStatus === 'taken' && (
                          <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                        )}
                      </span>
                    )}
                  </div>
                  {username.length >= 3 && usernameMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                        usernameStatus === 'available'
                          ? 'text-[#22C55E]'
                          : usernameStatus === 'taken'
                            ? 'text-[#EF4444]'
                            : usernameStatus === 'checking'
                              ? 'text-[#858589]'
                              : 'text-[#EF4444]'
                      }`}
                    >
                      {usernameMessage}
                    </motion.p>
                  )}

                  {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2"
                    >
                      <p className="text-xs text-[#858589] mb-1.5">Available alternatives:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {usernameSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setUsername(suggestion);
                              checkUsername(suggestion);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.06)] text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)]"
                          >
                            @{suggestion}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {username.length < 3 && (
                    <span className="text-xs text-[#5F6063] mt-1.5 block">
                      Your unique handle. Letters, numbers, hyphens only.
                    </span>
                  )}
                </InputWrapper>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputWrapper label="First Name" required error={errors.firstName} field="firstName" touched={touched}>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => handleBlur('firstName')}
                      placeholder="John"
                      maxLength={100}
                      className={getInputClass('firstName')}
                    />
                  </InputWrapper>
                  <InputWrapper label="Last Name" required error={errors.lastName} field="lastName" touched={touched}>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => handleBlur('lastName')}
                      placeholder="Francisco"
                      maxLength={100}
                      className={getInputClass('lastName')}
                    />
                  </InputWrapper>
                </div>

                <InputWrapper label="Email address" required error={errors.email} field="email" touched={touched}>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="hello@example.com"
                      maxLength={254}
                      className={`${getInputClass('email')} pr-9`}
                    />
                    {email && !validateEmail(email) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailCheckStatus === 'checking' && (
                          <Loader2 className="w-4 h-4 text-[#858589] animate-spin" />
                        )}
                        {emailCheckStatus === 'available' && (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        )}
                        {emailCheckStatus === 'taken' && (
                          <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                        )}
                      </span>
                    )}
                  </div>
                  {emailCheckStatus === 'taken' && !errors.email && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                    >
                      <span className="text-xs text-[#EF4444]">This email is already registered</span>
                      <button
                        type="button"
                        onClick={() => {
                          setErrors({});
                          setTouched({});
                          switchMode('login');
                          setLoginStep('password');
                        }}
                        className="text-xs font-semibold text-[#F5F5F5] hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        Sign in instead →
                      </button>
                    </motion.div>
                  )}
                </InputWrapper>

                <button
                  type="submit"
                  disabled={isSubmitting || !step1Complete}
                  className="wave-btn wave-btn-primary mt-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <>
                      <span className="relative z-10">Continue</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
                    </>
                  )}
                </button>

                <div className="wave-divider">
                  <span>or sign up with</span>
                </div>

                {/* One-click social — compact row */}
                <SocialAuthButtons variant="row" />
              </motion.form>
            )}

            {/* ═══ SIGNUP STEP 2: DETAILS ═══ */}
            {mode === 'signup' && signupStep === 2 && (
              <motion.form
                key="signup-step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignupSubmit}
                className="space-y-3"
              >
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Profile Picture Display */}
                <div className="flex items-center justify-center gap-4">
                  <button type="button" onClick={handleProfilePicClick} className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.04)] border-2 border-dashed border-[rgba(255,255,255,0.12)] flex items-center justify-center overflow-hidden group-hover:border-white transition-all">
                      {isUploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-[#F5F5F5] animate-spin" />
                      ) : profilePic ? (
                        <img
                          src={profilePic}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-[#5F6063] group-hover:text-[#F5F5F5] transition-colors" />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F5F5F5] flex items-center justify-center shadow-lg">
                      {isUploadingAvatar ? (
                        <Loader2 className="w-3 h-3 text-black animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3 text-black" />
                      )}
                    </span>
                  </button>
                  <div className="text-left">
                    <p className="text-sm text-[#AAAAAA]">Profile photo</p>
                    <p className="text-xs text-[#666666] mt-0.5">JPEG, PNG, GIF, WebP • Max 5MB</p>
                    {profilePic && (
                      <button
                        type="button"
                        onClick={handleRemoveProfilePic}
                        className="mt-1 text-xs text-[#EF4444] hover:text-[#F87171] font-medium cursor-pointer transition-colors"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputWrapper label="Gender" required error={errors.gender} field="gender" touched={touched}>
                    <select
                      value={gender}
                      onChange={(e) => { setGender(e.target.value); if (touched.gender) validateField('gender', e.target.value); }}
                      onBlur={() => handleBlur('gender')}
                      className="wave-input appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0a0a0c]">Select</option>
                      <option value="male" className="bg-[#0a0a0c]">Male</option>
                      <option value="female" className="bg-[#0a0a0c]">Female</option>
                      <option value="non-binary" className="bg-[#0a0a0c]">Non-binary</option>
                      <option value="prefer-not" className="bg-[#0a0a0c]">Prefer not to say</option>
                    </select>
                  </InputWrapper>
                  <InputWrapper label="Date of Birth" required error={errors.dob} field="dob" touched={touched}>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => { setDob(e.target.value); if (touched.dob) validateField('dob', e.target.value); }}
                      onBlur={() => handleBlur('dob')}
                      className={getInputClass('dob')}
                    />
                  </InputWrapper>
                </div>

                <InputWrapper label="Occupation" error={errors.occupation} field="occupation" touched={touched}>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    onBlur={() => handleBlur('occupation')}
                    placeholder="Software Engineer"
                    maxLength={200}
                    className={getInputClass('occupation')}
                  />
                </InputWrapper>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputWrapper label="Company" error={errors.company} field="company" touched={touched}>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      onBlur={() => handleBlur('company')}
                      placeholder="Acme Inc."
                      maxLength={200}
                      className={getInputClass('company')}
                    />
                  </InputWrapper>
                  <InputWrapper label="Role" error={errors.role} field="role" touched={touched}>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onBlur={() => handleBlur('role')}
                      placeholder="Developer"
                      maxLength={200}
                      className={getInputClass('role')}
                    />
                  </InputWrapper>
                </div>

                <div className="flex gap-3 mt-1">
                  <button type="submit" disabled={isSubmitting || !step2Complete} className="wave-btn wave-btn-primary flex-1">
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                    ) : (
                      <>
                        <span className="relative z-10">Continue</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ═══ SIGNUP STEP 3: VERIFY (OTP — mandatory) ═══ */}
            {mode === 'signup' && signupStep === 3 && (
              <motion.form
                key="signup-step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignupSubmit}
                className="space-y-5"
              >
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-7 h-7 text-[#F5F5F5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Verify your email</h3>
                  <p className="text-sm text-[#858589] mt-1">
                    We sent a 6-digit code to<br />
                    <span className="text-white font-medium">{email}</span>
                  </p>
                </div>

                <InputWrapper label="Verification Code" error={errors.verificationCode} field="verificationCode" touched={touched}>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(val);
                      if (val.length === 6) {
                        const input = e.currentTarget;
                        requestAnimationFrame(() => {
                          input.closest('form')?.requestSubmit();
                        });
                      }
                    }}
                    onBlur={() => handleBlur('verificationCode')}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className={`${getInputClass('verificationCode')} text-center text-2xl tracking-[0.5em] font-mono`}
                  />
                </InputWrapper>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0}
                  className="w-full text-center text-sm text-[#F5F5F5] hover:text-white font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>

                <button type="submit" disabled={isSubmitting || verificationCode.length !== 6} className="wave-btn wave-btn-primary w-full">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <>
                      <span className="relative z-10">Continue</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* ═══ SIGNUP STEP 4: PASSWORD + CONSENT ═══ */}
            {mode === 'signup' && signupStep === 4 && (
              <motion.form
                key="signup-step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignupSubmit}
                className="space-y-5"
              >
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-[#F5F5F5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Set your password</h3>
                  <p className="text-sm text-[#858589] mt-1">
                    Create a strong password to secure your account
                  </p>
                </div>

                <InputWrapper label="Password" required error={errors.password} field="password" touched={touched}>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••••••"
                      maxLength={128}
                      className={`${getInputClass('password')} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6063] hover:text-[#F5F5F5] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              password.length >= i * 3
                                ? password.length >= 12
                                  ? 'bg-[#22C55E]'
                                  : password.length >= 8
                                    ? 'bg-[#F5F5F5]'
                                    : 'bg-white'
                                : 'bg-[rgba(255,255,255,0.08)]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#5F6063] mt-1">
                        {password.length < 8
                          ? 'At least 8 characters'
                          : password.length < 12
                            ? 'Good password'
                            : 'Strong password'}
                      </p>
                    </div>
                  )}
                </InputWrapper>

                <InputWrapper label="Confirm Password" required error={errors.confirmPassword} field="confirmPassword" touched={touched}>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="••••••••••••"
                    maxLength={128}
                    className={getInputClass('confirmPassword')}
                  />
                </InputWrapper>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-all">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => { setConsentTerms(e.target.checked); setErrors(prev => ({ ...prev, consentTerms: undefined })); }}
                      className="w-5 h-5 mt-0.5 rounded border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#F5F5F5] focus:ring-white focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-[#AAAAAA] leading-relaxed">
                      I agree to the{' '}
                      <button type="button" onClick={() => onOpenLegalModal('terms')} className="text-[#F5F5F5] hover:text-white font-medium underline underline-offset-2">
                        Terms of Service
                      </button>{' '}
                      <span className="text-[#F5F5F5]">*</span>
                    </span>
                  </label>
                  <ErrorMessage error={errors.consentTerms} field="consentTerms" touched={touched} />

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-all">
                    <input
                      type="checkbox"
                      checked={consentPrivacy}
                      onChange={(e) => { setConsentPrivacy(e.target.checked); setErrors(prev => ({ ...prev, consentPrivacy: undefined })); }}
                      className="w-5 h-5 mt-0.5 rounded border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#F5F5F5] focus:ring-white focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-[#AAAAAA] leading-relaxed">
                      I acknowledge the{' '}
                      <button type="button" onClick={() => onOpenLegalModal('privacy')} className="text-[#F5F5F5] hover:text-white font-medium underline underline-offset-2">
                        Privacy Policy
                      </button>{' '}
                      and consent to data processing <span className="text-[#F5F5F5]">*</span>
                    </span>
                  </label>
                  <ErrorMessage error={errors.consentPrivacy} field="consentPrivacy" touched={touched} />

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-all">
                    <input
                      type="checkbox"
                      checked={consentMarketing}
                      onChange={(e) => setConsentMarketing(e.target.checked)}
                      className="w-5 h-5 mt-0.5 rounded border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#F5F5F5] focus:ring-white focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-[#AAAAAA] leading-relaxed">
                      Send me product updates and marketing emails (optional)
                    </span>
                  </label>
                </div>

                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <p className="text-xs text-[#858589] leading-relaxed">
                    Your account will be created with <span className="text-white font-medium">{email}</span>.
                  </p>
                </div>

                <button type="submit" disabled={isSubmitting || !step4Complete} className="wave-btn wave-btn-primary w-full">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Create Account</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* ═══ LOGIN EMAIL STEP ═══ */}
            {mode === 'login' && loginStep === 'email' && (
              <motion.form
                key="login-email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLoginSubmit}
                className="space-y-5"
              >
                <InputWrapper label="Email address" required error={errors.email} field="email" touched={touched}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (touched.email) validateField('email', e.target.value); }}
                    onBlur={() => {
                      handleBlur('email');
                      if (mode === 'login' && loginStep === 'email' && email.includes('@') && loginProfile?.email !== email) {
                        checkEmailExists(email)
                          .then((res) => {
                            if (res.ok && res.data) {
                              setLoginProfile({
                                email,
                                exists: !!res.data.exists,
                                photoUrl: res.data.photoUrl,
                                name: res.data.name,
                                hasRecoveryEmail: !!res.data.hasRecoveryEmail,
                                recoveryEmail: res.data.recoveryEmail,
                              });
                            }
                          })
                          .catch(() => {});
                      }
                    }}
                    placeholder="user@tirbeo.app"
                    maxLength={254}
                    className={getInputClass('email')}
                  />
                </InputWrapper>

                <button type="submit" disabled={isSubmitting} className="wave-btn wave-btn-primary">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <>
                      <span className="relative z-10">Continue</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5] relative z-10" />
                    </>
                  )}
                </button>

                <div className="wave-divider">
                  <span>or continue with</span>
                </div>

                {/* One-click social — compact row */}
                <SocialAuthButtons variant="row" />

                {/* Magic link — one click, no password */}
                <button
                  type="button"
                  onClick={() => { handleRequestRecovery('magic-link'); }}
                  disabled={isSubmitting}
                  className="wave-btn wave-btn-secondary mt-3"
                >
                  <Mail className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Email me a magic link</span>
                </button>

                <p className="text-xs text-[#55555C] text-center leading-relaxed pt-1">
                  You agree to our{' '}
                  <button type="button" onClick={() => onOpenLegalModal('terms')} className="text-[#8A8A90] hover:text-white underline underline-offset-2 transition-colors cursor-pointer">
                    Terms
                  </button>{' '}
                  and{' '}
                  <button type="button" onClick={() => onOpenLegalModal('privacy')} className="text-[#8A8A90] hover:text-white underline underline-offset-2 transition-colors cursor-pointer">
                    Privacy Policy
                  </button>
                </p>
              </motion.form>
            )}

            {/* ═══ LOGIN PASSWORD STEP ═══ */}
            {mode === 'login' && loginStep === 'password' && (
              <motion.form
                key="login-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLoginSubmit}
                className="space-y-5"
              >
                <div className="flex flex-col items-center text-center mb-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg shadow-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]">
                    {loginProfile?.photoUrl ? (
                      <img src={loginProfile.photoUrl} alt={loginProfile.name || 'Profile'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#F5F5F5]">
                        {(() => {
                          const name = loginProfile?.name?.trim();
                          if (name) {
                            const parts = name.split(/\s+/).filter(Boolean);
                            return parts.length > 1
                              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                              : parts[0]?.slice(0, 2).toUpperCase() || 'T';
                          }
                          return (email.split('@')[0] || 'T').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'T';
                        })()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-[#AAAAAA] mt-3">
                    Signing in with{' '}
                    <span className="text-white font-semibold">{getProviderDisplayName()}</span>
                  </p>
                  <p className="text-sm text-[#858589] mt-0.5">{email}</p>
                  <button
                    type="button"
                    onClick={() => { setPassword(''); setLoginProfile(null); setLoginStep('email'); setErrors({}); setTouched({}); }}
                    className="text-xs text-[#858589] hover:text-white underline underline-offset-2 mt-1.5 cursor-pointer transition-colors"
                  >
                    Not you? Use another account
                  </button>
                </div>

                <div className="mb-1.5">
                  <InputWrapper label="Password" required error={errors.password} field="password" touched={touched}>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••••••"
                        autoFocus
                        maxLength={128}
                        className={`${getInputClass('password')} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#858589] hover:text-[#F5F5F5] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </InputWrapper>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRequestRecovery('code')}
                      disabled={isSubmitting}
                      className="text-xs text-[#858589] hover:text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Forgot password
                    </button>
                    <span className="text-xs text-[#3A3A3A] select-none">|</span>
                    <button
                      type="button"
                      onClick={() => handleRequestRecovery('code')}
                      disabled={isSubmitting}
                      className="text-xs text-[#858589] hover:text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      One-time code
                    </button>
                    <span className="text-xs text-[#3A3A3A] select-none">|</span>
                    <button
                      type="button"
                      onClick={() => handleRequestRecovery('magic-link')}
                      disabled={isSubmitting}
                      className="text-xs text-[#858589] hover:text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Magic link
                    </button>
                  </div>
                  {loginProfile?.hasRecoveryEmail && (
                    <button
                      type="button"
                      onClick={() => handleRequestRecovery('recovery')}
                      disabled={isSubmitting}
                      className="w-full text-center text-xs text-white hover:text-[#F5F5F5] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send recovery mail{loginProfile.recoveryEmail ? ` (${loginProfile.recoveryEmail})` : ''}
                    </button>
                  )}
                </div>

                <button type="submit" disabled={isSubmitting} className="wave-btn wave-btn-primary w-full">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <span className="relative z-10">Sign In</span>
                  )}
                </button>
              </motion.form>
            )}

            {/* ═══ LOGIN OTP STEP (new-IP verification) ═══ */}
            {mode === 'login' && loginStep === 'otp' && (
              <motion.form
                key="login-otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLoginSubmit}
                className="space-y-5"
              >
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-7 h-7 text-[#F5F5F5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Verify it's you</h3>
                  <p className="text-sm text-[#858589] mt-1">
                    We noticed a new sign-in. A code was sent to<br />
                    <span className="text-white font-medium">{email}</span>
                    {loginPending2fa && (
                      <>
                        <br />Then enter your authenticator 2FA code.
                      </>
                    )}
                  </p>
                </div>

                <InputWrapper label="Verification Code" error={errors.loginOtpCode} field="loginOtpCode" touched={touched}>
                  <input
                    type="text"
                    value={loginOtpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setLoginOtpCode(val);
                      if (val.length === 6) {
                        const input = e.currentTarget;
                        requestAnimationFrame(() => {
                          input.closest('form')?.requestSubmit();
                        });
                      }
                    }}
                    onBlur={() => handleBlur('loginOtpCode')}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className={`${getInputClass('loginOtpCode')} text-center text-2xl tracking-[0.5em] font-mono`}
                  />
                </InputWrapper>

                <button
                  type="button"
                  onClick={handleLoginOtpResend}
                  disabled={isSubmitting}
                  className="w-full text-center text-sm text-[#F5F5F5] hover:text-white font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend code
                </button>

                <button type="submit" disabled={isSubmitting || loginOtpCode.length !== 6} className="wave-btn wave-btn-primary w-full">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <span className="relative z-10">Continue</span>
                  )}
                </button>
              </motion.form>
            )}

            {/* ═══ LOGIN 2FA STEP ═══ */}
            {mode === 'login' && loginStep === '2fa' && (
              <motion.form
                key="login-2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLoginSubmit}
                className="space-y-5"
              >
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-7 h-7 text-[#F5F5F5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-[#858589] mt-1">
                    Enter the code from your authenticator app
                  </p>
                </div>

                {!loginWithBackup ? (
                  <InputWrapper label="6-Digit Code" error={errors.twoFactorCode} field="twoFactorCode" touched={touched}>
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setTwoFactorCode(val);
                        if (val.length === 6) {
                          const input = e.currentTarget;
                          requestAnimationFrame(() => {
                            input.closest('form')?.requestSubmit();
                          });
                        }
                      }}
                      onBlur={() => handleBlur('twoFactorCode')}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      className={`${getInputClass('twoFactorCode')} text-center text-2xl tracking-[0.5em] font-mono`}
                    />
                  </InputWrapper>
                ) : (
                  <InputWrapper label="Backup Code" error={errors.twoFactorCode} field="twoFactorCode" touched={touched}>
                    <input
                      type="text"
                      value={backupCode}
                      onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                      className={`${getInputClass('twoFactorCode')} text-center text-lg tracking-wider font-mono`}
                    />
                    <p className="text-xs text-[#5F6063] mt-1.5">
                      Enter one of your backup codes (e.g., ABCD-EFGH-IJKL)
                    </p>
                  </InputWrapper>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setLoginWithBackup(!loginWithBackup)}
                    className="w-full text-left text-sm text-[#F5F5F5] hover:text-white font-medium cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    {loginWithBackup ? 'Use authenticator app' : 'Use backup code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecoveryMethod('magic-link'); setLoginStep('recovery'); }}
                    className="w-full text-left text-sm text-[#F5F5F5] hover:text-white font-medium cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Send magic link instead
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (loginWithBackup ? backupCode.trim().length === 0 : twoFactorCode.length !== 6)}
                  className="wave-btn wave-btn-primary w-full"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                  ) : (
                    <span className="relative z-10">Continue</span>
                  )}
                </button>
              </motion.form>
            )}

            {/* ═══ LOGIN RECOVERY STEP ═══ */}
            {mode === 'login' && loginStep === 'recovery' && (
              <motion.div
                key="login-recovery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-3">
                    {recoveryMethod === 'code' || recoveryMethod === 'recovery' ? (
                      <Key className="w-7 h-7 text-[#F5F5F5]" />
                    ) : (
                      <Link2 className="w-7 h-7 text-[#F5F5F5]" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {recoveryMethod === 'code' || recoveryMethod === 'recovery'
                      ? (recoveryStage === 'password' ? 'Choose a new password' : 'Recovery Code')
                      : 'Magic Link'}
                  </h3>
                  <p className="text-sm text-[#858589] mt-1">
                    {recoveryMethod === 'code' ? (
                      recoveryStage === 'password' ? (
                        <>Enter a new password for <span className="text-white">{email}</span></>
                      ) : (
                        <>A one-time code has been sent to <span className="text-white">{email}</span></>
                      )
                    ) : recoveryMethod === 'recovery' ? (
                      recoveryStage === 'password' ? (
                        <>Enter a new password for <span className="text-white">{email}</span></>
                      ) : (
                        <>A one-time code has been sent to your recovery email <span className="text-white">{loginProfile?.recoveryEmail || 'on file'}</span></>
                      )
                    ) : (
                      <>A magic link has been sent to <span className="text-white">{email}</span></>
                    )}
                  </p>
                </div>

                {(recoveryMethod === 'code' || recoveryMethod === 'recovery') && recoveryStage === 'code' && (
                  <form onSubmit={handleRecoveryCodeSubmit} className="space-y-5">
                    <InputWrapper label="Enter Recovery Code" error={errors.recoveryCode} field="recoveryCode" touched={touched}>
                      <input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setRecoveryCode(val);
                          if (val.length === 6) {
                            const input = e.currentTarget;
                            requestAnimationFrame(() => {
                              input.closest('form')?.requestSubmit();
                            });
                          }
                        }}
                        onBlur={() => handleBlur('recoveryCode')}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                        className={`${getInputClass('recoveryCode')} text-center text-2xl tracking-[0.5em] font-mono`}
                      />
                    </InputWrapper>

                    <button
                      type="button"
                      onClick={handleResendRecoveryCode}
                      disabled={isSubmitting}
                      className="w-full text-center text-sm text-[#F5F5F5] hover:text-white font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resend code
                    </button>

                    <button type="submit" disabled={isSubmitting || recoveryCode.length !== 6} className="wave-btn wave-btn-primary w-full">
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                      ) : (
                        <span className="relative z-10">Continue</span>
                      )}
                    </button>
                  </form>
                )}

                {(recoveryMethod === 'code' || recoveryMethod === 'recovery') && recoveryStage === 'password' && (
                  <form onSubmit={handleRecoveryNewPassword} className="space-y-5">
                    <InputWrapper label="New Password" required error={errors.password} field="password" touched={touched}>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => handleBlur('password')}
                          placeholder="••••••••••••"
                          autoFocus
                          maxLength={128}
                          className={`${getInputClass('password')} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6063] hover:text-[#F5F5F5] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </InputWrapper>

                    <InputWrapper label="Confirm New Password" required error={errors.confirmPassword} field="confirmPassword" touched={touched}>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="••••••••••••"
                        maxLength={128}
                        className={getInputClass('confirmPassword')}
                      />
                    </InputWrapper>

                    <button type="submit" disabled={isSubmitting} className="wave-btn wave-btn-primary w-full">
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                      ) : (
                        <span className="relative z-10">Reset Password</span>
                      )}
                    </button>
                  </form>
                )}

                {recoveryMethod === 'magic-link' && (
                  <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <p className="text-xs text-[#858589] leading-relaxed">
                      Click the link in your email to sign in. The link expires in 15 minutes.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <p className="text-xs text-[#858589] leading-relaxed">
                    {recoveryMethod === 'code' || recoveryMethod === 'recovery' ? (
                      recoveryStage === 'password' ? (
                        <>Your password will be reset and all existing sessions will be signed out.</>
                      ) : (
                        <>Check your email for the one-time recovery code.</>
                      )
                    ) : (
                      <>Check your inbox (and spam folder) for the magic link email.</>
                    )}
                  </p>
                </div>

                {recoveryMethod === 'magic-link' && (
                  <button
                    type="button"
                    onClick={handleResendRecoveryCode}
                    disabled={isSubmitting}
                    className="wave-btn wave-btn-primary w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-black relative z-10" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Resend</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={goBack}
                  className="w-full text-center text-xs text-[#858589] hover:text-white transition-colors cursor-pointer"
                >
                  Back to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
            </div>
          </div>

          {/* Bottom switch */}
          <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)] text-sm text-[#8A8A90] text-center">
            {mode === 'signup' ? (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => { switchMode('login'); setLoginStep('email'); }}
                  className="text-white font-medium hover:text-[#BFBFC6] transition-colors cursor-pointer"
                >
                  Log in
                </button>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { switchMode('signup'); setSignupStep(1 as SignupStep); }}
                  className="text-white font-medium hover:text-[#BFBFC6] transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
          </motion.div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 pt-4 pb-8 flex items-center justify-center gap-5 text-xs text-[#55555C]">
        <button type="button" onClick={() => onOpenLegalModal('terms')} className="uppercase tracking-wider hover:text-white transition-colors cursor-pointer">Terms</button>
        <button type="button" onClick={() => onOpenLegalModal('privacy')} className="uppercase tracking-wider hover:text-white transition-colors cursor-pointer">Privacy</button>
      </footer>

      {/* Image Crop Editor */}
      {showImageEditor && tempImageUrl && (
        <ImageCropEditor
          imageUrl={tempImageUrl}
          onCrop={handleCropImage}
          onCancel={handleCancelImageEditor}
          outputSize={512}
        />
      )}
    </div>
  );
};
