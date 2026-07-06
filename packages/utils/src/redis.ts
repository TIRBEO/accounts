// In‑memory mock Redis implementation (no external dependency)
// This satisfies the same API used throughout the project (setCache, getCache, delCache)

const store = new Map<string, { value: string; expiresAt: number }>();

/** Cache a value for `ttl` seconds */
export async function setCache(key: string, value: string, ttl: number = 300) {
  const expiresAt = Date.now() + ttl * 1000;
  store.set(key, { value, expiresAt });
}

/** Retrieve a cached value (or null) */
export async function getCache(key: string): Promise<string | null> {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/** Simple helper to delete a key */
export async function delCache(key: string) {
  store.delete(key);
}
