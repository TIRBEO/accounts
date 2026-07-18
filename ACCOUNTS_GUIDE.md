# TIRBEO Accounts — Content Configuration & Admin Panel Guide

The accounts app (`accounts.tirbeo.app`) is the **SSO hub**: login, sign‑up (multi‑phase),
OAuth (Google/GitHub), one‑time‑code login, magic link, and password reset.

Unlike the landing page, the current implementation has its **copy, options and flow steps
hard‑coded** inside the React pages. This guide extracts **everything that is currently
static** and re‑expresses it as a single JSON config object (`AccountsConfig`) plus the
**API contract** and **database schema** the app already talks to — so you can later build
a DB / API / admin panel that drives it exactly like the landing config.

> Goal: make every visible string, avatar option, dropdown option, redirect target and
> auth‑method toggle come from `accounts_config` (DB) via `/api/accounts-config`, with a
> local fallback so the page always renders.

---

## 1. How it works today (and target loading model)

### Today
- All pages are Next.js App Router client components under `app/`.
- API base: `NEXT_PUBLIC_API_URL` (default `https://api.tirbeo.app`).
- All auth calls go to the **API gateway** (`api.tirbeo.app`) with `credentials: "include"`
  so the `__session` cookie (`Domain=.tirbeo.app`) is set cross‑subdomain.
- After success the user is sent to `appUrl("dashboard")` → `https://dashboard.tirbeo.app`.
- Copy, dropdown options, avatar list and enabled auth methods are **inline in the code**.

### Target (to match landing)
- On mount call `getAccountsConfig()` (new `lib/accountsConfig.ts`).
- Endpoint: `process.env.NEXT_PUBLIC_ACCOUNTS_CONFIG_API` **or** `/api/accounts-config`.
- Shallow‑merge API JSON over `defaultAccountsConfig` (arrays replaced wholesale).
- On failure use local `defaultAccountsConfig` so the login page always renders.
- Read via a `useAccountsConfig()` hook.

### API contract for config (implement on backend)

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/accounts-config` | — | Full `AccountsConfig` JSON (the `value` of the `accounts_config` row). |
| `PUT` / `POST` | `/api/accounts-config` | Full `AccountsConfig` JSON | Saved config, echoed back. Written by the admin app only. |

> The frontend stores no config itself; the admin app is the single writer.

---

## 2. Auth API endpoints the app already calls

All are `POST` to `${API}` with `credentials: "include"` unless noted. These already exist
on `api.tirbeo.app` (`apps/api`) and must stay stable.

| Purpose | Method | Path | Body | Success behavior |
|---|---|---|---|---|
| Password login | POST | `/api/auth/login` | `{ email, password }` | 200 → redirect to dashboard |
| Sign‑up: request email OTP | POST | `/api/auth/signup-otp/request` | `{ email, password, name }` | 200 → go to OTP phase; may return `{ devCode }` |
| Sign‑up: complete | POST | `/api/auth/signup` | `{ email, password, name, otpCode }` | 200 → go to profile phase |
| Save profile | PATCH | `/api/users/me` | `{ name?, phoneNumber?, occupation?, photoUrl? }` | 200 (non‑blocking; UI advances regardless) |
| One‑time‑code login | POST | `/api/auth/login-otp/request` | `{ email }` | 200 → redirect to dashboard |
| Magic link request | POST | `/api/auth/magic-link/request` | `{ email }` | 200 → "Magic link sent" |
| Magic link verify | POST | `/api/auth/magic-link/verify` | `{ token }` | 200 → redirect (used by `/callback`) |
| Google OAuth start | GET | `/auth/google` | — | redirect to Google (browser nav) |
| GitHub OAuth start | GET | `/auth/github` | — | redirect to GitHub (browser nav) |
| Password reset: request | POST | `/api/auth/password-reset/request` | `{ email }` | 200 → code step; may return `{ devCode }` |
| Password reset: verify | POST | `/api/auth/password-reset/verify` | `{ email, code }` | 200 → `{ resetToken }` |
| Password reset: confirm | POST | `/api/auth/password-reset/confirm` | `{ email, resetToken, newPassword }` | 200 → success |

**Client rules (extract as config `validation`):**
- Email regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Password min length: `8`
- OTP length: `6` (numeric); reset code accepted at `>= 4`
- Request timeout: `15000 ms`

---

## 3. Pages, routes & flows

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Redirects → `/login` |
| `/login` | `app/login/page.tsx` | Login + sign‑up (mode via `?mode=signup`) |
| `/register` | `app/register/page.tsx` | Redirects → `/login?mode=signup` |
| `/reset-password` | `app/reset-password/page.tsx` | 4‑step reset flow (`?token=` jumps to set‑password) |
| `/callback` | `app/callback/page.tsx` | Magic‑link + OAuth landing → verify/redirect |

### Login mode (`/login`)
Social buttons (Google, GitHub) → **Or** → email + password → **Sign In**.
Extra: **Send one‑time code** and **Sign in with magic link**. Footer: **Forgot your password?** → `/reset-password`, **Create one** → `/register`.

### Sign‑up mode (`/login?mode=signup`) — phases
1. **Create an Account** — First Name, Last Name, Email, Password → requests email OTP.
1.5. **Verify Your Email** — 6‑box OTP (paste‑aware) → completes signup. **Resend code**.
2. **Configure Your Studio** — avatar picker (+ upload), Occupation, Phone, "Who you are", "Where did you find us?" → saves profile (non‑blocking).
3. **Finalize Your Profile** — avatar + name + occupation summary → **Go to Dashboard**.

> Custom uploaded avatar is a base64 data URL kept **client‑side only** (not sent to the API,
> to avoid the storage/Cloudflare limit). Only `http(s)` avatar URLs are persisted via `photoUrl`.

### Reset flow (`/reset-password`)
`email` → `code` (6‑digit) → `set-password` (new + confirm) → `success`. `?token=` in URL skips to set‑password.

---

## 4. The `AccountsConfig` object (proposed) — all currently‑static values

```ts
interface AccountsConfig {
  brand: {
    name: string;              // "Tirbeo"
    pageTitle: string;         // <title> — "Sign In — Tirbeo"
    pageDescription: string;   // meta description
    heroImage: string;         // "/login-hero.jpg" background
  };

