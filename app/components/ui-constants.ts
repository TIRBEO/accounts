// Shared UI constants for accounts app
// Use these instead of inline magic numbers for consistency

export const IMAGE_BASE = (() => {
  if (process.env.NEXT_PUBLIC_IMAGE_BASE) return process.env.NEXT_PUBLIC_IMAGE_BASE;
  return process.env.NODE_ENV === "development" ? "http://localhost:3000/image" : "https://api.tirbeo.app/image";
})();

export function img(name: string): string {
  return `${IMAGE_BASE}/${name}.png`;
}

export const BUTTON = {
  height: 'h-9', // 36px - compact but comfortable
  heightSm: 'h-8', // 32px - for dense areas
  heightLg: 'h-10', // 40px - for primary CTAs
  padding: 'px-4',
  paddingLg: 'px-5',
  radius: 'rounded-lg',
  radiusFull: 'rounded-full',
  text: 'text-[13px]',
  textSm: 'text-[12px]',
  fontWeight: 'font-medium',
} as const;

export const INPUT = {
  height: 'h-10',
  heightSm: 'h-9',
  radius: 'rounded-lg',
  border: 'border border-[#dadce0]',
  focusBorder: 'focus:border-[#1A73E8] focus:shadow-[0_0_0_1px_#1A73E8]',
  padding: 'px-3.5',
  text: 'text-[14px]',
} as const;

export const CARD = {
  radius: 'rounded-2xl',
  border: 'border border-[#e8eaed]',
  padding: 'p-6',
  paddingLg: 'p-8',
  shadow: 'shadow-sm',
} as const;

export const SPACING = {
  section: 'space-y-5',
  form: 'space-y-4',
  tight: 'space-y-3',
  loose: 'space-y-6',
  gap: 'gap-3',
  gapLg: 'gap-4',
} as const;

export const COLOR = {
  primary: '#1A73E8',
  primaryHover: '#1769d2',
  primaryActive: '#1558b0',
  success: '#188038',
  error: '#d93025',
  warning: '#f9ab00',
  text: '#202124',
  textSecondary: '#5f6368',
  textMuted: '#80868b',
  border: '#dadce0',
  borderLight: '#e8eaed',
  surface: '#f8f9fa',
  background: '#f1f3f4',
} as const;
