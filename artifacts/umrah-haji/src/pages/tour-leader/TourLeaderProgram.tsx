import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  CalendarDays, Clock, CheckCircle2, Play, AlertTriangle,
  Pencil, X, Check, ChevronLeft, MapPin, Megaphone
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

type LiveStatus = "pending" | "ongoing" | "done" | "delayed";

const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: "Akan Datang", color: "text-slate-600",   bg: "bg-slate-100",   icon: <Clock className="w-4 h-4" /> },
  ongoing:  { label: "Sedang",      color: "text-blue-700",    bg: "bg-blue-100",    icon: <Play className="w-4 h-4" /> },
  done:     { label: "Selesai",     color: "text-emerald-700", bg: "bg-emerald-100", icon: <CheckCircle2 className="w-4 h-4" /> },
  delayed:  { label: "Ditunda",     color: "text-amber-700",   bg: "bg-amber-100",   icon: <AlertTriangle className="w-4 h-4" /> },
};

interface ProgramItem {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  type: string;
  sort_order: number;
  live_status: LiveStatus;
  delay_minutes: number;
  live_notes?: string;
  location_changed_to?: string;
}

export default function TourLeaderProgram() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Partial<ProgramItem>>({});
  const [today] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: departure } = useQuery({
    queryKey: ["tl-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, package:packages(name)")
        .eq("tour_leader_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1).single();
      return data;
    },
  });

  const depId = departure?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["tl-program", depId, today],
    enabled: !!depId,
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await fetch(`/api/v1/guide/program/${depId}?date=${today}`, {
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      return res.json();
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/program/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tl-program", depId] });
      setEditingId(null);
      toast.success("Program diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const broadcastMutation = useMutation({
    mutationFn: async ({ item }: { item: ProgramItem }) => {
      const session = (await supabase.auth.getSession()).data.session;
      const status = STATUS_CONFIG[item.live_status];
      const body = item.delay_minutes > 0
        ? `🔔 Update Program: "${item.title}" ${status.label}${item.delay_minutes > 0 ? ` (terlambat ${item.delay_minutes} menit)` : ""}${item.live_notes ? `\n${item.live_notes}` : ""}`
        : `✅ "${item.title}" ${status.label}`;
      await fetch("/api/v1/guide/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          departure_id: depId,
          message_type: item.live_status === "delayed" ? "warning" : "program_update",
          title: `Update Program: ${item.title}`,
          body,
        }),
      });
    },
    onSuccess: () => toast.success("Broadcast terkirim ke jamaah"),
  });

  function startEdit(item: ProgramItem) {
    setEditingId(item.id);
    setEditState({
      live_status: item.live_status,
      delay_minutes: item.delay_minutes || 0,
      live_notes: item.live_notes || "",
      location_changed_to: item.location_changed_to || "",
      event_time: item.event_time || "",
    });
  }

  function saveEdit(item: ProgramItem) {
    patchMutation.mutate({ id: item.id, body: editState });
    if (editState.live_status && editState.live_status !== item.live_status) {
      broadcastMutation.mutate({ item: { ...item, ...editState } as ProgramItem });
    }
  }

  const program: ProgramItem[] = data?.program || [];
  const todayItems = program.filter(i => i.event_date === today);
  const tomorrowItems = program.filter(i => i.event_date !== today);

  if (!depId && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm text-center p-6">
          <CalendarDays className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Tidak ada keberangkatan aktif yang ditugaskan ke Anda.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/tour-leader" className="text-slate-500 hover:text-slate-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-slate-800">Program Harian Live</h1>
            <p className="text-xs text-slate-500">{departure?.package?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : program.length === 0 ? (
          <Card className="text-center p-8">
            <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada program hari ini.</p>
          </Card>
        ) : (
          <>
            {todayItems.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Hari Ini — {format(new Date(today), "EEEE, d MMMM", { locale: idLocale })}
                </h2>
                <div className="space-y-3">
                  {todayItems.map(item => (
                    <ProgramCard
                      key={item.id}
                      item={item}
                      editing={editingId === item.id}
                      editState={editState}
                      onEdit={startEdit}
                      onSave={saveEdit}
                      onCancel={() => setEditingId(null)}
                      onEditChange={setEditState}
                      saving={patchMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}
            {tomorrowItems.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Besok</h2>
                <div className="space-y-3">
                  {tomorrowItems.map(item => (
                    <ProgramCard
                      key={item.id}
                      item={item}
                      editing={false}
                      editState={{}}
                      onEdit={startEdit}
                      onSave={saveEdit}
                      onCancel={() => setEditingId(null)}
                      onEditChange={setEditState}
                      saving={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProgramCard({
  item, editing, editState, onEdit, onSave, onCancel, onEditChange, saving
}: {
  item: ProgramItem;
  editing: boolean;
  editState: Partial<ProgramItem>;
  onEdit: (item: ProgramItem) => void;
  onSave: (item: ProgramItem) => void;
  onCancel: () => void;
  onEditChange: (s: Partial<ProgramItem>) => void;
  saving: boolean;
}) {
  const status = STATUS_CONFIG[item.live_status] || STATUS_CONFIG.pending;

  return (
    <Card className={`border-l-4 ${item.live_status === "ongoing" ? "border-l-blue-500" : item.live_status === "done" ? "border-l-emerald-500" : item.live_status === "delayed" ? "border-l-amber-500" : "border-l-slate-200"}`}>
      <CardContent className="p-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.event_time && (
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {item.event_time}
                    </span>
                  )}
                  <Badge className={`text-xs ${status.bg} ${status.color} border-0 gap-1`}>
                    {status.icon}{status.label}
                  </Badge>
                  {item.delay_minutes > 0 && (
                    <span className="text-xs text-amber-600">+{item.delay_minutes} mnt</span>
                  )}
                </div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                {item.location && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {item.location_changed_to || item.location}
                    {item.location_changed_to && (
                      <span className="text-amber-600">(berubah)</span>
                    )}
                  </p>
                )}
                {item.live_notes && (
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded">
                    📝 {item.live_notes}
                  </p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => onEdit(item)} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="font-semibold text-slate-800">{item.title}</p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as LiveStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => onEditChange({ ...editState, live_status: s })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${editState.live_status === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border-current` : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            {editState.live_status === "delayed" && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Keterlambatan (menit)</label>
                <Input
                  type="number"
                  min={0}
                  value={editState.delay_minutes || 0}
                  onChange={e => onEditChange({ ...editState, delay_minutes: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Catatan untuk Jamaah</label>
              <Textarea
                value={editState.live_notes || ""}
                onChange={e => onEditChange({ ...editState, live_notes: e.target.value })}
                placeholder="Misal: Harap kumpul di lobby hotel..."
                className="text-sm min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Perubahan Lokasi (opsional)</label>
              <Input
                value={editState.location_changed_to || ""}
                onChange={e => onEditChange({ ...editState, location_changed_to: e.target.value })}
                placeholder="Jika lokasi berubah..."
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => onSave(item)} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8">
                <Check className="w-4 h-4 mr-1" />Simpan & Broadcast
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel} className="h-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
