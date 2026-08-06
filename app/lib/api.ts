export const API = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://api.tirbeo.app";
})();

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function csrfHeaders(): Record<string, string> {
  const token = getCookie("__csrf");
  return token ? { "X-CSRF-Token": token } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { ...csrfHeaders() },
    });
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

async function parseRes(res: Response): Promise<any> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export async function apiFetch(path: string, opts?: RequestInit): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${API}${normalized}`;
  const headers: Record<string, string> = { ...csrfHeaders() };
  if (!(opts?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const attempt = async () =>
    fetch(url, {
      credentials: 'include',
      ...opts,
      headers: { ...headers, ...(opts?.headers as Record<string, string> || {}) },
    });
  let res = await attempt();
  if (res.status === 401 && path !== 'auth/refresh' && path !== 'auth/login' && path !== 'auth/signup') {
    const refreshed = await refreshSession();
    if (refreshed) {
      getCookie('__csrf');
      res = await attempt();
    }
  }
  return res;
}

export async function apiPost(path: string, body?: Record<string, any>): Promise<any> {
  const res = await apiFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseRes(res);
  if (!res.ok) {
    const errMsg = typeof data === "string" ? data : data.error || data.message || "Request failed";
    throw new ApiError(errMsg, res.status);
  }
  return data;
}

export async function apiGet(path: string): Promise<any> {
  const res = await apiFetch(path, { method: "GET" });
  const data = await parseRes(res);
  if (!res.ok) {
    const errMsg = typeof data === "string" ? data : data.error || data.message || "Request failed";
    throw new ApiError(errMsg, res.status);
  }
  return data;
}
