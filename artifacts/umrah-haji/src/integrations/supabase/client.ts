/**
 * Supabase client — supports both local Express proxy and real Supabase.
 *
 * Priority:
 *   1. VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY  → connects to real Supabase
 *   2. No env vars                                         → falls back to local proxy
 *                                                            (window.location.origin, caught by Vite proxy → Express API)
 *
 * For production on Vercel: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 * in Vercel → Project Settings → Environment Variables.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const env = import.meta.env as Record<string, string | undefined>;

const localOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

const SUPABASE_URL =
  env.VITE_SUPABASE_URL ||
  env.VITE_SUPABASE_PROJECT_URL ||
  env.VITE_SUPABASE_API_URL ||
  localOrigin;

const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_KEY ||
  'local-dev-anon-key';

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const resolvedUrl = isValidUrl(SUPABASE_URL) ? SUPABASE_URL : localOrigin;
const resolvedKey = SUPABASE_KEY || 'local-dev-anon-key';

const usingRealSupabase = !!(env.VITE_SUPABASE_URL || env.VITE_SUPABASE_PUBLISHABLE_KEY);

if (!usingRealSupabase) {
  console.warn(
    '[supabase] Konfigurasi tidak lengkap. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY ' +
    'di Replit Secrets agar fitur autentikasi dan database berfungsi.',
  );
}

export const supabaseConfigSource = {
  url: resolvedUrl,
  urlSource: env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'local-proxy',
  keySource: env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : 'local-proxy',
  envKeysSeen: Object.keys(env).filter((k) => k.startsWith('VITE_SUPABASE')),
} as const;

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 0 },
  },
  global: {
    headers: {
      'x-client-info': 'vinstour/1.0',
    },
  },
});
