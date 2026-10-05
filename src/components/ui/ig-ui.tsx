import React, { useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { startOAuth, type OAuthProvider } from '../../lib/oauth';
import { GitHubIcon, GoogleIcon, DiscordIcon } from '../SocialIcons';
import { RandomAvatar } from './random-avatar';

/* ═══════════════════════════════════════════════════════════════════════
   Tirbeo Accounts — primitives

   Everything here is deliberately quiet. There is no card, no pill, no filled
   brand button. A field is a label, a value, and a hairline. An action is a
   flat wash of white at 7%. The accent colour only ever draws a focus ring.

   The one rule that overrides tidiness: anything carrying information must
   stay readable. Purely decorative marks (rules, the wordmark, the OR label)
   are free to sit at 7–28% white.
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

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={cn('tb-shimmer block rounded', className)} />;
}

/* ── Buttons ──────────────────────────────────────────────────────────── */

type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * One shape for every action, Instagram's: sentence case, semibold, no
 * letter-spacing, generous radius, and a 3% press. Uppercase-and-tracked
 * labels read as software; these read as a product.
 */
const BUTTON_BASE =
  'relative inline-flex w-full select-none items-center justify-center gap-2 overflow-hidden ' +
  'rounded-xl font-semibold normal-case tracking-[-0.01em] whitespace-nowrap ' +
  'transition-[background-color,color,border-color,opacity,transform] duration-150 ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:active:scale-100';

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-12 px-4 text-[14px]',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-[15px]',
};

/** Primary — the one place the brand blue is allowed to be a fill. */
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
        'bg-ig text-white hover:bg-ig-hover active:bg-ig-press',
        // A blocked action dims rather than disappearing — the user still has
        // to be able to see what they need to complete.
        'disabled:bg-white/[0.12] disabled:text-white/40',
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

/** Secondary — Instagram's outlined button: no fill, a hairline, then a
 *  quiet wash on hover. */
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
        'border border-white/[0.18] bg-transparent text-white/85',
        'hover:border-white/35 hover:bg-white/[0.04] hover:text-white',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Ghost — no fill until hover. For back, cancel, switch-account. */
export function GhostButton({
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
        'text-white/70 hover:bg-white/[0.07] hover:text-white',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DangerButton({
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
        'bg-danger/90 text-white hover:bg-danger',
        'disabled:pointer-events-none disabled:opacity-40',
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
        // tappable on a phone, and let colour carry the affordance instead of
        // an underline that fights the rest of the type.
        'inline-flex min-h-10 items-center gap-1.5 rounded-xl px-1 text-[15px] font-semibold text-white/75',
        'transition-colors hover:text-white active:text-white/70',
        'focus-visible:outline-none focus-visible:text-white',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Fields ───────────────────────────────────────────────────────────── */

/**
 * A filled field, Instagram's: a low-opacity white plate, a hairline, and a
 * soft ring on focus. 48px tall so the value sits at a comfortable reading
 * size and the tap target clears the 44px minimum without looking like a bar.
 */
const FIELD_LINE =
  'w-full rounded-xl border border-white/[0.16] bg-white/[0.07] px-4 text-[16px] text-white ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'placeholder:text-white/40 hover:border-white/25 ' +
  'focus:border-white/70 focus:bg-white/[0.1] focus:shadow-[0_0_0_3px_var(--accent-soft)]';

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
          className={cn(FIELD_LINE, 'h-12', trailing && 'pr-12', error && '!border-danger', className)}
          {...inputProps}
        />
        {trailing ? (
          <span className="absolute bottom-0 right-0 flex h-12 items-center">{trailing}</span>
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

/** The reveal toggle that sits on the baseline. */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="grid size-10 place-items-center rounded-xl text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
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
        <ChevronDown className="pointer-events-none absolute bottom-[15px] right-4 size-5 text-white/50" />
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
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl text-left transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-[1px] grid size-5 shrink-0 place-items-center rounded-[6px] border-2 transition-colors duration-150',
          checked ? 'border-white bg-white' : 'border-white/30 group-hover:border-white/60',
        )}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" className="size-3.5 text-black" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-white/80">{label}</span>
    </button>
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
            'h-14 min-w-0 flex-1 rounded-xl border bg-transparent text-center text-[21px] font-normal text-white',
            'transition-[border-color,background-color,box-shadow] duration-150',
            error
              ? 'border-danger'
              : focused === i
                ? 'border-white/80 shadow-[0_0_0_3px_var(--accent-soft)]'
                : 'border-white/[0.18] hover:border-white/35',
          )}
        />
      ))}
    </div>
  );
}

/* ── Steppers ─────────────────────────────────────────────────────────── */

/**
 * Signup step rail.
 *
 * Four soft pills: done and current are blue, future ones are a faint outline.
 * The current pill also carries a glow, so "where am I" is answered by the
 * shape of the bar itself rather than by reading the caption. Finished steps
 * are buttons — going back one or two steps should not cost four taps.
 */
