/**
 * Supabase client — always routes through the local Express proxy.
 *
 * The client uses window.location.origin as the base URL so all requests
 * go through the Vite dev-server proxy → Express API server (port 3001)
 * which implements a Supabase-compatible interface backed by Neon Postgres.
 *
 * VITE_SUPABASE_URL is intentionally ignored so the app never talks to an
 * external Supabase project — all data lives in the Replit Neon database.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Always use the current page origin — Vite proxies /auth/v1/* and /rest/v1/*
// to the local Express API server regardless of build environment.
const localOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

// Any non-empty key works — the proxy validates via JWT, not Supabase anon key.
const LOCAL_KEY = 'local-dev-anon-key';

export const supabaseConfigSource = {
  url: localOrigin,
  urlSource: 'local-proxy',
  keySource: 'local-proxy',
  envKeysSeen: [] as string[],
} as const;

export const supabase = createClient<Database>(localOrigin, LOCAL_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Realtime disabled — no WS server; backend uses cron/polling.
  realtime: {
    params: { eventsPerSecond: 0 },
    timeout: 1,   // minimal timeout so retries are instant-fail
  },
  global: {
    headers: {
      'x-client-info': 'vinstour-local-proxy/1.0',
    },
  },
});

// Disconnect realtime immediately — prevents WebSocket connection attempts
// to /realtime/v1/websocket which we do not support.
if (typeof window !== 'undefined') {
  supabase.realtime.disconnect();
}
