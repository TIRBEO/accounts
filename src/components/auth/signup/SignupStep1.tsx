'use client';

import React from 'react';
import { Field, OrDivider, OAuthRow, PrimaryButton } from '../../ui/ig-ui';
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
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  usernameMessage: string;
  usernameSuggestions: string[];
  emailCheckStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  isSubmitting: boolean;
  step1Complete: boolean;
  onSubmit: (e: React.FormEvent) => void;
}> = ({
  firstName, setFirstName, lastName, setLastName, email, setEmail,
  username, setUsername, errors, touched, handleBlur,
  usernameStatus, usernameMessage, usernameSuggestions, emailCheckStatus,
  isSubmitting, step1Complete, onSubmit,
}) => {
  const showFirstNameError = touched.firstName && errors.firstName;
  const showLastNameError = touched.lastName && errors.lastName;
  const showEmailError = touched.email && errors.email;
  const showUsernameError = touched.username && errors.username;

  // Field already wraps a hint in `.tb-hint`, so the slots below carry tone only.
  let emailHint: React.ReactNode = undefined;
  if (!showEmailError) {
    if (emailCheckStatus === 'taken') {
      emailHint = <span className="field-note-danger">An account with this email already exists</span>;
    } else if (emailCheckStatus === 'checking') {
      emailHint = 'Checking availability…';
    } else if (emailCheckStatus === 'error') {
      // Not a refusal: the account may well be free, we just could not ask.
      // Signing up still goes through, and the server is what decides.
      emailHint = "Couldn't check right now — you can continue";
    } else if (emailCheckStatus === 'available' && !validateEmail(email)) {
      emailHint = <span className="tb-hint-ok">Email is available</span>;
    }
  }

  let usernameHint: React.ReactNode = undefined;
  if (!showUsernameError) {
    if (usernameStatus === 'checking') {
      usernameHint = usernameMessage || 'Checking availability…';
    } else if (usernameStatus === 'available') {
      usernameHint = <span className="tb-hint-ok">{usernameMessage}</span>;
    } else if (usernameStatus === 'taken') {
      usernameHint = <span className="field-note-danger">{usernameMessage}</span>;
    } else if (usernameStatus === 'error') {
      usernameHint = usernameMessage || "Couldn't check right now — you can continue";
    }
  }

  return (
    <form className="signup-fields" onSubmit={onSubmit} noValidate>
      {/* Labeled fields — the main site's recipe: small semibold label
          above a solid rounded plate. */}
      <div className="name-grid">
        <Field
          type="text"
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onBlur={() => handleBlur('firstName')}
          autoComplete="given-name"
          error={showFirstNameError ? errors.firstName : undefined}
        />
        <Field
          type="text"
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onBlur={() => handleBlur('lastName')}
          autoComplete="family-name"
          error={showLastNameError ? errors.lastName : undefined}
        />
      </div>

      <Field
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur('email')}
        autoComplete="email"
        error={showEmailError ? errors.email : undefined}
        hint={emailHint}
      />

      <Field
        type="text"
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        onBlur={() => handleBlur('username')}
        maxLength={30}
        autoComplete="username"
        error={showUsernameError ? errors.username : undefined}
        hint={usernameHint}
      />

      {usernameSuggestions.length > 0 && !showUsernameError && (
        <div className="name-suggest">
          {usernameSuggestions.slice(0, 4).map((s) => (
            <button key={s} type="button" onClick={() => setUsername(s)} className="name-suggest-pill">
              @{s}
            </button>
          ))}
        </div>
      )}

      <PrimaryButton type="submit" disabled={!step1Complete} loading={isSubmitting}>
        Next
      </PrimaryButton>

      {/* The sign-up form is the action; creating the account with a provider
          is an alternative to it, so it sits under the one fill — same block
          the login screen uses. */}
      <div className="login-alts">
        <OrDivider label="or" />
        <OAuthRow disabled={isSubmitting} />
      </div>
    </form>
  );
};

SignupStep1.displayName = 'SignupStep1';