  redirects: {
    afterAuth: string;         // dashboard URL (appUrl("dashboard"))
    dashboardSubdomain: string;// "dashboard"
    loginPath: string;         // "/login"
    registerPath: string;      // "/register"
    resetPath: string;         // "/reset-password"
  };

  methods: {                   // toggle auth methods on/off
    google: boolean;
    github: boolean;
    passwordLogin: boolean;
    otpLogin: boolean;         // "Send one-time code"
    magicLink: boolean;
    signupEnabled: boolean;
  };

  validation: {
    emailRegex: string;        // "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
    passwordMinLength: number; // 8
    otpLength: number;         // 6
    requestTimeoutMs: number;  // 15000
  };

  copy: {
    login: {
      title: string;           // "Welcome to Tirbeo"
      subtitle: string;        // "Sign in to access your workspace"
      signInBtn: string;       // "Sign In"
      googleBtn: string;       // "Google"
      githubBtn: string;       // "GitHub"
      dividerOr: string;       // "Or"
      emailLabel: string;      // "Email"
      emailPlaceholder: string;// "hello@example.com"
      passwordLabel: string;   // "Password"
      passwordPlaceholder: string; // "8+ characters"
      otpBtn: string;          // "Send one-time code"
      magicBtn: string;        // "Sign in with magic link"
      magicSentMsg: string;    // "Magic link sent to your email."
      forgot: string;          // "Forgot your password?"
      noAccount: string;       // "Don't have an account?"
      createOne: string;       // "Create one"
    };
    signup: {
      title: string;           // "Create an Account"
      subtitle: string;        // "Sign up to get started."
      firstNameLabel: string;  // "First Name"   placeholder "John"
      lastNameLabel: string;   // "Last Name"    placeholder "Doe"
      createBtn: string;       // "Create Account"
      haveAccount: string;     // "Already have an account?"
      signIn: string;          // "Sign in"
    };
    verify: {
      title: string;           // "Verify Your Email"
      subtitle: string;        // "We sent a verification code to {email}"
      verifyBtn: string;       // "Verify & Continue"
      resendBtn: string;       // "Resend code"
    };
    configure: {
      title: string;           // "Configure Your Studio"
      subtitle: string;        // "Tell us a bit about yourself."
      avatarLabel: string;     // "Choose Your Avatar"
      occupationLabel: string; // "Occupation"      placeholder "Select your role"
      phoneLabel: string;      // "Phone Number"    placeholder "+977 98XXXXXXXX"
      bioLabel: string;        // "Who you are"     placeholder "A short bio about yourself"
      findUsLabel: string;     // "Where did you find us?"  placeholder "Choose an option"
      continueBtn: string;     // "Continue"
    };
    finalize: {
      title: string;           // "Finalize Your Profile"
      subtitle: string;        // "You're all set. Ready to explore Tirbeo."
      completeMsg: string;     // "Profile Complete"
      defaultRole: string;     // "Member"
      dashboardBtn: string;    // "Go to Dashboard"
    };
    reset: {
      emailTitle: string;      // "Reset Password"
      emailSub: string;        // "Enter your email to receive a reset code."
      sendBtn: string;         // "Send Reset Code"
      codeTitle: string;       // "Enter Code"
      codeSub: string;         // "We sent a code to {email}"
      codePlaceholder: string; // "Enter 6-digit code"
      verifyBtn: string;       // "Verify Code"
      setTitle: string;        // "Set New Password"
      setSub: string;          // "Choose a strong password for your account."
      newLabel: string;        // "New Password"
      confirmLabel: string;    // "Confirm Password"
      resetBtn: string;        // "Reset Password"
      successTitle: string;    // "Password Reset"
      successSub: string;      // "Your password has been successfully updated..."
      goLoginBtn: string;      // "Go to Login"
    };
    callback: {
      completing: string;      // "Completing sign in..."
      failedTitle: string;     // "Authentication failed"
      backToSignIn: string;    // "Back to sign in"
    };
    errors: {                  // client-side validation messages
      invalidEmail: string;    // "Enter a valid email address"
      shortPassword: string;   // "Password must be at least 8 characters"
      otpTooShort: string;     // "Enter the 6-digit code"
      pwMismatch: string;      // "Passwords do not match"
      timeout: string;         // "Request timed out. Check your connection."
      network: string;         // "Network request failed"
    };
  };

