// ─────────────────────────────────────────────────────────────
//  Config — point this at your real auth API.
//  Expected endpoints (same-origin or set TIRBEO_API base):
//    POST {API}/auth/send-code   { email, flow }  -> 200 { sent: true }
//    POST {API}/auth/verify-code { email, code }  -> 200 { token: "..." }
// ─────────────────────────────────────────────────────────────
const API_BASE = window.TIRBEO_API || ""; // same-origin: /api/auth/send-code, /api/auth/verify-code

const REDIRECT_TO = "/login"; // the real app reads the one-time token

// ── i18n ──
const I18N = {
  en: {
    "brand.tagline": "Connecting communities.",
    "auth.back": "Back to Website",
    "hero.heading": "A calmer place to belong.",
    "hero.sub": "Real conversations. Real communities. No noise.",
    "auth.login": "Log in",
    "auth.signup": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.remember": "Remember me",
    "auth.forgot": "Forgot password?",
    "auth.loginCta": "Log in",
    "auth.name": "Full name",
    "auth.tos": "I agree to the Terms & Privacy Policy",
    "auth.signupCta": "Create account",
    "auth.or": "or continue with",
    "auth.legal": "Protected by Tirbeo. Your data stays yours.",
    "auth.orCode": "or sign in with a code",
    "auth.sendCode": "Email me a code",
    "auth.sendCodeSent": "Code sent",
    "auth.codeHintPre": "We sent a 6-digit code to",
    "auth.code": "Verification code",
    "auth.verify": "Verify & continue",
    "auth.usePassword": "Use password instead",
    "auth.sending": "Sending…",
    "auth.verified": "तपाईं प्रमाणित हुनुहुन्छ",
    "auth.verifiedSub": "तपाईंको कोड स्वीकार गरियो। तपाईं अब तिर्बिओमा जान सक्नुहुन्छ।",
    "auth.continue": "तिर्बिओमा जारी राख्नुहोस्",
    "auth.verified": "You're verified",
    "auth.verifiedSub": "Your code was accepted. You can now continue to Tirbeo.",
    "auth.continue": "Continue to Tirbeo",
  },
  ne: {
    "brand.tagline": "समुदायहरू जोड्दै।",
    "auth.back": "वेबसाइटमा फर्कनुहोस्",
    "hero.heading": "साथी बन्ने शान्त ठाउँ।",
    "hero.sub": "वास्तविक कुराकानी। वास्तविक समुदाय। कुनै हल्ला छैन।",
    "auth.login": "लग इन",
    "auth.signup": "साइन अप",
    "auth.email": "इमेल",
    "auth.password": "पासवर्ड",
    "auth.remember": "मलाई सम्झनुहोस्",
    "auth.forgot": "पासवर्ड बिर्सनुभयो?",
    "auth.loginCta": "लग इन",
    "auth.name": "पूरा नाम",
    "auth.tos": "म सर्त र गोपनीयता नीतिसँग सहमत छु",
    "auth.signupCta": "खाता बनाउनुहोस्",
    "auth.or": "वा यसबाट जारी राख्नुहोस्",
    "auth.legal": "तिर्बिओद्वारा सुरक्षित। तपाईंको डाटा तपाईंकै हो।",
    "auth.orCode": "वा कोडबाट साइन इन गर्नुहोस्",
    "auth.sendCode": "इमेलमा कोड पठाउनुहोस्",
    "auth.sendCodeSent": "कोड पठाइयो",
    "auth.codeHintPre": "हामीले ६ अङ्कको कोड पठायौं",
    "auth.code": "प्रमाणीकरण कोड",
    "auth.verify": "प्रमाणित गरी जारी राख्नुहोस्",
    "auth.usePassword": "पासवर्ड प्रयोग गर्नुहोस्",
    "auth.sending": "पठाउँदै…",
  },
};

const langToggle = document.getElementById("langToggle");
function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  // keep dynamic "sent" labels correct after language switch
  document.querySelectorAll(".btn-send-code.sent .label").forEach((el) => {
    el.textContent = I18N[lang]["auth.sendCodeSent"];
  });
  langToggle.querySelectorAll("img").forEach((img) => {
    img.classList.toggle("active", img.dataset.flag === lang);
    img.classList.toggle("dim", img.dataset.flag !== lang);
  });
  localStorage.setItem("tirbeo-lang", lang);
}
langToggle.addEventListener("click", () => {
  applyLang(localStorage.getItem("tirbeo-lang") === "ne" ? "en" : "ne");
});
applyLang(localStorage.getItem("tirbeo-lang") === "ne" ? "ne" : "en");

// ── Tab slide toggle ──
const shell = document.getElementById("shell");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
function setMode(mode) {
  const signup = mode === "signup";
  shell.classList.toggle("signup", signup);
  tabLogin.classList.toggle("is-active", !signup);
  tabSignup.classList.toggle("is-active", signup);
  document.getElementById("hero").style.transform = signup ? "translateX(18px)" : "translateX(0)";
}
tabLogin.addEventListener("click", () => setMode("login"));
tabSignup.addEventListener("click", () => setMode("signup"));
setMode("login");

// ── Hero carousel ──
const slides = document.querySelectorAll(".hero-slide");
const dots = document.querySelectorAll("#carousel .dot");
let ci = 0;
function goSlide(i) {
  ci = (i + slides.length) % slides.length;
  slides.forEach((s, idx) => s.classList.toggle("is-active", idx === ci));
  dots.forEach((d, idx) => d.classList.toggle("is-active", idx === ci));
}
dots.forEach((d, idx) => d.addEventListener("click", () => goSlide(idx)));
setInterval(() => goSlide(ci + 1), 5000);

