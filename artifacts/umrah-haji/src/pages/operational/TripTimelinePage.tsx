import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import {
  MapPin, Plus, CheckCircle2, Circle, Clock,
  Plane, Hotel, Bus, Users, Edit2, Trash2, Flag, Loader2, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const ACTIVITY_ICONS: Record<string, any> = {
  'flight': Plane,
  'hotel': Hotel,
  'transport': Bus,
  'group': Users,
  'location': MapPin,
  'other': Circle,
};

const ACTIVITY_TYPES = [
  { value: 'flight', label: 'Penerbangan', icon: Plane },
  { value: 'hotel', label: 'Hotel/Check-in', icon: Hotel },
  { value: 'transport', label: 'Transportasi', icon: Bus },
  { value: 'group', label: 'Kegiatan Kelompok', icon: Users },
  { value: 'location', label: 'Kunjungan Lokasi', icon: MapPin },
  { value: 'other', label: 'Lainnya', icon: Circle },
];

interface TimelineEntry {
  id: string;
  departure_id: string;
  day_number: number;
  activity_type: string;
  title: string;
  description: string | null;
  location: string | null;
  time_start: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export default function TripTimelinePage() {
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimelineEntry | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    day_number: "1",
    activity_type: "other",
    title: "",
    description: "",
    location: "",
    time_start: "",
    notes: "",
  });

  const resetForm = () => setForm({
    day_number: "1", activity_type: "other", title: "",
    description: "", location: "", time_start: "", notes: "",
  });

  const { data: departures } = useQuery({
    queryKey: ['timeline-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, return_date, package:packages(name, duration_days)')
        .gte('departure_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        .order('departure_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: entries, isLoading } = useQuery<TimelineEntry[]>({
    queryKey: ['trip-timeline', selectedDepartureId],
    enabled: !!selectedDepartureId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('trip_timeline')
        .select('*')
        .eq('departure_id', selectedDepartureId)
        .order('day_number', { ascending: true })
        .order('time_start', { ascending: true });
      if (error) {
        if (error.code === '42P01') return []; // table doesn't exist yet
        throw error;
      }
      return (data || []) as TimelineEntry[];
    },
  });

  // ── Fire-and-forget push notification helper ─────────────────────────────
  const fireTimelineNotify = useCallback((
    entryTitle: string,
    activityType: string,
    location: string | null,
    notes: string | null,
    changeType: 'new' | 'update' | 'complete' | 'location',
  ) => {
    if (!selectedDepartureId) return;
    fetch('/api/guide/timeline-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departure_id: selectedDepartureId,
        entry_title: entryTitle,
        activity_type: activityType,
        location: location ?? undefined,
        notes: notes ?? undefined,
        change_type: changeType,
      }),
    }).catch(() => {});
  }, [selectedDepartureId]);

  const addEntryMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload: any = {
        departure_id: selectedDepartureId,
        day_number: parseInt(data.day_number) || 1,
        activity_type: data.activity_type,
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        time_start: data.time_start || null,
        notes: data.notes || null,
        is_completed: false,
      };
      if (editEntry) {
        const { error } = await (supabase as any).from('trip_timeline').update(payload).eq('id', editEntry.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('trip_timeline').insert(payload);
        if (error) throw error;
      }
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['trip-timeline'] });
      const wasEdit = !!editEntry;
      toast.success(wasEdit ? 'Aktivitas diperbarui' : 'Aktivitas berhasil ditambahkan');
      setAddDialogOpen(false);
      setEditEntry(null);
      resetForm();
      // Kirim push notification ke jamaah
      fireTimelineNotify(
        payload.title,
        payload.activity_type,
        payload.location ?? null,
        payload.notes ?? null,
        wasEdit ? 'update' : 'new',
      );
    },
    onError: (err: any) => toast.error('Gagal menyimpan: ' + err?.message),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await (supabase as any)
        .from('trip_timeline')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
          completed_by: is_completed ? user?.id : null,
        })
        .eq('id', id);
      if (error) throw error;
      return { id, is_completed };
    },
    onSuccess: ({ id, is_completed }) => {
      queryClient.invalidateQueries({ queryKey: ['trip-timeline'] });
      // Notify jamaah saat aktivitas selesai
      if (is_completed) {
        const entry = entries?.find(e => e.id === id);
        if (entry) {
          fireTimelineNotify(entry.title, entry.activity_type, entry.location ?? null, entry.notes ?? null, 'complete');
        }
      }
    },
    onError: () => toast.error('Gagal update status'),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('trip_timeline').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-timeline'] });
      toast.success('Aktivitas dihapus');
    },
  });

  const selectedDep = departures?.find(d => d.id === selectedDepartureId);
  const totalDays = selectedDep
    ? differenceInDays(new Date(selectedDep.return_date), new Date(selectedDep.departure_date)) + 1
    : 0;

  const dayGroups = entries?.reduce((acc, entry) => {
    const day = entry.day_number;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {} as Record<number, TimelineEntry[]>) || {};

  const completedCount = entries?.filter(e => e.is_completed).length || 0;
  const totalCount = entries?.length || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getDayDate = (dayNum: number) => {
    if (!selectedDep) return null;
    const d = new Date(selectedDep.departure_date);
    d.setDate(d.getDate() + dayNum - 1);
    return d;
  };

  const openAddDialog = (dayNum?: number) => {
    resetForm();
    setEditEntry(null);
    if (dayNum) setForm(f => ({ ...f, day_number: dayNum.toString() }));
    setAddDialogOpen(true);
  };

  const openEditDialog = (entry: TimelineEntry) => {
    setEditEntry(entry);
    setForm({
      day_number: entry.day_number.toString(),
      activity_type: entry.activity_type,
      title: entry.title,
      description: entry.description || '',
      location: entry.location || '',
      time_start: entry.time_start || '',
      notes: entry.notes || '',
    });
    setAddDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timeline Perjalanan</h1>
          <p className="text-muted-foreground">Catat dan pantau progress harian perjalanan jamaah</p>
        </div>
        {selectedDepartureId && (
          <Button onClick={() => openAddDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Aktivitas
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium mb-2 block">Pilih Keberangkatan</label>
          <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih keberangkatan..." />
            </SelectTrigger>
            <SelectContent>
              {departures?.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5" />
                    {(d.package as any)?.name} — {format(new Date(d.departure_date), "dd MMM yyyy", { locale: id })}
                    {' → '}
                    {format(new Date(d.return_date), "dd MMM yyyy", { locale: id })}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDepartureId && selectedDep && !isLoading && (
        <>
          <div className="grid gap-3 grid-cols-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{totalDays}</p>
                <p className="text-xs text-muted-foreground">Hari Perjalanan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Aktivitas Selesai</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{totalCount - completedCount}</p>
                <p className="text-xs text-muted-foreground">Belum Selesai</p>
              </CardContent>
            </Card>
          </div>

          {totalCount > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progress Keseluruhan</span>
                  <span className="font-bold text-primary">{completedCount}/{totalCount} ({progressPct}%)</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {selectedDepartureId && !isLoading && (
        <div className="space-y-6">
          {totalDays > 0
            ? Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNum => {
                const dayEntries = dayGroups[dayNum] || [];
                const dayDate = getDayDate(dayNum);
                const isToday = dayDate ? format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;
                const isPast = dayDate ? dayDate < new Date() && !isToday : false;
                const dayCompleted = dayEntries.length > 0 && dayEntries.every(e => e.is_completed);

                return (
                  <div key={dayNum} className="relative">
                    <div className={`flex items-center gap-3 mb-3 p-3 rounded-lg ${isToday ? 'bg-primary/10 border border-primary/30' : isPast && dayCompleted ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-muted/40'}`}>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0 ${isToday ? 'bg-primary text-primary-foreground' : isPast && dayCompleted ? 'bg-green-100 text-green-800' : 'bg-background border'}`}>
                        {dayCompleted ? <CheckCircle2 className="h-5 w-5" /> : dayNum}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">Hari {dayNum}</span>
                          {isToday && <Badge className="text-[10px] h-4 bg-primary">Hari Ini</Badge>}
                          {dayCompleted && !isToday && <Badge className="text-[10px] h-4 bg-green-100 text-green-800">Selesai</Badge>}
                        </div>
                        {dayDate && (
                          <p className="text-xs text-muted-foreground">
                            {format(dayDate, "EEEE, dd MMMM yyyy", { locale: id })}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openAddDialog(dayNum)}>
                        <Plus className="h-3 w-3 mr-1" /> Tambah
                      </Button>
                    </div>

                    {dayEntries.length === 0 ? (
                      <div
                        className="ml-6 pl-6 border-l-2 border-dashed border-muted pb-4 text-center py-3 text-muted-foreground text-xs cursor-pointer hover:text-primary"
                        onClick={() => openAddDialog(dayNum)}
                      >
                        + Tambah aktivitas untuk hari ini
                      </div>
                    ) : (
                      <div className="ml-6 pl-6 border-l-2 border-muted space-y-3 pb-4">
                        {dayEntries.map(entry => {
                          const Icon = ACTIVITY_ICONS[entry.activity_type] || Circle;
                          return (
                            <div key={entry.id} className={`relative flex gap-3 p-3 rounded-lg border transition-colors ${entry.is_completed ? 'bg-green-50/40 border-green-200 dark:bg-green-950/10 dark:border-green-800' : 'bg-card hover:bg-muted/30'}`}>
                              <div className={`absolute -left-[33px] top-3 w-5 h-5 rounded-full flex items-center justify-center ${entry.is_completed ? 'bg-green-500' : 'bg-muted border-2 border-background'}`}>
                                {entry.is_completed
                                  ? <CheckCircle2 className="h-3 w-3 text-white" />
                                  : <Icon className="h-3 w-3 text-muted-foreground" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className={`font-semibold text-sm ${entry.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {entry.title}
                                      </p>
                                      <Badge variant="outline" className="text-[10px] h-4">
                                        {ACTIVITY_TYPES.find(t => t.value === entry.activity_type)?.label || entry.activity_type}
                                      </Badge>
                                    </div>
                                    {entry.time_start && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Clock className="h-3 w-3" />{entry.time_start}
                                      </p>
                                    )}
                                    {entry.location && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3" />{entry.location}
                                      </p>
                                    )}
                                    {entry.description && (
                                      <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                                    )}
                                    {entry.is_completed && entry.completed_at && (
                                      <p className="text-xs text-green-600 mt-1">
                                        ✓ Selesai pukul {format(new Date(entry.completed_at), "HH:mm, dd MMM")}
                                      </p>
                                    )}
                                    {entry.notes && (
                                      <p className="text-xs italic text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded">
                                        Catatan: {entry.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant={entry.is_completed ? "secondary" : "outline"}
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => toggleCompleteMutation.mutate({ id: entry.id, is_completed: !entry.is_completed })}
                                      disabled={toggleCompleteMutation.isPending}
                                    >
                                      {entry.is_completed ? 'Batal' : 'Selesai'}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(entry)}>
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteEntryMutation.mutate(entry.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            : (
              <div className="space-y-4">
                {Object.entries(dayGroups).map(([dayNum, dayEntries]) => (
                  <div key={dayNum}>
                    <h3 className="font-semibold mb-2">Hari {dayNum}</h3>
                    <div className="space-y-2">
                      {dayEntries.map(entry => (
                        <div key={entry.id} className="p-3 rounded-lg border bg-card">
                          <p className="font-medium text-sm">{entry.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          {!isLoading && totalCount === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada aktivitas perjalanan</p>
                <p className="text-sm mt-1">Tambahkan aktivitas harian untuk memantau progress perjalanan</p>
                <Button className="mt-4" onClick={() => openAddDialog(1)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Aktivitas Pertama
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedDepartureId && (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Flag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan untuk melihat timeline perjalanan</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) { setEditEntry(null); resetForm(); } setAddDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Edit Aktivitas' : 'Tambah Aktivitas Perjalanan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Hari ke-</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.day_number}
                  onChange={e => setForm(f => ({ ...f, day_number: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Waktu Mulai</Label>
                <Input
                  type="time"
                  value={form.time_start}
                  onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Jenis Aktivitas</Label>
              <Select value={form.activity_type} onValueChange={v => setForm(f => ({ ...f, activity_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-3.5 w-3.5" />{t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Judul Aktivitas *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Contoh: Check-in Hotel Novotel Madinah"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Lokasi</Label>
              <Input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Madinah, Makkah, Bandara, ..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Deskripsi</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detail aktivitas..."
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm">Catatan Lapangan</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan..."
                rows={2}
                className="mt-1 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditEntry(null); resetForm(); }}>Batal</Button>
            <Button onClick={() => addEntryMutation.mutate(form)} disabled={addEntryMutation.isPending || !form.title.trim()}>
              {addEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editEntry ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
