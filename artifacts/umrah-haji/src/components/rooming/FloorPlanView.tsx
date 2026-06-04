import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserX, BedDouble, Users, ArrowLeftRight } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type RoomAssignmentRow = Database["public"]["Tables"]["room_assignments"]["Row"];
type RoomOccupantRow = Database["public"]["Tables"]["room_occupants"]["Row"];

interface ExtendedRoomAssignment extends RoomAssignmentRow {
  hotel?: { name: string; city: string } | null;
  occupants?: (RoomOccupantRow & {
    customer?: Pick<CustomerRow, "id" | "full_name" | "gender"> | null;
  })[];
}

interface ExtendedPassenger {
  customer_id: string;
  customer?: Pick<CustomerRow, "id" | "full_name" | "gender"> | null;
  booking?: { departure_id: string; room_type?: string } | null;
}

interface FloorPlanViewProps {
  rooms: ExtendedRoomAssignment[];
  unassignedPassengers: ExtendedPassenger[];
  onAssignPassenger: (roomId: string, customerId: string) => void;
  onRemoveOccupant: (occupantId: string) => void;
  onMovePassenger: (occupantId: string, newRoomId: string, customerId: string) => void;
}

const ROOM_TYPE_COLORS: Record<string, string> = {
  single: "bg-violet-100 text-violet-800 border-violet-200",
  double: "bg-blue-100 text-blue-800 border-blue-200",
  triple: "bg-cyan-100 text-cyan-800 border-cyan-200",
  quad: "bg-teal-100 text-teal-800 border-teal-200",
};

const getRoomCapacity = (roomType: string) => {
  const map: Record<string, number> = { single: 1, double: 2, triple: 3, quad: 4 };
  return map[roomType] || 4;
};

type DragPayload =
  | { from: "sidebar"; customerId: string }
  | { from: "room"; customerId: string; occupantId: string; sourceRoomId: string };

let activeDragFrom: "sidebar" | "room" = "sidebar";

function OccupantDot({
  occupant,
  sourceRoomId,
  onRemove,
}: {
  occupant: (RoomOccupantRow & { customer?: Pick<CustomerRow, "id" | "full_name" | "gender"> | null }) | null;
  sourceRoomId: string;
  onRemove?: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);

  if (!occupant) {
    return (
      <div className="w-8 h-8 rounded-full border-2 border-dashed border-border bg-muted/30 flex items-center justify-center opacity-50" />
    );
  }

  const isMale = occupant.customer?.gender === "male";

  const handleDragStart = (e: React.DragEvent) => {
    activeDragFrom = "room";
    const payload: DragPayload = {
      from: "room",
      customerId: occupant.customer?.id ?? "",
      occupantId: occupant.id,
      sourceRoomId,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    activeDragFrom = "sidebar";
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
          "cursor-grab active:cursor-grabbing select-none transition-all hover:scale-110 hover:shadow-md",
          isMale
            ? "bg-blue-100 border-blue-300 text-blue-800"
            : "bg-pink-100 border-pink-300 text-pink-800"
        )}
        title={`${occupant.customer?.full_name} — seret untuk pindah kamar`}
      >
        {isMale ? "L" : "P"}
      </div>

      {hover && onRemove && (
        <button
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors z-10"
          onClick={() => onRemove(occupant.id)}
          title={`Keluarkan ${occupant.customer?.full_name}`}
        >
          <UserX className="w-2.5 h-2.5" />
        </button>
      )}

      {hover && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 bg-popover border border-border rounded-md px-2 py-1 text-[11px] whitespace-nowrap shadow-md pointer-events-none">
          <span className="font-medium">{occupant.customer?.full_name || "?"}</span>
          <span className="text-muted-foreground ml-1 text-[9px]">— seret pindah / × hapus</span>
        </div>
      )}
    </div>
  );
}

