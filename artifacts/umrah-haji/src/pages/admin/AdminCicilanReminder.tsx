import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Bell, PiggyBank, Send, CheckCircle2, AlertCircle, Clock,
  RefreshCcw, Settings, Calendar, Users, Zap, MessageSquare,
  TrendingUp, Filter
} from "lucide-react";
import { format, parseISO, addDays, differenceInDays, isBefore } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const DEFAULT_TEMPLATE = `Assalamu'alaikum *{nama}*,

💰 *Pengingat Setoran Tabungan Umroh*

Kami mengingatkan bahwa setoran tabungan Anda akan jatuh tempo dalam *{hari} hari* pada *{tanggal_jatuh_tempo}*.

📋 Detail Setoran:
• Jumlah: *{jumlah_cicilan}*
• Total Terkumpul: *{total_terkumpul}* dari *{target}*
• Progress: *{progress}%*

Silakan lakukan setoran tepat waktu agar tidak terkena denda dan perjalanan Anda tidak tertunda.

Transfer ke:
🏦 Bank: {bank}
💳 No. Rek: {no_rek}
👤 a.n: {atas_nama}

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`;

export default function AdminCicilanReminder() {
  const queryClient = useQueryClient();
  const [reminderDays, setReminderDays] = useState(() => parseInt(localStorage.getItem("cicilan_reminder_days") || "3"));
  const [isAutoEnabled, setIsAutoEnabled] = useState(() => localStorage.getItem("cicilan_auto_reminder") === "true");
  const [template, setTemplate] = useState(() => localStorage.getItem("cicilan_reminder_template") || DEFAULT_TEMPLATE);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState("upcoming");

  const { data: waConfig } = useQuery({
    queryKey: ["wa-config"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_config").select("*").eq("is_active", true).maybeSingle();
      return data;
    },
  });

  const { data: rawPlans = [], isLoading, refetch } = useQuery({
    queryKey: ["cicilan-reminder-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_plans")
        .select(`
          id, customer_id, target_amount, installment_amount, installment_day,
          start_date, status, next_payment_date, last_payment_date,
          customer:profiles(full_name, phone, email),
          savings_payments(id, status, amount, payment_date)
        `)
        .in("status", ["active", "dp_paid"])
        .order("next_payment_date", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data || [];
    },
  });

  const today = new Date();
  const plans = (rawPlans as any[]).map(p => {
    const nextDate = p.next_payment_date ? new Date(p.next_payment_date) : null;
    const daysUntil = nextDate ? differenceInDays(nextDate, today) : null;
    const totalSaved = (p.savings_payments || [])
      .filter((sp: any) => sp.status === "confirmed")
      .reduce((s: number, sp: any) => s + (sp.amount || 0), 0);
    const progress = p.target_amount > 0 ? Math.round((totalSaved / p.target_amount) * 100) : 0;
    return { ...p, daysUntil, totalSaved, progress, nextDate };
  });

  const upcomingPlans = plans.filter(p => p.daysUntil !== null && p.daysUntil >= 0 && p.daysUntil <= reminderDays);
  const overduePlans = plans.filter(p => p.daysUntil !== null && p.daysUntil < 0);
  const allActivePlans = plans;

  const displayedPlans = filterStatus === "upcoming" ? upcomingPlans : filterStatus === "overdue" ? overduePlans : allActivePlans;

  function buildMessage(plan: any): string {
    return template
      .replace(/{nama}/g, plan.customer?.full_name || "Bapak/Ibu")
      .replace(/{hari}/g, plan.daysUntil?.toString() || "?")
      .replace(/{tanggal_jatuh_tempo}/g, plan.nextDate ? format(plan.nextDate, "dd MMMM yyyy", { locale: idLocale }) : "—")
      .replace(/{jumlah_cicilan}/g, formatCurrency(plan.installment_amount))
      .replace(/{total_terkumpul}/g, formatCurrency(plan.totalSaved))
      .replace(/{target}/g, formatCurrency(plan.target_amount))
      .replace(/{progress}/g, plan.progress.toString())
      .replace(/{bank}/g, "BCA / Mandiri")
      .replace(/{no_rek}/g, "XXX-XXXX-XXXX")
      .replace(/{atas_nama}/g, "PT Vinstour Travel");
  }

  async function sendReminder(plan: any) {
    if (!waConfig?.api_key) { toast.error("Konfigurasi WA belum diatur"); return; }
    if (!plan.customer?.phone) { toast.error("Nomor telepon jamaah tidak tersedia"); return; }
    setSendingIds(prev => new Set(prev).add(plan.id));
    try {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp-notifier");
      const result = await sendWhatsAppMessage({
        token: waConfig.api_key,
        target: plan.customer.phone,
        message: buildMessage(plan),
      });
      if (result.success) toast.success(`Reminder dikirim ke ${plan.customer.full_name}`);
      else toast.error("Gagal: " + result.error);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSendingIds(prev => { const s = new Set(prev); s.delete(plan.id); return s; });
    }
  }

  async function sendAllReminders() {
    if (!waConfig?.api_key) { toast.error("Konfigurasi WA belum diatur"); return; }
    if (upcomingPlans.length === 0) { toast.info("Tidak ada cicilan yang jatuh tempo dalam " + reminderDays + " hari ke depan"); return; }
    setSendingAll(true);
    let success = 0, failed = 0;
    for (const plan of upcomingPlans) {
      if (!plan.customer?.phone) { failed++; continue; }
      try {
        const { sendWhatsAppMessage } = await import("@/lib/whatsapp-notifier");
        const result = await sendWhatsAppMessage({
          token: waConfig.api_key,
          target: plan.customer.phone,
          message: buildMessage(plan),
        });
        if (result.success) success++; else failed++;
      } catch { failed++; }
      await new Promise(r => setTimeout(r, 1000));
    }
    setSendingAll(false);
    toast.success(`Reminder selesai: ${success} berhasil, ${failed} gagal`);
  }

  function saveSettings() {
    localStorage.setItem("cicilan_reminder_days", reminderDays.toString());
    localStorage.setItem("cicilan_auto_reminder", isAutoEnabled.toString());
    localStorage.setItem("cicilan_reminder_template", template);
    toast.success("Pengaturan reminder disimpan");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            Pengingat Cicilan Otomatis
          </h1>
          <p className="text-muted-foreground mt-1">Kirim reminder WA ke jamaah sebelum tanggal setor cicilan tabungan</p>
        </div>
        <div className="flex gap-2">
          <Badge className="gap-1 bg-amber-100 text-amber-700 border-0">
            <Clock className="h-3 w-3" /> {upcomingPlans.length} Jatuh Tempo
          </Badge>
          <Badge className="gap-1 bg-red-100 text-red-700 border-0">
            <AlertCircle className="h-3 w-3" /> {overduePlans.length} Terlambat
          </Badge>
        </div>
      </div>

      {!waConfig && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Konfigurasi WhatsApp belum diatur. Pergi ke menu <strong>WhatsApp</strong> untuk setup API key Fonnte.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg"><Calendar className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Jatuh Tempo {reminderDays}H ke Depan</p>
              <p className="text-xl font-bold">{upcomingPlans.length} jamaah</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Terlambat Setor</p>
              <p className="text-xl font-bold">{overduePlans.length} jamaah</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg"><PiggyBank className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tabungan Aktif</p>
              <p className="text-xl font-bold">{allActivePlans.length} rencana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><Users className="h-4 w-4 mr-1" />Daftar Jamaah</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />Pengaturan</TabsTrigger>
          <TabsTrigger value="template"><MessageSquare className="h-4 w-4 mr-1" />Template Pesan</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Akan Jatuh Tempo</SelectItem>
                  <SelectItem value="overdue">Terlambat</SelectItem>
                  <SelectItem value="all">Semua Aktif</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" /></Button>
            </div>
            <Button onClick={sendAllReminders} disabled={sendingAll || upcomingPlans.length === 0 || !waConfig}>
              {sendingAll ? <RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Kirim Semua Reminder ({upcomingPlans.length})
            </Button>
          </div>

          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Memuat data...</p>
          ) : displayedPlans.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Tidak ada jamaah pada filter ini</p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Cicilan</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedPlans.map((plan: any) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{plan.customer?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{plan.customer?.phone || "Tidak ada HP"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(plan.installment_amount)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[100px]">
                          <Progress value={plan.progress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{plan.progress}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {plan.nextDate ? format(plan.nextDate, "dd MMM yyyy", { locale: idLocale }) : "—"}
                      </TableCell>
                      <TableCell>
                        {plan.daysUntil === null ? (
                          <Badge variant="outline" className="text-[10px]">Tidak ada jadwal</Badge>
                        ) : plan.daysUntil < 0 ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Terlambat {Math.abs(plan.daysUntil)}h</Badge>
                        ) : plan.daysUntil === 0 ? (
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px]">Hari ini!</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">{plan.daysUntil} hari lagi</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendingIds.has(plan.id) || !plan.customer?.phone || !waConfig}
                          onClick={() => sendReminder(plan)}
                        >
                          {sendingIds.has(plan.id) ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          {!sendingIds.has(plan.id) && "Kirim"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengaturan Reminder Otomatis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Aktifkan Reminder Otomatis</p>
                  <p className="text-xs text-muted-foreground">Sistem akan otomatis mengirim reminder sesuai jadwal</p>
                </div>
                <Switch checked={isAutoEnabled} onCheckedChange={setIsAutoEnabled} />
              </div>
              <div className="space-y-2">
                <Label>Kirim Reminder H- (hari sebelum jatuh tempo)</Label>
                <Select value={reminderDays.toString()} onValueChange={v => setReminderDays(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7, 14].map(d => (
                      <SelectItem key={d} value={d.toString()}>{d} hari sebelum</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveSettings}><CheckCircle2 className="h-4 w-4 mr-1" />Simpan Pengaturan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Pesan Reminder</CardTitle>
              <CardDescription>Edit pesan yang dikirim ke jamaah sebagai pengingat cicilan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={template} onChange={e => setTemplate(e.target.value)} rows={15} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                Variabel: {"{nama}"}, {"{hari}"}, {"{tanggal_jatuh_tempo}"}, {"{jumlah_cicilan}"}, {"{total_terkumpul}"}, {"{target}"}, {"{progress}"}
              </p>
              <div className="flex gap-2">
                <Button onClick={saveSettings}><CheckCircle2 className="h-4 w-4 mr-1" />Simpan Template</Button>
                <Button variant="outline" onClick={() => setTemplate(DEFAULT_TEMPLATE)}>Reset Default</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
