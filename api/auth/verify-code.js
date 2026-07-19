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

function makeToken() {
  return "tok_" + crypto.randomUUID().replace(/-/g, "");
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
  const code = String(body.code || "").trim();
  const flow = body.flow === "signup" ? "signup" : "login";

  // Read the signed code payload from the cookie set by send-code.
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)tirbeo_code=([^;]+)/);
  if (!m) return res.status(400).json({ error: "No pending code. Request a new one." });

  const payload = unsign(decodeURIComponent(m[1]));
  if (!payload) return res.status(400).json({ error: "Invalid code session." });

  if (Date.now() > payload.exp) {
    res.setHeader("Set-Cookie", "tirbeo_code=; Path=/; Max-Age=0");
    return res.status(400).json({ error: "Code expired. Request a new one." });
  }
  if (payload.email !== email || payload.code !== code || payload.flow !== flow) {
    return res.status(401).json({ error: "That code didn't match." });
  }

  // One-time: clear the cookie.
  res.setHeader("Set-Cookie", "tirbeo_code=; Path=/; Max-Age=0");

  return res.status(200).json({ token: makeToken(), email });
}
