import React, { useState } from 'react';
import { redirectBlockedToDashboard } from '../../lib/redirect';
const ImageCropEditor = React.lazy(() => import('../ImageCropEditor'));
import { uploadAvatarViaApi } from '../../lib/api';
import { AuthShell, StepProgress } from '../ui/ig-ui';
import { TurnstileCaptcha } from './TurnstileCaptcha';
import { TURNSTILE_SITE_KEY } from '../../lib/turnstile';

/**
 * Switching between sign in and sign up is navigation, not a task. It gets
 * highlighted type rather than a filled box: bold, full-contrast, with a real
 * 44px hit area so it is still comfortable to tap. A second box down here just
 * competes with the one action the screen is actually asking for.
 */
const FOOTER_ACTION =
  'inline-flex min-h-11 items-center rounded-xl px-1 text-[17px] font-bold tracking-[-0.01em] ' +
  'text-white underline decoration-white/40 decoration-2 underline-offset-[6px] ' +
  'transition-colors duration-150 hover:decoration-white ' +
  'focus-visible:outline-none focus-visible:underline focus-visible:decoration-white ' +
  'focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.45)]';
import {
  login,
  verify2FA,
  recovery2FA,
  requestLoginOtp,
  verifyLoginOtp,
  requestSignupOtp,
  verifySignupOtp,
  signup,
  updateProfile,
  requestPasswordReset,
  requestMagicLink,
  confirmPasswordReset,
  verifyPasswordReset,
  checkEmailExists,
  logout,
} from '../../lib/api';
import type { BlockInfo } from '../../lib/api';
import { validatePassword, validateEmail, validateUsername, validateDob } from '../../lib/validations';
import { captureException } from '../../lib/sentry';
import { PasskeyError, authenticatePasskey } from '../../lib/passkeys';
import { haptic } from '../../lib/haptics';
import { useAuthForm } from './useAuthForm';
import { SignupStep1 } from './signup/SignupStep1';
import { SignupStep2 } from './signup/SignupStep2';
import { SignupStep3 } from './signup/SignupStep3';
import { SignupStep4 } from './signup/SignupStep4';
import { LoginEmail } from './login/LoginEmail';
import { LoginPassword } from './login/LoginPassword';
import { LoginOtp } from './login/LoginOtp';
import { Login2FA } from './login/Login2FA';
import { LoginMoreOptions } from './login/LoginMoreOptions';
import { LoginRecovery } from './login/LoginRecovery';

interface AuthCardProps {
  onSuccessAuth: (email: string, provider: string) => void;
  onOpenLegalModal: (type: 'terms' | 'privacy') => void;
  onShowToast: (msg: string) => void;
}