  avatars: {
    seeds: string[];           // dicebear seeds (see below)
    provider: string;          // "https://api.dicebear.com/7.x/adventurer/svg"
    backgroundColors: string;  // "050505,0A0A0A,111111,1A1A1A,2A2A2A"
    allowUpload: boolean;      // true
  };

  occupations: string[];       // dropdown options (see below)
  findUsOptions: string[];     // dropdown options (see below)
}
```

### Current hard‑coded values to seed the config

**Avatar seeds** (19): `Felix, Luna, Milo, Nala, Oscar, Pixel, Ruby, Sage, Tango, Ursa, Willow, Xena, Yuki, Zara, Aria, Blaze, Cleo, Dexter, Ember`
Rendered as `https://api.dicebear.com/7.x/adventurer/svg?seed={seed}&backgroundColor=050505,0A0A0A,111111,1A1A1A,2A2A2A`

**Occupation options**: `Designer, Developer, Engineer, Founder / CEO, Product Manager, Content Creator, Student, Other`

**Where did you find us?**: `Google, Friend, Social Media, Newsletter, Event, Other`

---

## 5. Database schema

### `accounts_config` — single source of truth (mirrors landing's `site_config`)
```sql
CREATE TABLE accounts_config (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE DEFAULT 'default',
  value       JSONB NOT NULL,          -- the whole AccountsConfig object
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);
```
`GET /api/accounts-config` returns `value`; the frontend merges it over defaults.

### Existing user/auth tables (already used by the API — for reference)
The app writes to a user via `PATCH /api/users/me` (`name, phoneNumber, occupation, photoUrl`)
and authenticates against the API's Prisma schema. The relevant fields (from `apps/api`):

```
User        : id, email, name, passwordHash, googleId (unique), githubId (unique),
              photoUrl, phoneNumber, occupation, secondaryEmail, adminRole,
              totpSecret, is2FAEnabled, isBanned, isSuspended, lastActiveAt,
              preferences (JSON), createdAt
Session     : token/session rows for the __session cookie (Domain=.tirbeo.app)
Integration : (userId, provider) — 'google' | 'github', connected, metadata
AuditEvent  : actorId, action, targetType, targetId, metadata  (e.g. 'user.created')
```
OTP / magic‑link / reset codes are handled server‑side in `apps/api/lib/auth/*`.

