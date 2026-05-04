import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Clock, Plus, Edit, Trash2, Play, Pause,
  Calendar, Mail, FileText, BarChart3, Users,
  CheckCircle, XCircle, History
} from "lucide-react";

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  recipients: string[];
  filters: any;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

interface ReportLog {
  id: string;
  report_id: string;
  status: string;
  error_message: string | null;
  recipients_sent: string[] | null;
  generated_at: string;
}

const REPORT_TYPES = [
  { value: "financial", label: "Keuangan (P&L)", icon: BarChart3 },
  { value: "operational", label: "Operasional", icon: FileText },
  { value: "marketing", label: "Marketing & Sales", icon: Users },
  { value: "booking_summary", label: "Ringkasan Booking", icon: Calendar },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Harian" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Bulanan" },
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function AdminScheduledReports() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("schedules");
  const [formDialog, setFormDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [recipientInput, setRecipientInput] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    report_type: "financial",
    frequency: "weekly",
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: "08:00",
    recipients: [] as string[],
    is_active: true,
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["scheduled-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScheduledReport[];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["scheduled-report-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_report_logs")
        .select("*")
        .order("generated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ReportLog[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        report_type: formData.report_type,
        frequency: formData.frequency,
        day_of_week: formData.frequency === "weekly" ? formData.day_of_week : null,
        day_of_month: formData.frequency === "monthly" ? formData.day_of_month : null,
        time_of_day: formData.time_of_day + ":00",
        recipients: formData.recipients,
        is_active: formData.is_active,
      };

      if (editingReport) {
        const { error } = await supabase
          .from("scheduled_reports")
          .update(payload)
          .eq("id", editingReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scheduled_reports")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingReport ? "Jadwal berhasil diupdate" : "Jadwal berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      setFormDialog(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("scheduled_reports")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Status jadwal diperbarui");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
      toast.success("Jadwal berhasil dihapus");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      report_type: "financial",
      frequency: "weekly",
      day_of_week: 1,
      day_of_month: 1,
      time_of_day: "08:00",
      recipients: [],
      is_active: true,
    });
    setEditingReport(null);
    setRecipientInput("");
  };

  const openEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      report_type: report.report_type,
      frequency: report.frequency,
      day_of_week: report.day_of_week ?? 1,
      day_of_month: report.day_of_month ?? 1,
      time_of_day: report.time_of_day?.substring(0, 5) || "08:00",
      recipients: report.recipients || [],
      is_active: report.is_active,
    });
    setFormDialog(true);
  };

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (email && email.includes("@") && !formData.recipients.includes(email)) {
      setFormData({ ...formData, recipients: [...formData.recipients, email] });
      setRecipientInput("");
    }
  };

  const removeRecipient = (email: string) => {
    setFormData({ ...formData, recipients: formData.recipients.filter((r) => r !== email) });
  };

  const getFrequencyLabel = (report: ScheduledReport) => {
    if (report.frequency === "daily") return "Setiap hari";
    if (report.frequency === "weekly") return `Setiap ${DAY_NAMES[report.day_of_week ?? 1]}`;
    if (report.frequency === "monthly") return `Tanggal ${report.day_of_month} setiap bulan`;
    return report.frequency;
  };

  const getReportTypeInfo = (type: string) => {
    return REPORT_TYPES.find((r) => r.value === type) || REPORT_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan Terjadwal</h1>
          <p className="text-muted-foreground">Atur pengiriman laporan otomatis ke email</p>
        </div>
        <Button onClick={() => { resetForm(); setFormDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Jadwal Baru
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules" className="gap-2">
            <Clock className="h-4 w-4" />
            Jadwal Aktif
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Riwayat Pengiriman
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Jadwal</h3>
                <p className="text-muted-foreground mb-4">
                  Buat jadwal untuk mengirim laporan otomatis ke email owner/finance
                </p>
                <Button onClick={() => { resetForm(); setFormDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Jadwal Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => {
                const typeInfo = getReportTypeInfo(report.report_type);
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={report.id} className={!report.is_active ? "opacity-60" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2.5 rounded-lg bg-primary/10">
                            <TypeIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{report.name}</h3>
                              <Badge variant={report.is_active ? "default" : "secondary"}>
                                {report.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {typeInfo.label} • {getFrequencyLabel(report)} pukul {report.time_of_day?.substring(0, 5)}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {report.recipients?.map((email) => (
                                <Badge key={email} variant="outline" className="text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {email}
                                </Badge>
                              ))}
                            </div>
                            {report.last_run_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Terakhir dikirim: {format(new Date(report.last_run_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={report.is_active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: report.id, is_active: checked })}
                          />
                          <Button size="icon" variant="ghost" onClick={() => openEdit(report)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(report.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Laporan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const report = reports.find((r) => r.id === log.report_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.generated_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-medium">{report?.name || "-"}</TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Terkirim
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Gagal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.recipients_sent?.join(", ") || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada riwayat pengiriman
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={formDialog} onOpenChange={setFormDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? "Edit" : "Buat"} Jadwal Laporan
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nama Jadwal *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Laporan Keuangan Mingguan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Laporan</Label>
                <Select value={formData.report_type} onValueChange={(v) => setFormData({ ...formData, report_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frekuensi</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Hari Pengiriman</Label>
                <Select value={String(formData.day_of_week)} onValueChange={(v) => setFormData({ ...formData, day_of_week: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Tanggal Pengiriman</Label>
                <Select value={String(formData.day_of_month)} onValueChange={(v) => setFormData({ ...formData, day_of_month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Tanggal {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Jam Pengiriman</Label>
              <Input
                type="time"
                value={formData.time_of_day}
                onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Penerima Email</Label>
              <div className="flex gap-2">
                <Input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  placeholder="email@contoh.com"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRecipient())}
                />
                <Button type="button" variant="outline" onClick={addRecipient}>
                  Tambah
                </Button>
              </div>
              {formData.recipients.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.recipients.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeRecipient(email)}>
                      {email}
                      <XCircle className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Aktifkan langsung</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(false)}>Batal</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.name || formData.recipients.length === 0 || saveMutation.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
