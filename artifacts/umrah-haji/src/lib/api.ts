/**
 * Centralized API fetcher — prepends VITE_API_URL to all /api paths.
 *
 * In local dev: VITE_API_URL is empty → requests go to /api (caught by Vite proxy → localhost:3001)
 * In production: VITE_API_URL = https://your-railway-app.up.railway.app
 *                → requests go to https://your-railway-app.up.railway.app/api/...
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/**
 * Fetch wrapper that prepends the API base URL.
 * Usage: apiFetch('/api/midtrans/create-transaction', { method: 'POST', body: ... })
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, init);
}

/**
 * Convenience: fetch JSON and throw on non-2xx.
 */
export async function apiFetchJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? body?.error ?? message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
