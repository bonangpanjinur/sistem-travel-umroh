/**
 * AudioListener — komponen untuk PENDENGAR (jamaah)
 *
 * - Menerima binary audio chunk dari server via WebSocket
 * - Memutar audio menggunakan MediaSource API / Blob URL fallback
 * - Tampilkan siapa yang sedang bicara
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Radio, Users, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioSession } from '@/hooks/useAudioSession';

interface AudioListenerProps {
  sessionId: string;
  userId: string;
  displayName: string;
  departureId?: string;
}

export function AudioListener({
  sessionId,
  userId,
  displayName,
  departureId: _departureId,
}: AudioListenerProps) {
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);

  const { state, wsRef } = useAudioSession({
    sessionId,
    userId,
    displayName,
    appRole: 'jamaah',
    enabled: true,
  });

  // Handle binary audio chunks via raw WS message listener
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const onMessage = async (ev: MessageEvent) => {
      if (typeof ev.data === 'string') return; // JSON control msg
      if (muted) return;

      // Queue the audio chunk
      const buf = ev.data instanceof ArrayBuffer
        ? ev.data
        : await (ev.data as Blob).arrayBuffer();
      queueRef.current.push(buf);
      drainQueue();
    };

    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [wsRef.current, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  const drainQueue = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;
    setPlaying(true);

    while (queueRef.current.length > 0) {
      const chunk = queueRef.current.shift()!;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
        }
        const ctx = audioCtxRef.current;
        const decoded = await ctx.decodeAudioData(chunk.slice(0));
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
        await new Promise<void>((res) => {
          src.onended = () => res();
          src.start();
        });
      } catch {
        // chunk may be a fragment; skip silently
      }
    }

    playingRef.current = false;
    setPlaying(false);
  }, []);

  if (!state.connected) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/30 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Menghubungkan ke saluran audio…
      </div>
    );
  }

  if (state.sessionEnded) {
    return (
      <div className="p-4 rounded-xl bg-slate-100 text-center text-sm text-muted-foreground">
        Sesi audio telah berakhir.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className="h-3.5 w-3.5 text-green-500" />
        <span>Siaran live aktif</span>
        <Users className="h-3.5 w-3.5 ml-auto" />
        <span>{state.listenerCount} pendengar</span>
      </div>

      {/* Speaker info */}
      <div className={`rounded-xl border p-4 space-y-3 transition-all ${
        state.currentSpeaker
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-slate-50'
      }`}>
        {state.currentSpeaker ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-800 text-sm">Sedang Siaran</span>
              {playing && !muted && (
                <Volume2 className="h-4 w-4 text-emerald-600 ml-auto animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-200 flex items-center justify-center">
                <Mic className="h-4 w-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  {state.currentSpeaker.displayName}
                </p>
                <p className="text-xs text-emerald-700">Muthawif / Tour Leader</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <VolumeX className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">Menunggu siaran…</span>
          </div>
        )}

        {/* Mute toggle */}
        <Button
          size="sm"
          variant={muted ? 'outline' : 'secondary'}
          className="w-full gap-2"
          onClick={() => setMuted(m => !m)}
        >
          {muted ? (
            <><VolumeX className="h-4 w-4" /> Suara Dimatikan</>
          ) : (
            <><Volume2 className="h-4 w-4" /> Suara Aktif</>
          )}
        </Button>
      </div>

      {state.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{state.error}</p>
      )}
    </div>
  );
}
