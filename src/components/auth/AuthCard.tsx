import React from 'react';
import { Loader2 } from 'lucide-react';
import { redirectBlockedToDashboard } from '../../lib/redirect';
const ImageCropEditor = React.lazy(() => import('../ImageCropEditor'));
import { uploadAvatarViaApi } from '../../lib/api';
import { getRedirectTarget } from '../../lib/redirect';
import { RADIUS, TYPOGRAPHY, TRANSITIONS } from '../../lib/design';
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
} from '../../lib/api';
import type { BlockInfo } from '../../lib/api';
import { validatePassword, validateEmail, validateUsername, validateDob } from '../../lib/validations';
import { Sentry } from '../../lib/sentry';
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

  const {
    mode, switchMode,
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
    cooldowns, setCooldowns, isInCooldown, getCooldownRemaining, startCooldown,
    canSend, incrementSend, remainingSends,
    errors, setErrors,
    touched, setTouched,
    validateField, handleBlur, validateStep,
    usernameStatus, usernameMessage, usernameSuggestions,
    emailCheckStatus,
    checkUsername,
    resetToHome, clearValidation, resetLoginPassword, resetRecovery,
  } = form;

  const COOLDOWN_SECONDS = 30;

  const lockAccount = (result: { block?: BlockInfo | null }): boolean => {
    if (!result.block) return false;
    haptic('error');
    setIsSubmitting(false);
    void redirectBlockedToDashboard(result.block);
    return true;
  };

  const handlePasskeyLogin = () => {
    onShowToast('Signed in with passkey');
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 500);
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
          occupation: occupation || undefined,
          companyName: company || undefined,
          role: role || undefined,
          policyAccepted: consentTerms && consentPrivacy,
          otpCode: verificationCode,
        });

        if (!result.ok) {
          onShowToast(result.error || 'Error creating account');
          haptic('error');
          Sentry.captureException(new Error(result.error || 'Signup failed'));
          setIsSubmitting(false);
          return;
        }

        const userId = result.data?.id;
        if (userId && profilePic) {
          try {
            // Convert data URL to Blob for API upload
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

        onSuccessAuth(email, 'Email Registration');
        haptic('success');
      }
    } catch (err) {
      onShowToast('An unexpected error occurred');
      Sentry.captureException(err);
      haptic('error');
      setIsSubmitting(false);
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
          if (res.ok && res.data?.exists) {
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
          setErrors({ email: 'No account found with this email' });
          setTouched({ email: true });
          onShowToast('No account found with this email');
          setIsSubmitting(false);
          return;
        }
        setLoginStep('password');
        setIsSubmitting(false);
      } else if (loginStep === 'password') {
        const result = await login(email, password);

        if (!result.ok) {
          if (lockAccount(result)) return;
          onShowToast(result.error || 'Invalid email or password');
          haptic('error');
          Sentry.captureException(new Error(result.error || 'Login failed'));
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
          Sentry.captureException(new Error(result.error || '2FA verification failed'));
          setIsSubmitting(false);
          return;
        }

        onSuccessAuth(email, 'Email & Password');
        haptic('success');
        setIsSubmitting(false);
      }
    } catch (err) {
      onShowToast('An unexpected error occurred');
      Sentry.captureException(err);
      haptic('error');
      setIsSubmitting(false);
    }
  };

  const handleLoginOtpResend = async () => {
    if (!email || isInCooldown('login-otp')) return;
    setIsSubmitting(true);
    const result = await requestLoginOtp(email);
    setIsSubmitting(false);
    if (result.ok) {
      incrementSend('login-otp');
      startCooldown('login-otp');
      onShowToast('Verification code resent to ' + email);
    } else if (result.status === 429) {
      incrementSend('login-otp');
      const seconds = result.data?.retryAfterMs ? Math.ceil(result.data.retryAfterMs / 1000) : COOLDOWN_SECONDS;
      setCooldowns((prev) => ({ ...prev, 'login-otp': seconds }));
      onShowToast(result.error || 'Please wait before resending');
    } else {
      if (lockAccount(result)) return;
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

  const handleCooldown = (method: string, retryAfterMs?: number) => {
    const seconds = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : COOLDOWN_SECONDS;
    setCooldowns((prev) => ({ ...prev, [method]: seconds }));
  };

  const handleDirectLoginRequest = async (method: 'code' | 'magic-link') => {
    if (!email) {
      onShowToast('Please enter your email first');
      return;
    }
    const otpKey = method === 'code' ? 'login-otp' : method;
    if (!canSend(otpKey)) {
      onShowToast('Maximum sends reached. Please try again later.');
      return;
    }
    if (isInCooldown(otpKey)) {
      onShowToast(`Please wait ${getCooldownRemaining(otpKey)}s before sending again`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (method === 'code') {
        const result = await requestLoginOtp(email);
        if (!result.ok) {
          if (lockAccount(result)) return;
          if (result.status === 429) {
            incrementSend(otpKey);
            handleCooldown(otpKey, result.data?.retryAfterMs);
            onShowToast(result.error || 'Please wait before requesting another code');
          } else {
            onShowToast(result.error || 'Failed to send the code');
          }
          return;
        }
        incrementSend(otpKey);
        startCooldown(otpKey);
        setLoginOtpCode('');
        setLoginPending2fa(false);
        setLoginStep('otp');
        onShowToast('One-time code sent to ' + email);
      } else {
        const result = await requestMagicLink(email);
        if (!result.ok) {
          if (result.status === 429) {
            incrementSend(method);
            handleCooldown(method, result.retryAfterMs);
            onShowToast(result.error || 'Please wait before requesting another magic link');
          } else {
            onShowToast(result.error || 'Failed to send magic link');
          }
          return;
        }
        incrementSend(method);
        startCooldown(method);
        setRecoveryMethod('magic-link');
        setRecoveryStage('code');
        setRecoveryCode('');
        setErrors({});
        setTouched({});
        setLoginStep('recovery');
        onShowToast('Magic link sent to ' + email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async (method: 'otp' | 'recovery') => {
    if (!email) {
      onShowToast('Please enter your email first');
      return;
    }
    const uiKey = method === 'recovery' ? 'recovery' : 'otp';
    if (!canSend(uiKey)) {
      onShowToast('Maximum sends reached. Please try again later.');
      return;
    }
    if (isInCooldown(uiKey)) {
      onShowToast(`Please wait ${getCooldownRemaining(uiKey)}s before sending again`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email, method);
      if (!result.ok) {
        if (result.status === 429) {
          incrementSend(uiKey);
          handleCooldown(uiKey, result.data?.retryAfterMs);
          onShowToast(result.error || 'Please wait before requesting another code');
        } else {
          onShowToast(result.error || 'Failed to send the reset code');
        }
        return;
      }
      incrementSend(uiKey);
      startCooldown(uiKey);
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
    } finally {
      setIsSubmitting(false);
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
    await handlePasswordResetRequest(recoveryMethod === 'recovery' ? 'recovery' : 'otp');
  };

  const handleResendCode = async () => {
    if (isInCooldown('signup-otp')) return;

    try {
      const result = await requestSignupOtp(email);
      if (!result.ok) {
        if (result.status === 429) {
          incrementSend('signup-otp');
          onShowToast(result.error || 'Please wait before resending');
        } else {
          onShowToast(result.error || 'Error sending verification code');
        }
        return;
      }
      incrementSend('signup-otp');
      startCooldown('signup-otp');
      onShowToast('Verification code resent to ' + email);
    } catch (err) {
      onShowToast('Error sending verification code');
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
      Sentry.captureException(new Error(result.error || 'Reset code verification failed'));
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
      Sentry.captureException(new Error(result.error || 'Password reset failed'));
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

  const getProviderDisplayName = () => {
    if (email.includes('@gmail.com')) return 'Google';
    if (email.includes('@outlook.com') || email.includes('@hotmail.com')) return 'Microsoft';
    if (email.includes('@yahoo.com')) return 'Yahoo';
    return 'Email';
  };

  const stepLabels = ['Basics', 'Details', 'Verify', 'Create'];

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

  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      minHeight: 'calc(100vh - 72px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
      padding: '32px 20px 64px',
    }}>
      <main className="auth-main" style={{
        width: '100%',
        maxWidth: mode === 'signup' && signupStep === 2 ? '860px' : '600px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '32px 20px 64px',
        transition: 'max-width 200ms ease',
      }}>
        {/* Main card */}
        <div
          className="auth-card"
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: mode === 'signup' && signupStep === 2 ? '40px 44px' : '52px 56px',
            boxSizing: 'border-box',
            opacity: 1,
          }}
        >
          <div>
            <div style={{ position: 'relative' }}>
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
                  occupation={occupation}
                  setOccupation={setOccupation}
                  company={company}
                  setCompany={setCompany}
                  role={role}
                  setRole={setRole}
                  profilePic={profilePic}
                  fileInputRef={fileInputRef}
                  onFileSelect={handleFileSelect}
                  onRemoveProfilePic={handleRemoveProfilePic}
                  errors={errors}
                  touched={touched}
                  handleBlur={handleBlur}
                  validateField={validateField}
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
                  onPasskeyLogin={handlePasskeyLogin}
                  onMagicLink={() => {
                    handleDirectLoginRequest('magic-link');
                  }}
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
        </div>

        {/* Sign up / Log in bottom card */}
        <div
          className="auth-card-bottom"
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '24px',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <p style={{
            fontSize: '16px',
            color: '#707070',
            fontFamily: TYPOGRAPHY.fontFamily,
            margin: 0,
          }}>
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { switchMode('login'); setLoginStep('email'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0095f6',
                    fontSize: '16px',
                    fontWeight: 600,
                    fontFamily: TYPOGRAPHY.fontFamily,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { switchMode('signup'); setSignupStep(1 as SignupStep); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0095f6',
                    fontSize: '16px',
                    fontWeight: 600,
                    fontFamily: TYPOGRAPHY.fontFamily,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </main>

      {/* Image Crop Editor */}
      {showImageEditor && tempImageUrl && (
        <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}><Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#707070' }} /></div>}>
          <ImageCropEditor
            imageUrl={tempImageUrl}
            onCrop={handleCropImage}
            onCancel={handleCancelImageEditor}
            outputSize={512}
          />
        </React.Suspense>
      )}
    </div>
  );
};
