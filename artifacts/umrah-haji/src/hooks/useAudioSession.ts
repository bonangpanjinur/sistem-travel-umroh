/**
 * useAudioSession — shared hook untuk connect ke WebSocket audio relay
 *
 * Digunakan oleh AudioBroadcaster (speaker) dan AudioListener (pendengar).
 * Protocol: JSON control messages + binary audio chunks.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type AudioSessionRole = 'speaker_candidate' | 'listener';
export type AppRole = 'super_admin' | 'owner' | 'operational' | 'tour_leader' | 'muthawif' | 'jamaah';

export interface SessionState {
  connected: boolean;
  listenerCount: number;
  currentSpeaker: { userId: string; displayName: string } | null;
  error: string | null;
  sessionEnded: boolean;
}

interface UseAudioSessionOptions {
  sessionId: string;
  userId: string;
  displayName: string;
  appRole: AppRole;
  enabled: boolean;
}

export function useAudioSession(opts: UseAudioSessionOptions) {
  const { sessionId, userId, displayName, appRole, enabled } = opts;
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<SessionState>({
    connected: false,
    listenerCount: 0,
    currentSpeaker: null,
    error: null,
    sessionEnded: false,
  });

  const handleMessage = useCallback((ev: MessageEvent) => {
    if (typeof ev.data !== 'string') return;
    let msg: any;
    try { msg = JSON.parse(ev.data); } catch { return; }

    switch (msg.type) {
      case 'joined':
        setState(s => ({
          ...s,
          connected: true,
          listenerCount: msg.listenerCount,
          currentSpeaker: msg.currentSpeaker,
          error: null,
        }));
        break;
      case 'floor_granted':
        setState(s => ({
          ...s,
          currentSpeaker: { userId: msg.userId, displayName: msg.displayName },
        }));
        break;
      case 'floor_revoked':
        setState(s => ({ ...s, currentSpeaker: null }));
        break;
      case 'listener_count':
        setState(s => ({ ...s, listenerCount: msg.count }));
        break;
      case 'session_ended':
        setState(s => ({ ...s, sessionEnded: true, connected: false }));
        break;
      case 'error':
        setState(s => ({ ...s, error: msg.message }));
        break;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId || !userId) return;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/audio`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        sessionId,
        userId,
        displayName,
        appRole,
      }));
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setState(s => ({ ...s, connected: false }));
    };

    ws.onerror = () => {
      setState(s => ({ ...s, error: 'Koneksi WebSocket gagal', connected: false }));
    };

    return () => {
      ws.send(JSON.stringify({ type: 'leave' }));
      ws.close();
      wsRef.current = null;
    };
  }, [enabled, sessionId, userId, displayName, appRole, handleMessage]);

  const grantFloor = useCallback((targetUserId: string, targetDisplayName: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'grant_floor', targetUserId, targetDisplayName }));
  }, []);

  const revokeFloor = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'revoke_floor' }));
  }, []);

  const endSession = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'end_session' }));
  }, []);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk);
    }
  }, []);

  return { state, grantFloor, revokeFloor, endSession, sendAudioChunk, wsRef };
}
