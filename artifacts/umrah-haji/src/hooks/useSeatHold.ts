import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "seat-hold-session-id";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface SeatHoldState {
  expiresAt: Date | null;
  remainingMs: number;
  loading: boolean;
  error: string | null;
}

export function useSeatHold(departureId: string | null | undefined, paxCount: number = 1) {
  const [state, setState] = useState<SeatHoldState>({
    expiresAt: null,
    remainingMs: 0,
    loading: false,
    error: null,
  });
  const sessionIdRef = useRef<string>(getSessionId());
  const refreshTimerRef = useRef<number | null>(null);

  const acquire = useCallback(async () => {
    if (!departureId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await (supabase.rpc as any)("hold_departure_seats", {
      _departure_id: departureId,
      _session_id: sessionIdRef.current,
      _pax_count: Math.max(1, paxCount),
    });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }
    if (data?.ok) {
      setState({
        expiresAt: data.expires_at ? new Date(data.expires_at) : null,
        remainingMs: data.expires_at ? new Date(data.expires_at).getTime() - Date.now() : 0,
        loading: false,
        error: null,
      });
    } else {
      setState({
        expiresAt: null,
        remainingMs: 0,
        loading: false,
        error: data?.error || "hold_failed",
      });
    }
  }, [departureId, paxCount]);

  const release = useCallback(async () => {
    if (!departureId) return;
    await (supabase.rpc as any)("release_seat_hold", {
      _session_id: sessionIdRef.current,
      _departure_id: departureId,
    });
    setState({ expiresAt: null, remainingMs: 0, loading: false, error: null });
  }, [departureId]);

  // Acquire on mount / when departure changes
  useEffect(() => {
    if (!departureId) return;
    acquire();
    // refresh every 10 minutes (TTL is 15)
    refreshTimerRef.current = window.setInterval(() => acquire(), 10 * 60 * 1000);
    return () => {
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
    };
  }, [departureId, acquire]);

  // Tick countdown every second
  useEffect(() => {
    if (!state.expiresAt) return;
    const tick = window.setInterval(() => {
      setState((s) => {
        if (!s.expiresAt) return s;
        const ms = Math.max(0, s.expiresAt.getTime() - Date.now());
        return { ...s, remainingMs: ms };
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [state.expiresAt]);

  // Release on tab close
  useEffect(() => {
    const handler = () => {
      if (!departureId) return;
      // sendBeacon-style fire-and-forget via supabase
      (supabase.rpc as any)("release_seat_hold", {
        _session_id: sessionIdRef.current,
        _departure_id: departureId,
      });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [departureId]);

  return { ...state, acquire, release, sessionId: sessionIdRef.current };
}

export function formatHoldRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}