type SignupStep = 1 | 2 | 3 | 4;

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccessAuth,
  onOpenLegalModal,
  onShowToast,
}) => {
  const form = useAuthForm(onShowToast);

  /* ── Cloudflare Turnstile ──
     The API gates login/signup behind a Turnstile token once an IP looks
     suspicious or a few attempts fail (403 `{ turnstileRequired: true }`).
     `captchaSiteKey` prefers the key the API returns over the build-time env
     var, so the widget still renders if the key was added after this bundle
     was built. */
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [captchaBroken, setCaptchaBroken] = useState(false);

  /** Called on every failed auth submit: burn the single-use token, re-arm. */
  const invalidateCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaReset((n) => n + 1);
  };

  /** Record a 403 `{ turnstileRequired }` so the retry can satisfy it. */
  const noteCaptchaChallenge = (result: {
    captchaRequired?: boolean;
    captchaSiteKey?: string | null;
  }) => {
    if (!result.captchaRequired) return false;
    setCaptchaSiteKey(result.captchaSiteKey || TURNSTILE_SITE_KEY || null);
    invalidateCaptcha();
    return true;
  };

    const {
      mode, switchMode,
      signupStep, setSignupStep,
      loginStep, setLoginStep, noAccountEmail, setNoAccountEmail,
      firstName, setFirstName,
      lastName, setLastName,
      email, setEmail,
      password, setPassword,
      confirmPassword, setConfirmPassword,
      showPassword, setShowPassword,
      showConfirm, setShowConfirm,
      gender, setGender,
      dob, setDob,
      username, setUsername,
      jobRole, setJobRole,
      jobCompany, setJobCompany,
      jobPlace, setJobPlace,
      jobStartedOn, setJobStartedOn,
      verificationCode, setVerificationCode,
      profilePic, setProfilePic,
      showImageEditor, setShowImageEditor,
      tempImageUrl, setTempImageUrl,
      fileInputRef,
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
      consentTerms, setConsentTerms,
      consentPrivacy, setConsentPrivacy,
      isSubmitting, setIsSubmitting,
      isPasskeyLoading, setIsPasskeyLoading,
      setCooldowns, isInCooldown, getCooldownRemaining,
      canSend, remainingSends, sendWithRateLimit,
      getMaxSends, refreshRemaining, getResetAt, setResetAt,
      errors, setErrors,
      touched, setTouched,
      validateField, handleBlur, validateStep,
      usernameStatus, usernameMessage, usernameSuggestions,
      emailCheckStatus,
      checkUsername,
      resetLoginPassword,
    } = form;

  const lockAccount = (result: { block?: BlockInfo | null }): boolean => {
    if (!result.block) return false;
    haptic('error');
    setIsSubmitting(false);
    void redirectBlockedToDashboard(result.block);
    return true;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(await validateStep(signupStep))) {
      onShowToast('Please fix the errors before continuing');
      return;
    }

    setIsSubmitting(true);

    try {
      if (signupStep === 1 || signupStep === 2) {
        setSignupStep((signupStep + 1) as SignupStep);
        setIsSubmitting(false);
      } else if (signupStep === 3) {
        const result = await verifySignupOtp(email, verificationCode);
        if (!result.ok) {
          onShowToast(result.error || 'Invalid verification code');
          haptic('error');
          setIsSubmitting(false);
          return;
        }
        setSignupStep(4 as SignupStep);
        setIsSubmitting(false);
      } else if (signupStep === 4) {
        const result = await signup({
          email,
          password,
          firstName,
          lastName,
          username,
          gender: gender || undefined,
          dob: dob || undefined,
          // Work — sent under the names the settings app uses, so the answer
          // a person gives here is what their Work sheet shows later.
          companyRole: jobRole || undefined,
          companyName: jobCompany || undefined,
          jobPlace: jobPlace || undefined,
          jobStarted: jobStartedOn || undefined,
          policyAccepted: consentTerms && consentPrivacy,
          turnstileToken: captchaToken,
          otpCode: verificationCode,
        });

        if (!result.ok) {
          if (noteCaptchaChallenge(result)) {
            setIsSubmitting(false);
            onShowToast('Please complete the security check, then try again.');
            return;
          }
          onShowToast(result.error || 'Error creating account');
          haptic('error');
          captureException(new Error(result.error || 'Signup failed'));
          invalidateCaptcha();
          setIsSubmitting(false);
          return;
        }

        const userId = result.data?.id;
        if (userId && profilePic) {
          try {
            // Convert data URL to Blob for API upload — must happen while the
            // freshly-created session cookie is still valid.
            const headerMatch = profilePic.match(/^data:([^;]+);base64,(.+)$/);
            let uploadFile: Blob;
            if (headerMatch) {
              const mime = headerMatch[1];
              const raw = atob(headerMatch[2]);
              const bytes = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
              uploadFile = new Blob([bytes], { type: mime });
            } else {
              uploadFile = new Blob([profilePic], { type: 'image/jpeg' });
            }
            const { url, error: uploadErr } = await uploadAvatarViaApi(uploadFile);
            if (url) {
              await updateProfile({ photoUrl: url }).catch(() => {});
            } else if (uploadErr) {
              console.warn('Avatar upload error:', uploadErr);
            }
          } catch (err) {
            console.warn('Avatar upload after signup failed:', err);
          }
        }

        // Always force the user through /login after creation — never auto-redirect
        // to the dashboard and never honour an incoming redirect_to. The fresh
        // session issued by the signup endpoint is cleared so the login screen
        // does not immediately auto-bounce via getCurrentUser().
        haptic('success');
        onShowToast('Account created — please log in');
        setIsSubmitting(false);
        try {
          await logout();
        } catch {}
        try { localStorage.removeItem('tirbeo_session'); } catch {}
        // Preserve the email so the login form can pre-fill it.
        // Switch to /login route so refresh stays on login and the
        // getCurrentUser auto-redirect in App.tsx is bypassed (no cookie now).
        switchMode('login');
        setLoginStep('email');
        // Do NOT call onSuccessAuth — that would redirect to dashboard.
        return;
      }
    } catch (err) {
      onShowToast('An unexpected error occurred');
      captureException(err);
      haptic('error');
      setIsSubmitting(false);
    }
  };

  /**
   * Sign in with a passkey instead of a password.
   *
   * The API issues the challenge against the caller's session, so the honest
   * failure here is "no session" — we say exactly that rather than pretending
   * the passkey was rejected, and we never leave the form in a half state.
   */
  const handlePasskeySignIn = async () => {
    if (isPasskeyLoading) return;
    setIsPasskeyLoading(true);
    try {
      const account = await authenticatePasskey();
      haptic('success');
      onShowToast(`Signed in as ${account.email || 'your account'}`);
      if (account.id) {
        try {
          localStorage.setItem('tirbeo_session_user_id', account.id);
        } catch {}
      }
      onSuccessAuth(account.email || email, 'Passkey');
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : new PasskeyError('Passkey sign-in failed.');
      if (!failure.cancelled) {
        haptic('error');
        onShowToast(failure.message);
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginStep === 'email') {
      const emailError = validateField('email', email);
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
      if (loginOtpCode.length !== 6 || !/^\d{6}$/.test(loginOtpCode)) {
        setErrors({ loginOtpCode: 'Code must be 6 digits' });
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
        if (twoFactorCode.length !== 6 || !/^\d{6}$/.test(twoFactorCode)) {
          setErrors({ twoFactorCode: 'Code must be 6 digits' });
          setTouched({ twoFactorCode: true });
          onShowToast('Please enter a valid 6-digit code');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      if (loginStep === 'email') {
        let profile = loginProfile;
        if (!profile || profile.email !== email) {
          const res = await checkEmailExists(email);
          /* A lookup that failed is not a lookup that said "no". Reporting the
             outage as "No account found with this email" tells someone with a
             perfectly good account that they do not have one, and sends them
             to sign up for a duplicate. Say we could not check, and let them
             try again. */
          if (!res.ok) {
            const message = 'Could not check that email. Please try again.';
            setErrors({ email: message });
            setTouched({ email: true });
            onShowToast(message);
            setIsSubmitting(false);
            return;
          }
          if (res.data?.exists) {
            profile = {
              email,
              exists: true,
              photoUrl: res.data.photoUrl,
              name: res.data.name,
              hasRecoveryEmail: !!res.data.hasRecoveryEmail,
              recoveryEmail: res.data.recoveryEmail,
            };
            setLoginProfile(profile);
          } else {
            profile = { email, exists: false };
            setLoginProfile(profile);
          }
        }
        if (!profile.exists) {
          /* No account for this address. Stay exactly where we are and say so
             under the field: the next move is the visitor's to make, and the
             email stays on screen so they can retype it after a typo. The
             sign-up route is offered as text, not taken for them. */
          setErrors({});
          setTouched({ email: false });
          haptic('error');
          setNoAccountEmail(email);
          setIsSubmitting(false);
          return;
        }
        setNoAccountEmail(null);
        setLoginStep('password');
        setIsSubmitting(false);
      } else if (loginStep === 'password') {
        const result = await login(email, password, captchaToken);

        if (!result.ok) {
          if (noteCaptchaChallenge(result)) {
            setIsSubmitting(false);
            onShowToast('Please complete the security check, then try again.');
            return;
          }
          if (lockAccount(result)) return;
          // The token is single-use, so it is spent either way.
          invalidateCaptcha();
          onShowToast(result.error || 'Invalid email or password');
          haptic('error');
          captureException(new Error(result.error || 'Login failed'));
          setIsSubmitting(false);
          return;
        }

        if (result.data?.needsOtp) {
          const otpRes = await requestLoginOtp(email);
          if (otpRes.ok) {
            setLoginOtpCode('');
            setLoginStep('otp');
            setLoginPending2fa(!!result.data?.needs2FA);
            setIsSubmitting(false);
            onShowToast('A verification code has been sent to your email');
          } else {
            if (lockAccount(otpRes)) return;
            setIsSubmitting(false);
            onShowToast(otpRes.error || 'Failed to send verification code');
          }
          return;
        }

        if (result.data?.needs2FA && result.data?.tempToken) {
          setLoginTempToken(result.data.tempToken);
          setLoginStep('2fa');
          setIsSubmitting(false);
          onShowToast('Please enter your 2FA code');
          return;
        }

        onSuccessAuth(email, 'Email & Password');
        haptic('success');
        setIsSubmitting(false);
      } else if (loginStep === 'otp') {
        const result = await verifyLoginOtp(email, loginOtpCode);

        if (!result.ok) {
          if (lockAccount(result)) return;
          onShowToast(result.error || 'Invalid or expired code');
          haptic('error');
          setIsSubmitting(false);
          return;
        }

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
        haptic('success');
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
          if (lockAccount(result)) return;
          onShowToast(result.error || (loginWithBackup ? 'Invalid backup code' : 'Invalid 2FA code'));
          haptic('error');
          captureException(new Error(result.error || '2FA verification failed'));
          setIsSubmitting(false);
          return;
        }

        onSuccessAuth(email, 'Email & Password');
        haptic('success');
        setIsSubmitting(false);
      }
    } catch (err) {
      onShowToast('An unexpected error occurred');
      captureException(err);
      haptic('error');
      setIsSubmitting(false);
    }
  };

  /** Human copy for a server-reported window reset: "resets at HH:MM". */
  const resetCopy = (resetsAt?: number) => {
    if (!resetsAt || resetsAt <= Date.now()) return '';
    return ` — resets at ${new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleLoginOtpResend = async () => {
    const result = await sendWithRateLimit('login-otp', () => requestLoginOtp(email), { cooldownKey: 'login-otp' });
    if (result.ok) {
      setLoginOtpCode('');
      setLoginPending2fa(false);
      setLoginStep('otp');
      onShowToast('Verification code resent to ' + email);
    } else if (result.status === 429) {
      const payload: any = (result as any).data || {};
      const exceeded = payload.exceeded as string | undefined;
      const resetsAt: number | undefined =
        (exceeded && payload.remaining?.[exceeded]?.resetAt) || payload.remaining?.['login-otp']?.resetAt;
      if (resetsAt) setResetAt('login-otp', resetsAt);
      const retryAfter = resetsAt
        ? Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000))
        : payload.retryAfterMs ? Math.ceil(payload.retryAfterMs / 1000) : 30;
      setCooldowns((prev) => ({ ...prev, 'login-otp': retryAfter }));
      const limitMsg = resetsAt
        ? `Limit reached for code sends${resetCopy(resetsAt)}`
        : (result.error || 'Please wait before resending');
      onShowToast(limitMsg);
    } else {
      if (lockAccount(result as any)) return;
      onShowToast(result.error || 'Failed to resend code');
    }
  };

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

  const handleDirectLoginRequest = async (method: 'code' | 'magic-link') => {
    const key = method === 'code' ? 'login-otp' : 'magic-link';
    const sendFn = method === 'code'
      ? () => requestLoginOtp(email)
      : () => requestMagicLink(email);
    // magic-link: optimistic navigation within 1s so page shows fast even if API 5s
    let navigated = false;
    const doNav = () => {
      if (navigated) return;
      navigated = true;
      try {
        window.history.pushState(null, '', `/magic-sent?email=${encodeURIComponent(email)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {}
    };
    let navTimer: ReturnType<typeof setTimeout> | null = null;
    if (method === 'magic-link') {
      setErrors({});
      setTouched({});
      // show page in ~700ms max
      navTimer = setTimeout(doNav, 700);
    }
    const result = await sendWithRateLimit(key, sendFn, { cooldownKey: key });
    if (navTimer) clearTimeout(navTimer);
    if (result.ok) {
      if (method === 'code') {
        setLoginOtpCode('');
        setLoginPending2fa(false);
        setLoginStep('otp');
        onShowToast('One-time code sent to ' + email);
      } else {
        onShowToast('Magic link sent to ' + email + ' — one-time link, direct login.');
        doNav();
      }
      return;
    }
    // Failure AFTER the optimistic navigation: return to /login so the error
    // toast is shown in context instead of stranding the user on the sent
    // page. (requestMagicLink returns retryAfterMs at the top level.)
    const backToLogin = () => {
      if (window.location.pathname.startsWith('/magic-sent')) {
        try {
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch {}
      }
    };
    if (result.status === 429) {
      const retryAfterMs = result.retryAfterMs || (result as any).data?.retryAfterMs;
      const resetsAt = (result as any).resetsAt || (retryAfterMs ? Date.now() + retryAfterMs : undefined);
      if (resetsAt) setResetAt(key, resetsAt);
      const retryAfter = resetsAt
        ? Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000))
        : retryAfterMs ? Math.ceil(retryAfterMs / 1000) : 30;
      setCooldowns((prev) => ({ ...prev, [key]: retryAfter }));
      backToLogin();
      onShowToast(
        resetsAt
          ? `Limit reached for magic link sends${resetCopy(resetsAt)}`
          : (result.error || 'Please wait before requesting again'),
      );
    } else {
      if (lockAccount(result as any)) { backToLogin(); return; }
      backToLogin();
      onShowToast(result.error || 'Failed to send. Please try again.');
    }
  };

  const handlePasswordResetRequest = async (method: 'otp' | 'recovery') => {
    if (!email) {
      onShowToast('Please enter your email first');
      return;
    }
    const key = method === 'recovery' ? 'recovery' : 'otp';
    const result = await sendWithRateLimit(key, () => requestPasswordReset(email, method), { cooldownKey: key });
    if (result.ok) {
      setRecoveryMethod(method === 'recovery' ? 'recovery' : 'code');
      setRecoveryStage('code');
      setRecoveryCode('');
      setResetToken('');
      setErrors({});
      setTouched({});
      setLoginStep('recovery');
      onShowToast(
        method === 'recovery'
          ? 'Reset code sent to ' + (loginProfile?.recoveryEmail || 'your recovery email')
          : 'Reset code sent to ' + email,
      );
    } else if (result.status === 429) {
      const payload: any = (result as any).data || {};
      const exceeded = payload.exceeded as string | undefined;
      const resetsAt: number | undefined =
        (exceeded && payload.remaining?.[exceeded]?.resetAt) || payload.remaining?.[key]?.resetAt;
      if (resetsAt) setResetAt(key, resetsAt);
      const retryAfter = resetsAt
        ? Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000))
        : payload.retryAfterMs ? Math.ceil(payload.retryAfterMs / 1000) : 30;
      setCooldowns((prev) => ({ ...prev, [key]: retryAfter }));
      onShowToast(
        resetsAt
          ? `Limit reached${resetCopy(resetsAt)}`
          : (result.error || 'Please wait before requesting another code'),
      );
    } else {
      onShowToast(result.error || 'Failed to send the reset code');
    }
  };

  const handleResendRecoveryCode = async () => {
    if (!email) {
      onShowToast('Please enter your email first');
      return;
    }
    if (recoveryMethod === 'magic-link') {
      await handleDirectLoginRequest('magic-link');
      return;
    }
    const key = recoveryMethod === 'recovery' ? 'recovery' : 'otp';
    const pwMethod = key === 'recovery' ? 'recovery' : 'otp';
    const result = await sendWithRateLimit(key, () => requestPasswordReset(email, pwMethod as any), { cooldownKey: key });
    if (result.ok) {
      setRecoveryMethod(recoveryMethod === 'recovery' ? 'recovery' : 'code');
      setRecoveryStage('code');
      setRecoveryCode('');
      setResetToken('');
      setErrors({});
      setTouched({});
      setLoginStep('recovery');
    } else if (result.status === 429) {
      const retryAfter = result.data?.retryAfterMs ? Math.ceil(result.data.retryAfterMs / 1000) : 30;
      setCooldowns((prev) => ({ ...prev, [key]: retryAfter }));
      onShowToast(result.error || 'Please wait before requesting another code');
    } else {
      onShowToast(result.error || 'Failed to send the reset code');
    }
  };

  const handleResendCode = async () => {
    if (!email || isInCooldown('signup-otp')) return;
    const result = await sendWithRateLimit('signup-otp', () => requestSignupOtp(email), { cooldownKey: 'signup-otp' });
    if (result.ok) {
      onShowToast('Verification code resent to ' + email);
    } else if (result.status === 429) {
      const payload: any = (result as any).data || {};
      const exceeded = payload.exceeded as string | undefined;
      const resetsAt: number | undefined =
        (exceeded && payload.remaining?.[exceeded]?.resetAt) || payload.remaining?.['signup-otp']?.resetAt;
      if (resetsAt) setResetAt('signup-otp', resetsAt);
      const retryAfter = resetsAt
        ? Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000))
        : payload.retryAfterMs ? Math.ceil(payload.retryAfterMs / 1000) : 30;
      setCooldowns((prev) => ({ ...prev, 'signup-otp': retryAfter }));
      onShowToast(
        resetsAt
          ? `Limit reached for verification codes${resetCopy(resetsAt)}`
          : (result.error || 'Please wait before resending'),
      );
    } else {
      onShowToast(result.error || 'Error sending verification code');
    }
  };

  const handleRecoveryCodeSubmit = async (code: string) => {
    if (recoveryMethod === 'magic-link') return;

    // Forgot-password / recovery-email flow: verify the reset code, then
    // show the new-password step. (One-time-code direct login uses the
    // separate LoginOtp step, not this screen.)
    setIsSubmitting(true);
    const result = await verifyPasswordReset(email, code);
    setIsSubmitting(false);
    if (!result.ok || !result.data?.resetToken) {
      onShowToast(result.error || 'Invalid or expired code');
      haptic('error');
      captureException(new Error(result.error || 'Reset code verification failed'));
      return;
    }
    setResetToken(result.data.resetToken);
    setRecoveryStage('password');
    onShowToast('Code verified — choose a new password.');
  };

  const handleRecoveryNewPassword = async (newPassword: string) => {
    const { error: pwError } = validatePassword(newPassword);
    if (pwError) {
      onShowToast(pwError);
      return;
    }
    if (!resetToken) {
      onShowToast('Session expired. Please request a new code.');
      setResetToken('');
      return;
    }

    setIsSubmitting(true);
    const result = await confirmPasswordReset(resetToken, newPassword);
    setIsSubmitting(false);
    if (!result.ok) {
      onShowToast(result.error || 'Failed to reset password');
      haptic('error');
      captureException(new Error(result.error || 'Password reset failed'));
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setRecoveryStage('code');
    setResetToken('');
    setLoginStep('password');
    onShowToast('Password updated. Sign in with your new password.');
    haptic('success');
  };

  const goBack = () => {
    setErrors({});
    setTouched({});
    if (mode === 'signup' && signupStep > 1) {
      setSignupStep((signupStep - 1) as SignupStep);
    } else if (mode === 'login') {
      if (loginStep === 'password') {
        setPassword('');
        setLoginProfile(null);
        setLoginStep('email');
        setErrors({});
        setTouched({});
      } else if (loginStep === 'otp') {
        setLoginStep('more-options');
        setLoginPending2fa(false);
      } else if (loginStep === '2fa') setLoginStep('password');
      else if (loginStep === 'recovery') {
        setResetToken('');
        setRecoveryCode('');
        setLoginStep('password');
      }
      else if (loginStep === 'more-options') setLoginStep('password');
    }
  };

  const emailValid = !validateEmail(email);
  const usernameValid = validateUsername(username) === undefined;
  const step1Complete = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    emailValid &&
    usernameValid &&
    usernameStatus === 'available' &&
    emailCheckStatus === 'available',
  );
  const step2Complete = Boolean(gender && dob && !validateDob(dob));
  const step4Complete = Boolean(
    password &&
    !validatePassword(password).error &&
    confirmPassword === password &&
    consentTerms &&
    consentPrivacy,
  );

  /* Signup is a fixed four-step flow, so it gets the step slider and a title
     per step. Login's step count is unknowable up front — an OTP challenge
     only sometimes appears — so its steps keep their own headings. */
  const SIGNUP_STEPS = [
    { title: 'Create your account', label: 'Your details' },
    { title: 'Tell us about you', label: 'About you' },
    { title: 'Verify your email', label: 'Verify email' },
    { title: 'Secure your account', label: 'Set password' },
  ] as const;

  const signupCopy = SIGNUP_STEPS[signupStep - 1];
  /* Remounts the panel on every step change so the enter animation replays. */
  const panelKey = `${mode}:${signupStep}:${loginStep}`;

  return (
    <AuthShell
      title={mode === 'signup' ? signupCopy.title : undefined}
      footer={
        <>
          <span className="block text-center text-[15px] text-white/55">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { switchMode('login'); setLoginStep('email'); }}
                  className={FOOTER_ACTION}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { switchMode('signup'); setSignupStep(1 as SignupStep); }}
                  className={FOOTER_ACTION}
                >
                  Create one
                </button>
              </>
            )}
          </span>
          {/* The legal pages are reachable from the first screen, not only from
              the consent checkboxes on the last signup step. Spans, not <p>:
              AuthShell already wraps the footer in a paragraph. */}
          <span className="mt-2 flex items-center justify-center gap-2 text-[14px] text-white/55">
            <button
              type="button"
              onClick={() => onOpenLegalModal('terms')}
              className="-my-1 inline-block rounded-xl px-1 py-2 text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
            >
              Terms of Service
            </button>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <button
              type="button"
              onClick={() => onOpenLegalModal('privacy')}
              className="-my-1 inline-block rounded-xl px-1 py-2 text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
            >
              Privacy Policy
            </button>
          </span>
        </>
      }
    >
      <div className="w-full">
        {mode === 'signup' ? (
          <StepProgress
            className="mb-7"
            current={signupStep}
            total={4}
            labels={SIGNUP_STEPS.map((s) => s.label)}
            onSelect={(step) => setSignupStep(step as SignupStep)}
          />
        ) : null}

        <div key={panelKey} className="animate-rise">
          {/* ═══ SIGNUP STEP 1 ═══ */}
          {mode === 'signup' && signupStep === 1 && (
          <SignupStep1
            key="signup-step-1"
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            setEmail={setEmail}
            username={username}
            setUsername={setUsername}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            checkUsername={checkUsername}
            usernameStatus={usernameStatus}
            usernameMessage={usernameMessage}
            usernameSuggestions={usernameSuggestions}
            emailCheckStatus={emailCheckStatus}
            isSubmitting={isSubmitting}
            step1Complete={step1Complete}
            onSwitchToLogin={() => { switchMode('login'); setLoginStep('email'); }}
            onSubmit={handleSignupSubmit}
          />
        )}

        {/* ═══ SIGNUP STEP 2 ═══ */}
        {mode === 'signup' && signupStep === 2 && (
          <SignupStep2
            key="signup-step-2"
            gender={gender}
            setGender={setGender}
            dob={dob}
            setDob={setDob}
            jobRole={jobRole}
            setJobRole={setJobRole}
            jobCompany={jobCompany}
            setJobCompany={setJobCompany}
            jobPlace={jobPlace}
            setJobPlace={setJobPlace}
            jobStartedOn={jobStartedOn}
            setJobStartedOn={setJobStartedOn}
            profilePic={profilePic}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onRemoveProfilePic={handleRemoveProfilePic}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            isSubmitting={isSubmitting}
            step2Complete={step2Complete}
            onSubmit={handleSignupSubmit}
          />
        )}

        {/* ═══ SIGNUP STEP 3 ═══ */}
        {mode === 'signup' && signupStep === 3 && (
          <SignupStep3
            key="signup-step-3"
            email={email}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            isSubmitting={isSubmitting}
            isInCooldown={isInCooldown}
            getCooldownRemaining={getCooldownRemaining}
            onResend={handleResendCode}
            onSubmit={handleSignupSubmit}
            remainingSends={remainingSends}
          />
        )}

        {/* ═══ SIGNUP STEP 4 ═══ */}
        {mode === 'signup' && signupStep === 4 && (
          <SignupStep4
            key="signup-step-4"
            email={email}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirm={showConfirm}
            setShowConfirm={setShowConfirm}
            consentTerms={consentTerms}
            setConsentTerms={setConsentTerms}
            consentPrivacy={consentPrivacy}
            setConsentPrivacy={setConsentPrivacy}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            setErrors={setErrors}
            isSubmitting={isSubmitting}
            step4Complete={step4Complete}
            onOpenLegalModal={onOpenLegalModal}
            onSubmit={handleSignupSubmit}
            captcha={
              captchaSiteKey ? (
                <TurnstileCaptcha
                  siteKey={captchaSiteKey}
                  onToken={setCaptchaToken}
                  onError={() => setCaptchaBroken(true)}
                  resetSignal={captchaReset}
                />
              ) : null
            }
            captchaPending={!!captchaSiteKey && !captchaToken && !captchaBroken}
          />
        )}

        {/* ═══ LOGIN EMAIL ═══ */}
        {mode === 'login' && loginStep === 'email' && (
          <LoginEmail
            key="login-email"
            email={email}
            setEmail={setEmail}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            loginProfile={loginProfile}
            isSubmitting={isSubmitting}
            setLoginStep={setLoginStep}
            onSubmit={handleLoginSubmit}
            onMagicLink={() => {
              handleDirectLoginRequest('magic-link');
            }}
            onPasskeySignIn={handlePasskeySignIn}
            noAccountEmail={noAccountEmail}
            onCreateAccount={() => {
              /* Carry the address over — the visitor already typed it, and the
                 sign-up form opens pre-filled with it. */
              setErrors({});
              setTouched({ email: false });
              switchMode('signup');
              setSignupStep(1 as SignupStep);
            }}
            passkeyLoading={isPasskeyLoading}
          />
        )}

        {/* ═══ LOGIN PASSWORD ═══ */}
        {mode === 'login' && loginStep === 'password' && (
          <LoginPassword
            key="login-password"
            email={email}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            loginProfile={loginProfile}
            isSubmitting={isSubmitting}
            setLoginStep={setLoginStep}
            onSwitchAccount={() => { resetLoginPassword(); setLoginStep('email'); }}
            onSubmit={handleLoginSubmit}
            onMoreOptions={() => setLoginStep('more-options')}
            /* Only mounted once the API has actually demanded a challenge, so
               the common case stays a plain password form. */
            captcha={
              captchaSiteKey ? (
                <TurnstileCaptcha
                  siteKey={captchaSiteKey}
                  onToken={setCaptchaToken}
                  onError={() => setCaptchaBroken(true)}
                  resetSignal={captchaReset}
                />
              ) : null
            }
            captchaPending={!!captchaSiteKey && !captchaToken && !captchaBroken}
          />
        )}

        {/* ═══ LOGIN OTP ═══ */}
        {mode === 'login' && loginStep === 'otp' && (
          <LoginOtp
            key="login-otp"
            email={email}
            loginOtpCode={loginOtpCode}
            setLoginOtpCode={setLoginOtpCode}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            loginPending2fa={loginPending2fa}
            isSubmitting={isSubmitting}
            isInCooldown={isInCooldown}
            getCooldownRemaining={getCooldownRemaining}
            onResend={handleLoginOtpResend}
            onSubmit={handleLoginSubmit}
            onBack={goBack}
            remainingSends={remainingSends}
          />
        )}

        {/* ═══ LOGIN 2FA ═══ */}
        {mode === 'login' && loginStep === '2fa' && (
          <Login2FA
            key="login-2fa"
            twoFactorCode={twoFactorCode}
            setTwoFactorCode={setTwoFactorCode}
            backupCode={backupCode}
            setBackupCode={setBackupCode}
            loginWithBackup={loginWithBackup}
            setLoginWithBackup={setLoginWithBackup}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            isSubmitting={isSubmitting}
            setRecoveryMethod={setRecoveryMethod}
            setLoginStep={setLoginStep}
            onSubmit={handleLoginSubmit}
            onBack={goBack}
          />
        )}

        {/* ═══ LOGIN MORE OPTIONS ═══ */}
        {mode === 'login' && loginStep === 'more-options' && (
          <LoginMoreOptions
            key="more-options"
            email={email}
            loginProfile={loginProfile}
            isSubmitting={isSubmitting}
            canSend={canSend}
            remainingSends={remainingSends}
            isInCooldown={isInCooldown}
            getCooldownRemaining={getCooldownRemaining}
            onRequestCode={() => handleDirectLoginRequest('code')}
            onRequestMagicLink={() => handleDirectLoginRequest('magic-link')}
            getMaxSends={getMaxSends}
            refreshRemaining={refreshRemaining}
            getResetAt={getResetAt}
            onRequestForgotPassword={() => handlePasswordResetRequest('otp')}
            onRequestRecoveryEmail={() => handlePasswordResetRequest('recovery')}
            onBack={goBack}
          />
        )}

        {/* ═══ LOGIN RECOVERY ═══ */}
        {mode === 'login' && loginStep === 'recovery' && (
          <LoginRecovery
            key="login-recovery"
            email={email}
            loginProfile={loginProfile}
            recoveryMethod={recoveryMethod}
            recoveryStage={recoveryStage}
            recoveryCode={recoveryCode}
            setRecoveryCode={setRecoveryCode}
            isSubmitting={isSubmitting}
            isInCooldown={isInCooldown}
            getCooldownRemaining={getCooldownRemaining}
            onResend={handleResendRecoveryCode}
            onBack={goBack}
            onSubmitCode={handleRecoveryCodeSubmit}
            onSubmitNewPassword={handleRecoveryNewPassword}
            remainingSends={remainingSends}
          />
          )}
        </div>
      </div>

      {/* Image Crop Editor — deliberately outside the keyed step panel: it is a
          modal over the current step, and remounting it would drop the canvas
          mid-crop. */}
      {showImageEditor && tempImageUrl && (
        <React.Suspense fallback={null}>
          <ImageCropEditor
            imageUrl={tempImageUrl}
            onCrop={handleCropImage}
            onCancel={handleCancelImageEditor}
            outputSize={512}
          />
        </React.Suspense>
      )}
    </AuthShell>
  );
};
