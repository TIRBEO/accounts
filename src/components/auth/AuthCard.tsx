import React, { useState } from 'react';
import gsap from 'gsap';
import { redirectBlockedToDashboard } from '../../lib/redirect';
const ImageCropEditor = React.lazy(() => import('../ImageCropEditor'));
import { uploadAvatarViaApi } from '../../lib/api';
import { clearSessionTrace } from '../../lib/sessionSync';
import { AuthShell } from '../ui/ig-ui';
import { TurnstileCaptcha } from './TurnstileCaptcha';
import { TURNSTILE_SITE_KEY } from '../../lib/turnstile';

/**
 * Switching between sign in and sign up is navigation, not a task. It gets
 * highlighted type rather than a filled box: bold, full-contrast, with a real
 * 44px hit area so it is still comfortable to tap. A second box down here just
 * competes with the one action the screen is actually asking for.
 */
const FOOTER_ACTION =
  'inline-flex min-h-11 items-center rounded-full px-1 text-[17px] font-bold tracking-[-0.01em] ' +
  'text-fg underline decoration-border-strong decoration-2 underline-offset-[6px] ' +
  'transition-colors duration-150 hover:decoration-fg ' +
  'focus-visible:outline-none focus-visible:underline focus-visible:decoration-fg ' +
  'focus-visible:shadow-[0_0_0_2px_var(--ring)]';
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
import { trackEvent, trackError, emailDomain } from '../../lib/telemetry';
import { PasskeyError, authenticatePasskey } from '../../lib/passkeys';
import { haptic } from '../../lib/haptics';
import { useAuthForm } from './useAuthForm';
import { SignupStep1 } from './signup/SignupStep1';
import { SignupStep2 } from './signup/SignupStep2';
import { SignupStep3 } from './signup/SignupStep3';
import { SignupStep4 } from './signup/SignupStep4';
import { LoginEmail } from './login/LoginEmail';
import { LoginOtp } from './login/LoginOtp';
import { Login2FA } from './login/Login2FA';
import { LoginMoreOptions } from './login/LoginMoreOptions';
import { MagicLinkSentPage } from './MagicLinkSentPage';
import { LoginForgot } from './login/LoginForgot';
import { LoginRecovery } from './login/LoginRecovery';

interface AuthCardProps {
  onSuccessAuth: (email: string, provider: string) => void;
  onShowToast: (msg: string) => void;
}

