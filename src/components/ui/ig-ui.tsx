import React, { useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { startOAuth, type OAuthProvider } from '../../lib/oauth';
import { GitHubIcon, GoogleIcon, DiscordIcon } from '../SocialIcons';

/* ═══════════════════════════════════════════════════════════════════════
   Tirbeo Accounts — primitives

   System-theme surface: the canvas follows the OS (black plates on black in
   dark, white plates on pale grey in light), fields are ink-tinted pills, and
   one royal-blue accent is used
   as a fill for primary actions. Every
   colour here comes from a token, never a literal, so the whole surface moves
   with the palette. Type inside the card is em-based off the card's --u scale
   so proportions hold at any viewport.
   ═══════════════════════════════════════════════════════════════════════ */

/** Class joiner — keeps the conditional class lists readable. */
export function cn(...parts: Array<string | false | null | undefined | 0 | 0n>): string {
  // Values are filtered by truthiness, so 0 / 0n / '' are all dropped safely.
  // Accepting them keeps `cond && 'cls'` idiomatic even when cond is a count.
  return parts.filter(Boolean).join(' ');
}

/* ── Feedback ─────────────────────────────────────────────────────────── */

/** The fleet's one in-flight mark: a ring turning at 700ms in the colour of
    the label beside it (`.spinner` in index.css, the same recipe myprofile,
    landing and social carry). `size` sets the box — the geometry belongs to
    the recipe. */
export function Spinner({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('spinner', className)}
      style={{ '--spinner-size': `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

/* ── Loading plates ───────────────────────────────────────────────────── */

/** A block of the page that hasn't arrived yet, drawn at its own size:
    the fleet's shimmer recipe (.skeleton in index.css). Give it the height
    and rounding the finished content will have so nothing jumps when data
    lands. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={cn('skeleton block', className)} />;
}

/** The shape the auth card will take — a title, a lede, two 48px fields and
    a 42px pill — so a chunk fetch or a session probe is a waiting card, not
    a blank canvas. */
export function AuthCardSkeleton() {
  return (
    <div className="login-card" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <header className="login-head">
        <Skeleton className="mx-auto h-[1.15em] w-[62%] rounded-full" />
        <Skeleton className="mx-auto mt-[0.9em] h-[0.85em] w-[84%] rounded-full" />
      </header>
      <div className="login-form space-y-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="mt-1 h-[42px] rounded-full" />
      </div>
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * One shape for every action: the landing app's `.btn` recipe — a pill with
 * the AA-checked `--accent-solid` fill, semibold label and a 42px plate.
 * Defined in index.css so a button here and a button on tirbeo.com are the
 * same object, not two lookalikes.
 */
const BUTTON_BASE = 'btn btn-block select-none';

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: '',
};

/** Primary — the one action fill: the AA-checked solid blue the site uses
    (#0062cc daylight / #0a63e5 dark), flat, no glow. Disabled follows the iOS
    convention: a muted grey plate with a dimmed label, never a darkened blue. */
export function PrimaryButton({
  children,
  loading = false,
  className = '',
  size = 'lg',
  ...btnProps
}: {
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...btnProps}
      disabled={btnProps.disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BUTTON_BASE,
        BUTTON_SIZE[size],
        'btn-primary',
        'disabled:scale-100',
        className,
      )}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        {loading ? <Spinner size={16} /> : null}
        {children}
      </span>
    </button>
  );
}

/** Secondary — a filled grey pill, not an outlined one: the shape every other
    control in the fleet is, with the label in accent so a quiet pill sitting
    beside a loud one still reads as pressable rather than disabled. */
export function SecondaryButton({
  children,
  className = '',
  size = 'lg',
  ...btnProps
}: { children: ReactNode; size?: ButtonSize } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...btnProps}
      className={cn(
        BUTTON_BASE,
        BUTTON_SIZE[size],
        'btn-secondary',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Inline text action. */
export function TextButton({
  children,
  className = '',
  ...btnProps
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...btnProps}
      className={cn(
        // A text button is still a button: give it a 40px hit area so it is
        // tappable on a phone, and let colour carry the affordance.
        'inline-flex min-h-10 items-center gap-1.5 rounded-full px-1 text-[14px] font-semibold text-text-3',
        'transition-colors hover:text-fg active:text-text-2',
        'disabled:opacity-45',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Fields ───────────────────────────────────────────────────────────── */

/** Inline error/success line on the login screens — replaces toasts. */
export function FormNotice({ notice }: { notice?: { msg: string; tone: 'error' | 'success' } | null }) {
  if (!notice) return null;
  return (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={'form-notice form-notice-' + notice.tone}
    >
      {notice.msg}
    </p>
  );
}

/**
 * A filled field: the landing form's own control — 48px tall, 14px round,
 * hairline border, grey plate, and an accent border on focus. The whole box
 * is the target.
 */
const FIELD_LINE =
  'w-full rounded-lg border border-border bg-input px-4 text-base text-fg ' +
  'transition-[border-color,background-color] duration-150 ' +
  'placeholder:text-placeholder hover:border-border-strong hover:bg-field-hover ' +
  'focus:border-accent focus:bg-field-focus';

export const Field = React.forwardRef<HTMLInputElement, {
  label?: string;
  /** Sits on the label's line, right-aligned — "Forgot password?". A field's
      own escape hatch belongs beside it, not on a row of its own below. */
  labelAction?: ReactNode;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
  /** Glyph after the value, on the baseline — a reveal toggle, a unit. */
  trailing?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>>(function Field(
  { label, labelAction, error, hint, containerClassName, trailing, id, className, ...inputProps },
  ref,
) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  return (
    <div className={containerClassName}>
      {label || labelAction ? (
        <div className="tb-label-row">
          {label ? (
            <label htmlFor={fieldId} className="tb-label">
              {label}
            </label>
          ) : <span />}
          {labelAction || null}
        </div>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(FIELD_LINE, 'h-12', trailing && 'pr-12', error && '!border-danger', className)}
          {...inputProps}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-0 flex items-center">{trailing}</span>
        ) : null}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="tb-hint tb-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="tb-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** Comment-box style field — same skin as Field, roomier body. */
export function TextAreaField({
  label,
  error,
  hint,
  containerClassName,
  id,
  className,
  rows = 2,
  ...textProps
}: {
  label?: string;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
  rows?: number;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={fieldId} className="tb-label">
          {label}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_LINE, 'resize-none py-3 leading-snug', error && '!border-danger', className)}
        {...textProps}
      />
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="tb-hint tb-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="tb-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The reveal toggle that sits on the baseline. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="grid size-10 place-items-center rounded-full text-text-4 transition-colors hover:bg-hover hover:text-fg"
    >
      {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
}

export function PasswordField({
  shown,
  onToggleShown,
  ...props
}: { shown: boolean; onToggleShown: () => void } & React.ComponentProps<typeof Field>) {
  /* The input type follows `shown`, not the caller. Handing the type back to the
     caller meant every screen that only passed `shown` kept rendering
     type="password" — the eye icon flipped and the dots never changed. */
  return (
    <Field
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={<PasswordToggle shown={shown} onToggle={onToggleShown} />}
    />
  );
}

/** Select — same hairline treatment as Field. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="tb-label">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(FIELD_LINE, 'h-12 cursor-pointer appearance-none pr-11 [&>option]:bg-card')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-text-4" />
      </div>
    </div>
  );
}

/** Consent — a hairline square that fills when checked. */
export function ConsentCheck({
  checked,
  onChange,
  label,
  className = '',
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  className?: string;
  id?: string;
}) {
  // A span, not a button: labels carry Terms/Privacy buttons and a <button>
  // may not contain another one (invalid HTML, hydration error).
  return (
    <span
      id={id}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer items-start gap-3 rounded-xl text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-press',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-[1px] grid size-5 shrink-0 place-items-center rounded-[5px] border border-border-strong transition-colors duration-150',
          checked ? 'border-accent bg-accent' : 'group-hover:border-border-hover',
        )}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" className="size-3.5 text-accent-fg" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-text-2">{label}</span>
    </span>
  );
}

/* ── OTP ──────────────────────────────────────────────────────────────── */

/** Code boxes the size of the fields they belong to. */
export function OtpBoxes({
  value,
  onChange,
  length = 6,
  error = false,
  label,
  inputMode = 'numeric',
  pattern = '[0-9]*',
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  label: string;
  inputMode?: 'numeric' | 'text';
  pattern?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setChar = (i: number, ch: string) => {
    const chars = Array.from({ length }, (_, j) => value[j] || '');
    chars[i] = ch;
    onChange(chars.join('').replace(/\s+$/, ''));
  };

  return (
    <div className="flex w-full justify-between gap-2.5" role="group" aria-label={label}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode={inputMode}
          pattern={pattern}
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`${label} digit ${i + 1} of ${length}`}
          value={value[i] || ''}
          onChange={(e) => {
            const ch = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(-1);
            if (!ch && e.target.value !== '') return;
            setChar(i, ch.toUpperCase());
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            onChange(text.slice(0, length));
            refs.current[Math.min(text.length, length - 1)]?.focus();
          }}
          className={cn(
            'otp-box h-14 min-w-0 flex-1 rounded-lg border border-border bg-input text-center text-[22px] font-semibold text-fg',
            'transition-[border-color,background-color] duration-150',
            'hover:border-border-strong hover:bg-field-hover focus:border-accent focus:bg-field-focus',
            // Variant rules always beat the base ones; a plain `border-danger` would
            // lose its tie with `border-border` to sheet order and never show.
            error && '!border-danger',
          )}
        />
      ))}
    </div>
  );
}

/* ── Steppers ─────────────────────────────────────────────────────────── */

/** Range slider with its label and live value. */
export function RangeSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  disabled,
  className = '',
}: {
  label?: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={className}>
      {label ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="tb-label mb-0">
            {label}
          </label>
          {format ? (
            <span className="text-[14px] tabular-nums text-text-3">{format(value)}</span>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex h-6 items-center">
        <span aria-hidden className="absolute inset-x-0 h-1 rounded-full bg-track" />
        <span
          aria-hidden
          className="absolute left-0 h-1 rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tb-range relative h-6 w-full"
        />
      </div>
    </div>
  );
}

/** Segmented control — Social's nav recipe: the active choice is an accent-soft
    chip with accent text, so it reads in both schemes without a raised slab. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-xl border border-border bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors duration-150',
              active ? 'bg-card text-fg shadow-ambient' : 'text-text-3 hover:bg-hover hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Lists ────────────────────────────────────────────────────────────── */

export function Block({
  title,
  children,
  hint,
}: {
  title: React.ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-[19px] font-semibold text-fg">{title}</h3>
      {children}
      {hint ? <p className="mt-3 text-[13px] leading-relaxed text-text-4">{hint}</p> : null}
    </div>
  );
}

/** Grouped list — a hairline box, rows split by a fainter one. */
export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('divide-y divide-divider overflow-hidden rounded-xl border border-border bg-card', className)}>
      {children}
    </div>
  );
}

export function Row({
  onClick,
  icon,
  label,
  sub,
  right,
  danger,
  chevron,
}: {
  onClick?: () => void;
  icon?: ReactNode;
  label: string;
  sub?: string;
  right?: ReactNode;
  danger?: boolean;
  chevron?: boolean;
}) {
  const inner = (
    <>
      {icon ? <span className="shrink-0 text-text-4">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[15px] leading-snug', danger ? 'text-danger-text' : 'text-fg')}>
          {label}
        </span>
        {sub ? <span className="mt-1 block text-[14px] leading-snug text-text-3">{sub}</span> : null}
      </span>
      {right ? <span className="shrink-0 text-[15px] tabular-nums text-text-3">{right}</span> : null}
      {chevron !== false && onClick ? <ChevronRight className="size-[22px] shrink-0 text-text-4" /> : null}
    </>
  );
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3.5 text-left text-fg transition-colors hover:bg-hover';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function CardToggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: ReactNode;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug text-fg">{label}</span>
        {sub ? <span className="mt-1 block text-[14px] leading-snug text-text-3">{sub}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-track',
        )}
      >
        <span
          className={cn(
            'block size-6 rounded-full bg-accent-fg shadow-ambient transition-transform duration-200 ease-out motion-reduce:transition-none',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    </div>
  );
}

/* ── OAuth ────────────────────────────────────────────────────────────── */

export const OAUTH: { id: OAuthProvider; name: string; fill: string; hover: string; icon: ReactNode }[] = [
  { id: 'google', name: 'Google', fill: '#4285F6', hover: '#3179E3', icon: <GoogleIcon className="size-[22px]" /> },
  { id: 'github', name: 'GitHub', fill: '#24292F', hover: '#15191D', icon: <GitHubIcon className="size-[22px] text-fg" /> },
  { id: 'discord', name: 'Discord', fill: '#5865F2', hover: '#4752C4', icon: <DiscordIcon className="size-[22px] text-[#5865F2]" /> },
];

/**
 * Compact 3-up provider buttons — provider glyph over the provider name,
 * all three on one row (see .oauth-list in index.css).
 */
export function OAuthRow({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="oauth-list">
      {OAUTH.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => startOAuth(p.id)}
          aria-label={`Continue with ${p.name}`}
          className="oauth-item"
        >
          <span className="oauth-ico" aria-hidden="true">{p.icon}</span>
          <span className="oauth-label">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Divider with a centred label. */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="or-divider flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-divider" />
      <span className="text-[12px] font-medium tracking-[0.01em] text-text-3">
        {label}
      </span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  );
}

/* ── Brand + shell ────────────────────────────────────────────────────── */

/** The Tirbeo wordmark. `onCanvas` swaps between the two ink cuts so the
    mark stays legible when the page flips light — a CSS filter would invert
    the glyph's colour along with its fill, so it is two sources, one shown. */
export function BrandMark({
  size = 'md',
  className = '',
  onCanvas = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onCanvas?: boolean;
}) {
  const glyph = { sm: 'h-[1.4em]', md: 'h-[1.8em]', lg: 'h-[2.2em]' }[size];
  const shared = {
    alt: 'Tirbeo',
    width: 600,
    height: 200,
    decoding: 'async' as const,
  };
  if (!onCanvas) {
    return <img {...shared} src="/logo-white.webp" className={cn('w-auto object-contain', glyph, className)} />;
  }
  return (
    <>
      <img {...shared} src="/logo-dark.webp" className={cn('brand-mark brand-mark--ink w-auto object-contain', glyph, className)} />
      <img {...shared} src="/logo-white.webp" className={cn('brand-mark brand-mark--paper w-auto object-contain', glyph, className)} />
    </>
  );
}

/**
 * Auth frame — a bare column on the shared canvas. The app shell (App.tsx)
 * owns the header, centring and footer; this only lays out the form.
 */
export function AuthShell({
  title,
  subtitle,
  kicker,
  children,
  footer,
  wide = false,
  step,
  onBack,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  kicker?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  step?: { index: number; total: number; label?: string };
  onBack?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('login-card animate-fade-in', className)} data-wide={wide || undefined}>
      {(step || onBack) ? (
        <div className="wizard-rail">
          <div className="wizard-row">
            <div
              className="wizard-segs"
              role="progressbar"
              aria-valuenow={step?.index}
              aria-valuemin={1}
              aria-valuemax={step?.total}
              aria-label={step?.label ? `${step.label} — step ${step?.index} of ${step?.total}` : undefined}
            >
              {Array.from({ length: step?.total ?? 0 }, (_, i) => (
                <i key={i} className={cn('wizard-seg', i < (step?.index ?? 0) && 'is-done')} />
              ))}
            </div>
            {onBack ? (
              <button type="button" onClick={onBack} className="wizard-back">
                <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3.5 5.5 8 10 12.5" />
                </svg>
                Back
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {(kicker || title || subtitle) ? (
        <header className="login-head">
          {kicker ? <p className="login-kicker mt-0">{kicker}</p> : null}
          {title ? <h1 className={cn('tb-heading', kicker ? 'mt-[0.42em]' : 'mt-0')}>{title}</h1> : null}
          {subtitle ? <p className="tb-sub mt-[0.7em]">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="login-form">
        {children}
        {footer ? <p className="login-terms">{footer}</p> : null}
      </div>
    </div>
  );
}