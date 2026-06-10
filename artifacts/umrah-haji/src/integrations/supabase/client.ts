/**
 * Supabase client — always routes through the local Express proxy.
 *
 * Realtime is fully disabled via a no-op WebSocket transport.
 * This prevents any WebSocket connection attempt — zero console errors.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const localOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

const LOCAL_KEY = 'local-dev-anon-key';

export const supabaseConfigSource = {
  url: localOrigin,
  urlSource: 'local-proxy',
  keySource: 'local-proxy',
  envKeysSeen: [] as string[],
} as const;

/**
 * No-op WebSocket implementation used as the realtime transport.
 *
 * Phoenix's Socket class calls `new transport(url, protocols)` and expects
 * the standard WebSocket interface.  This implementation:
 *  - Never opens a network connection (zero HTTP/WS traffic)
 *  - Dispatches a clean close event (code 1000, wasClean=true) so Phoenix
 *    treats it as an intentional disconnect and does NOT schedule reconnects
 *  - Results in zero browser console errors
 */
class DisabledWebSocket {
  static CONNECTING = 0 as const;
  static OPEN      = 1 as const;
  static CLOSING   = 2 as const;
  static CLOSED    = 3 as const;

  readyState = DisabledWebSocket.CLOSING as number;

  onopen:    ((ev: Event)        => void) | null = null;
  onclose:   ((ev: CloseEvent)   => void) | null = null;
  onerror:   ((ev: Event)        => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  constructor(_url: string, _protocols?: string | string[]) {
    // Dispatch a clean close on the next tick.
    // wasClean:true signals Phoenix that this is an intentional disconnect,
    // suppressing automatic reconnection attempts.
    setTimeout(() => {
      this.readyState = DisabledWebSocket.CLOSED;
      this.onclose?.(
        new CloseEvent('close', { code: 1000, reason: 'realtime disabled', wasClean: true })
      );
    }, 0);
  }

  close(_code?: number, _reason?: string) {
    this.readyState = DisabledWebSocket.CLOSED;
  }

  send(_data: string | ArrayBuffer | Blob) { /* no-op */ }

  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions,
  ) {}

  removeEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions,
  ) {}
}

export const supabase = createClient<Database>(localOrigin, LOCAL_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    // Use no-op transport — Phoenix creates an instance but never makes a
    // network connection, so no WS errors appear in the browser console.
    transport: DisabledWebSocket as unknown as typeof WebSocket,
    params: { eventsPerSecond: 0 },
    // If Phoenix ignores wasClean=true and still schedules a reconnect,
    // make it wait 24 h so it's effectively never.
    reconnectAfterMs: () => 86_400_000,
  },
  global: {
    headers: {
      'x-client-info': 'vinstour-local-proxy/1.0',
    },
  },
});
