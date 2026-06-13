/**
 * Supabase client — smart environment detection.
 *
 * • Production (umrohweb.site / any deploy with VITE_SUPABASE_URL):
 *   Uses the real Supabase cloud URL + anon key from env vars.
 *
 * • Replit dev (no VITE_SUPABASE_URL set):
 *   Uses the local Express proxy at window.location.origin.
 *   The proxy at /auth/v1/* and /rest/v1/* is forwarded by Vite
 *   to the Express backend on port 3001.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const explicitUrl  = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const explicitKey  = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

const isProduction = !!explicitUrl && !!explicitKey;

const resolvedUrl = isProduction
  ? explicitUrl!
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

const resolvedKey = isProduction
  ? explicitKey!
  : 'local-dev-anon-key';

export const supabaseConfigSource = {
  url: resolvedUrl,
  urlSource: isProduction ? 'env-VITE_SUPABASE_URL' : 'local-proxy',
  keySource: isProduction ? 'env-VITE_SUPABASE_PUBLISHABLE_KEY' : 'local-proxy',
  isProduction,
  envKeysSeen: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_SUPABASE')),
} as const;

export const supabase = createClient<Database>(resolvedUrl, resolvedKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: isProduction
    ? undefined
    : {
        params: { eventsPerSecond: 0 },
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
