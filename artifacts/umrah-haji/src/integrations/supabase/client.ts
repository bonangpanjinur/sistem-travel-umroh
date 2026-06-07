/**
 * Supabase client — migrated to use local Express proxy.
 *
 * The client now points to the same origin as the frontend.
 * Vite proxies /auth/v1/* and /rest/v1/* to the Express API server (port 8080)
 * which implements a Supabase-compatible interface backed by Neon Postgres.
 *
 * Original Supabase credentials are kept as fallback for environments where
 * the local proxy is not running (e.g., a standalone Supabase deployment).
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const env = import.meta.env as Record<string, string | undefined>;

// In the browser, window.location.origin gives us the Vite dev-server origin
// (e.g. https://xxx.repl.co). Combined with the Vite proxy, this routes
// Supabase client calls through the Express API server.
const localOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

// Prefer the real Supabase URL if configured (existing deployments).
// Fall back to local proxy origin so the app works without Supabase credentials.
const SUPABASE_URL =
  env.VITE_SUPABASE_URL ||
  env.VITE_SUPABASE_PROJECT_URL ||
  env.VITE_SUPABASE_API_URL ||
  localOrigin;

const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_KEY ||
  // Local dev key — accepted by the proxy (any non-empty string works)
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

// Expose source for diagnostics (used by EnvDiagnostic component).
export const supabaseConfigSource = {
  url: resolvedUrl,
  urlSource: env.VITE_SUPABASE_URL ? 'env' : 'local-proxy',
  keySource: env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'env' : 'local-proxy',
  envKeysSeen: Object.keys(env).filter((k) => k.startsWith('VITE_SUPABASE')),
} as const;

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Disable realtime — the backend uses its own cron/polling; no WS server exists.
  realtime: {
    params: { eventsPerSecond: 0 },
  },
  global: {
    headers: {
      // Identify requests from the local proxy client
      'x-client-info': 'vinstour-local-proxy/1.0',
    },
  },
});
