"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const fetchedOnce = useRef(false);

  const fetchChallenge = useCallback(async () => {
    setState("loading");
    setError("");
    setSelected(null);
    setAttemptsLeft(null);
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
  }, [onBlocked]);

  // Open the popup immediately when required (autoShow/forceShow) — and on the
  // first mount so autoShow reliably loads a challenge.
  useEffect(() => {
    if ((forceShow || autoShow) && !fetchedOnce.current) {
      fetchedOnce.current = true;
      setModalOpen(true);
      void fetchChallenge();
    }
  }, [forceShow, autoShow, fetchChallenge]);

  // Re-open popup when forceShow flips on after a submit error.
  useEffect(() => {
    if (forceShow && !modalOpen && state !== "verified") {
      setModalOpen(true);
    }
  }, [forceShow, modalOpen, state]);

  const openModal = () => {
    setModalOpen(true);
    if (state === "idle" || state === "verified") {
      void fetchChallenge();
    }
  };

  const closeModal = () => {
    if (state === "verifying") return;
    setModalOpen(false);
    setError("");
  };

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
        if (data.blocked) {
          setState("blocked");
          setModalOpen(false);
          onBlocked?.(challenge.challenge.rayId, data.reason || "Blocked", data.expiresAt);
          return;
        }
        // Fetch a FRESH challenge so users can always continue — the old one
        // may have exhausted its server-side attempts.
        setError(data.reason || "Verification failed");
        setVerifying(false);
        await fetchChallenge();
        return;
      }
      setState("verified");
      setVerifying(false);
      setModalOpen(false);
      onSuccess?.(challenge.challenge.rayId);
    } catch (e: any) {
      setError(e?.message || "Verification failed");
      setVerifying(false);
      await fetchChallenge();
    }
  };

  /* ── verified pill (inline) ─────────────────────────────────────────── */
  if (state === "verified") {
    return (
      <div className="captcha-box captcha-verified">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="captcha-checkbox verified"><Check size={16} /></div>
          <span className="captcha-label">Verified</span>
        </div>
        <button type="button" className="captcha-resolve" onClick={() => { setState("idle"); setModalOpen(true); void fetchChallenge(); }}>
          Re-verify
        </button>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="captcha-box">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--error)" }}>
          <ShieldAlert size={18} />
          <span style={{ fontSize: "13px", fontWeight: 600 }}>You have been blocked from continuing. Contact support if this is an error.</span>
        </div>
      </div>
    );
  }

  /* ── trigger (idle / loading) ───────────────────────────────────────── */
  const isLoading = state === "loading";
  return (
    <>
      <div className="captcha-box captcha-trigger">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          <button
            type="button"
            className="captcha-checkbox"
            disabled={isLoading}
            onClick={openModal}
            aria-label="Open CAPTCHA verification"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>●</span>}
          </button>
          <button type="button" className="captcha-label captcha-open" onClick={openModal} disabled={isLoading}>
            {isLoading ? "Loading challenge…" : "I'm not a robot"}
          </button>
        </div>
        {error && <p style={{ color: "var(--error)", fontSize: "11px", marginLeft: "8px" }}>{error}</p>}
      </div>

      {modalOpen && (
        <div className="captcha-overlay" role="dialog" aria-modal="true" aria-label="CAPTCHA verification" onClick={closeModal}>
          <div className="captcha-modal" onClick={(e) => e.stopPropagation()}>
            <div className="captcha-modal-head">
              <span className="captcha-label">Verify you are human</span>
              <button type="button" className="captcha-close" onClick={closeModal} aria-label="Close CAPTCHA">
                <X size={16} />
              </button>
            </div>

            {state === "loading" && (
              <div className="captcha-modal-body" style={{ minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            )}

            {state === "challenge" && challenge && (
              <div className="captcha-modal-body">
                <p className="captcha-question">{challenge.challenge.question}</p>
                {error && <p style={{ color: "var(--error)", fontSize: "12px", margin: "4px 0" }}>{error}</p>}
                {challenge.challenge.imageUrl && (
                  <img src={challenge.challenge.imageUrl} alt="captcha challenge" style={{ maxWidth: "100%", marginBottom: "10px" }} />
                )}
                {(challenge.challenge.challengeType === "word" || challenge.challenge.challengeType === "select" || challenge.challenge.challengeType === "image" || (challenge.challenge.options && challenge.challenge.options.length > 0)) ? (
                  <div className="captcha-options">
                    {(challenge.challenge.options || []).map((opt) => (
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
                {(challenge.challenge.challengeType === "math" || challenge.challenge.challengeType === "input" || !(challenge.challenge.options && challenge.challenge.options.length > 0)) ? (
                  <input
                    type="text"
                    placeholder="Type your answer"
                    value={selected || ""}
                    onChange={(e) => setSelected(e.target.value)}
                    autoFocus
                  />
                ) : null}
                <button
                  type="button"
                  className="btn-primary"
                  style={{ height: 48, width: "100%", marginTop: "14px", fontSize: "13px" }}
                  disabled={verifying || !selected}
                  onClick={handleVerify}
                >
                  {verifying ? <span className="spinner" /> : "Verify"}
                </button>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "8px" }}>
                    {attemptsLeft} attempt{attemptsLeft > 1 ? "s" : ""} left before block
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
