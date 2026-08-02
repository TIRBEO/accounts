"use client";

import { useState, useCallback } from "react";
import { AuthShell } from "../components/auth-shell";
import { ResendButton } from "../components/resend-button";
import { apiPost, ApiError } from "../lib/api";
import { Mail, CheckCircle2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const maskedEmail = email.length > 0
    ? email[0] + "••••" + (email.includes("@") ? email.substring(email.indexOf("@")) : "")
    : "";

  const handleResend = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      await apiPost("auth/email-otp/request", { email });
      setMessageType("success");
      setMessage("Verification email sent successfully.");
    } catch (err: unknown) {
      setMessageType("error");
      if (err instanceof ApiError) setMessage(err.message);
      else setMessage("Failed to send verification email. Try again.");
    }
    setLoading(false);
  }, [email]);

  return (
    <AuthShell title="Check your email" subtitle="We sent a verification link to">
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#e8f0fe] flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#1A73E8]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#188038] flex items-center justify-center border-2 border-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
        <p className="text-[13px] text-[#5f6368] font-medium">{maskedEmail || "your email address"}</p>
        <p className="text-[13px] text-[#5f6368]">Click the link in the email to verify your address.</p>
        {message && (
          <p className={`text-[13px] text-center ${messageType === "success" ? "text-[#188038]" : "text-[#d93025]"}`}>
            {message}
          </p>
        )}
        <div className="flex justify-center">
          <ResendButton
            onResend={handleResend}
            label="Resend email"
            cooldown={30}
            className="h-8 px-4 rounded-[7px] bg-[#1A73E8] hover:bg-[#1769d2] active:bg-[#1558b0] text-white text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            spinnerClassName="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        </div>
        <div className="space-y-1.5">
          <p>
            <a href="/signup" className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
              Change email address
            </a>
          </p>
          <p>
            <a href="/login" className="text-[13px] font-medium text-[#1A73E8] hover:text-[#1769d2] transition-colors">
              Back to sign in
            </a>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
