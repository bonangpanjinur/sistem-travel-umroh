import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Calendar, FileText, Plus, Search, Clock, CheckCircle, XCircle, GraduationCap, Moon, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface HajiRegistration {
  id: string;
  customer_id: string;
  registration_number: string | null;
  haji_type: string;
  portion_number: string | null;
  registration_year: number;
  estimated_departure_year: number | null;
  status: string;
  passport_status: string;
  visa_status: string;
  health_status: string;
  manasik_completed: boolean;
  notes: string | null;
  customer?: { full_name: string; phone: string };
}

interface ManasikSchedule {
  id: string;
  departure_id: string | null;
  title: string;
  description: string | null;
  schedule_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  instructor: string | null;
  max_participants: number;
  is_mandatory: boolean;
}

const hajiTypeLabels: Record<string, string> = {
  regular: "Haji Reguler",
  plus: "Haji Plus",
  furoda: "Haji Furoda",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  registered: { label: "Terdaftar", color: "secondary" },
  waiting: { label: "Menunggu", color: "default" },
  departed: { label: "Berangkat", color: "default" },
  completed: { label: "Selesai", color: "default" },
};

const documentStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  submitted: { label: "Submitted", variant: "default" },
  verified: { label: "Verified", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function AdminHajiManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("registrations");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isManasikDialogOpen, setIsManasikDialogOpen] = useState(false);
  const [editingManasik, setEditingManasik] = useState<ManasikSchedule | null>(null);
  const [deletingManasik, setDeletingManasik] = useState<ManasikSchedule | null>(null);

  // Fetch haji registrations
  const { data: registrations = [], isLoading: loadingRegistrations } = useQuery({
    queryKey: ["haji-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("haji_registrations" as any)
        .select("*, customer:customers(full_name, phone)")
        .order("registration_year", { ascending: false });
      if (error) throw error;
      return data as unknown as HajiRegistration[];
    },
  });

  // Fetch manasik schedules
  const { data: manasikSchedules = [], isLoading: loadingManasik } = useQuery({
    queryKey: ["manasik-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manasik_schedules" as any)
        .select("*")
        .order("schedule_date");
      if (error) throw error;
      return data as unknown as ManasikSchedule[];
    },
  });

  // Save manasik mutation
  const saveManasikMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const scheduleData = {
        title: formData.get("title") as string,
        description: formData.get("description") as string || null,
        schedule_date: formData.get("schedule_date") as string,
        start_time: formData.get("start_time") as string || null,
        end_time: formData.get("end_time") as string || null,
        location: formData.get("location") as string || null,
        instructor: formData.get("instructor") as string || null,
        max_participants: parseInt(formData.get("max_participants") as string) || 100,
        is_mandatory: formData.get("is_mandatory") === "on",
      };

      if (editingManasik?.id) {
        const { error } = await supabase
          .from("manasik_schedules" as any)
          .update(scheduleData)
          .eq("id", editingManasik.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("manasik_schedules" as any)
          .insert(scheduleData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manasik-schedules"] });
      toast.success("Jadwal manasik berhasil disimpan");
      setIsManasikDialogOpen(false);
      setEditingManasik(null);
    },
    onError: (error: Error) => toast.error("Gagal: " + error.message),
  });

  const deleteManasikMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manasik_schedules" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manasik-schedules"] });
      toast.success("Jadwal manasik berhasil dihapus");
      setDeletingManasik(null);
    },
    onError: (error: Error) => toast.error("Gagal: " + error.message),
  });

  const filteredRegistrations = registrations.filter((reg) => {
    const matchSearch =
      reg.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.portion_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || reg.haji_type === filterType;
    return matchSearch && matchType;
  });

  // Stats
  const stats = {
    total: registrations.length,
    regular: registrations.filter((r) => r.haji_type === "regular").length,
    plus: registrations.filter((r) => r.haji_type === "plus").length,
    furoda: registrations.filter((r) => r.haji_type === "furoda").length,
    manasikCompleted: registrations.filter((r) => r.manasik_completed).length,
  };

  const handleSubmitManasik = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveManasikMutation.mutate(new FormData(e.currentTarget));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Moon className="h-8 w-8 text-primary" />
        
        <div>
          <h1 className="text-3xl font-bold">Manajemen Haji</h1>
          <p className="text-muted-foreground">Kelola pendaftaran haji dan jadwal manasik</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Registrasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.regular}</p>
            <p className="text-sm text-muted-foreground">Haji Reguler</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.plus}</p>
            <p className="text-sm text-muted-foreground">Haji Plus</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.furoda}</p>
            <p className="text-sm text-muted-foreground">Haji Furoda</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.manasikCompleted}</p>
            <p className="text-sm text-muted-foreground">Manasik Selesai</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="registrations">Pendaftaran Haji</TabsTrigger>
          <TabsTrigger value="manasik">Jadwal Manasik</TabsTrigger>
          <TabsTrigger value="waiting">Waiting List</TabsTrigger>
        </TabsList>

        {/* Registrations Tab */}
        <TabsContent value="registrations" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, no registrasi, no porsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipe Haji" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(hajiTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jamaah</TableHead>
                  <TableHead>No. Registrasi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tahun Daftar</TableHead>
                  <TableHead>Est. Berangkat</TableHead>
                  <TableHead>Dokumen</TableHead>
                  <TableHead>Manasik</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{reg.customer?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{reg.customer?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{reg.registration_number || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{hajiTypeLabels[reg.haji_type] || reg.haji_type}</Badge>
                    </TableCell>
                    <TableCell>{reg.registration_year}</TableCell>
                    <TableCell>{reg.estimated_departure_year || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={documentStatusLabels[reg.passport_status]?.variant || "secondary"} className="text-xs">
                          PP: {documentStatusLabels[reg.passport_status]?.label || reg.passport_status}
                        </Badge>
                        <Badge variant={documentStatusLabels[reg.health_status]?.variant || "secondary"} className="text-xs">
                          HC: {documentStatusLabels[reg.health_status]?.label || reg.health_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {reg.manasik_completed ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" /> Belum
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[reg.status]?.color as any || "secondary"}>
                        {statusLabels[reg.status]?.label || reg.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRegistrations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Tidak ada data pendaftaran haji
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Manasik Tab */}
        <TabsContent value="manasik" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsManasikDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Jadwal Manasik
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manasikSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{schedule.title}</CardTitle>
                      <CardDescription>{schedule.description}</CardDescription>
                    </div>
                    {schedule.is_mandatory && (
                      <Badge variant="destructive">Wajib</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(schedule.schedule_date), "dd MMMM yyyy", { locale: id })}</span>
                    </div>
                    {schedule.start_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{schedule.start_time} - {schedule.end_time || "selesai"}</span>
                      </div>
                    )}
                    {schedule.location && (
                      <p className="text-muted-foreground">📍 {schedule.location}</p>
                    )}
                    {schedule.instructor && (
                      <p className="text-muted-foreground">👤 {schedule.instructor}</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingManasik(schedule);
                        setIsManasikDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">Absensi</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingManasik(schedule)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {manasikSchedules.length === 0 && (
              <Card className="col-span-full p-8 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada jadwal manasik</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Waiting List Tab */}
        <TabsContent value="waiting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estimasi Keberangkatan</CardTitle>
              <CardDescription>
                Berdasarkan tipe haji dan tahun pendaftaran
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">~22 thn</p>
                    <p className="text-sm text-muted-foreground">Haji Reguler</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">~5 thn</p>
                    <p className="text-sm text-muted-foreground">Haji Plus</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">~1 thn</p>
                    <p className="text-sm text-muted-foreground">Haji Furoda</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jamaah</TableHead>
                      <TableHead>No. Porsi</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Tahun Daftar</TableHead>
                      <TableHead>Est. Berangkat</TableHead>
                      <TableHead>Sisa Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations
                      .filter(r => r.status === 'waiting' || r.status === 'registered')
                      .slice(0, 20)
                      .map((reg) => {
                        const currentYear = new Date().getFullYear();
                        const yearsLeft = (reg.estimated_departure_year || currentYear + 20) - currentYear;
                        
                        return (
                          <TableRow key={reg.id}>
                            <TableCell>
                              <p className="font-medium">{reg.customer?.full_name || "Unknown"}</p>
                            </TableCell>
                            <TableCell className="font-mono">{reg.portion_number || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{hajiTypeLabels[reg.haji_type]}</Badge>
                            </TableCell>
                            <TableCell>{reg.registration_year}</TableCell>
                            <TableCell className="font-semibold">
                              {reg.estimated_departure_year || "-"}
                            </TableCell>
                            <TableCell>
                              {yearsLeft > 0 ? (
                                <Badge variant={yearsLeft <= 3 ? "default" : "secondary"}>
                                  ~{yearsLeft} tahun lagi
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Siap berangkat
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {registrations.filter(r => r.status === 'waiting' || r.status === 'registered').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Tidak ada jamaah dalam waiting list
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              onClick={() => deletingManasik && deleteManasikMutation.mutate(deletingManasik.id)}
              disabled={deleteManasikMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteManasikMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manasik Dialog */}
      <Dialog open={isManasikDialogOpen} onOpenChange={setIsManasikDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingManasik ? "Edit Jadwal Manasik" : "Tambah Jadwal Manasik"}</DialogTitle>
            <DialogDescription>Atur jadwal pelatihan manasik untuk jamaah</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitManasik} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={editingManasik?.title || ""}
                placeholder="Manasik Umrah Batch 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingManasik?.description || ""}
                placeholder="Deskripsi kegiatan manasik..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule_date">Tanggal *</Label>
                <Input
                  id="schedule_date"
                  name="schedule_date"
                  type="date"
                  defaultValue={editingManasik?.schedule_date || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Jam Mulai</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  defaultValue={editingManasik?.start_time || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Jam Selesai</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="time"
                  defaultValue={editingManasik?.end_time || ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={editingManasik?.location || ""}
                  placeholder="Aula Masjid..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor">Instruktur</Label>
                <Input
                  id="instructor"
                  name="instructor"
                  defaultValue={editingManasik?.instructor || ""}
                  placeholder="Ustadz..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_participants">Maks Peserta</Label>
                <Input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  defaultValue={editingManasik?.max_participants || 100}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  name="is_mandatory"
                  defaultChecked={editingManasik?.is_mandatory ?? true}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_mandatory">Wajib Hadir</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManasikDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveManasikMutation.isPending}>
                {saveManasikMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