// ── Password reveal ──
document.querySelectorAll(".reveal").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
  });
});

// ── Ripple effect ──
document.querySelectorAll(".ripple").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const span = document.createElement("span");
    span.className = "rp";
    span.style.width = span.style.height = size + "px";
    span.style.left = e.clientX - r.left - size / 2 + "px";
    span.style.top = e.clientY - r.top - size / 2 + "px";
    btn.appendChild(span);
    setTimeout(() => span.remove(), 600);
  });
});

// ── Toast ──
const toast = document.getElementById("toast");
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

// ── Status helper ──
function setStatus(el, msg, kind) {
  el.hidden = false;
  el.textContent = msg;
  el.className = "status " + (kind || "");
}

// ── Send-code / verify flow (both forms) ──
function wireFlow(form) {
  const flow = form.dataset.flow; // login | signup
  const stepEmail = form.querySelector(".step-email");
  const stepCode = form.querySelector(".step-code");
  const sendBtn = form.querySelector(".btn-send-code");
  const verifyBtn = form.querySelector(".btn-verify");
  const backBtn = form.querySelector("[data-back]");
  const statusEl = form.querySelector(".status");
  const emailInput = form.querySelector('input[type="email"]');
  const codeInput = form.querySelector('input[maxlength="6"]');
  const codeTo = form.querySelector(".code-hint b");

  let sentTo = "";

  // label markup with floating send icon
  sendBtn.innerHTML =
    '<span class="fly"><svg class="icon-send" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
    '<span class="label">' + I18N[localStorage.getItem("tirbeo-lang") === "ne" ? "ne" : "en"]["auth.sendCode"] + "</span></span>";

  sendBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      emailInput.focus();
      setStatus(statusEl, "Please enter a valid email.", "err");
      return;
    }
    const lang = localStorage.getItem("tirbeo-lang") === "ne" ? "ne" : "en";
    sendBtn.disabled = true;
    sendBtn.querySelector(".label").textContent = I18N[lang]["auth.sending"];
    setStatus(statusEl, "", "");
    statusEl.hidden = true;

    try {
      const res = await fetch(API_BASE + "/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, flow }),
      });
      if (!res.ok) throw new Error("send failed");

      // success UI
      sentTo = email;
      codeTo.textContent = email;
      sendBtn.classList.add("sent");
      sendBtn.querySelector(".label").textContent = I18N[lang]["auth.sendCodeSent"];
      stepEmail.hidden = true;
      stepCode.hidden = false;
      codeInput.focus();
      showToast(I18N[lang]["auth.sendCodeSent"]);
    } catch (err) {
      sendBtn.disabled = false;
      sendBtn.querySelector(".label").textContent = I18N[lang]["auth.sendCode"];
      setStatus(statusEl, "Could not send the code. Please try again.", "err");
    }
  });

  verifyBtn.addEventListener("click", async () => {
    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      codeInput.focus();
      setStatus(statusEl, "Enter the 6-digit code.", "err");
      return;
    }
    const lang = localStorage.getItem("tirbeo-lang") === "ne" ? "ne" : "en";
    verifyBtn.disabled = true;
    setStatus(statusEl, "Verifying…", "");

    try {
      const res = await fetch(API_BASE + "/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentTo, code, flow }),
      });
      if (!res.ok) throw new Error("verify failed");
      const data = await res.json().catch(() => ({}));
      const token = data.token || "tok_" + Math.random().toString(36).slice(2);

      // one-time token: consumed by the real app after the user clicks Continue
      try {
        sessionStorage.setItem("tirbeo_otp", token);
        sessionStorage.setItem("tirbeo_otp_email", sentTo);
      } catch (_) {}

      // Show verified state in-page (no auto-redirect to dashboard).
      stepCode.hidden = true;
      form.querySelector(".step-done").hidden = false;
      form.querySelector(".btn-continue").dataset.token = token;
    } catch (err) {
      verifyBtn.disabled = false;
      setStatus(statusEl, "That code didn’t match. Try again.", "err");
    }
  });

  backBtn.addEventListener("click", () => {
    stepCode.hidden = true;
    stepEmail.hidden = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove("sent");
    const lang = localStorage.getItem("tirbeo-lang") === "ne" ? "ne" : "en";
    sendBtn.querySelector(".label").textContent = I18N[lang]["auth.sendCode"];
    statusEl.hidden = true;
  });

  const continueBtn = form.querySelector(".btn-continue");
  continueBtn.addEventListener("click", () => {
    const token = continueBtn.dataset.token || "";
    window.location.assign(REDIRECT_TO + (token ? "?token=" + encodeURIComponent(token) : ""));
  });

  // submit (password path) — demo only
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (flow === "signup" && !form.querySelector('input[type="checkbox"]').checked) {
      showToast("Please accept the Terms & Privacy Policy.");
      return;
    }
    showToast(flow === "login" ? "Welcome back — signing you in…" : "Account created — welcome to Tirbeo!");
  });
}

document.querySelectorAll("form[data-flow]").forEach(wireFlow);

// ── Particles ──
const pc = document.getElementById("particles");
for (let i = 0; i < 36; i++) {
  const p = document.createElement("span");
  p.className = "particle";
  p.style.left = Math.random() * 100 + "%";
  p.style.top = Math.random() * 100 + "%";
  p.style.animationDuration = 6 + Math.random() * 8 + "s";
  p.style.animationDelay = -Math.random() * 10 + "s";
  const s = 2 + Math.random() * 3;
  p.style.width = p.style.height = s + "px";
  pc.appendChild(p);
}
