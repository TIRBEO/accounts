"use client";

import React from "react";
// LoginEmail — the whole sign-in screen: two fields, one action, then the
// alternatives underneath it, quiet.
import type { LoginStep } from "../../../lib/validations";
import {
  Field,
  FormNotice,
  PasswordField,
  OrDivider,
  PrimaryButton,
  OAuthRow,
} from "../../ui/ig-ui";

interface LoginEmailProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  loginProfile: {
    email: string;
    exists: boolean;
    photoUrl?: string | null;
    name?: string | null;
    hasRecoveryEmail?: boolean;
    recoveryEmail?: string | null;
  } | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onForgot: () => void;
  onMoreOptions: () => void;
  noAccountEmail?: string | null;
  onCreateAccount?: () => void;
  loginNotice?: { msg: string; tone: "error" | "success" } | null;
  /** Cloudflare Turnstile widget, or null when no challenge is pending. */
  captcha?: React.ReactNode;
  /** A challenge is pending and hasn't been solved yet — block submit. */
  captchaPending?: boolean;
}

export const LoginEmail: React.FC<LoginEmailProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  errors,
  touched,
  handleBlur,
  loginProfile,
  isSubmitting,
  onSubmit,
  onForgot,
  onMoreOptions,
  noAccountEmail,
  onCreateAccount,
  loginNotice,
  captcha,
  captchaPending,
}) => {
  const showPasswordError = touched.password && errors.password;
  /* A confirmed "no account" from the address lookup — authoritative, so the
     forgot/more-options/submit paths short-circuit and the field carries the
     one message about it. */
  const emailMissing =
    !!loginProfile && loginProfile.email === email.trim() && loginProfile.exists === false;
  const offeredSignup = !!noAccountEmail && noAccountEmail === email;
  const noAccount = emailMissing || offeredSignup;

  const guard = (fn: () => void) => () => {
    if (emailMissing) return;
    fn();
  };

  return (
    <form onSubmit={onSubmit} className="signup-fields">
      <Field
        label="Email"
        aria-label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => handleBlur("email")}
        placeholder="you@example.com"
        autoComplete="email"
        /* One line says this, not two: the actionable note replaces the plain
           field error rather than stacking under it. */
        error={noAccount ? undefined : (touched.email ? errors.email : undefined)}
        hint={
          noAccount ? (
            <span className="field-note-danger">
              No account for this email yet —{' '}
              <button type="button" onClick={onCreateAccount}>
                create one
              </button>
            </span>
          ) : undefined
        }
      />

      <PasswordField
        label="Password"
        aria-label="Password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => handleBlur("password")}
        autoComplete="current-password"
        shown={showPassword}
        onToggleShown={() => setShowPassword(!showPassword)}
        error={showPasswordError ? errors.password : undefined}
        labelAction={
          <button
            type="button"
            className="label-action"
            onClick={guard(onForgot)}
            disabled={isSubmitting || emailMissing}
          >
            Forgot password?
          </button>
        }
      />

      <FormNotice notice={loginNotice} />

      {captcha}

      <PrimaryButton
        type="submit"
        loading={isSubmitting}
        disabled={!email.includes("@") || !password || captchaPending || emailMissing}
      >
        Log in
      </PrimaryButton>

      {/* Everything that is not the one action sits under it on one quiet
          block: providers, then the inbox-delivered routes. */}
      <div className="login-alts">
        <OrDivider label="or" />
        <OAuthRow disabled={isSubmitting} />
        <button
          type="button"
          className="more-ways-btn"
          onClick={guard(onMoreOptions)}
          disabled={isSubmitting || emailMissing}
        >
          More ways to sign in
        </button>
      </div>
    </form>
  );
};

LoginEmail.displayName = "LoginEmail";
