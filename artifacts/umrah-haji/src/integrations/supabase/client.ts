/**
 * Supabase client — on Replit, always uses the local Express proxy.
 *
 * The Express backend at /auth/v1/* and /rest/v1/* fully implements the
 * Supabase-compatible API using Replit's built-in PostgreSQL database.
 * No external Supabase cloud connection is needed or used.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const localOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

const resolvedUrl = localOrigin;
const resolvedKey = 'local-dev-anon-key';

export const supabaseConfigSource = {
  url: resolvedUrl,
  urlSource: 'local-proxy',
  keySource: 'local-proxy',
  envKeysSeen: [],
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
    // Disable realtime WebSocket — not supported by local Express proxy.
    // All data is fetched via REST /rest/v1/* which is fully proxied.
    transport: class DisabledWebSocket extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 3;
      constructor() { super(); }
      send() {}
      close() {}
    } as any,
  },
  global: {
    headers: {
      'x-client-info': 'vinstour/1.0',
    },
  },
});
