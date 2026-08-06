export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const nav = navigator as any;
  const screen = window.screen;
  const data = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!nav.cookieEnabled,
    nav.hardwareConcurrency || "unknown",
  ].join("|");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
