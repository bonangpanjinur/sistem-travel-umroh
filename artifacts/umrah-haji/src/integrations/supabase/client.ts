// Supabase client — resilient against missing/misnamed env vars on Vercel.
// Anon (publishable) key is safe to ship to the browser.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ---- Hardcoded fallbacks (Lovable Cloud project) -------------------------
// These are PUBLIC values. They guarantee the app keeps working even if
// Vercel env vars are missing, misnamed, or scoped to the wrong environment.
const FALLBACK_URL = 'https://ribjppjnjigiowhjgngu.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYmpwcGpuamlnaW93aGpnbmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDE3ODEsImV4cCI6MjA5MjQ3Nzc4MX0.Qf7APA9hAIX6xEFTiCfrdI0efoFTZgTsfQ84Pj6vluA';

// ---- Read env (accept several common names) ------------------------------
const env = import.meta.env as Record<string, string | undefined>;

const envUrl =
  env.VITE_SUPABASE_URL ||
  env.VITE_SUPABASE_PROJECT_URL ||
  env.VITE_SUPABASE_API_URL;

const envKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_KEY;

function isValidUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const SUPABASE_URL = isValidUrl(envUrl) ? envUrl! : FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY = envKey && envKey.length > 20 ? envKey : FALLBACK_ANON_KEY;

// Expose source for diagnostics (used by EnvDiagnostic component).
export const supabaseConfigSource = {
  url: SUPABASE_URL,
  urlSource: isValidUrl(envUrl) ? 'env' : 'fallback',
  keySource: envKey && envKey.length > 20 ? 'env' : 'fallback',
  envKeysSeen: Object.keys(env).filter((k) => k.startsWith('VITE_SUPABASE')),
} as const;

if (typeof window !== 'undefined') {
  if (supabaseConfigSource.urlSource === 'fallback') {
    // eslint-disable-next-line no-console
    console.warn(
      '[supabase] VITE_SUPABASE_URL tidak ditemukan di env. Memakai fallback Lovable Cloud. ' +
        'Set VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY di Vercel lalu redeploy untuk memakai project Anda.'
    );
  }
  if (supabaseConfigSource.keySource === 'fallback' && supabaseConfigSource.urlSource === 'env') {
    // eslint-disable-next-line no-console
    console.warn(
      '[supabase] VITE_SUPABASE_PUBLISHABLE_KEY tidak ditemukan, memakai fallback. ' +
        'Pastikan nama env di Vercel diawali VITE_ dan sudah redeploy.'
    );
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});