export function StepProgress({
  current,
  total,
  labels,
  onSelect,
  className = '',
}: {
  current: number;
  total: number;
  labels?: string[];
  onSelect?: (step: number) => void;
  className?: string;
}) {
  const safeCurrent = Math.min(Math.max(current, 1), Math.max(total, 1));
  const label = labels?.[safeCurrent - 1];

  return (
    <div className={cn('w-full', className)}>
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label={`Step ${safeCurrent} of ${total}`}
      >
        {Array.from({ length: total }).map((_, i) => {
          const step = i + 1;
          const done = step < safeCurrent;
          const active = step === safeCurrent;
          const reachable = done && !!onSelect;
          const pill = cn(
            'h-[7px] min-w-0 flex-1 rounded-full transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
            active
              ? 'bg-white shadow-[0_0_16px_rgba(255,255,255,0.35)]'
              : done
                ? 'bg-white/45'
                : 'bg-white/[0.07] ring-1 ring-inset ring-white/[0.05]',
            reachable && 'cursor-pointer hover:bg-white/70',
          );
          return reachable ? (
            <button
              key={step}
              type="button"
              onClick={() => onSelect?.(step)}
              aria-label={`Back to step ${step}`}
              className={pill}
            />
          ) : (
            <span
              key={step}
              aria-hidden={!active}
              aria-current={active ? 'step' : undefined}
              className={pill}
            />
          );
        })}
      </div>

      {label ? (
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium text-white/85">{label}</span>
          <span className="text-[14px] tabular-nums text-white/45">
            Step {safeCurrent} of {total}
          </span>
        </div>
      ) : null}
    </div>
  );
}

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
            <span className="text-[14px] tabular-nums text-white/70">{format(value)}</span>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex h-6 items-center">
        <span aria-hidden className="absolute inset-x-0 h-1 rounded-full bg-white/15" />
        <span
          aria-hidden
          className="absolute left-0 h-1 rounded-full bg-white/90"
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

/** Segmented control. */
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
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1.5 rounded-2xl border border-white/[0.08] bg-black/40 p-1.5', className)}>
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
              'flex-1 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-150',
              active ? 'bg-white text-black' : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
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
  title: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-[19px] font-semibold text-white/95">{title}</h3>
      {children}
      {hint ? <p className="mt-3 text-[10px] leading-relaxed text-white/40">{hint}</p> : null}
    </div>
  );
}

/** Grouped list — a hairline box, rows split by a fainter one. */
export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('divide-y divide-white/[0.1] overflow-hidden rounded-2xl border border-white/[0.14] bg-white/[0.04]', className)}>
      {children}
    </div>
  );
}

export function GroupDivider() {
  return <div className="h-px bg-white/[0.1]" />;
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
      {icon ? <span className="shrink-0 text-white/35">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[16px] leading-snug', danger ? 'text-danger' : 'text-white/90')}>
          {label}
        </span>
        {sub ? <span className="mt-1 block text-[14px] leading-snug text-white/55">{sub}</span> : null}
      </span>
      {right ? <span className="shrink-0 text-[15px] tabular-nums text-white/55">{right}</span> : null}
      {chevron !== false && onClick ? <ChevronRight className="size-[22px] shrink-0 text-white/45" /> : null}
    </>
  );
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.07]';
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
        <span className="block text-[16px] leading-snug text-white/90">{label}</span>
        {sub ? <span className="mt-1 block text-[14px] leading-snug text-white/55">{sub}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-white' : 'bg-white/20',
        )}
      >
        <span
          className={cn(
            'block size-6 rounded-full transition-transform duration-200',
            checked ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white/70',
          )}
        />
      </button>
    </div>
  );
}

/* ── Identity ─────────────────────────────────────────────────────────── */

/**
 * Who you are right now.
 *
 * Once an email is known the screens stop talking about "your account" and
 * show the account: avatar, name, address. A switch link is part of the card
 * because the second most likely thing to want on these screens is *not* this
 * account — it shouldn't cost a trip back through the form.
 */
