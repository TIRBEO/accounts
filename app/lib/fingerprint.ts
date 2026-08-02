export function getDeviceFingerprint(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )__dfp=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}
