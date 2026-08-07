const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Read the __csrf cookie set by the API (httpOnly:false) and return it as the X-CSRF-Token header. */
function csrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
  return match ? { "X-CSRF-Token": decodeURIComponent(match[1]) } : {};
}

export async function apiPost(path: string, body?: any) {
  const res = await fetch(`${API}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrfHeaders() },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message || data?.error?.code || data?.message || "Request failed", res.status);
  }
  return data;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API}/api/${path}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message || "Request failed", res.status);
  }
  return data;
}

/** Raw fetch wrapper (returns the Response) — used where the caller inspects status directly. */
export async function apiFetch(path: string, opts?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...(opts?.headers as Record<string, string>) || {} };
  const method = (opts?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    Object.assign(headers, csrfHeaders());
  }
  return fetch(`${API}/api/${path}`, { ...opts, headers, credentials: "include" });
}