export function IdentityCard({
  name,
  email,
  photoUrl,
  switchLabel = 'Switch',
  onSwitch,
  className = '',
}: {
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  switchLabel?: string;
  onSwitch?: () => void;
  className?: string;
}) {
  const handle = (name || email?.split('@')[0] || '').trim();
  const displayName = name?.trim() || handle || 'Account';
  const initial = displayName.charAt(0).toUpperCase();
  /* Provider photos (lh3.googleusercontent.com and friends) get blocked by
     the browser before they paint — a dead <img> is a black circle. On error
     the seeded generated face takes over. */
  const [photoBroken, setPhotoBroken] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        className,
      )}
    >
      <span className="relative shrink-0">
        {photoUrl && !photoBroken ? (
          <img
            src={photoUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-[60px] rounded-full object-cover ring-1 ring-white/15"
            onError={() => setPhotoBroken(true)}
          />
        ) : photoBroken ? (
          <span
            aria-hidden="true"
            className="grid size-[60px] place-items-center overflow-hidden rounded-full ring-1 ring-inset ring-white/12"
          >
            <RandomAvatar seed={email || displayName} className="size-full" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[60px] place-items-center rounded-full bg-white/[0.08] text-[24px] font-semibold text-white/85 ring-1 ring-inset ring-white/12"
          >
            {initial}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-semibold leading-tight text-white">{displayName}</p>
        {email ? (
          <p className="mt-0.5 truncate text-[14px] text-white/50">{email}</p>
        ) : null}
      </div>

      {onSwitch ? (
        <button
          type="button"
          onClick={onSwitch}
          className="h-10 shrink-0 rounded-xl border border-white/[0.16] bg-white/[0.04] px-3.5 text-[14px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          {switchLabel}
        </button>
      ) : null}
    </div>
  );
}

/* ── OAuth ────────────────────────────────────────────────────────────── */

const OAUTH: { id: OAuthProvider; name: string; icon: ReactNode }[] = [
  { id: 'google', name: 'Google', icon: <GoogleIcon className="size-[22px] w-[22px]" /> },
  { id: 'github', name: 'GitHub', icon: <GitHubIcon className="size-[22px] w-[22px]" /> },
  { id: 'discord', name: 'Discord', icon: <DiscordIcon className="size-[22px] w-[22px] text-[#8b95ff]" /> },
];

/**
 * Icon-only tiles. The marks are already distinct at 22px, so a label on every
 * tile is noise — three words reading "Google GitHub Discord" tells the user
 * nothing they can't get from the glyph. The name stays on `aria-label` and
 * `title` so it is still announced and still shows on hover.
 */
export function OAuthRow({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {OAUTH.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => startOAuth(p.id)}
          aria-label={`Continue with ${p.name}`}
          className={cn(
            // Boxed type: the label sits inside a hairline box, the same
            // recipe as every other control here. The box is what makes a line
            // of 16px medium-weight copy read as something you can press.
            'group flex h-[52px] w-full items-center justify-center gap-3 rounded-xl',
            'border border-white/[0.16] bg-white/[0.04] text-[15px] font-semibold text-white/90',
            'transition-all duration-150 hover:border-white/35 hover:bg-white/[0.08] hover:text-white',
            'active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:border-white/70 focus-visible:bg-white/[0.08]',
            'focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.45)]',
            'disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <span className="grid size-[22px] shrink-0 place-items-center transition-transform duration-150 group-hover:scale-110">
            {p.icon}
          </span>
          <span className="truncate tracking-[-0.01em]">Continue with {p.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Divider with a centred label. */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5" role="separator">
      <span className="h-px flex-1 bg-white/[0.16]" />
      <span className="text-[14px] font-medium text-white/50">{label}</span>
      <span className="h-px flex-1 bg-white/[0.16]" />
    </div>
  );
}

/* ── Brand + shell ────────────────────────────────────────────────────── */

/**
 * The lockup: mark and word, nothing between them.
 *
 * No plate, no fill, no rule. What makes a wordmark look expensive is
 * typographic, not decorative — even colour, a touch more weight than the
 * surrounding UI, and negative tracking that pulls the letters into a single
 * shape instead of a row. The mark carries no background either; it sits on the
 * card and that is all it needs.
 */
export function BrandMark({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const glyph = { sm: 'h-[22px]', md: 'h-[30px]', lg: 'h-[38px]' }[size];
  const type = { sm: 'text-[18px]', md: 'text-[24px]', lg: 'text-[30px]' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="/logo-opt.png" alt="" decoding="async" className={cn('w-auto object-contain', glyph)} />
      <span
        className={cn(
          'font-semibold tracking-[-0.035em] text-white',
          type,
        )}
      >
        Tirbeo
      </span>
    </span>
  );
}

/**
 * Auth frame. No card, no border, no shadow — just the wordmark and the form,
 * centred, inside the glow. The column is capped at 300px so the viewport stays
 * far larger than the work, which is where the sense of space comes from.
 *
 * min-h-dvh (not h-dvh) means a short screen grows the page and scrolls
 * instead of clipping the footer.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
      <div
        className={cn(
          'animate-fade-in relative w-full rounded-3xl border border-white/[0.09] bg-black/75 p-6 sm:p-8',
          // Blurred glass: the photograph behind tints the plate but never
          // washes it out, and the faint top highlight is the only lit edge.
          // On phones the photograph is switched off, so the 40px backdrop blur
          // has nothing to sample — it still costs a full-screen blur pass on
          // every scroll frame, which is the expensive part on a mid-range
          // Android. The plate reads the same either way.
          'shadow-[0_32px_100px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_0_80px_rgba(0,0,0,0.55)]',
          'max-sm:backdrop-blur-none max-sm:backdrop-saturate-100',
          'backdrop-blur-[40px] backdrop-saturate-150',
          wide ? 'max-w-[660px]' : 'max-w-[560px]',
        )}
      >
        <a
          href="/"
          aria-label="Tirbeo home"
          className="-mx-2 mb-8 flex justify-center py-1 transition-opacity duration-200 hover:opacity-80"
        >
          <BrandMark />
        </a>

        {title ? <h1 className="tb-heading">{title}</h1> : null}
        {subtitle ? <p className="tb-sub mt-1.5">{subtitle}</p> : null}
        <div className={cn(title || subtitle ? 'mt-6' : '')}>{children}</div>

        {footer ? (
          <p className="mt-7 text-center text-[14px] text-white/55">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}