import { useEffect, useState } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarOff, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

const LEAVE_TYPES: Record<string, string> = {
  annual: "Cuti Tahunan",
  sick: "Cuti Sakit",
  maternity: "Cuti Melahirkan",
  paternity: "Cuti Ayah",
  emergency: "Cuti Darurat",
  unpaid: "Cuti Tanpa Gaji",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:  { label: "Menunggu",  cls: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4 text-amber-500" /> },
  approved: { label: "Disetujui", cls: "bg-green-100 text-green-800",  icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
  rejected: { label: "Ditolak",   cls: "bg-red-100 text-red-800",     icon: <XCircle className="w-4 h-4 text-red-500" /> },
};

function duration(start: string, end: string) {
  const d = differenceInCalendarDays(new Date(end), new Date(start)) + 1;
  return d + " hari";
}

export default function ESSLeaveRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [empId, setEmpId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("employees").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => setEmpId(data?.id));
  }, [user]);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["ess-leaves", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("leave_requests")
        .select("*")
        .eq("employee_id", empId)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form.start_date || !form.end_date || !form.reason) throw new Error("Semua field wajib diisi");
      if (new Date(form.end_date) < new Date(form.start_date)) throw new Error("Tanggal akhir harus setelah tanggal mulai");
      const { error } = await (supabase as any).from("leave_requests").insert({
        employee_id: empId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ess-leaves", empId] });
      setDialogOpen(false);
      setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      toast.success("Pengajuan cuti berhasil dikirim! Menunggu persetujuan HR.");
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengajukan cuti"),
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const durationDays = form.start_date && form.end_date
    ? differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1
    : 0;

  const pendingCount = leaves.filter((l: any) => l.status === "pending").length;
  const approvedCount = leaves.filter((l: any) => l.status === "approved").length;

  return (
    <ESSLayout title="Cuti & Izin">
      <div className="max-w-2xl space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Pengajuan", val: leaves.length, cls: "text-slate-700" },
            { label: "Menunggu", val: pendingCount, cls: "text-amber-600" },
            { label: "Disetujui", val: approvedCount, cls: "text-green-600" },
          ].map(({ label, val, cls }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ajukan */}
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" /> Ajukan Cuti
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Memuat data...</div>
        ) : leaves.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarOff className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">Belum ada pengajuan cuti</p>
              <p className="text-sm text-slate-400 mt-1">Klik "Ajukan Cuti" untuk membuat permohonan</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leaves.map((leave: any) => {
              const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
              return (
                <Card key={leave.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {cfg.icon}
                        <div>
                          <p className="font-semibold text-slate-800">{LEAVE_TYPES[leave.leave_type] || leave.leave_type}</p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {format(new Date(leave.start_date), "dd MMM yyyy", { locale: idLocale })} —{" "}
                            {format(new Date(leave.end_date), "dd MMM yyyy", { locale: idLocale })}
                            <span className="ml-2 text-slate-400">({duration(leave.start_date, leave.end_date)})</span>
                          </p>
                          <p className="text-sm text-slate-600 mt-1 italic">"{leave.reason}"</p>
                          {leave.rejection_reason && (
                            <div className="mt-2 flex items-start gap-1.5 text-sm text-red-600">
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>Alasan penolakan: {leave.rejection_reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={`text-xs shrink-0 ${cfg.cls}`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Diajukan: {format(new Date(leave.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-blue-500" /> Ajukan Cuti / Izin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Jenis Cuti *</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal Mulai *</Label>
                <Input type="date" min={today} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Selesai *</Label>
                <Input type="date" min={form.start_date || today} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            {durationDays > 0 && (
              <p className="text-sm text-emerald-600 font-medium">Durasi: {durationDays} hari kerja</p>
            )}
            <div className="space-y-1.5">
              <Label>Alasan / Keterangan *</Label>
              <Textarea rows={3} placeholder="Jelaskan alasan pengajuan cuti Anda..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!form.start_date || !form.end_date || !form.reason || submitMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitMutation.isPending ? "Mengirim..." : "Kirim Pengajuan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ESSLayout>
  );
}
