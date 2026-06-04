import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, User, Phone, Mail, Globe, Star, Edit, Save, X,
  CalendarDays, Plane, Users, CheckCircle2, AlertCircle, Plus
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

export default function AdminMuthawifDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [form, setForm] = useState<any>({});

  // Fetch muthawif detail
  const { data: muthawif, isLoading } = useQuery({
    queryKey: ["muthawif-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("muthawifs")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setForm(data);
      return data;
    },
    enabled: !!id,
  });

  // Fetch departures assigned to this muthawif
  const { data: assignments = [] } = useQuery({
    queryKey: ["muthawif-assignments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, flight_number, status,
          package:packages(name),
          bookings:bookings(count)
        `)
        .eq("muthawif_id", id)
        .order("departure_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch all departures for assignment dialog
  const { data: availableDepartures = [] } = useQuery({
    queryKey: ["departures-for-assignment"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name), muthawif_id")
        .is("muthawif_id", null)
        .order("departure_date", { ascending: true })
        .limit(50);
      return data || [];
    },
    enabled: assignDialog,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("muthawifs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data muthawif berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["muthawif-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-muthawifs"] });
      setEditing(false);
    },
    onError: () => toast.error("Gagal menyimpan data"),
  });

  // Assign departure mutation
  const assignMutation = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase
        .from("departures")
        .update({ muthawif_id: id })
        .eq("id", depId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Keberangkatan berhasil di-assign");
      queryClient.invalidateQueries({ queryKey: ["muthawif-assignments", id] });
      queryClient.invalidateQueries({ queryKey: ["departures-for-assignment"] });
      setAssignDialog(false);
      setSelectedDeparture("");
    },
    onError: () => toast.error("Gagal assign keberangkatan"),
  });

  // Unassign departure
  const unassignMutation = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase
        .from("departures")
        .update({ muthawif_id: null })
        .eq("id", depId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["muthawif-assignments", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!muthawif) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Muthawif tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/muthawifs")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  const depStatus = (s: string) => {
    const m: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      ongoing: "bg-emerald-100 text-emerald-800",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-800",
    };
    return m[s] || "bg-gray-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/muthawifs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{muthawif.name}</h1>
          <p className="text-muted-foreground text-sm">Detail & Jadwal Keberangkatan</p>
        </div>
        <Badge variant={muthawif.is_active ? "default" : "secondary"} className="ml-auto">
          {muthawif.is_active ? "Aktif" : "Nonaktif"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Profil Muthawif</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1.5" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(muthawif); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl border-2 border-primary/20">
                {muthawif.name.charAt(0)}
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nama</Label>
                  <Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">No HP</Label>
                  <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Pengalaman (tahun)</Label>
                  <Input type="number" value={form.experience_years || ""} onChange={e => setForm({ ...form, experience_years: parseInt(e.target.value) })} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Bahasa (pisahkan koma)</Label>
                  <Input
                    value={(form.languages || []).join(", ")}
                    onChange={e => setForm({ ...form, languages: e.target.value.split(",").map((l: string) => l.trim()).filter(Boolean) })}
                    placeholder="Indonesia, Arab, Inggris"
                    className="h-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label className="text-xs">Status Aktif</Label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <InfoRow icon={User} label="Nama" value={muthawif.name} />
                <InfoRow icon={Phone} label="Telepon" value={muthawif.phone || "-"} />
                <InfoRow icon={Mail} label="Email" value={muthawif.email || "-"} />
                <InfoRow icon={Star} label="Pengalaman" value={`${muthawif.experience_years || 0} tahun`} />
                <InfoRow icon={Globe} label="Bahasa" value={muthawif.languages?.join(", ") || "-"} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Jadwal Keberangkatan</CardTitle>
                <CardDescription>{assignments.length} keberangkatan di-assign</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAssignDialog(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Assign Keberangkatan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {assignments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada keberangkatan yang di-assign</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tgl Berangkat</TableHead>
                    <TableHead>Kembali</TableHead>
                    <TableHead>No Penerbangan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((dep: any) => (
                    <TableRow key={dep.id}>
                      <TableCell className="font-medium text-sm">{dep.package?.name || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {dep.departure_date ? format(parseISO(dep.departure_date), "dd MMM yyyy", { locale: idLocale }) : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {dep.return_date ? format(parseISO(dep.return_date), "dd MMM yyyy", { locale: idLocale }) : "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{dep.flight_number || "-"}</TableCell>
                      <TableCell>
                        <Badge className={`${depStatus(dep.status || "scheduled")} border-0 text-[10px]`}>
                          {dep.status || "Terjadwal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                            <Link to={`/admin/departures/${dep.id}`}>Lihat</Link>
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => unassignMutation.mutate(dep.id)}
                          >
                            Lepas
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Keberangkatan ke {muthawif.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Pilih Keberangkatan (belum ada muthawif)</Label>
            <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih keberangkatan..." />
              </SelectTrigger>
              <SelectContent>
                {availableDepartures.map((dep: any) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {dep.package?.name} — {dep.departure_date
                      ? format(parseISO(dep.departure_date), "dd MMM yyyy", { locale: idLocale })
                      : "TBD"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableDepartures.length === 0 && (
              <p className="text-xs text-muted-foreground">Semua keberangkatan sudah memiliki muthawif</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Batal</Button>
            <Button
              onClick={() => selectedDeparture && assignMutation.mutate(selectedDeparture)}
              disabled={!selectedDeparture || assignMutation.isPending}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