---

## 6. Admin panel — recommended sections & inputs

| Panel | Inputs |
|---|---|
| **Brand** | name, pageTitle, pageDescription, heroImage (upload/url) |
| **Redirects** | afterAuth (dashboard URL), login/register/reset paths |
| **Auth Methods** | toggles: google, github, passwordLogin, otpLogin, magicLink, signupEnabled |
| **Validation** | emailRegex, passwordMinLength, otpLength, requestTimeoutMs |
| **Login copy** | all `copy.login.*` strings |
| **Sign‑up copy** | all `copy.signup.*` + `copy.verify.*` strings |
| **Configure step** | all `copy.configure.*` strings |
| **Finalize step** | all `copy.finalize.*` strings |
| **Reset copy** | all `copy.reset.*` strings |
| **Callback copy** | `copy.callback.*` |
| **Error messages** | all `copy.errors.*` |
| **Avatars** | seeds (repeatable), provider url, backgroundColors, allowUpload toggle |
| **Occupations** | repeatable list |
| **Find‑us options** | repeatable list |

Saving serializes the whole object into `accounts_config.value`.

---

## 7. Redirects / links behavior

- **Google / GitHub** → browser navigates to `${API}/auth/google` / `${API}/auth/github`
  (API redirects to provider; callback sets `__session` cookie; then → dashboard).
- **Successful login / OTP login / signup finish** → `appUrl("dashboard")` = `https://dashboard.tirbeo.app`.
- **Magic link** → request shows a sent message; the emailed link lands on `/callback?magic_token=…`
  which POSTs to `/api/auth/magic-link/verify` then redirects (validated to `*.tirbeo.app` / `localhost`).
- **OAuth callback** → `/callback?code=…` just redirects (cookie already set by API).
- **`/` and `/register`** → server redirects to `/login` and `/login?mode=signup`.
- **Forgot password** → `/reset-password`; **`?token=`** jumps straight to set‑password.
- **Redirect safety**: `/callback` only honors redirects whose hostname ends with `tirbeo.app`
  (or is `localhost`); otherwise falls back to dashboard.

---

## 8. Environment variables

| Var | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Auth API gateway base | `https://api.tirbeo.app` |
| `NEXT_PUBLIC_APP_DOMAIN` | Base domain for `appUrl()` subdomains | `tirbeo.app` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Cross‑subdomain cookie domain | `.tirbeo.app` |
| `NEXT_PUBLIC_ACCOUNTS_CONFIG_API` | (proposed) override for config endpoint | `/api/accounts-config` |

OAuth requires these on the **API** deployment (not this app): `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`GITHUB_REDIRECT_URI`.

---

## 9. Files of interest

- `app/login/page.tsx` — login + 4‑phase signup (all copy, avatars, dropdowns, OTP boxes, social buttons).
- `app/reset-password/page.tsx` — 4‑step reset flow, `StepIndicator`, `PasswordInput`, confetti.
- `app/callback/page.tsx` — magic‑link verify + OAuth landing + redirect validation.
- `app/register/page.tsx` — redirect to `/login?mode=signup`.
- `app/page.tsx` — redirect to `/login`.
- `app/layout.tsx` — `<title>`/description metadata, Inter font, ThemeProvider.
- `app/components.tsx` — ThemeProvider default colors.
- `app/globals.css` — black/white theme tokens, `noise-overlay`, `vignette`.
- `packages/utils/src/domains.ts` — `appUrl()`, `loginUrl()`, subdomain map, cookie domain.
- `public/login-hero.jpg` — login background image.

---

## 10. Migration path (to fully config‑drive it, like landing)

1. Add `lib/accountsConfig.ts` (`AccountsConfig` type + `defaultAccountsConfig` seeded from §4/§5 + loader/merge).
2. Add `lib/useAccountsConfig.ts` hook.
3. Replace inline strings/options in the pages with `cfg.*` reads; gate social/OTP/magic buttons by `cfg.methods.*`.
4. Implement `GET/PUT /api/accounts-config` + `accounts_config` table on the API.
5. Build the admin panel sections in §6 that write the whole object back.
