type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 20],
  error: [30, 50, 30, 50, 30],
};

export function haptic(pattern: HapticPattern = 'light'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(patterns[pattern]);
}
