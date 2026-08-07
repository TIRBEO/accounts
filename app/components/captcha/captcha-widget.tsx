"use client";
import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface CaptchaWidgetProps {
  onSuccess?: (rayId: string) => void;
  onBlocked?: (rayId: string, reason: string, expiresAt?: string) => void;
  forceShow?: boolean;
  autoShow?: boolean;
}

interface Challenge {
  challenge: {
    id: string;
    type: string;
    challengeType: string;
    difficulty: "easy" | "medium" | "hard";
    question: string;
    options: string[];
    imageUrl: string | null;
    rayId: string;
    attempts: number;
    token: string;
    expiresAt: string;
  };
  risk: { score: number; level: string; reasons: string[] };
}

type State = "idle" | "loading" | "challenge" | "verifying" | "verified" | "blocked";

export function CaptchaWidget({ onSuccess, onBlocked, forceShow = false, autoShow = false }: CaptchaWidgetProps) {
  const [state, setState] = useState<State>("idle");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchChallenge = async () => {
    setState("loading");
    setError("");
    setSelected(null);
    try {
      const res = await fetch(`${API}/api/captcha/challenge`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.blocked) { setState("blocked"); onBlocked?.(data.rayId, data.reason, data.expiresAt); setError(data.reason || "Blocked"); return; }
        throw new Error(data?.error || "Failed to load CAPTCHA");
      }
      const data: Challenge = await res.json();
      setChallenge(data);
      setState("challenge");
    } catch (e: any) {
      setError(e?.message || "Failed to load CAPTCHA");
      setState("idle");
    }
  };

  useEffect(() => {
    if (forceShow || autoShow) { void fetchChallenge(); }
  }, [forceShow, autoShow]);

  const handleVerify = async () => {
    if (!challenge || verifying) return;
    if (!selected) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          challengeId: challenge.challenge.id,
          answer: selected,
          token: challenge.challenge.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.blocked) { setState("blocked"); onBlocked?.(challenge.challenge.rayId, data.reason || "Blocked", data.expiresAt); return; }
        const rem = challenge.challenge.attempts + 1;
        setAttemptsLeft(3 - rem);
        setError(data.reason || "Verification failed");
        setState("challenge");
        setVerifying(false);
        return;
      }
      setState("verified");
      setVerifying(false);
      onSuccess?.(challenge.challenge.rayId);
    } catch (e: any) {
      setError(e?.message || "Verification failed");
      setState("challenge");
      setVerifying(false);
    }
  };

  if (state === "verified") {
    return (
      <div className="captcha-box">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="captcha-checkbox verified"><Check size={16} /></div>
          <span className="captcha-label">Verified</span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ray ID: {challenge?.challenge.rayId.slice(0, 12)}...</span>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="captcha-box">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--error)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>You have been blocked from continuing. Contact support if this is an error.</span>
        </div>
      </div>
    );
  }

  if (state === "idle" || state === "loading") {
    const isLoading = state === "loading";
    return (
      <div className="captcha-box">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          <button type="button" className="captcha-checkbox" disabled={isLoading} onClick={fetchChallenge}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>●</span>}
          </button>
          <span className="captcha-label">{isLoading ? "Loading challenge…" : "I'm not a robot"}</span>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ray ID: {challenge?.challenge.rayId.slice(0, 12) || "—"}</span>
      </div>
    );
  }

  if (state === "challenge" && challenge) {
    const c = challenge.challenge;
    return (
      <div className="captcha-box">
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span className="captcha-label" style={{ marginBottom: "6px", fontWeight: 600 }}>Verify you are human</span>
          <span className="captcha-question">{c.question}</span>
          {error && <p style={{ color: "var(--error)", fontSize: "12px", margin: "4px 0" }}>{error}</p>}
          {c.imageUrl && <img src={c.imageUrl} alt="captcha challenge" style={{ maxWidth: "100%", borderRadius: "8px", marginBottom: "8px" }} />}
          {/* Word / select challenges: pick from options */}
          {(c.challengeType === "word" || c.challengeType === "select" || c.challengeType === "image" || (c.options && c.options.length > 0)) ? (
            <div className="captcha-options">
              {(c.options || []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`captcha-option ${selected === opt ? "selected" : ""}`}
                  onClick={() => setSelected(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : null}
          {/* Math / input challenges without options: type answer */}
          {(c.challengeType === "math" || c.challengeType === "input" || ((c.challengeType === "math" || c.challengeType === "input") && (!c.options || c.options.length === 0))) ? (
            <input
              type="text"
              placeholder="Type your answer"
              value={selected || ""}
              onChange={(e) => setSelected(e.target.value)}
              style={{ height: "44px", marginTop: "8px" }}
            />
          ) : null}
          <button type="button" className="btn-primary" style={{ height: "44px", width: "100%", marginTop: "12px", fontSize: "13px", padding: "0 16px" }} disabled={verifying || !selected} onClick={handleVerify}>
            {verifying ? <span className="spinner" /> : "Verify"}
          </button>
          {attemptsLeft !== null && attemptsLeft > 0 && <p style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "8px" }}>{attemptsLeft} attempt{attemptsLeft > 1 ? "s" : ""} left before block</p>}
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ray ID: {c.rayId.slice(0, 14)}…</span>
      </div>
    );
  }

  return null;
}
