import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomAllocationVisualizerProps {
  allocation: {
    quad: number;
    triple: number;
    double: number;
    single: number;
  };
  totalPassengers: number;
}

interface RoomConfig {
  type: 'quad' | 'triple' | 'double' | 'single';
  occupancy: number;
  color: string;
  label: string;
}

const ROOM_CONFIGS: RoomConfig[] = [
  { type: 'quad', occupancy: 4, color: 'bg-blue-100 border-blue-300', label: 'Quad (4 orang)' },
  { type: 'triple', occupancy: 3, color: 'bg-green-100 border-green-300', label: 'Triple (3 orang)' },
  { type: 'double', occupancy: 2, color: 'bg-purple-100 border-purple-300', label: 'Double (2 orang)' },
  { type: 'single', occupancy: 1, color: 'bg-orange-100 border-orange-300', label: 'Single (1 orang)' },
];

export function RoomAllocationVisualizer({ allocation, totalPassengers }: RoomAllocationVisualizerProps) {
  const rooms: { type: string; occupants: number; color: string }[] = [];

  // Generate room visualization
  ROOM_CONFIGS.forEach(config => {
    const count = allocation[config.type];
    if (count > 0) {
      // For double rooms, handle odd numbers
      if (config.type === 'double') {
        const fullRooms = Math.floor(count / 2);
        const hasLeftover = count % 2 === 1;

        for (let i = 0; i < fullRooms; i++) {
          rooms.push({ type: config.label, occupants: 2, color: config.color });
        }

        if (hasLeftover) {
          rooms.push({ type: `${config.label} (+ 1 staff)`, occupants: 1, color: config.color });
        }
      } else {
        for (let i = 0; i < count; i++) {
          rooms.push({ type: config.label, occupants: config.occupancy, color: config.color });
        }
      }
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {rooms.map((room, index) => (
          <div
            key={index}
            className={cn(
              "p-3 rounded-lg border-2 transition-all hover:shadow-md",
              room.color
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">{room.type}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: room.occupants }).map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold"
                >
                  👤
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{totalPassengers} jamaah</span> dalam{' '}
          <span className="font-semibold text-foreground">{rooms.length} kamar</span>
        </p>
      </div>
    </div>
  );
}