type SignupStep = 1 | 2 | 3 | 4;

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccessAuth,
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
      loginNotice, setLoginNotice,
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
    } = form;

  /* Inline error/success line for the login screens — replaces toasts. */
  const notice = (msg: string, tone: 'error' | 'success' = 'error') =>
    setLoginNotice({ msg, tone });

  /* A rejected guess leaves its error line up. Once the reader starts typing a
     different code, that message describes nothing on the screen — and it
     survives into the password step, where it reads as though the code they
     just entered was rejected. */
  const changeRecoveryCode = (value: string) => {
    setRecoveryCode(value);
    if (loginNotice?.tone === 'error') setLoginNotice(null);
  };

  /* ── Deep links from auth emails ──
     Password-reset links land as ?token=…, magic-link failures as
     ?error=magic_link_invalid, and "request a new link" returns with a
     pre-fill ?email=. Consumed once on mount, then the query is stripped so
     a refresh doesn't re-fire it. */
  const deepLinked = React.useRef(false);
  React.useEffect(() => {
    if (deepLinked.current) return;
    deepLinked.current = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    const seededEmail = params.get('email');
    if (!token && !error && !seededEmail) return;
    if (error === 'magic_link_invalid') {
      notice('That sign-in link is invalid or has expired — request a new one.');
    } else if (error) {
      /* OAuth callbacks that fail server-side redirect here with ?error=…&ref=…
         — the ref is the event ID recorded in the admin ledger, so what the
         person sees and what staff can look up are the same code. */
      const ref = (params.get('ref') || '').replace(/[^0-9a-f-]/gi, '').slice(0, 16);
      notice(ref && ref.includes('-')
        ? `Something went wrong with that sign-in. Please try again. (Ref: ${ref})`
        : 'Something went wrong with that link. Please try again.');
    }
    if (seededEmail && /^[^<>"'\s]+@[^<>"'\s]+\.[^<>"'\s]+$/.test(seededEmail)) {
      setEmail(seededEmail);
    }
    if (token) {
      switchMode('login');
      setLoginStep('recovery');
      setRecoveryMethod('code');
      setRecoveryStage('password');
      setResetToken(token);
    }
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lockAccount = (result: { block?: BlockInfo | null }): boolean => {
    if (!result.block) return false;
    haptic('error');
    setIsSubmitting(false);
    void redirectBlockedToDashboard(result.block);
    return true;
  };

  /* An address with no account must not be able to reach the forgot/reset
     flow. Returns false (and shows the inline error) only on a CONFIRMED
     "no account" from the server; a failed check fails OPEN so a flaky
     endpoint never locks out a real user. */
  const MISSING_COPY = 'No Tirbeo account found for this email.';
  const assertAccountExists = async (): Promise<boolean> => {
    if (validateEmail(email)) return true;
    if (loginProfile && loginProfile.email === email) {
      if (loginProfile.exists === false) {
        setErrors({ email: MISSING_COPY });
        setTouched({ email: true });
        haptic('error');
        return false;
      }
      return true;
    }
    const res = await checkEmailExists(email);
    if (res.ok && res.data) {
      const exists = !!res.data.exists;
      setLoginProfile({
        email,
        exists,
        photoUrl: res.data.photoUrl,
        name: res.data.name,
        hasRecoveryEmail: !!res.data.hasRecoveryEmail,
        recoveryEmail: res.data.recoveryEmail,
      });
      if (!exists) {
        setErrors({ email: MISSING_COPY });
        setTouched({ email: true });
        haptic('error');
        return false;
      }
      return true;
    }
    // Could not reach the server → fail OPEN, allow the normal flow.
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
        if (signupStep === 1) {
          trackEvent('auth.signup_start', { metadata: { domain: emailDomain(email) } });
        }
        setSignupStep((signupStep + 1) as SignupStep);
        setIsSubmitting(false);
      } else if (signupStep === 3) {
        const result = await verifySignupOtp(email, verificationCode);
        if (!result.ok) {
          trackEvent('auth.signup_failed', { metadata: { reason: 'otp_invalid', step: 3 } });
          onShowToast(result.error || 'Invalid verification code');
          haptic('error');
          setIsSubmitting(false);
          return;
        }
        trackEvent('auth.otp_verified', { metadata: { flow: 'signup', domain: emailDomain(email) } });
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
            trackEvent('auth.signup_failed', { metadata: { reason: 'captcha_required' } });
            setIsSubmitting(false);
            onShowToast('Please complete the security check, then try again.');
            return;
          }
          const flags = result.data as { usernameTaken?: boolean } | null;
          // A signup can pass every client-side check and still lose the race
          // against a concurrent create of the same email or username. When the
          // server wins, put the person back on the field that is wrong rather
          // than leaving a toast as the only trace of why nothing happened.
          if (flags?.usernameTaken) {
            setSignupStep(1 as SignupStep);
            setErrors({ username: 'This username is already taken. Pick another one.' });
            setTouched({ username: true });
          }
          trackEvent('auth.signup_failed', {
            metadata: { reason: flags?.usernameTaken ? 'username_taken' : 'server_error', status: result.status },
          });
          onShowToast(result.error || 'Error creating account');
          haptic('error');
          captureException(new Error(result.error || 'Signup failed'));
          invalidateCaptcha();
          setIsSubmitting(false);
          return;
        }

        trackEvent('auth.signup_success', { metadata: { domain: emailDomain(email) } });
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
              await updateProfile({ photoUrl: url }).catch((err) => trackError('signup:avatar-attach', err));
            } else if (uploadErr) {
              trackError('signup:avatar-upload', new Error(uploadErr));
            }
          } catch (err) {
            trackError('signup:avatar-upload', err);
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
        clearSessionTrace();
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
      trackError('signup:submit', err);
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
  const handlePasskeySignIn = async (opts?: { auto?: boolean }) => {
    if (isPasskeyLoading) return;
    setIsPasskeyLoading(true);
    try {
      const account = await authenticatePasskey();
      trackEvent('auth.passkey_login', { metadata: { mode: opts?.auto ? 'conditional' : 'explicit' } });
      haptic('success');
      if (account.id) {
        try {
          localStorage.setItem('tirbeo_session_user_id', account.id);
        } catch {}
      }
      onSuccessAuth(account.email || email, 'Passkey');
    } catch (err) {
      const failure = err instanceof PasskeyError ? err : new PasskeyError('Passkey sign-in failed.');
      trackEvent('auth.passkey_failed', {
        detail: failure.message,
        metadata: { stage: 'login', cancelled: Boolean(failure.cancelled) },
      });
      if (!failure.cancelled && !opts?.auto) {
        haptic('error');
        notice(failure.message);
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  /* Passkey autofill: no button anymore — we ask the browser for a passkey
     (conditional mediation) so people with one registered get the native prompt
     straight away. But firing it on EVERY page load/refresh nags: someone who
     dismissed it gets it handed again on the next reload. Gate it to once per
     browser session via sessionStorage — the flag is set the moment we ask, so
     a dismiss does not re-arm it next refresh, and a real sign-in navigates
     away anyway. */
  const autoPasskeyFired = React.useRef(false);
  React.useEffect(() => {
    if (autoPasskeyFired.current) return;
    autoPasskeyFired.current = true;
    let alreadyPrompted = false;
    try { alreadyPrompted = sessionStorage.getItem('tirbeo:passkey-prompted') === '1'; } catch {}
    if (alreadyPrompted) return;
    const t = setTimeout(() => {
      try { sessionStorage.setItem('tirbeo:passkey-prompted', '1'); } catch {}
      void handlePasskeySignIn({ auto: true });
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Email+password credential exchange, shared by the single-page entry
   *  form and the standalone password step. */
  const attemptPasswordLogin = async () => {
    trackEvent('auth.login_submit', { metadata: { domain: emailDomain(email) } });
    const result = await login(email, password, captchaToken);

    if (!result.ok) {
      if (noteCaptchaChallenge(result)) {
        trackEvent('auth.login_failed', { metadata: { reason: 'captcha_required' } });
        /* The Turnstile widget renders right on the single-page login form —
           stay put, the visitor solves it and hits Log in again. */
        notice('Please complete the security check, then try again.');
        return;
      }
      if (lockAccount(result)) return;
      // The token is single-use, so it is spent either way.
      invalidateCaptcha();
      trackEvent('auth.login_failed', { metadata: { reason: 'credentials', status: result.status } });
      notice(result.error || 'Invalid email or password');
      haptic('error');
      captureException(new Error(result.error || 'Login failed'));
      return;
    }

    if (result.data?.needsOtp) {
      const otpRes = await requestLoginOtp(email);
      if (otpRes.ok) {
        trackEvent('auth.otp_sent', { metadata: { flow: 'login', domain: emailDomain(email) } });
        setLoginOtpCode('');
        setLoginStep('otp');
        setLoginPending2fa(!!result.data?.needs2FA);
      } else {
        if (lockAccount(otpRes)) return;
        notice(otpRes.error || 'Failed to send verification code');
      }
      return;
    }

    if (result.data?.needs2FA && result.data?.tempToken) {
      setLoginTempToken(result.data.tempToken);
      setLoginStep('2fa');
      return;
    }

    trackEvent('auth.login_success', { metadata: { method: 'password', domain: emailDomain(email) } });
    onSuccessAuth(email, 'Email & Password');
    haptic('success');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginNotice(null);

    if (loginStep === 'email') {
      const emailError = validateField('email', email);
      if (emailError) {
        setErrors({ email: emailError });
        setTouched({ email: true });
        return;
      }
    } else if (loginStep === 'otp') {
      if (loginOtpCode.length !== 6 || !/^\d{6}$/.test(loginOtpCode)) {
        setErrors({ loginOtpCode: 'Code must be 6 digits' });
        setTouched({ loginOtpCode: true });
        return;
      }
    } else if (loginStep === '2fa') {
      if (loginWithBackup) {
        if (!backupCode.trim()) {
          setErrors({ twoFactorCode: 'Backup code is required' });
          setTouched({ twoFactorCode: true });
          return;
        }
      } else {
        if (twoFactorCode.length !== 6 || !/^\d{6}$/.test(twoFactorCode)) {
          setErrors({ twoFactorCode: 'Code must be 6 digits' });
          setTouched({ twoFactorCode: true });
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
             sign-up route is offered as text, not taken for them. This confirmed
             "no" also gates the forgot/reset path. */
          setErrors({ email: MISSING_COPY });
          setTouched({ email: true });
          haptic('error');
          setNoAccountEmail(email);
          setIsSubmitting(false);
          return;
        }
        setNoAccountEmail(null);
        if (!password.trim()) {
          setErrors({ password: 'Password is required' });
          setTouched({ password: true });
          setIsSubmitting(false);
          return;
        }
        /* Single-page login: credentials go straight to the API. */
        await attemptPasswordLogin();
        setIsSubmitting(false);
      } else if (loginStep === 'otp') {
        const result = await verifyLoginOtp(email, loginOtpCode);

        if (!result.ok) {
          if (lockAccount(result)) return;
          trackEvent('auth.login_failed', { metadata: { reason: 'otp_invalid', status: result.status } });
          notice(result.error || 'Invalid or expired code');
          haptic('error');
          setIsSubmitting(false);
          return;
        }

        trackEvent('auth.otp_verified', { metadata: { flow: 'login', domain: emailDomain(email) } });

        if (result.data?.requiresMfa && result.data?.tempToken) {
          setLoginTempToken(result.data.tempToken);
          setLoginStep('2fa');
          setLoginPending2fa(false);
          setIsSubmitting(false);
          return;
        }

        trackEvent('auth.login_success', { metadata: { method: 'otp', domain: emailDomain(email) } });
        onSuccessAuth(email, 'Email & Password');
        setLoginPending2fa(false);
        haptic('success');
        setIsSubmitting(false);
      } else if (loginStep === '2fa') {
        if (!loginTempToken) {
          notice('Session error. Please try again.');
          setLoginStep('email');
          setIsSubmitting(false);
          return;
        }

        trackEvent('auth.2fa_submit', { metadata: { via: loginWithBackup ? 'backup_code' : 'totp' } });

        let result;
        if (loginWithBackup) {
          result = await recovery2FA(loginTempToken, backupCode);
        } else {
          result = await verify2FA(loginTempToken, twoFactorCode);
        }

        if (!result.ok) {
          if (lockAccount(result)) return;
          trackEvent('auth.2fa_failed', {
            metadata: { via: loginWithBackup ? 'backup_code' : 'totp', status: result.status },
          });
          notice(result.error || (loginWithBackup ? 'Invalid backup code' : 'Invalid 2FA code'));
          haptic('error');
          captureException(new Error(result.error || '2FA verification failed'));
          setIsSubmitting(false);
          return;
        }

        if (loginWithBackup) {
          trackEvent('auth.backup_code_used', { metadata: { domain: emailDomain(email) } });
        }
        trackEvent('auth.login_success', { metadata: { method: '2fa', domain: emailDomain(email) } });
        onSuccessAuth(email, 'Email & Password');
        haptic('success');
        setIsSubmitting(false);
      }
    } catch (err) {
      notice('An unexpected error occurred');
      trackError('login:submit', err);
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
    setLoginNotice(null);
    const result = await sendWithRateLimit('login-otp', () => requestLoginOtp(email), { cooldownKey: 'login-otp' });
    if (result.ok) {
      trackEvent('auth.otp_sent', { metadata: { flow: 'login', purpose: 'resend', domain: emailDomain(email) } });
      setLoginOtpCode('');
      setLoginPending2fa(false);
      setLoginStep('otp');
      notice('Code resent to ' + email, 'success');
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
      notice(limitMsg);
    } else {
      if (lockAccount(result as any)) return;
      notice(result.error || 'Failed to resend code');
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

  const [magicSentPtr, setMagicSentPtr] = useState('');

  const handleDirectLoginRequest = async (method: 'code' | 'magic-link') => {
    setLoginNotice(null);
    if (!(await assertAccountExists())) return;
    const key = method === 'code' ? 'login-otp' : 'magic-link';
    const sendFn = method === 'code'
      ? () => requestLoginOtp(email)
      : () => requestMagicLink(email);
    if (method === 'magic-link') {
      setErrors({});
      setTouched({});
    }
    const result = await sendWithRateLimit(key, sendFn, { cooldownKey: key });
    if (result.ok) {
      if (method === 'code') {
        trackEvent('auth.otp_sent', { metadata: { flow: 'login', purpose: 'direct', domain: emailDomain(email) } });
        setLoginOtpCode('');
        setLoginPending2fa(false);
        setLoginStep('otp');
      } else {
        trackEvent('auth.magic_link_requested', { metadata: { domain: emailDomain(email) } });
        // The sent-page is a step of the login flow, not a separate URL —
        // it opens right here on /login. The ptr stays in component state;
        // only a direct /magic-sent deep link reads it from the query string.
        setMagicSentPtr((result as any).ptr || '');
        setLoginStep('magic-sent');
      }
      return;
    }
    if (result.status === 429) {
      const retryAfterMs = result.retryAfterMs || (result as any).data?.retryAfterMs;
      const resetsAt = (result as any).resetsAt || (retryAfterMs ? Date.now() + retryAfterMs : undefined);
      if (resetsAt) setResetAt(key, resetsAt);
      const retryAfter = resetsAt
        ? Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000))
        : retryAfterMs ? Math.ceil(retryAfterMs / 1000) : 30;
      setCooldowns((prev) => ({ ...prev, [key]: retryAfter }));
      notice(
        resetsAt
          ? `Limit reached for magic link sends${resetCopy(resetsAt)}`
          : (result.error || 'Please wait before requesting again'),
      );
    } else {
      if (lockAccount(result as any)) return;
      notice(result.error || 'Failed to send. Please try again.');
    }
  };

  const handlePasswordResetRequest = async (method: 'otp' | 'recovery') => {
    setLoginNotice(null);
    if (!email) {
      notice('Please enter your email first');
      return;
    }
    /* A reset only makes sense against a real account. If the server says the
       address does not exist, stop here with a clear inline error rather than
       reaching the captcha/reset step for an email that has nothing to reset. */
    if (!(await assertAccountExists())) return;
    const key = method === 'recovery' ? 'recovery' : 'otp';
    const result = await sendWithRateLimit(key, () => requestPasswordReset(email, method), { cooldownKey: key });
    if (result.ok) {
      trackEvent('auth.reset_requested', { metadata: { method, domain: emailDomain(email) } });
      setRecoveryMethod(method === 'recovery' ? 'recovery' : 'code');
      setRecoveryStage('code');
      setRecoveryCode('');
      setResetToken('');
      setErrors({});
      setTouched({});
      setLoginStep('recovery');
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
      notice(
        resetsAt
          ? `Limit reached${resetCopy(resetsAt)}`
          : (result.error || 'Please wait before requesting another code'),
      );
    } else {
      notice(result.error || 'Failed to send the reset code');
    }
  };

  const handleResendRecoveryCode = async () => {
    setLoginNotice(null);
    if (!email) {
      notice('Please enter your email first');
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
      notice(result.error || 'Please wait before requesting another code');
    } else {
      notice(result.error || 'Failed to send the reset code');
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
      notice(result.error || 'Invalid or expired code');
      haptic('error');
      captureException(new Error(result.error || 'Reset code verification failed'));
      return;
    }
    setLoginNotice(null);
    setResetToken(result.data.resetToken);
    setRecoveryStage('password');
  };

  const handleRecoveryNewPassword = async (newPassword: string) => {
    setLoginNotice(null);
    const { error: pwError } = validatePassword(newPassword);
    if (pwError) {
      notice(pwError);
      return;
    }
    if (!resetToken) {
      notice('Session expired. Please request a new code.');
      setResetToken('');
      return;
    }

    setIsSubmitting(true);
    const result = await confirmPasswordReset(resetToken, newPassword);
    setIsSubmitting(false);
    if (!result.ok) {
      notice(result.error || 'Failed to reset password');
      haptic('error');
      captureException(new Error(result.error || 'Password reset failed'));
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setRecoveryStage('code');
    setResetToken('');
    setLoginStep('email');
    notice('Password updated — sign in with your new password.', 'success');
    haptic('success');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginNotice(null);
    const emailError = validateField('email', email);
    if (emailError) {
      setErrors({ email: emailError });
      setTouched({ email: true });
      return;
    }
    setErrors({});
    setTouched({});
    await handlePasswordResetRequest('otp');
  };

  const goBack = () => {
    setErrors({});
    setTouched({});
    setLoginNotice(null);
    if (mode === 'signup' && signupStep > 1) {
      setSignupStep((signupStep - 1) as SignupStep);
    } else if (mode === 'login') {
      if (loginStep !== 'email') {
        setPassword('');
        setLoginStep('email');
        setLoginPending2fa(false);
        setResetToken('');
        setRecoveryCode('');
        setErrors({});
        setTouched({});
      }
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
    { title: 'Create your account', label: 'Your details', sub: 'Tell us who you are so friends can find you.' },
    { title: 'Tell us about you', label: 'About you', sub: 'Add a photo and your birthday to finish your profile.' },
    { title: 'Verify your email', label: 'Verify email', sub: "We sent a 6-digit code to confirm it's really you." },
    { title: 'Secure your account', label: 'Set password', sub: 'Pick a strong password you will remember.' },
  ] as const;

  const signupCopy = SIGNUP_STEPS[signupStep - 1];
  /* Remounts the panel on every step change so the enter animation replays. */
  const panelKey = `${mode}:${signupStep}:${loginStep}`;

  const isLoginEntry = mode === 'login' && loginStep === 'email';
  const isSignupEntry = mode === 'signup' && signupStep === 1;

  /* Wizard chrome is signup-only — login's step count is unknowable up
     front (an OTP challenge only sometimes appears), so it stays a plain
     panel. */
  const wizard = mode === 'signup' ? { index: signupStep, total: 4, label: signupCopy.label } : undefined;
  const canGoBack = mode === 'signup' && signupStep > 1;

  /* GSAP transition — the panel slides up + fades in on every step/mode
     change. No loaders, just motion. */
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
  }, [panelKey]);

  return (
    <AuthShell
      step={wizard}
      onBack={canGoBack ? goBack : undefined}
      className={mode === 'signup' ? 'mode-signup' : 'mode-login'}
      title={mode === 'signup' ? signupCopy.title : isLoginEntry ? 'Welcome to Tirbeo' : undefined}
      subtitle={mode === 'signup' ? signupCopy.sub : isLoginEntry ? 'Sign in and see what everyone is sharing today.' : undefined}
      kicker={undefined}
      footer={
        <>
          <span className="block text-center text-[15px] text-text-3">
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
                <span className="block text-center text-[15px] text-text-3">
                  Don&apos;t have an account?
                </span>
                <button
                  type="button"
                  onClick={() => { switchMode('signup'); setSignupStep(1 as SignupStep); }}
                  className="create-pill"
                >
                  Create new account
                </button>
              </>
            )}
          </span>
        </>
      }
    >
      <div className="w-full">
        <div key={panelKey} ref={panelRef}>
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
            onSubmit={handleLoginSubmit}
            onForgot={async () => {
              /* An address with no account has nothing to recover — check
                 before leaving the login screen, not after. */
              if (!(await assertAccountExists())) return;
              setErrors({});
              setTouched({});
              setLoginNotice(null);
              setLoginStep('forgot');
            }}
            onMoreOptions={async () => {
              /* Same gate for the code / magic-link / reset list: a
                 non-existent email never gets this far. */
              if (!(await assertAccountExists())) return;
              setLoginNotice(null);
              setLoginStep('more-options');
            }}
            onMagicLink={() => {
              handleDirectLoginRequest('magic-link');
            }}
            onPasskeySignIn={handlePasskeySignIn}
            /* Only mounted once the API has actually demanded a challenge, so
               the common case stays a plain login form. */
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
            noAccountEmail={noAccountEmail}
            loginNotice={loginNotice}
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
            loginNotice={loginNotice}
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
            loginNotice={loginNotice}
          />
        )}

        {/* ═══ LOGIN MORE OPTIONS ═══ */}
        {mode === 'login' && loginStep === 'more-options' && (
          <LoginMoreOptions
            key="more-options"
            email={email}
            setEmail={setEmail}
            setLoginProfile={setLoginProfile}
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
            loginNotice={loginNotice}
          />
        )}

        {/* ═══ LOGIN MAGIC LINK SENT — inline step, no separate URL ═══ */}
        {mode === 'login' && loginStep === 'magic-sent' && (
          <MagicLinkSentPage
            key="magic-sent"
            email={email}
            ptr={magicSentPtr}
            onClose={() => setLoginStep('more-options')}
          />
        )}

        {/* ═══ LOGIN FORGOT PASSWORD ═══ */}
        {mode === 'login' && loginStep === 'forgot' && (
          <LoginForgot
            key="login-forgot"
            email={email}
            setEmail={setEmail}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            isSubmitting={isSubmitting}
            onSubmit={handleForgotSubmit}
            onBack={goBack}
            loginNotice={loginNotice}
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
            setRecoveryCode={changeRecoveryCode}
            isSubmitting={isSubmitting}
            isInCooldown={isInCooldown}
            getCooldownRemaining={getCooldownRemaining}
            onResend={handleResendRecoveryCode}
            onBack={goBack}
            onSubmitCode={handleRecoveryCodeSubmit}
            onSubmitNewPassword={handleRecoveryNewPassword}
            remainingSends={remainingSends}
            loginNotice={loginNotice}
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