function RoomCell({
  room,
  onDrop,
  onRemoveOccupant,
  onMove,
}: {
  room: ExtendedRoomAssignment;
  onDrop: (roomId: string, customerId: string) => void;
  onRemoveOccupant: (occupantId: string) => void;
  onMove: (occupantId: string, newRoomId: string, customerId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const capacity = room.capacity || getRoomCapacity(room.room_type);
  const occupants = room.occupants || [];
  const isFull = occupants.length >= capacity;
  const dots = Array.from({ length: capacity }, (_, i) => occupants[i] ?? null);
  const typeColorClass = ROOM_TYPE_COLORS[room.room_type] || ROOM_TYPE_COLORS.quad;

  const handleDragOver = (e: React.DragEvent) => {
    const isMove = activeDragFrom === "room";
    if (isFull && !isMove) return;
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    setDragOver(false);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    activeDragFrom = "sidebar";
    try {
      const payload = JSON.parse(raw) as DragPayload;
      if (payload.from === "room") {
        if (payload.sourceRoomId === room.id) return;
        onMove(payload.occupantId, room.id, payload.customerId);
      } else {
        if (isFull) return;
        onDrop(room.id, payload.customerId);
      }
    } catch {}
  };

  const isSwapTarget = dragOver && activeDragFrom === "room";
  const isAssignTarget = dragOver && activeDragFrom === "sidebar" && !isFull;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-xl border-2 p-3 flex flex-col gap-2.5 transition-all duration-150 select-none",
        isFull && !dragOver
          ? "bg-green-50/60 border-green-200 dark:bg-green-950/10 dark:border-green-800"
          : "bg-card border-border hover:border-primary/30",
        isSwapTarget && "border-amber-400 ring-2 ring-amber-200 scale-[1.02] shadow-lg bg-amber-50/50",
        isAssignTarget && "border-primary ring-2 ring-primary/20 scale-[1.02] shadow-lg bg-primary/5"
      )}
      style={{ minWidth: 148 }}
    >
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="font-bold text-sm leading-tight">
            <BedDouble className="inline h-3.5 w-3.5 mr-0.5 mb-0.5 opacity-60" />
            {room.room_number}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {occupants.length}/{capacity} orang
          </p>
        </div>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize leading-tight shrink-0", typeColorClass)}>
          {room.room_type}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {dots.map((occ, i) => (
          <OccupantDot
            key={occ?.id ?? `empty-${i}`}
            occupant={occ}
            sourceRoomId={room.id}
            onRemove={onRemoveOccupant}
          />
        ))}
      </div>

      {isFull && !dragOver && (
        <div className="absolute top-1 right-1">
          <span className="text-[9px] bg-green-500 text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">PENUH</span>
        </div>
      )}

      {(isSwapTarget || isAssignTarget) && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none">
          <span className={cn(
            "text-xs font-semibold rounded-lg px-2 py-1 shadow flex items-center gap-1",
            isSwapTarget
              ? "text-amber-800 bg-amber-50/90 border border-amber-300"
              : "text-primary bg-background/90"
          )}>
            {isSwapTarget && <ArrowLeftRight className="w-3 h-3" />}
            {isSwapTarget ? "Pindahkan di sini" : "Lepas di sini"}
          </span>
        </div>
      )}
    </div>
  );
}

function PassengerChip({ passenger }: { passenger: ExtendedPassenger }) {
  const isMale = passenger.customer?.gender === "male";

  const handleDragStart = (e: React.DragEvent) => {
    activeDragFrom = "sidebar";
    const payload: DragPayload = {
      from: "sidebar",
      customerId: passenger.customer_id,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    activeDragFrom = "sidebar";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all",
        "hover:shadow-sm hover:scale-[1.01]",
        isMale
          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
          : "bg-pink-50 border-pink-200 dark:bg-pink-950/20 dark:border-pink-800"
      )}
    >
      <span className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
        isMale ? "bg-blue-200 text-blue-900" : "bg-pink-200 text-pink-900"
      )}>
        {isMale ? "L" : "P"}
      </span>
      <span className="text-xs font-medium truncate max-w-[130px]">
        {passenger.customer?.full_name || "—"}
      </span>
      <span className="ml-auto text-[9px] opacity-50">⠿</span>
    </div>
  );
}

