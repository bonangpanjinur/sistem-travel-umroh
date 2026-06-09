/**
 * AudioBroadcaster — komponen untuk SPEAKER (muthawif / siapapun yang dapat giliran bicara)
 *
 * - Merekam suara via MediaRecorder API (WebM/Opus)
 * - Mengirim chunk binary ke server via WebSocket relay
 * - Hanya aktif saat server memberi tahu bahwa user ini adalah current speaker
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Radio, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAudioSession } from '@/hooks/useAudioSession';

interface AudioBroadcasterProps {
  sessionId: string;
  userId: string;
  displayName: string;
  appRole?: 'super_admin' | 'owner' | 'operational' | 'tour_leader' | 'muthawif' | 'jamaah';
  onSessionEnd?: () => void;
}

export function AudioBroadcaster({
  sessionId,
  userId,
  displayName,
  appRole = 'muthawif',
  onSessionEnd,
}: AudioBroadcasterProps) {
  const [recording, setRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [volume, setVolume] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const { state, sendAudioChunk } = useAudioSession({
    sessionId,
    userId,
    displayName,
    appRole,
    enabled: true,
  });

  const amISpeaker = state.currentSpeaker?.userId === userId;

  // Volume visualizer
  const measureVolume = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    setVolume(Math.min(100, avg * 2));
    animFrameRef.current = requestAnimationFrame(measureVolume);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
        },
      });
      streamRef.current = stream;
      setMicPermission('granted');

      // Volume meter
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      animFrameRef.current = requestAnimationFrame(measureVolume);

      // MediaRecorder — kirim chunk setiap 250ms
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });

      mr.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buf = await e.data.arrayBuffer();
          sendAudioChunk(buf);
        }
      };

      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setMicPermission('denied');
    }
  }, [sendAudioChunk, measureVolume]);

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setVolume(0);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    if (!amISpeaker && recording) stopRecording();
    if (!amISpeaker && recording) return;
  }, [amISpeaker, recording, stopRecording]);

  useEffect(() => {
    if (state.sessionEnded) {
      stopRecording();
      onSessionEnd?.();
    }
  }, [state.sessionEnded, stopRecording, onSessionEnd]);

  useEffect(() => () => { stopRecording(); }, [stopRecording]);

  if (!state.connected) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/30 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Menghubungkan ke sesi audio…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className="h-3.5 w-3.5 text-green-500" />
        <span>Sesi live aktif</span>
        <Users className="h-3.5 w-3.5 ml-auto" />
        <span>{state.listenerCount} pendengar</span>
      </div>

      {/* Speaker status */}
      {amISpeaker ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-800 text-sm">Giliran Anda Bicara</span>
          </div>

          {/* Volume bar */}
          {recording && (
            <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                style={{ width: `${volume}%` }}
              />
            </div>
          )}

          {/* Mic toggle */}
          {micPermission === 'denied' ? (
            <p className="text-xs text-red-600">
              Izin mikrofon ditolak. Buka pengaturan browser untuk mengizinkan akses mikrofon.
            </p>
          ) : (
            <Button
              size="sm"
              className={cn(
                'w-full gap-2',
                recording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white',
              )}
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? (
                <><MicOff className="h-4 w-4" /> Mute Mikrofon</>
              ) : (
                <><Mic className="h-4 w-4" /> Aktifkan Mikrofon</>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MicOff className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">Menunggu giliran bicara…</span>
          </div>
          {state.currentSpeaker && (
            <p className="text-xs text-muted-foreground">
              Sedang bicara:{' '}
              <span className="font-medium text-foreground">
                {state.currentSpeaker.displayName}
              </span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Tour Leader akan mengatur giliran siapa yang dapat bicara.
          </p>
        </div>
      )}

      {state.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{state.error}</p>
      )}
    </div>
  );
}
