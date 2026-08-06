"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  numDigits?: number;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function OTPInput({
  value,
  onChange,
  numDigits = 6,
  error = false,
  disabled = false,
  className,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").slice(0, numDigits);

  const focusIndex = (idx: number) => {
    const ref = inputRefs.current[idx];
    if (ref) ref.focus();
  };

  const handleChange = (idx: number, char: string) => {
    if (!/^\d$/.test(char)) return;
    const newDigits = [...digits];
    newDigits[idx] = char;
    const newVal = newDigits.join("").slice(0, numDigits);
    onChange(newVal);
    if (idx < numDigits - 1) focusIndex(idx + 1);
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx]) {
        const newDigits = [...digits];
        newDigits[idx] = "";
        onChange(newDigits.join(""));
      } else if (idx > 0) {
        focusIndex(idx - 1);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      focusIndex(idx - 1);
    } else if (e.key === "ArrowRight" && idx < numDigits - 1) {
      focusIndex(idx + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, numDigits);
    if (!text) return;
    onChange(text);
    const nextIdx = Math.min(text.length, numDigits - 1);
    focusIndex(nextIdx);
  };

  return (
    <div className={`flex gap-3 justify-center ${className || ""}`} role="group" aria-label="Verification code input">
      {Array.from({ length: numDigits }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[idx] || ""}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={idx === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`Digit ${idx + 1}`}
          className={`otp-box ${error ? "border-error" : ""}`}
          style={{ border: `2px solid ${error ? "var(--error)" : "var(--border)"}` }}
        />
      ))}
    </div>
  );
}
