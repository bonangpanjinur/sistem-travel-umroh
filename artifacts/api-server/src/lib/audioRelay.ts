/**
 * audioRelay.ts — WebSocket-based live audio broadcast relay
 *
 * Architecture (server-side relay):
 *   Speaker → [binary audio chunks] → Server → broadcast to all listeners in session
 *   TL/Admin → [JSON control msg]   → Server → update floor state → notify all
 *
 * Protocol (JSON messages, client↔server):
 *   join         { type, sessionId, role, userId, displayName, token }
 *   grant_floor  { type, targetUserId, targetDisplayName }    (TL/admin only)
 *   revoke_floor { type }                                      (TL/admin only)
 *   end_session  { type }                                      (TL/admin only)
 *   leave        { type }
 *
 * Server → Client (JSON):
 *   joined         { type, listenerCount, currentSpeaker }
 *   floor_granted  { type, userId, displayName }
 *   floor_revoked  { type }
 *   session_ended  { type }
 *   listener_count { type, count }
 *   error          { type, message }
 *
 * Server → Listeners (binary): raw audio chunks from speaker
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { logger } from './logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientInfo {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  displayName: string;
  role: 'speaker_candidate' | 'listener';  // role in session (not app role)
  appRole: string;                          // super_admin | tour_leader | muthawif | jamaah
  joinedAt: number;
}

interface AudioSession {
  id: string;
  departureId: string;
  title: string;
  clients: Map<string, ClientInfo>;     // userId → ClientInfo (1 per user)
  currentSpeakerUserId: string | null;
  startedAt: number;
}

// ─── Global state ─────────────────────────────────────────────────────────────

const sessions = new Map<string, AudioSession>();   // sessionId → AudioSession

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastJson(session: AudioSession, data: object, exclude?: string) {
  for (const [uid, client] of session.clients) {
    if (uid === exclude) continue;
    send(client.ws, data);
  }
}

function broadcastBinary(session: AudioSession, buf: Buffer, excludeUserId: string) {
  for (const [uid, client] of session.clients) {
    if (uid === excludeUserId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(buf, { binary: true });
    }
  }
}

function listenerCount(session: AudioSession): number {
  return session.clients.size;
}

function canControl(appRole: string): boolean {
  return ['super_admin', 'owner', 'branch_manager', 'operational', 'tour_leader', 'muthawif_lead'].includes(appRole);
}

// ─── Attach WebSocket server to existing HTTP server ──────────────────────────

export function attachAudioRelay(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/audio' });

  logger.info('Audio relay WebSocket server attached at /ws/audio');

  wss.on('connection', (ws) => {
    let clientInfo: ClientInfo | null = null;

    ws.on('message', (raw, isBinary) => {
      // ── Binary: audio chunk from current floor holder ──
      if (isBinary) {
        if (!clientInfo) return;
        const session = sessions.get(clientInfo.sessionId);
        if (!session) return;
        // Only relay if this client is the current speaker
        if (session.currentSpeakerUserId !== clientInfo.userId) return;
        broadcastBinary(session, raw as Buffer, clientInfo.userId);
        return;
      }

      // ── Text: JSON control message ──────────────────────
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      switch (msg.type) {
        case 'join': {
          const { sessionId, userId, displayName, appRole = 'jamaah' } = msg;
          if (!sessionId || !userId) {
            send(ws, { type: 'error', message: 'sessionId and userId required' });
            return;
          }

          // Get or create in-memory session
          let session = sessions.get(sessionId);
          if (!session) {
            session = {
              id: sessionId,
              departureId: msg.departureId || '',
              title: msg.title || 'Sesi Audio',
              clients: new Map(),
              currentSpeakerUserId: null,
              startedAt: Date.now(),
            };
            sessions.set(sessionId, session);
            logger.info({ sessionId }, 'Audio session created in relay');
          }

          // Remove any stale connection for same user
          const existing = session.clients.get(userId);
          if (existing) {
            existing.ws.close(1000, 'replaced');
            session.clients.delete(userId);
          }

          clientInfo = {
            ws,
            sessionId,
            userId,
            displayName: displayName || userId,
            role: 'listener',
            appRole,
            joinedAt: Date.now(),
          };
          session.clients.set(userId, clientInfo);

          send(ws, {
            type: 'joined',
            listenerCount: listenerCount(session),
            currentSpeaker: session.currentSpeakerUserId
              ? {
                  userId: session.currentSpeakerUserId,
                  displayName: session.clients.get(session.currentSpeakerUserId)?.displayName,
                }
              : null,
          });

          // Notify everyone of new count
          broadcastJson(session, { type: 'listener_count', count: listenerCount(session) }, userId);
          logger.info({ sessionId, userId, appRole }, 'Client joined audio session');
          break;
        }

        case 'grant_floor': {
          if (!clientInfo) return;
          const session = sessions.get(clientInfo.sessionId);
          if (!session) return;
          if (!canControl(clientInfo.appRole)) {
            send(ws, { type: 'error', message: 'Tidak memiliki izin untuk mengatur giliran bicara' });
            return;
          }
          const { targetUserId, targetDisplayName } = msg;
          session.currentSpeakerUserId = targetUserId;
          broadcastJson(session, {
            type: 'floor_granted',
            userId: targetUserId,
            displayName: targetDisplayName || session.clients.get(targetUserId)?.displayName || targetUserId,
          });
          logger.info({ sessionId: clientInfo.sessionId, speaker: targetUserId }, 'Floor granted');
          break;
        }

        case 'revoke_floor': {
          if (!clientInfo) return;
          const session = sessions.get(clientInfo.sessionId);
          if (!session) return;
          if (!canControl(clientInfo.appRole)) {
            send(ws, { type: 'error', message: 'Tidak memiliki izin' });
            return;
          }
          session.currentSpeakerUserId = null;
          broadcastJson(session, { type: 'floor_revoked' });
          logger.info({ sessionId: clientInfo.sessionId }, 'Floor revoked');
          break;
        }

        case 'end_session': {
          if (!clientInfo) return;
          const session = sessions.get(clientInfo.sessionId);
          if (!session) return;
          if (!canControl(clientInfo.appRole)) {
            send(ws, { type: 'error', message: 'Tidak memiliki izin' });
            return;
          }
          broadcastJson(session, { type: 'session_ended' });
          // Close all clients
          for (const c of session.clients.values()) {
            c.ws.close(1000, 'session ended');
          }
          sessions.delete(clientInfo.sessionId);
          logger.info({ sessionId: clientInfo.sessionId }, 'Audio session ended by controller');
          break;
        }

        case 'leave': {
          if (clientInfo) {
            handleLeave(clientInfo);
            clientInfo = null;
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      if (clientInfo) {
        handleLeave(clientInfo);
        clientInfo = null;
      }
    });

    ws.on('error', (err) => {
      logger.warn({ err: err.message }, 'Audio relay WS error');
    });
  });

  return wss;
}

function handleLeave(client: ClientInfo) {
  const session = sessions.get(client.sessionId);
  if (!session) return;
  session.clients.delete(client.userId);

  // If the current speaker left, revoke floor
  if (session.currentSpeakerUserId === client.userId) {
    session.currentSpeakerUserId = null;
    broadcastJson(session, { type: 'floor_revoked' });
  }

  broadcastJson(session, { type: 'listener_count', count: listenerCount(session) });

  // Clean up empty sessions after a grace period
  if (session.clients.size === 0) {
    setTimeout(() => {
      if (sessions.get(client.sessionId)?.clients.size === 0) {
        sessions.delete(client.sessionId);
        logger.info({ sessionId: client.sessionId }, 'Audio session cleaned up (empty)');
      }
    }, 30_000);
  }
}

// Export for monitoring
export function getSessionStats() {
  return Array.from(sessions.values()).map(s => ({
    id: s.id,
    departureId: s.departureId,
    title: s.title,
    listenerCount: s.clients.size,
    currentSpeaker: s.currentSpeakerUserId,
    startedAt: s.startedAt,
  }));
}
