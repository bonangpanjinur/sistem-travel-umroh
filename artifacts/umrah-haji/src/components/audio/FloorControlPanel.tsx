/**
 * FloorControlPanel — panel Tour Leader untuk mengontrol siapa yang bicara
 *
 * - Tampilkan daftar peserta (muthawif + jamaah yang join)
 * - Klik → beri giliran bicara (grant_floor)
 * - Revoke floor (mute semua)
 * - Akhiri sesi
 */

import { useState } from 'react';
import { Mic, MicOff, Radio, Users, X, StopCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAudioSession } from '@/hooks/useAudioSession';
import { AudioBroadcaster } from './AudioBroadcaster';

interface Participant {
  userId: string;
  displayName: string;
  role?: string;
}

interface FloorControlPanelProps {
  sessionId: string;
  userId: string;
  displayName: string;
  appRole?: 'super_admin' | 'owner' | 'operational' | 'tour_leader';
  participants?: Participant[];
  onSessionEnd?: () => void;
}

export function FloorControlPanel({
  sessionId,
  userId,
  displayName,
  appRole = 'tour_leader',
  participants = [],
  onSessionEnd,
}: FloorControlPanelProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const { state, grantFloor, revokeFloor, endSession } = useAudioSession({
    sessionId,
    userId,
    displayName,
    appRole,
    enabled: true,
  });

  const handleEndSession = () => {
    endSession();
    onSessionEnd?.();
  };

  const currentSpeaker = state.currentSpeaker;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold text-sm">Panel Kontrol Siaran</span>
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {state.listenerCount}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 gap-1.5 h-8 px-2"
          onClick={() => setShowEndConfirm(true)}
        >
          <StopCircle className="h-4 w-4" />
          Akhiri
        </Button>
      </div>

      {/* Current speaker indicator */}
      <div className={`rounded-lg p-3 border text-sm ${
        currentSpeaker
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      }`}>
        {currentSpeaker ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-emerald-800">
                {currentSpeaker.displayName}
              </span>
              <span className="text-xs text-emerald-600">sedang bicara</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-slate-600 hover:bg-slate-200"
              onClick={() => revokeFloor()}
            >
              <MicOff className="h-3.5 w-3.5 mr-1" />
              Mute
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <MicOff className="h-4 w-4" />
            <span>Tidak ada yang bicara</span>
          </div>
        )}
      </div>

      {/* Berikan giliran ke saya sendiri */}
      <AudioBroadcaster
        sessionId={sessionId}
        userId={userId}
        displayName={displayName}
        appRole={appRole}
      />

      {/* Daftar peserta — beri giliran */}
      {participants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Beri Giliran ke Peserta
          </p>
          <div className="space-y-1.5">
            {participants.map(p => (
              <div
                key={p.userId}
                className="flex items-center justify-between rounded-lg border p-2.5 bg-white hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    currentSpeaker?.userId === p.userId ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <span className="text-sm font-medium">{p.displayName}</span>
                  {p.role && (
                    <Badge variant="outline" className="text-xs h-4 px-1">{p.role}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {currentSpeaker?.userId === p.userId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:bg-red-50"
                      onClick={() => revokeFloor()}
                    >
                      <MicOff className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => grantFloor(p.userId, p.displayName)}
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kontrol cepat */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => grantFloor(userId, displayName)}
        >
          <Mic className="h-3.5 w-3.5" />
          Saya yang Bicara
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => revokeFloor()}
        >
          <MicOff className="h-3.5 w-3.5" />
          Mute Semua
        </Button>
      </div>

      {state.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{state.error}</p>
      )}

      {/* Konfirmasi akhiri sesi */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akhiri Sesi Siaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua jamaah yang sedang mendengarkan akan terputus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleEndSession}
            >
              Ya, Akhiri Sesi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
