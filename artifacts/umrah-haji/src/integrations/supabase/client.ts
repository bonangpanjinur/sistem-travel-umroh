/**
 * Supabase-compatible client for Replit/Neon environment.
 * Auth is handled via the Express API server at /api/auth.
 * Data queries still use @supabase/supabase-js if VITE_SUPABASE_URL is set.
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
const hasValidConfig = !!(resolvedUrl && resolvedKey);

// Base supabase client — used for .from() data queries only.
// Auth is handled by apiAuth below; .auth on this client is NOT used.
// Realtime disabled when no valid Supabase config to avoid WebSocket noise.
const _supabaseBase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    storage: localStorage,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: hasValidConfig ? undefined : {
    params: { eventsPerSecond: 0 },
  },
  global: {
    headers: {},
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Token storage
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_KEY = 'vinstour_access_token';

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// API auth — replaces supabase.auth.*
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, { ...options, headers });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return { data: null, error: new Error(json?.error ?? `HTTP ${res.status}`) };
    }
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

type AuthStateCallback = (event: string, session: any) => void;
const authStateListeners: Set<AuthStateCallback> = new Set();

function notifyListeners(event: string, session: any) {
  authStateListeners.forEach((cb) => {
    try { cb(event, session); } catch {}
  });
}

export const apiAuth = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    const { data, error } = await apiFetch<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (error || !data) return { data: null, error };
    setStoredToken(data.access_token);
    const session = { access_token: data.access_token, user: data.user };
    notifyListeners('SIGNED_IN', session);
    return { data: { session, user: data.user }, error: null };
  },

  async signUp(params: { email: string; password: string; options?: { emailRedirectTo?: string; data?: Record<string, any> } }) {
    const { data, error } = await apiFetch<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: params.email, password: params.password, options: params.options }),
    });
    if (error || !data) return { data: null, error };
    setStoredToken(data.access_token);
    const session = { access_token: data.access_token, user: data.user };
    notifyListeners('SIGNED_IN', session);
    return { data: { user: data.user, session }, error: null };
  },

  async signOut() {
    setStoredToken(null);
    notifyListeners('SIGNED_OUT', null);
    return { error: null };
  },

  async getSession() {
    const token = getStoredToken();
    if (!token) return { data: { session: null }, error: null };
    const { data, error } = await apiFetch<any>('/auth/session');
    if (error || !data?.session) {
      return { data: { session: null }, error: null };
    }
    return { data: { session: data.session }, error: null };
  },

  async getUser() {
    const token = getStoredToken();
    if (!token) return { data: { user: null }, error: null };
    const { data, error } = await apiFetch<any>('/auth/user');
    if (error) return { data: { user: null }, error };
    return { data: { user: data?.user ?? null }, error: null };
  },

  onAuthStateChange(
    callback: AuthStateCallback,
  ): { data: { subscription: { unsubscribe: () => void } } } {
    authStateListeners.add(callback);

    // Emit initial state async
    const token = getStoredToken();
    if (token) {
      apiFetch<any>('/auth/session').then(({ data }) => {
        if (data?.session) callback('SIGNED_IN', data.session);
        else {
          setStoredToken(null);
          callback('SIGNED_OUT', null);
        }
      });
    } else {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => authStateListeners.delete(callback),
        },
      },
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Unified supabase export
// .from() / .rpc() etc. route to the base client for data queries.
// .auth.* routes to apiAuth (our Express JWT auth).
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Functions proxy — routes supabase.functions.invoke() to /api/functions/:name
// so Supabase Edge Functions are served by the Express API server.
// ─────────────────────────────────────────────────────────────────────────────

const apiFunctions = {
  invoke: async <T = any>(name: string, options?: { body?: any }) => {
    const { data, error } = await apiFetch<T>(`/functions/${name}`, {
      method: 'POST',
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    return { data, error };
  },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy(_supabaseBase, {
  get(target, prop) {
    if (prop === 'auth') return apiAuth;
    if (prop === 'functions') return apiFunctions;
    return (target as any)[prop];
  },
}) as typeof _supabaseBase;
