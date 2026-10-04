// ═══ FORM VALIDATION UTILITIES ═══
// Pure functions extracted from AuthCard for reuse across auth components.

export interface FormErrors {
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
  jobRole?: string;
  jobCompany?: string;
  jobPlace?: string;
  jobStartedOn?: string;
  consentTerms?: string;
  consentPrivacy?: string;
}

export const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  if (email.length > 254) return 'Email is too long';
  return undefined;
};

export const validatePassword = (password: string): { error?: string; strength: number } => {
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

export const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return undefined;
};

export const validateUsername = (username: string): string | undefined => {
  if (!username.trim()) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Only letters, numbers, hyphens, and underscores allowed';
  if (/^[-_]/.test(username)) return 'Username cannot start with a hyphen or underscore';
  return undefined;
};

export const validateName = (name: string, field: string): string | undefined => {
  if (name && name.length > 100) return `${field} must be 100 characters or less`;
  if (name && /\d/.test(name)) return `${field} cannot contain numbers`;
  return undefined;
};

export const validateVerificationCode = (code: string): string | undefined => {
  if (!code) return 'Verification code is required';
  if (code.length !== 6) return 'Code must be 6 digits';
  if (!/^\d{6}$/.test(code)) return 'Code must contain only numbers';
  return undefined;
};

export const validateTwoFactorCode = (code: string): string | undefined => {
  if (!code) return '2FA code is required';
  if (code.length !== 6) return 'Code must be 6 digits';
  if (!/^\d{6}$/.test(code)) return 'Code must contain only numbers';
  return undefined;
};

export const validateDob = (dob: string): string | undefined => {
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

export type SignupStep = 1 | 2 | 3 | 4;
export type LoginStep = 'email' | 'password' | 'otp' | '2fa' | 'recovery' | 'more-options';
