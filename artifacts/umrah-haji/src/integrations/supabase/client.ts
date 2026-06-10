/**
 * Supabase client — connects directly to Supabase cloud.
 *
 * Required environment variables:
 *   VITE_SUPABASE_URL             — Project URL (e.g. https://xxxx.supabase.co)
 *   VITE_SUPABASE_PUBLISHABLE_KEY — Project anon/public key
 *
 * Set these in:
 *   - Local dev   : .env file at the repo root
 *   - Vercel      : Project Settings → Environment Variables
 *   - Replit      : Secrets panel
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] Konfigurasi tidak lengkap. ' +
    'Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY ' +
    'di environment variables agar fitur autentikasi dan database berfungsi.',
  );
}

// Export config metadata for the EnvDiagnostic component
export const supabaseConfigSource = {
  url: supabaseUrl ?? '(tidak terkonfigurasi)',
  urlSource: supabaseUrl ? 'VITE_SUPABASE_URL' : 'missing',
  keySource: supabaseKey ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : 'missing',
  envKeysSeen: [
    ...(supabaseUrl ? ['VITE_SUPABASE_URL'] : []),
    ...(supabaseKey ? ['VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
  ],
} as const;

export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseKey ?? 'placeholder-key',
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-client-info': 'vinstour/1.0',
      },
    },
  },
);
