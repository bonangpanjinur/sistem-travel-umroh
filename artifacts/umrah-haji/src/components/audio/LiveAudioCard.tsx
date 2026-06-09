/**
 * LiveAudioCard — kartu siaran audio live yang bisa muncul di berbagai halaman
 * Menentukan tampilan berdasarkan role:
 *   - tour_leader/admin → FloorControlPanel
 *   - muthawif         → AudioBroadcaster
 *   - jamaah           → AudioListener
 */

import { useState } from 'react';
import { Radio, X, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AudioBroadcaster } from './AudioBroadcaster';
import { AudioListener } from './AudioListener';
import { FloorControlPanel } from './FloorControlPanel';

type Role = 'tour_leader' | 'muthawif' | 'jamaah' | 'super_admin' | 'owner' | 'operational';

interface Participant {
  userId: string;
  displayName: string;
  role?: string;
}

interface LiveAudioCardProps {
  sessionId: string;
  sessionTitle?: string;
  userId: string;
  displayName: string;
  role: Role;
  participants?: Participant[];
  onClose?: () => void;
  className?: string;
}

export function LiveAudioCard({
  sessionId,
  sessionTitle = 'Siaran Live',
  userId,
  displayName,
  role,
  participants,
  onClose,
  className,
}: LiveAudioCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const isController = ['tour_leader', 'super_admin', 'owner', 'operational'].includes(role);
  const isSpeaker = role === 'muthawif';

  return (
    <Card className={cn('border-emerald-200 shadow-md', className)}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold text-sm text-foreground flex-1">{sessionTitle}</span>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
            <Radio className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setCollapsed(c => !c)}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="px-4 pb-4">
          {isController ? (
            <FloorControlPanel
              sessionId={sessionId}
              userId={userId}
              displayName={displayName}
              appRole={role as any}
              participants={participants}
              onSessionEnd={onClose}
            />
          ) : isSpeaker ? (
            <AudioBroadcaster
              sessionId={sessionId}
              userId={userId}
              displayName={displayName}
              appRole="muthawif"
              onSessionEnd={onClose}
            />
          ) : (
            <AudioListener
              sessionId={sessionId}
              userId={userId}
              displayName={displayName}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
