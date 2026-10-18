"use client";

import React from "react";
// LoginEmail — single-page sign-in: email + password + recovery links + OAuth.
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
  setLoginStep: (step: LoginStep) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgot: () => void;
  onMoreOptions: () => void;
  onMagicLink: () => void;
  onPasskeySignIn: () => void;
  passkeyLoading?: boolean;
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
  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;
  const showNoAccount = !!noAccountEmail && noAccountEmail === email;
  const emailOk = email.includes("@");
  /* A confirmed "no account" from the prefetch/lookup — authoritative, so the
     forgot/more-options/submit paths short-circuit and the field carries the
     clear message. */
  const emailMissing =
    !!loginProfile && loginProfile.email === email.trim() && loginProfile.exists === false;
  const missingCopy = 'No Tirbeo account found for this email.';

  const guard = (fn: () => void) => () => {
    if (emailMissing) return;
    fn();
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="signup-fields">
        <div className="space-y-5 text-left">
          <Field
           
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
            placeholder="you@example.com"
            autoComplete="email"
            error={showEmailError ? errors.email : emailMissing ? missingCopy : undefined}
          />

          <PasswordField
            aria-label="Password"
           
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur("password")}
            autoComplete="current-password"
            shown={showPassword}
            onToggleShown={() => setShowPassword(!showPassword)}
            error={showPasswordError ? errors.password : undefined}
          />

          <div className="forgot-row">
            <button
              type="button"
              className="forgot-link"
             
              onClick={guard(onForgot)}
              disabled={isSubmitting || emailMissing}
            >
              Forgot password?
            </button>
          </div>

          {/* Slot always occupies its height, so the note appearing never
              shifts the form below it. */}
          <div className="no-account-slot" aria-live="polite">
            {showNoAccount && (
              <p role="status" className="no-account-note">
                No account for this email yet —{" "}
                <button type="button" onClick={onCreateAccount}>
                  create one
                </button>
              </p>
            )}
          </div>

          <FormNotice notice={loginNotice} />

          {captcha}

          <PrimaryButton
            type="submit"
            loading={isSubmitting}
            disabled={!emailOk || !password || captchaPending || emailMissing}
           
          >
            Log in
          </PrimaryButton>
        </div>
      </div>

      <div className="more-ways">
        <button
          type="button"
          className="more-ways-btn"
         
          onClick={guard(onMoreOptions)}
          disabled={isSubmitting || emailMissing}
        >
          More ways to sign in
        </button>
      </div>

      <OrDivider label="or continue with" />
      <OAuthRow disabled={isSubmitting} />
    </form>
  );
};

LoginEmail.displayName = "LoginEmail";
