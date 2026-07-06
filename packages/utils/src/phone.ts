const NEPALI_PHONE_REGEX = /^(?:\+977[- ]?)?(?:98\d{8}|97\d{8}|96\d{8}|0[1-9]\d{7,8})$/;

export function isValidNepaliPhone(phone: string): boolean {
  return NEPALI_PHONE_REGEX.test(phone.replace(/\s/g, ""));
}

export function formatNepaliPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, "");

  if (cleaned.startsWith("+977")) {
    const number = cleaned.slice(4);
    if (number.length === 10) {
      return `+977-${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`;
    }
  }

  if (cleaned.length === 10 && /^9[876]\d{8}$/.test(cleaned)) {
    return `+977-${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return cleaned;
}

export function getPhoneType(phone: string): "mobile" | "landline" | "invalid" {
  const cleaned = phone.replace(/[\s-]/g, "").replace(/^\+977/, "");

  if (/^9[876]\d{8}$/.test(cleaned)) return "mobile";
  if (/^0[1-9]\d{7,8}$/.test(cleaned)) return "landline";
  return "invalid";
}
