import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, BedDouble, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { useHotelRoomCapacities, useUpsertHotelRoomCapacity } from "@/hooks/useHotelRoomCapacities";

interface HotelRoomCapacityCardProps {
  hotelId: string;
  hotelName?: string;
}

const ROOM_TYPES = [
  { value: "quad",   label: "Quad",   desc: "4 orang per kamar", color: "bg-teal-100 text-teal-800" },
  { value: "triple", label: "Triple", desc: "3 orang per kamar", color: "bg-cyan-100 text-cyan-800" },
  { value: "double", label: "Double", desc: "2 orang per kamar", color: "bg-blue-100 text-blue-800" },
  { value: "single", label: "Single", desc: "1 orang per kamar", color: "bg-violet-100 text-violet-800" },
];

export default function HotelRoomCapacityCard({ hotelId, hotelName }: HotelRoomCapacityCardProps) {
  const { data: caps, isLoading } = useHotelRoomCapacities(hotelId);
  const upsert = useUpsertHotelRoomCapacity(hotelId);

  // Local draft state per room_type
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const getConfigured = (roomType: string) =>
    caps?.find(c => c.room_type === roomType);

  const getDraft = (roomType: string) => {
    if (drafts[roomType] !== undefined) return drafts[roomType];
    const cap = getConfigured(roomType);
    return cap ? String(cap.total_rooms) : "";
  };

  const handleSave = async (roomType: string) => {
    const raw = getDraft(roomType);
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Jumlah kamar harus angka >= 0");
      return;
    }
    setSaving(p => ({ ...p, [roomType]: true }));
    try {
      await upsert.mutateAsync({ room_type: roomType, total_rooms: val });
      setDrafts(p => { const n = { ...p }; delete n[roomType]; return n; });
      toast.success(`Kapasitas ${roomType} berhasil disimpan`);
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(p => ({ ...p, [roomType]: false }));
    }
  };

  const isDirty = (roomType: string) => {
    if (drafts[roomType] === undefined) return false;
    const cap = getConfigured(roomType);
    const existing = cap ? String(cap.total_rooms) : "";
    return drafts[roomType] !== existing;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" />
          Kapasitas Kamar{hotelName ? ` — ${hotelName}` : ""}
        </CardTitle>
        <CardDescription className="text-xs flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          Jumlah fisik kamar yang tersedia per tipe. Digunakan sebagai batas validasi rooming list.
          Isi 0 atau kosongkan jika tidak ada batas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat kapasitas...
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ROOM_TYPES.map(rt => {
              const configured = getConfigured(rt.value);
              const draft = getDraft(rt.value);
              const dirty = isDirty(rt.value);
              const isSaving = saving[rt.value];

              return (
                <div
                  key={rt.value}
                  className="border rounded-lg p-3 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${rt.color}`}>{rt.label}</Badge>
                      <span className="text-xs text-muted-foreground">{rt.desc}</span>
                    </div>
                    {configured && configured.total_rooms > 0 && (
                      <span className="text-xs font-semibold text-primary">
                        {configured.total_rooms} kamar
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Jumlah kamar
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0 = tidak ada batas"
                        value={draft}
                        onChange={e =>
                          setDrafts(p => ({ ...p, [rt.value]: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        variant={dirty ? "default" : "outline"}
                        className="h-8 px-3"
                        onClick={() => handleSave(rt.value)}
                        disabled={isSaving || !dirty}
                        title="Simpan kapasitas"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
