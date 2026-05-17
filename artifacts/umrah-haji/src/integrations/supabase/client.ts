/**
 * Supabase client configuration.
 * Standard implementation using @supabase/supabase-js.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const env = import.meta.env as Record<string, string | undefined>;

const SUPABASE_URL =
  env.VITE_SUPABASE_URL ||
  env.VITE_SUPABASE_PROJECT_URL ||
  env.VITE_SUPABASE_API_URL ||
  '';

const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_KEY ||
  '';

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const resolvedUrl = isValidUrl(SUPABASE_URL) ? SUPABASE_URL : '';
const resolvedKey = SUPABASE_KEY.length > 20 ? SUPABASE_KEY : '';

// Expose source for diagnostics (used by EnvDiagnostic component).
export const supabaseConfigSource = {
  url: resolvedUrl,
  urlSource: resolvedUrl ? 'env' : 'missing',
  keySource: resolvedKey ? 'env' : 'missing',
  envKeysSeen: Object.keys(env).filter((k) => k.startsWith('VITE_SUPABASE')),
} as const;

const clientUrl = resolvedUrl || 'https://placeholder.supabase.co';
const clientKey = resolvedKey || 'placeholder-key';

// Standard Supabase client export
export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
