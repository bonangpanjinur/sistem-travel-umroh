/**
 * /muthawif/audio — halaman siaran audio live
 * /jamaah/audio   — halaman dengarkan siaran
 * /tour-leader/audio — halaman kontrol siaran
 *
 * Route params: ?session_id=xxx&departure_id=xxx
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Radio, ArrowLeft, Play, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LiveAudioCard } from '@/components/audio/LiveAudioCard';
import { toast } from 'sonner';

type PageMode = 'controller' | 'speaker' | 'listener';

interface ActiveSession {
  id: string;
  title: string;
  session_type: string;
  status: string;
  departure_id: string;
}

export default function LiveAudioPage({ mode }: { mode?: PageMode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [departures, setDepartures] = useState<{ id: string; name: string }[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState(searchParams.get('departure_id') || '');
  const [sessionTitle, setSessionTitle] = useState('Siaran Live');
  const [sessionType, setSessionType] = useState('general');
  const [starting, setStarting] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const existingSessionId = searchParams.get('session_id');
  const displayName = (user?.user_metadata?.full_name as string) || user?.email || 'Pengguna';
  const userId = user?.id || '';

  const effectiveMode: PageMode =
    mode ||
    (existingSessionId ? 'listener' : 'controller');

  // Load departures (for controller/speaker)
  useEffect(() => {
    if (effectiveMode === 'listener') return;
    supabase
      .from('departures')
      .select('id, departure_date')
      .eq('status', 'active')
      .order('departure_date')
      .then(({ data }) => setDepartures(
        (data || []).map((d: any) => ({ id: d.id, name: d.departure_date || d.id }))
      ));
  }, [effectiveMode]);

  // Auto-join existing session
  useEffect(() => {
    if (existingSessionId) {
      setActiveSession({ id: existingSessionId, title: 'Siaran Live', session_type: 'general', status: 'active', departure_id: '' });
    }
  }, [existingSessionId]);

  // Load active sessions for selected departure
  useEffect(() => {
    if (!selectedDeparture || effectiveMode === 'listener') return;
    setLoadingSessions(true);
    fetch(`/api/v1/guide/audio/sessions/${selectedDeparture}`)
      .then(r => r.json())
      .then(data => {
        if (data.sessions?.length) setActiveSession(data.sessions[0]);
        else setActiveSession(null);
      })
      .finally(() => setLoadingSessions(false));
  }, [selectedDeparture, effectiveMode]);

  const startSession = async () => {
    if (!selectedDeparture) {
      toast.error('Pilih keberangkatan terlebih dahulu');
      return;
    }
    setStarting(true);
    try {
      const res = await fetch('/api/v1/guide/audio/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departure_id: selectedDeparture,
          title: sessionTitle,
          session_type: sessionType,
          speaker_user_id: userId,
        }),
      });
      const data = await res.json();
      if (data.session) {
        setActiveSession({ ...data.session, title: sessionTitle, session_type: sessionType, status: 'active', departure_id: selectedDeparture });
        toast.success('Sesi siaran dimulai!');
      }
    } catch {
      toast.error('Gagal memulai sesi');
    } finally {
      setStarting(false);
    }
  };

  const handleSessionEnd = async () => {
    if (activeSession) {
      await fetch(`/api/v1/guide/audio/sessions/${activeSession.id}`, { method: 'DELETE' });
    }
    setActiveSession(null);
    toast.success('Sesi siaran diakhiri');
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Radio className="h-4 w-4 text-emerald-600" />
            <h1 className="font-bold text-base">
              {effectiveMode === 'listener'
                ? 'Dengarkan Siaran'
                : effectiveMode === 'speaker'
                ? 'Siaran Muthawif'
                : 'Kelola Siaran'}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Active session card */}
        {activeSession && (
          <LiveAudioCard
            sessionId={activeSession.id}
            sessionTitle={activeSession.title}
            userId={userId}
            displayName={displayName}
            role={
              effectiveMode === 'controller'
                ? 'tour_leader'
                : effectiveMode === 'speaker'
                ? 'muthawif'
                : 'jamaah'
            }
            onClose={effectiveMode !== 'listener' ? handleSessionEnd : undefined}
          />
        )}

        {/* Start new session (controller / speaker) */}
        {!activeSession && effectiveMode !== 'listener' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-emerald-600" />
                Mulai Sesi Siaran Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Keberangkatan</Label>
                <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih keberangkatan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departures.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Judul Siaran</Label>
                <Input
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  placeholder="Doa bersama, Tawaf, Briefing sore…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Jenis Siaran</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Umum</SelectItem>
                    <SelectItem value="doa">Doa Bersama</SelectItem>
                    <SelectItem value="tawaf">Tawaf</SelectItem>
                    <SelectItem value="sai">Sa&apos;i</SelectItem>
                    <SelectItem value="manasik">Manasik</SelectItem>
                    <SelectItem value="briefing">Briefing</SelectItem>
                    <SelectItem value="ziarah">Ziarah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingSessions && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mengecek sesi aktif…
                </div>
              )}

              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={startSession}
                disabled={starting || !selectedDeparture}
              >
                {starting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memulai…</>
                ) : (
                  <><Play className="h-4 w-4" /> Mulai Siaran</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info jamaah — listener only, no active session */}
        {!activeSession && effectiveMode === 'listener' && (
          <Card className="border-dashed">
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <Radio className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Belum ada siaran aktif</p>
              <p className="text-sm text-muted-foreground/70">
                Muthawif atau Tour Leader akan memulai siaran saat dimulai.
                Halaman ini akan otomatis memperbarui.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