function FloorGrid({
  floorRooms,
  onDrop,
  onRemoveOccupant,
  onMove,
}: {
  floorRooms: ExtendedRoomAssignment[];
  onDrop: (roomId: string, customerId: string) => void;
  onRemoveOccupant: (occupantId: string) => void;
  onMove: (occupantId: string, newRoomId: string, customerId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {floorRooms.map(room => (
        <RoomCell
          key={room.id}
          room={room}
          onDrop={onDrop}
          onRemoveOccupant={onRemoveOccupant}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

export default function FloorPlanView({
  rooms,
  unassignedPassengers,
  onAssignPassenger,
  onRemoveOccupant,
  onMovePassenger,
}: FloorPlanViewProps) {
  const floors = [...new Set(rooms.map(r => r.floor ?? ""))].sort((a, b) => {
    const na = parseInt(a) || 0;
    const nb = parseInt(b) || 0;
    return na - nb;
  });

  const noFloor = rooms.filter(r => !r.floor);
  const withFloor = floors.filter(f => f !== "");
  const allFloorTabs = [...(noFloor.length ? [""] : []), ...withFloor];
  const defaultTab = allFloorTabs[0] ?? "";

  const genderCounts = {
    L: unassignedPassengers.filter(p => p.customer?.gender === "male").length,
    P: unassignedPassengers.filter(p => p.customer?.gender === "female").length,
  };

  return (
    <div className="flex gap-4 min-h-[420px]">
      {/* Sidebar: unassigned passengers */}
      <div className="w-52 flex-shrink-0">
        <div className="sticky top-0">
          <div className="mb-2.5">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              Belum Ditempatkan
            </p>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[10px] bg-blue-100 text-blue-800 rounded-full px-1.5 py-0.5">{genderCounts.L}L</span>
              <span className="text-[10px] bg-pink-100 text-pink-800 rounded-full px-1.5 py-0.5">{genderCounts.P}P</span>
            </div>
          </div>

          {unassignedPassengers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed rounded-xl">
              <p>✅ Semua jamaah</p>
              <p>sudah ditempatkan</p>
            </div>
          ) : (
            <ScrollArea className="h-[420px] pr-1">
              <div className="space-y-1.5 pb-2">
                <p className="text-[10px] text-muted-foreground mb-1">Seret ke kamar →</p>
                {unassignedPassengers.map(p => (
                  <PassengerChip key={p.customer_id} passenger={p} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <div className="w-px bg-border flex-shrink-0" />

      {/* Floor plan area */}
      <div className="flex-1 min-w-0">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada kamar.</p>
            <p className="text-xs mt-1">Klik "Tambah Kamar" untuk mulai.</p>
          </div>
        ) : allFloorTabs.length <= 1 ? (
          <div className="space-y-4">
            {allFloorTabs.map(floor => {
              const floorRooms = floor === "" ? noFloor : rooms.filter(r => r.floor === floor);
              return (
                <div key={floor || "none"}>
                  {allFloorTabs.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {floor ? `Lantai ${floor}` : "Semua Kamar"}
                    </p>
                  )}
                  <FloorGrid
                    floorRooms={floorRooms}
                    onDrop={onAssignPassenger}
                    onRemoveOccupant={onRemoveOccupant}
                    onMove={onMovePassenger}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-muted/60">
              {allFloorTabs.map(floor => {
                const floorRooms = floor === "" ? noFloor : rooms.filter(r => r.floor === floor);
                const count = floorRooms.length;
                const full = floorRooms.filter(r => (r.occupants?.length || 0) >= (r.capacity || 4)).length;
                return (
                  <TabsTrigger key={floor || "none"} value={floor} className="text-xs px-3">
                    {floor ? `Lantai ${floor}` : "Tanpa Lantai"}
                    <span className={cn(
                      "ml-1.5 text-[9px] rounded-full px-1.5 py-0.5 font-bold",
                      full === count ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                    )}>
                      {full}/{count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {allFloorTabs.map(floor => {
              const floorRooms = floor === "" ? noFloor : rooms.filter(r => r.floor === floor);
              return (
                <TabsContent key={floor || "none"} value={floor}>
                  <FloorGrid
                    floorRooms={floorRooms}
                    onDrop={onAssignPassenger}
                    onRemoveOccupant={onRemoveOccupant}
                    onMove={onMovePassenger}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold">Keterangan:</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-300 inline-block" /> Laki-laki
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-pink-100 border-2 border-pink-300 inline-block" /> Perempuan
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full border-2 border-dashed border-border inline-block" /> Slot kosong
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Drop → tempatkan
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Drop → pindahkan
          </span>
          <span className="ml-auto opacity-70">
            💡 Seret jamaah sidebar ke kamar · Seret dot penghuni antar kamar untuk pindah · Hover dot → × hapus
          </span>
        </div>
      </div>
    </div>
  );
}
