import { Resend } from "resend";

const RESEND = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM || "Tirbeo Support <noreply@send.tirbeo.app>";
const CODE_TTL = 10 * 60 * 1000; // 10 minutes

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeToken() {
  return "tok_" + crypto.randomUUID().replace(/-/g, "");
}

// Simple HMAC-signed payload so we don't need server-side state.
function sign(payload) {
  const data = JSON.stringify(payload);
  const h = crypto
    .createHmac("sha256", process.env.CODE_SECRET || "dev-secret-change-me")
    .update(data)
    .digest("hex");
  return Buffer.from(data + "." + h).toString("base64url");
}

function unsign(token) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [data, h] = raw.split(".");
    const check = crypto
      .createHmac("sha256", process.env.CODE_SECRET || "dev-secret-change-me")
      .update(data)
      .digest("hex");
    if (check !== h) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function emailHtml(code, email) {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);"></div>
      <span style="color:#fff;font-size:18px;font-weight:700;">Tirbeo</span>
    </div>
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Your Tirbeo login code</h1>
    <p style="color:#a8a8a8;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Use this code to sign in to your account.
    </p>
    <p style="color:#a8a8a8;font-size:14px;margin:0 0 12px;">Hello,</p>
    <p style="color:#a8a8a8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Here is your login verification code. It expires in 10 minutes.
    </p>
    <div style="background:rgba(124,58,237,0.12);border:1px solid rgba(168,85,247,0.4);border-radius:16px;
         padding:24px;text-align:center;font-size:34px;letter-spacing:8px;color:#fff;font-weight:700;margin-bottom:24px;">
      ${code}
    </div>
    <p style="color:#7a7a7a;font-size:13px;line-height:1.6;margin:0 0 8px;">
      This code is private. Never share it with anyone.
    </p>
    <p style="color:#7a7a7a;font-size:13px;line-height:1.6;margin:0 0 32px;">
      If you didn't request this login, you can safely ignore this email.
    </p>
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
      <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 4px;">Tirbeo</p>
      <p style="color:#7a7a7a;font-size:13px;margin:0 0 4px;">Premium Workspace Platform</p>
      <p style="color:#555;font-size:12px;margin:0;">© 2026 Tirbeo. All rights reserved.</p>
    </div>
  </div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: "Invalid body" });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const flow = body.flow === "signup" ? "signup" : "login";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const code = makeCode();
  const payload = sign({ email, code, flow, exp: Date.now() + CODE_TTL });

  // If RESEND_API_KEY is not configured (local dev / not yet set in Vercel),
  // fall back to logging the code so the flow stays testable. The email is
  // NOT sent in this mode — set the env var in production to deliver it.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[dev] login code for ${email}: ${code}`);
    res.setHeader(
      "Set-Cookie",
      `tirbeo_code=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    return res.status(200).json({ sent: true, devCode: code });
  }

  try {
    await RESEND.emails.send({
      from: FROM,
      to: email,
      subject: "Your Tirbeo login code is " + code,
      html: emailHtml(code, email),
    });
  } catch (err) {
    console.error("Resend error:", err);
    return res.status(502).json({ error: "Could not send email" });
  }

  // Return the signed payload as an httpOnly cookie the verify step will read back.
  res.setHeader(
    "Set-Cookie",
    `tirbeo_code=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );
  return res.status(200).json({ sent: true });
}
