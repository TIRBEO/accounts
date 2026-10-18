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

export function Spinner({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      style={{ animation: 'spin 0.75s linear infinite' }}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="26 60"
      />
    </svg>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * One shape for every action: a full pill, sentence case, semibold. The primary
 * is the scheme accent with Social's glow under it, lifting a pixel on hover
 * and stepping to accent-press on tap — the .login-cta recipe.
 */
const BUTTON_BASE =
  'relative inline-flex w-full select-none items-center justify-center gap-2 ' +
  'rounded-xl font-semibold normal-case tracking-[-0.01em] whitespace-nowrap ' +
  'transition-[background-color,box-shadow,transform,opacity] duration-150 ' +
  'disabled:pointer-events-none';

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-[14px] gap-1.5',
  md: 'h-[48px] px-5 text-[15px] gap-2',
  lg: 'h-[52px] px-6 text-[16px] gap-2',
};

/** Primary — the one action fill: solid accent, white label, flat (no glow).
    Disabled follows the iOS convention: a muted grey plate with a dimmed
    label, never a darkened blue. */
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
        'bg-accent text-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.2)]',
        'hover:bg-accent-hover',
        'active:bg-accent-press active:translate-y-0 active:scale-[0.995]',
        'disabled:bg-btn-disabled-bg disabled:text-btn-disabled-fg disabled:shadow-none disabled:translate-y-0',
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

/** Secondary — a hairline outline, never a grey slab: a filled one sitting
    next to the accent-filled primary reads as the disabled pair. */
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
        'border border-btn-line bg-transparent text-text-2',
        'hover:border-btn-line-hover hover:bg-hover hover:text-fg',
        'active:scale-[0.995]',
        'disabled:opacity-45',
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
        'inline-flex min-h-10 items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-text-3',
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
 * A filled field: grey plate, borderless until focus, then an accent border
 * plus a soft accent ring. The whole box is the target. 48px tall so the value
 * sits at a comfortable reading size and the tap target clears the 44px
 * minimum. Identical to myprofile's CONTROL.
 */
const FIELD_LINE =
  'w-full border border-border bg-field px-4 text-[16px] text-fg outline-none ' +
  'placeholder:text-placeholder ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'hover:bg-field-hover ' +
  'focus:border-accent-hover focus:bg-field-focus ' +
  'focus:shadow-[0_0_0_3px_var(--accent-soft-ring)] focus:outline-none ' +
  'disabled:opacity-50';

export const Field = React.forwardRef<HTMLInputElement, {
  label?: string;
  error?: string;
  hint?: ReactNode;
  containerClassName?: string;
  /** Glyph after the value, on the baseline — a reveal toggle, a unit. */
  trailing?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>>(function Field(
  { label, error, hint, containerClassName, trailing, id, className, ...inputProps },
  ref,
) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={fieldId} className="tb-label">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(FIELD_LINE, 'h-[50px] rounded-xl', trailing && 'pr-12', error && '!border-danger', className)}
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
        className={cn(FIELD_LINE, 'rounded-2xl resize-none py-3 leading-snug', error && '!border-danger', className)}
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
          className={cn(FIELD_LINE, 'h-12 rounded-full cursor-pointer appearance-none pr-11 [&>option]:bg-card')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-4" />
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
          'mt-[1px] grid size-5 shrink-0 place-items-center rounded-[6px] border-2 transition-colors duration-150',
          checked ? 'border-accent bg-accent' : 'border-track group-hover:border-border-strong',
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
  const [focused, setFocused] = useState(-1);

  const setChar = (i: number, ch: string) => {
    const chars = Array.from({ length }, (_, j) => value[j] || '');
    chars[i] = ch;
    onChange(chars.join('').replace(/\s+$/, ''));
  };

  return (
    <div className="flex w-full justify-between gap-1.5" role="group" aria-label={label}>
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
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused((f) => (f === i ? -1 : f))}
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
            'h-14 min-w-0 flex-1 rounded-2xl border border-transparent bg-field text-center text-[21px] font-semibold text-fg',
            'transition-[border-color,background-color,box-shadow] duration-150',
            error
              ? 'border-danger bg-hover'
              : focused === i
                ? 'border-accent-hover bg-field-focus shadow-[0_0_0_3px_var(--accent-soft-ring)]'
                : 'hover:bg-field-hover',
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
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-full border border-border bg-surface p-1.5', className)}>
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
              'flex-1 rounded-full text-center font-semibold whitespace-nowrap h-9 text-[14px]',
              'transition-all duration-150',
              active
                ? 'bg-accent-soft text-accent-text'
                : 'bg-transparent text-muted hover:bg-hover hover:text-fg',
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
    <div className={cn('divide-y divide-divider overflow-hidden rounded-2xl border border-border bg-card shadow-card', className)}>
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
        <span className={cn('block text-[16px] leading-snug', danger ? 'text-danger-text' : 'text-fg')}>
          {label}
        </span>
        {sub ? <span className="mt-1 block text-[14px] leading-snug text-text-3">{sub}</span> : null}
      </span>
      {right ? <span className="shrink-0 text-[15px] tabular-nums text-text-3">{right}</span> : null}
      {chevron !== false && onClick ? <ChevronRight className="size-[22px] shrink-0 text-text-4" /> : null}
    </>
  );
  const cls =
    'flex min-h-[3.5rem] w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-hover active:bg-field-focus';
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
    <div className="flex min-h-[3.5rem] items-center gap-4 px-4 py-3.5">
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
            'block size-6 rounded-full bg-accent-fg shadow-[0_1px_3px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-out motion-reduce:transition-none',
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
 * Full-width "Continue with…" rows — provider glyph on the left, label, and a
 * subtle chevron. Apple-styled: 13px radius, --field plate, hairline border.
 * Stacked list, one per provider. Replaces the old tiny circular icon row.
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
          <span className="oauth-label">Continue with {p.name}</span>
          <ChevronRight className="oauth-chev size-[18px]" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** Divider with a centred label. */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-divider" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-4">
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
      <img {...shared} src="/logo-dark.webp" className={cn('brand-mark w-auto object-contain', glyph, className)} />
      <img {...shared} src="/logo-white.webp" className={cn('brand-mark w-auto object-contain', glyph, className)} />
    </>
  );
}

/**
 * Auth frame — the login card: a bare em-scaled column on the
 * black-charcoal canvas. The outer .login-page container (App.tsx) owns
 * centring; on portrait phones the card pins near the top edge.
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
            {onBack ? (
              <button type="button" onClick={onBack} className="wizard-back">
                <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3.5 5.5 8 10 12.5" />
                </svg>
                Back
              </button>
            ) : null}
            {step ? (
              <div
                className="wizard-track"
                role="progressbar"
                aria-valuenow={step.index}
                aria-valuemin={1}
                aria-valuemax={step.total}
              >
                <i style={{ width: `${(step.index / step.total) * 100}%` }} />
              </div>
            ) : null}
          </div>
          {step ? (
            <p className="wizard-caption">
              {step.label ? `${step.label} · ` : ''}{step.index} of {step.total}
            </p>
          ) : null}
        </div>
      ) : null}
      <header className="login-head">
        {kicker ? <p className="login-kicker mt-0">{kicker}</p> : null}
        {title ? <h1 className={cn('tb-heading', kicker ? 'mt-[0.42em]' : 'mt-0')}>{title}</h1> : null}
        {subtitle ? <p className="tb-sub mt-[0.7em]">{subtitle}</p> : null}
      </header>
      <div className="login-form">
        {children}
        {footer ? <p className="login-terms">{footer}</p> : null}
      </div>
    </div>
  );
}