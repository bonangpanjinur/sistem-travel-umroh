const SUPABASE_URL = process.env['SUPABASE_URL'] || '';
const SUPABASE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export async function supabaseFetch(path: string, options: RequestInit = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data as any)?.message || res.statusText;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data;
}

export async function validateApiKey(rawKey: string): Promise<{ valid: boolean; permissions: string[] }> {
  try {
    const rows = await supabaseFetch(
      `/api_keys?key_hash=eq.${encodeURIComponent(rawKey)}&is_active=eq.true&select=id,permissions`,
    );
    if (!Array.isArray(rows) || rows.length === 0) return { valid: false, permissions: [] };
    supabaseFetch(`/api_keys?id=eq.${rows[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    }).catch(() => {});
    return { valid: true, permissions: rows[0].permissions ?? [] };
  } catch {
    return { valid: false, permissions: [] };
  }
}
