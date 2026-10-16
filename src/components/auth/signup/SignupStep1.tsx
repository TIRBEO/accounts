'use client';

import React from 'react';
import { Field, PrimaryButton, OAuthRow, OrDivider } from '../../ui/ig-ui';
import { validateEmail } from '../../../lib/validations';

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
      emailHint = <span className="text-danger-text">An account with this email already exists</span>;
    } else if (emailCheckStatus === 'checking') {
      emailHint = <span className="text-text-4">Checking availability...</span>;
    } else if (emailCheckStatus === 'error') {
      // Not a refusal: the account may well be free, we just could not ask.
      // Signing up still goes through, and the server is what decides.
      emailHint = <span className="text-text-4">Couldn't check right now — you can continue</span>;
    } else if (emailCheckStatus === 'available' && !validateEmail(email)) {
      emailHint = <span className="text-[var(--tb-success)]">Email is available</span>;
    }
  }

  let usernameHint: React.ReactNode = undefined;
  if (!showUsernameError) {
    if (usernameStatus === 'checking') {
      usernameHint = <span className="text-text-4">{usernameMessage || 'Checking availability...'}</span>;
    } else if (usernameStatus === 'available') {
      usernameHint = <span className="text-[var(--tb-success)]">{usernameMessage}</span>;
    } else if (usernameStatus === 'taken') {
      usernameHint = <span className="text-danger-text">{usernameMessage}</span>;
    } else if (usernameStatus === 'error') {
      usernameHint = <span className="text-text-4">{usernameMessage || "Couldn't check right now — you can continue"}</span>;
    }
  }

  return (
    <form className="space-y-3 text-left" onSubmit={onSubmit}>
      <OAuthRow disabled={isSubmitting} />

      <div className="signup-fields">
      <OrDivider label="or" />

      {/* Placeholder-only plates — same recipe as the login form. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          type="text"
          placeholder="First name"
          aria-label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onBlur={() => handleBlur('firstName')}
          onKeyDown={preventEnter}
          autoComplete="given-name"
          error={showFirstNameError ? errors.firstName : undefined}
        />
        <Field
          type="text"
          placeholder="Last name"
          aria-label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onBlur={() => handleBlur('lastName')}
          onKeyDown={preventEnter}
          autoComplete="family-name"
          error={showLastNameError ? errors.lastName : undefined}
        />
      </div>

      {/* Email */}
      <Field
        type="email"
       
        placeholder="Email"
        aria-label="Email"
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
        type="text"
       
        placeholder="Username"
        aria-label="Username"
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
        <div className="-mt-1 grid grid-cols-2 gap-2">
          {usernameSuggestions.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setUsername(s)}
              className="truncate rounded-lg border border-border-strong bg-field px-3 py-2 text-left text-[14px] text-text-2 transition-colors hover:border-border-hover hover:bg-hover hover:text-fg"
            >
              @{s}
            </button>
          ))}
        </div>
      )}

      <PrimaryButton type="submit" disabled={!step1Complete} loading={isSubmitting} className="mt-4">
        Next
      </PrimaryButton>
      </div>
    </form>
  );
};

SignupStep1.displayName = 'SignupStep1';
