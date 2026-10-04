'use client';

import React from 'react';
import { Field, PrimaryButton, OAuthRow, OrDivider } from '../../ui/ig-ui';

export const SignupStep1: React.FC<{
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  checkUsername: (value: string) => void;
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  usernameMessage: string;
  usernameSuggestions: string[];
  emailCheckStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  isSubmitting: boolean;
  step1Complete: boolean;
  onSwitchToLogin: () => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({
  firstName, setFirstName, lastName, setLastName, email, setEmail,
  username, setUsername, errors, touched, handleBlur, checkUsername,
  usernameStatus, usernameMessage, usernameSuggestions, emailCheckStatus,
  isSubmitting, step1Complete, onSwitchToLogin, onSubmit,
}) => {
  const showFirstNameError = touched.firstName && errors.firstName;
  const showLastNameError = touched.lastName && errors.lastName;
  const showEmailError = touched.email && errors.email;
  const showUsernameError = touched.username && errors.username;

  const preventEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  let emailHint: React.ReactNode = undefined;
  if (!showEmailError) {
    if (emailCheckStatus === 'taken') {
      emailHint = <span className="text-danger">An account with this email already exists</span>;
    } else if (emailCheckStatus === 'checking') {
      emailHint = <span className="text-white/50">Checking availability...</span>;
    } else if (emailCheckStatus === 'error') {
      emailHint = <span className="text-danger">Unable to check email availability</span>;
    } else if (emailCheckStatus === 'available' && email.includes('@')) {
      emailHint = <span className="text-[var(--tb-success)]">Email is available</span>;
    }
  }

  let usernameHint: React.ReactNode = undefined;
  if (!showUsernameError) {
    if (usernameStatus === 'checking') {
      usernameHint = <span className="text-white/50">{usernameMessage || 'Checking availability...'}</span>;
    } else if (usernameStatus === 'available') {
      usernameHint = <span className="text-[var(--tb-success)]">{usernameMessage}</span>;
    } else if (usernameStatus === 'taken') {
      usernameHint = <span className="text-danger">{usernameMessage}</span>;
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <OAuthRow disabled={isSubmitting} />

      <OrDivider label="or" />

      {/* Name fields */}
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
        <Field
          label="First name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onBlur={() => handleBlur('firstName')}
          onKeyDown={preventEnter}
          error={showFirstNameError ? errors.firstName : undefined}
        />
        <Field
          label="Last name"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onBlur={() => handleBlur('lastName')}
          onKeyDown={preventEnter}
          error={showLastNameError ? errors.lastName : undefined}
        />
      </div>

      {/* Email */}
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur('email')}
        autoComplete="email"
        onKeyDown={preventEnter}
        error={showEmailError ? errors.email : undefined}
        hint={emailHint}
      />

      {/* Username */}
      <Field
        label="Username"
        type="text"
        value={username}
        onChange={(e) => {
          const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
          setUsername(v);
        }}
        onBlur={() => handleBlur('username')}
        maxLength={30}
        autoComplete="username"
        onKeyDown={preventEnter}
        error={showUsernameError ? errors.username : undefined}
        hint={usernameHint}
      />

      {usernameSuggestions.length > 0 && !showUsernameError && (
        <div className="-mt-3 grid grid-cols-2 gap-2.5">
          {usernameSuggestions.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setUsername(s)}
              className="truncate rounded-xl border border-white/15 px-3 py-2.5 text-left text-[15px] text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              @{s}
            </button>
          ))}
        </div>
      )}

      <PrimaryButton type="submit" disabled={!step1Complete} loading={isSubmitting}>
        Continue
      </PrimaryButton>
    </form>
  );
};

SignupStep1.displayName = 'SignupStep1';
