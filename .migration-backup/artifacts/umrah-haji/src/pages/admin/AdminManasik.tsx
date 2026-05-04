import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Users, Calendar, CheckCircle2, Clock, Edit, Trash2, Share2, MapPin } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function AdminManasik() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedManasik, setSelectedManasik] = useState<any>(null);
  const [deletingManasik, setDeletingManasik] = useState<any>(null);
  const [editingManasik, setEditingManasik] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", location: "", google_maps_url: "", schedule_date: "",
    start_time: "", end_time: "", instructor: "", max_participants: "",
    departure_id: "",
  });

  const { data: departures } = useQuery({
    queryKey: ["departures-for-manasik"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");
      return data || [];
    },
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["manasik-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manasik_schedules")
        .select("*, departure:departures(departure_date, package:packages(name))")
        .order("schedule_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["manasik-attendance", selectedManasik?.id],
    queryFn: async () => {
      if (!selectedManasik?.id) return [];
      const { data } = await supabase
        .from("manasik_attendance")
        .select("*, customer:customers(id, full_name, phone)")
        .eq("schedule_id", selectedManasik.id);
      return data || [];
    },
    enabled: !!selectedManasik?.id,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-for-manasik", selectedManasik?.departure_id],
    queryFn: async () => {
      if (!selectedManasik?.departure_id) return [];
      const { data } = await supabase
        .from("booking_passengers")
        .select("customer:customers(id, full_name, phone), booking:bookings!inner(departure_id)")
        .eq("booking.departure_id", selectedManasik.departure_id);
      return data?.map((d: any) => d.customer).filter(Boolean) || [];
    },
    enabled: !!selectedManasik?.departure_id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingManasik?.id) {
        const { error } = await supabase.from("manasik_schedules").update({
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          google_maps_url: form.google_maps_url || null,
          schedule_date: form.schedule_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          instructor: form.instructor || null,
          max_participants: form.max_participants ? parseInt(form.max_participants) : null,
          departure_id: form.departure_id || null,
        } as any).eq("id", editingManasik.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("manasik_schedules").insert({
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          google_maps_url: form.google_maps_url || null,
          schedule_date: form.schedule_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          instructor: form.instructor || null,
          max_participants: form.max_participants ? parseInt(form.max_participants) : null,
          departure_id: form.departure_id || null,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manasik-schedules"] });
      setDialogOpen(false);
      setEditingManasik(null);
      setForm({ title: "", description: "", location: "", google_maps_url: "", schedule_date: "", start_time: "", end_time: "", instructor: "", max_participants: "", departure_id: "" });
      toast({ title: editingManasik?.id ? "Jadwal manasik berhasil diperbarui" : "Jadwal manasik berhasil dibuat" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manasik_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manasik-schedules"] });
      setDeletingManasik(null);
      toast({ title: "Jadwal manasik berhasil dihapus" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const markAttendance = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase.from("manasik_attendance").insert({
        schedule_id: selectedManasik.id,
        customer_id: customerId,
        attended: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manasik-attendance"] });
      toast({ title: "Kehadiran dicatat" });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const attendedIds = new Set(attendance?.filter((a: any) => a.attended).map((a: any) => a.customer?.id));
  const isPast = (date: string) => new Date(date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Manasik Umroh</h1>
          <p className="text-muted-foreground">Kelola jadwal bimbingan manasik jamaah</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingManasik(null);
            setForm({ title: "", description: "", location: "", google_maps_url: "", schedule_date: "", start_time: "", end_time: "", instructor: "", max_participants: "", departure_id: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Tambah Jadwal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingManasik?.id ? "Edit Jadwal Manasik" : "Tambah Jadwal Manasik"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Judul *</Label><Input value={form.title || editingManasik?.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Manasik Umroh Batch 1" /></div>
              <div>
                <Label>Keberangkatan</Label>
                <Select value={form.departure_id} onValueChange={v => setForm(f => ({ ...f, departure_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih keberangkatan" /></SelectTrigger>
                  <SelectContent>
                    {departures?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.package?.name} - {format(new Date(d.departure_date), "dd MMM yyyy")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tanggal *</Label><Input type="date" value={form.schedule_date || editingManasik?.schedule_date || ""} onChange={e => setForm(f => ({ ...f, schedule_date: e.target.value }))} /></div>
                <div><Label>Lokasi</Label><Input value={form.location || editingManasik?.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Link Google Maps</Label>
                <Input 
                  value={form.google_maps_url || editingManasik?.google_maps_url || ""} 
                  onChange={e => setForm(f => ({ ...f, google_maps_url: e.target.value }))} 
                  placeholder="https://maps.google.com/..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Jam Mulai</Label><Input type="time" value={form.start_time || editingManasik?.start_time || ""} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                <div><Label>Jam Selesai</Label><Input type="time" value={form.end_time || editingManasik?.end_time || ""} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Instruktur</Label><Input value={form.instructor || editingManasik?.instructor || ""} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} /></div>
                <div><Label>Maks Peserta</Label><Input type="number" value={form.max_participants || editingManasik?.max_participants || ""} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} /></div>
              </div>
              <div><Label>Deskripsi</Label><Textarea value={form.description || editingManasik?.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!(form.title || editingManasik?.title) || !(form.schedule_date || editingManasik?.schedule_date) || createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Calendar className="h-8 w-8 text-primary/60" /><div><p className="text-2xl font-bold">{schedules?.length || 0}</p><p className="text-xs text-muted-foreground">Total Jadwal</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-8 w-8 text-amber-500/60" /><div><p className="text-2xl font-bold">{schedules?.filter((s: any) => !isPast(s.schedule_date)).length || 0}</p><p className="text-xs text-muted-foreground">Akan Datang</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-emerald-500/60" /><div><p className="text-2xl font-bold">{schedules?.filter((s: any) => isPast(s.schedule_date)).length || 0}</p><p className="text-xs text-muted-foreground">Selesai</p></div></CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Keberangkatan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Instruktur</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !schedules?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada jadwal manasik</TableCell></TableRow>
              ) : schedules.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-sm">{(s.departure as any)?.package?.name || "-"}</TableCell>
                  <TableCell>{format(new Date(s.schedule_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm">{s.start_time ? `${s.start_time}${s.end_time ? ` - ${s.end_time}` : ""}` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{s.location || "-"}</span>
                      {s.google_maps_url && (
                        <a 
                          href={s.google_maps_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          <MapPin className="h-3 w-3" /> Lihat Peta
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{s.instructor || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={isPast(s.schedule_date) ? "secondary" : "outline"}>
                      {isPast(s.schedule_date) ? "Selesai" : "Akan Datang"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedManasik(s); setAttendanceDialogOpen(true); }}>
                      <Users className="h-3 w-3 mr-1" /> Absensi
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingManasik(s);
                      setForm({
                        title: s.title,
                        description: s.description || "",
                        location: s.location || "",
                        google_maps_url: s.google_maps_url || "",
                        schedule_date: s.schedule_date,
                        start_time: s.start_time || "",
                        end_time: s.end_time || "",
                        instructor: s.instructor || "",
                        max_participants: s.max_participants?.toString() || "",
                        departure_id: s.departure_id || "",
                      });
                      setDialogOpen(true);
                    }}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const text = `Jadwal Manasik: ${s.title}\nTanggal: ${format(new Date(s.schedule_date), "dd MMM yyyy")}\nWaktu: ${s.start_time || ""}\nLokasi: ${s.location || ""}\n${s.google_maps_url ? `Peta: ${s.google_maps_url}` : ""}`;
                      if (navigator.share) {
                        navigator.share({ title: s.title, text: text });
                      } else {
                        navigator.clipboard.writeText(text);
                        toast({ title: "Berhasil disalin", description: "Informasi manasik telah disalin ke clipboard" });
                      }
                    }}>
                      <Share2 className="h-3 w-3 mr-1" /> Share
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeletingManasik(s)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingManasik} onOpenChange={(open) => !open && setDeletingManasik(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal Manasik</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jadwal manasik "{deletingManasik?.title}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingManasik.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Absensi: {selectedManasik?.title}</DialogTitle></DialogHeader>
          {!selectedManasik?.departure_id ? (
            <p className="text-sm text-muted-foreground">Jadwal ini tidak terhubung ke keberangkatan.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customers?.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div><p className="font-medium text-sm">{c.full_name}</p><p className="text-xs text-muted-foreground">{c.phone || "-"}</p></div>
                  {attendedIds.has(c.id) ? (
                    <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" /> Hadir</Badge>
                  ) : (
                    <Button size="sm" onClick={() => markAttendance.mutate(c.id)} disabled={markAttendance.isPending}>Tandai Hadir</Button>
                  )}
                </div>
              ))}
              {(!customers || customers.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jamaah di keberangkatan ini</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
