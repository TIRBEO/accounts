const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiPost(path: string, body?: any) {
  const res = await fetch(`${API}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message || data?.error?.code || "Request failed", res.status);
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
