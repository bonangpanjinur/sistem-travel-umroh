/**
 * realtimeStub.ts
 *
 * Mounts a WebSocket server at /realtime/v1/websocket that immediately closes
 * every incoming connection with a clean close frame (1001 Going Away).
 *
 * Why this exists:
 *   Supabase JS client always attempts a WebSocket connection to
 *   /realtime/v1/websocket on initialisation, even when realtime is disabled
 *   via eventsPerSecond:0 and supabase.realtime.disconnect().
 *   Without this stub, the browser logs a noisy "WebSocket connection failed"
 *   error because the path returns HTTP 404/405.
 *   With this stub the handshake succeeds and the server immediately sends a
 *   clean close frame, so the browser sees a graceful close — zero console errors.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { logger } from './logger.js';

export function attachRealtimeStub(httpServer: Server): void {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/realtime/v1/websocket',
  });

  logger.info('Realtime stub WebSocket server attached at /realtime/v1/websocket');

  wss.on('connection', (ws: WebSocket) => {
    // Accept the upgrade — do NOT close from the server side immediately.
    //
    // Why: if we call ws.close() right away, Vite's WS proxy gets an EPIPE
    // (it tries to write to an already-closed socket) and responds 400 to the
    // browser, which is noisier than a clean handshake.
    //
    // Instead, the Supabase JS client calls supabase.realtime.disconnect()
    // immediately after initialisation, which sends the close frame from the
    // browser side.  The stub just waits for that graceful close.
    // If the browser never closes (race), the idle socket is harmless.
    ws.on('error', () => { /* ignore — client disconnected abruptly */ });
    ws.on('message', () => {
      // We don't implement the Phoenix protocol — close on any incoming message
      // so the client knows not to retry.
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1001, 'Realtime not supported');
      }
    });
  });

  wss.on('error', (err: Error) => {
    // Only log non-trivial errors (EADDRINUSE etc.)
    if (!err.message.includes('ECONNRESET')) {
      logger.warn({ err: err.message }, 'realtimeStub WSS error');
    }
  });
}
