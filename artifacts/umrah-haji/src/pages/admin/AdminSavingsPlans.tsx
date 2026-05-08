import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { useWhatsAppNotifier } from "@/hooks/useWhatsAppNotifier";
import { toast } from "sonner";
import {
  Wallet, Plus, Search, TrendingUp, CheckCircle, Clock,
  Eye, CreditCard, DollarSign, XCircle, Users, CalendarDays,
  ArrowRight, AlertCircle, Receipt, UserPlus, BanknoteIcon, Bell, Send
} from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────
const TENOR_OPTIONS = [6, 12, 18, 24, 36];

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    dp_paid: { label: "Menunggu DP", cls: "bg-yellow-100 text-yellow-800" },
    active:  { label: "Aktif",        cls: "bg-blue-100 text-blue-800"   },
    completed:{ label: "Lunas",       cls: "bg-green-100 text-green-800" },
    cancelled:{ label: "Dibatalkan",  cls: "bg-red-100 text-red-800"     },
    converted:{ label: "Dikonversi",  cls: "bg-purple-100 text-purple-800"},
  };
  const item = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge className={item.cls + " border-0"}>{item.label}</Badge>;
};

const payBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Menunggu",   cls: "bg-yellow-100 text-yellow-800" },
    verified: { label: "Diterima",   cls: "bg-green-100 text-green-800"  },
    rejected: { label: "Ditolak",    cls: "bg-red-100 text-red-800"      },
    paid:     { label: "Diterima",   cls: "bg-green-100 text-green-800"  },
  };
  const item = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge className={item.cls + " border-0"}>{item.label}</Badge>;
};

// ─── component ─────────────────────────────────────────────────────────────
export default function AdminSavingsPlans() {
  const queryClient = useQueryClient();
  const wa = useWhatsAppNotifier();

  // bulk reminder state
  const [sendingReminders, setSendingReminders] = useState(false);

  // list state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // detail dialog
  const [detailPlan, setDetailPlan] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingVerify, setPendingVerify] = useState<any>(null);
  const [verifyAction, setVerifyAction] = useState<"verify" | "reject">("verify");

  // manual payment dialog
  const [manualPayPlan, setManualPayPlan] = useState<any>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualMethod, setManualMethod] = useState("cash");
  const [manualNote, setManualNote] = useState("");

  // conversion dialog
  const [convPlan, setConvPlan] = useState<any>(null);
  const [convDepartureId, setConvDepartureId] = useState("");

  // enrollment dialog
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollCustomerSearch, setEnrollCustomerSearch] = useState("");
  const [enrollCustomerId, setEnrollCustomerId] = useState("");
  const [enrollPackageId, setEnrollPackageId] = useState("");
  const [enrollTenor, setEnrollTenor] = useState(12);
  const [enrollDp, setEnrollDp] = useState(0);

  // ── queries ───────────────────────────────────────────────────────────────
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-savings-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_plans")
        .select(`*, customer:customers(id, full_name, phone, email), package:packages(id, name, code)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: detailPayments = [], isLoading: loadingDetailPay } = useQuery({
    queryKey: ["savings-payments-detail", detailPlan?.id],
    enabled: !!detailPlan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_payments")
        .select("*")
        .eq("savings_plan_id", detailPlan.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["savings-payments-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_payments")
        .select(`*, savings_plan:savings_plans(id, customer:customers(full_name, phone), package:packages(name))`)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: convDepartures = [] } = useQuery({
    queryKey: ["departures-for-conv", convPlan?.package_id],
    enabled: !!convPlan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, return_date")
        .eq("package_id", convPlan.package_id)
        .eq("status", "open")
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers-for-enroll"],
    enabled: enrollOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, phone, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: savingsPackages = [] } = useQuery({
    queryKey: ["packages-savings"],
    enabled: enrollOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, code, savings_target")
        .eq("is_active", true)
        .gt("savings_target", 0)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    plans.length,
    active:   plans.filter((p: any) => p.status === "active").length,
    completed:plans.filter((p: any) => p.status === "completed").length,
    totalPaid:plans.reduce((s: number, p: any) => s + (p.paid_amount || 0), 0),
    pending:  pendingPayments.length,
  }), [plans, pendingPayments]);

  const filtered = useMemo(() => plans.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.customer?.full_name?.toLowerCase().includes(q) ||
        p.package?.name?.toLowerCase().includes(q) ||
        p.customer?.phone?.includes(q)
      );
    }
    return true;
  }), [plans, statusFilter, search]);

  // ── mutations ─────────────────────────────────────────────────────────────

  // ── helpers: format bank info for WA ────────────────────────────────────
  const bankInfoString = useMemo(() =>
    bankAccounts.length > 0
      ? bankAccounts.map((b: any) => `${b.bank_name}: ${b.account_number} (${b.account_name})`).join(" | ")
      : "Hubungi admin untuk info rekening",
  [bankAccounts]);

  // ── send per-plan reminder ────────────────────────────────────────────────
  const sendPlanReminder = async (plan: any) => {
    const phone = plan.customer?.phone;
    if (!phone) { toast.error("Nomor HP jamaah tidak tersedia"); return; }
    if (!wa.isReady) { toast.error("Konfigurasi WhatsApp belum aktif"); return; }
    const targetDate = plan.target_date
      ? new Date(plan.target_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    await wa.sendSavingsReminder(phone, {
      nama: plan.customer?.full_name ?? "Jamaah",
      nama_paket: plan.package?.name ?? "-",
      jumlah_cicilan: formatCurrency(plan.monthly_amount),
      total_terkumpul: formatCurrency(plan.paid_amount || 0),
      target: formatCurrency(plan.target_amount),
      target_date: targetDate,
      info_rekening: bankInfoString,
    });
    toast.success(`📲 Pengingat dikirim ke ${plan.customer?.full_name}`);
  };

  // ── bulk reminder for all active plans ───────────────────────────────────
  const sendBulkReminders = async () => {
    const activePlans = plans.filter((p: any) => p.status === "active" && p.customer?.phone);
    if (activePlans.length === 0) { toast.error("Tidak ada tabungan aktif dengan nomor HP"); return; }
    if (!wa.isReady) { toast.error("Konfigurasi WhatsApp belum aktif"); return; }
    setSendingReminders(true);
    let ok = 0, fail = 0;
    for (const plan of activePlans) {
      const targetDate = plan.target_date
        ? new Date(plan.target_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "-";
      const sent = await wa.sendSavingsReminder(plan.customer.phone ?? "", {
        nama: plan.customer?.full_name ?? "Jamaah",
        nama_paket: plan.package?.name ?? "-",
        jumlah_cicilan: formatCurrency(plan.monthly_amount),
        total_terkumpul: formatCurrency(plan.paid_amount || 0),
        target: formatCurrency(plan.target_amount),
        target_date: targetDate,
        info_rekening: bankInfoString,
      });
      if (sent) ok++; else fail++;
      await new Promise(r => setTimeout(r, 800));
    }
    setSendingReminders(false);
    toast.success(`📲 Pengingat terkirim: ${ok} berhasil${fail > 0 ? `, ${fail} gagal` : ""}`);
  };

  const verifyPayMutation = useMutation({
    mutationFn: async () => {
      if (!pendingVerify) return null;
      const isVerify = verifyAction === "verify";
      const { error } = await supabase
        .from("savings_payments")
        .update({
          status: isVerify ? "verified" : "rejected",
          verified_at: new Date().toISOString(),
          notes: rejectReason || null,
        } as any)
        .eq("id", pendingVerify.id);
      if (error) throw error;

      let newPaid = 0;
      let isCompleted = false;
      if (isVerify) {
        const planId = pendingVerify.savings_plan_id ?? pendingVerify.savings_plan?.id;
        const { data: plan } = await supabase
          .from("savings_plans")
          .select("paid_amount, target_amount")
          .eq("id", planId)
          .single();
        if (plan) {
          newPaid = (plan.paid_amount ?? 0) + pendingVerify.amount;
          isCompleted = newPaid >= plan.target_amount;
          await supabase
            .from("savings_plans")
            .update({ paid_amount: newPaid, status: isCompleted ? "completed" : "active" })
            .eq("id", planId);
        }
      }
      return { isVerify, newPaid, isCompleted };
    },
    onSuccess: async (result) => {
      toast.success(verifyAction === "verify" ? "✅ Pembayaran diterima" : "Pembayaran ditolak");
      queryClient.invalidateQueries({ queryKey: ["admin-savings-plans"] });
      queryClient.invalidateQueries({ queryKey: ["savings-payments-pending"] });
      queryClient.invalidateQueries({ queryKey: ["savings-payments-detail", detailPlan?.id] });

      // ── Auto WA ──
      if (result && wa.isReady) {
        const phone = pendingVerify?.savings_plan?.customer?.phone ?? "";
        const nama = pendingVerify?.savings_plan?.customer?.full_name ?? "Jamaah";
        const nama_paket = pendingVerify?.savings_plan?.package?.name ?? "-";
        const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const jumlah = formatCurrency(pendingVerify?.amount ?? 0);

        if (result.isVerify) {
          const planId = pendingVerify?.savings_plan_id ?? pendingVerify?.savings_plan?.id;
          const planData = plans.find((p: any) => p.id === planId);
          const target = formatCurrency(planData?.target_amount ?? 0);
          const sisa = formatCurrency(Math.max(0, (planData?.target_amount ?? 0) - result.newPaid));
          if (result.isCompleted) {
            await wa.sendSavingsLunas(phone, { nama, nama_paket, total_terkumpul: formatCurrency(result.newPaid), tanggal });
          } else {
            await wa.sendSavingsCicilanDiterima(phone, {
              nama, nama_paket, jumlah_cicilan: jumlah, tanggal,
              total_terkumpul: formatCurrency(result.newPaid), target, sisa,
            });
          }
        } else {
          await wa.sendSavingsCicilanDitolak(phone, {
            nama, nama_paket, jumlah_cicilan: jumlah, tanggal, alasan: rejectReason || "Bukti tidak valid",
          });
        }
      }

      setPendingVerify(null);
      setRejectReason("");
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  const manualPayMutation = useMutation({
    mutationFn: async () => {
      if (!manualPayPlan || !manualAmount) throw new Error("Data tidak lengkap");
      const amount = parseFloat(manualAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Jumlah tidak valid");
      const code = `SAV${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("savings_payments").insert({
        savings_plan_id: manualPayPlan.id,
        amount,
        payment_code: code,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: manualMethod,
        status: "verified",
        verified_at: new Date().toISOString(),
        notes: manualNote || null,
      } as any);
      if (error) throw error;
      const newPaid = (manualPayPlan.paid_amount || 0) + amount;
      const isCompleted = newPaid >= manualPayPlan.target_amount;
      await supabase
        .from("savings_plans")
        .update({ paid_amount: newPaid, status: isCompleted ? "completed" : "active" })
        .eq("id", manualPayPlan.id);
      return { amount, newPaid, isCompleted };
    },
    onSuccess: async (result) => {
      toast.success("✅ Pembayaran berhasil dicatat");
      queryClient.invalidateQueries({ queryKey: ["admin-savings-plans"] });
      queryClient.invalidateQueries({ queryKey: ["savings-payments-detail", manualPayPlan?.id] });

      // ── Auto WA ──
      if (result && wa.isReady && manualPayPlan?.customer?.phone) {
        const phone = manualPayPlan.customer.phone;
        const nama = manualPayPlan.customer.full_name ?? "Jamaah";
        const nama_paket = manualPayPlan.package?.name ?? "-";
        const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        if (result.isCompleted) {
          await wa.sendSavingsLunas(phone, { nama, nama_paket, total_terkumpul: formatCurrency(result.newPaid), tanggal });
        } else {
          await wa.sendSavingsCicilanDiterima(phone, {
            nama, nama_paket, jumlah_cicilan: formatCurrency(result.amount), tanggal,
            total_terkumpul: formatCurrency(result.newPaid),
            target: formatCurrency(manualPayPlan.target_amount),
            sisa: formatCurrency(Math.max(0, manualPayPlan.target_amount - result.newPaid)),
          });
        }
      }

      setManualPayPlan(null); setManualAmount(""); setManualNote(""); setManualMethod("cash");
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!convPlan || !convDepartureId) throw new Error("Pilih jadwal keberangkatan");
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          customer_id: convPlan.customer_id,
          departure_id: convDepartureId,
          room_type: "quad",
          total_pax: 1,
          base_price: convPlan.target_amount,
          total_price: convPlan.target_amount,
          paid_amount: convPlan.paid_amount,
          booking_status: "confirmed",
          payment_status: convPlan.paid_amount >= convPlan.target_amount ? "paid" : "partial",
          notes: `Konversi dari tabungan ${convPlan.package?.name}`,
        })
        .select()
        .single();
      if (bErr) throw bErr;
      // Create booking_passengers entry
      await supabase.from("booking_passengers").insert({
        booking_id: booking.id,
        customer_id: convPlan.customer_id,
        passenger_type: "adult",
        room_preference: "quad",
      } as any);
      // Mark plan converted
      await supabase
        .from("savings_plans")
        .update({ status: "converted", converted_booking_id: booking.id } as any)
        .eq("id", convPlan.id);
    },
    onSuccess: () => {
      toast.success("✅ Tabungan berhasil dikonversi menjadi booking");
      queryClient.invalidateQueries({ queryKey: ["admin-savings-plans"] });
      setConvPlan(null); setConvDepartureId("");
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!enrollCustomerId || !enrollPackageId) throw new Error("Pilih jamaah dan paket");
      const pkg = savingsPackages.find((p: any) => p.id === enrollPackageId) as any;
      if (!pkg || !pkg.savings_target) throw new Error("Paket tidak memiliki target tabungan");
      const targetAmount = pkg.savings_target;
      const monthlyAmount = Math.ceil((targetAmount - enrollDp) / enrollTenor);
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + enrollTenor);
      const { error } = await supabase.from("savings_plans").insert({
        customer_id: enrollCustomerId,
        package_id: enrollPackageId,
        target_amount: targetAmount,
        monthly_amount: monthlyAmount,
        tenor_months: enrollTenor,
        target_date: targetDate.toISOString().split("T")[0],
        paid_amount: enrollDp,
        dp_amount: enrollDp > 0 ? enrollDp : null,
        dp_status: enrollDp > 0 ? "verified" : null,
        status: "active",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Tabungan berhasil didaftarkan");
      queryClient.invalidateQueries({ queryKey: ["admin-savings-plans"] });
      setEnrollOpen(false);
      setEnrollCustomerId(""); setEnrollPackageId(""); setEnrollTenor(12); setEnrollDp(0);
      setEnrollCustomerSearch("");
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  // ── derived for enroll preview ────────────────────────────────────────────
  const enrollPkg = savingsPackages.find((p: any) => p.id === enrollPackageId) as any;
  const enrollTarget = enrollPkg?.savings_target ?? 0;
  const enrollMonthly = enrollTarget > 0 ? Math.ceil((enrollTarget - enrollDp) / enrollTenor) : 0;
  const filteredCustomers = allCustomers.filter((c: any) =>
    !enrollCustomerSearch ||
    c.full_name?.toLowerCase().includes(enrollCustomerSearch.toLowerCase()) ||
    c.phone?.includes(enrollCustomerSearch)
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tabungan Umroh</h1>
          <p className="text-muted-foreground text-sm">Kelola rencana tabungan & pembayaran jamaah</p>
        </div>
        <Button onClick={() => setEnrollOpen(true)} className="gap-2 self-start sm:self-auto">
          <UserPlus className="h-4 w-4" /> Daftarkan Jamaah
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: <Wallet className="h-5 w-5 text-muted-foreground" /> },
          { label: "Aktif", value: stats.active, icon: <Clock className="h-5 w-5 text-blue-500" />, cls: "text-blue-600" },
          { label: "Lunas", value: stats.completed, icon: <CheckCircle className="h-5 w-5 text-green-500" />, cls: "text-green-600" },
          { label: "Dana Terkumpul", value: formatCurrency(stats.totalPaid), icon: <TrendingUp className="h-5 w-5 text-orange-500" />, cls: "text-orange-600 text-base" },
          { label: "Perlu Verifikasi", value: stats.pending, icon: <AlertCircle className="h-5 w-5 text-yellow-500" />, cls: "text-yellow-600" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className={`font-bold text-xl leading-tight ${s.cls ?? ""}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans"><Wallet className="h-4 w-4 mr-1.5" />Rencana Tabungan</TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-1.5" />
            Perlu Verifikasi
            {stats.pending > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">{stats.pending}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Plans ── */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama, paket, HP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="completed">Lunas</SelectItem>
                <SelectItem value="dp_paid">Menunggu DP</SelectItem>
                <SelectItem value="converted">Dikonversi</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-2 text-green-700 border-green-300 hover:bg-green-50 shrink-0"
              onClick={sendBulkReminders}
              disabled={sendingReminders || !wa.isReady}
              title={!wa.isReady ? "Konfigurasi WhatsApp belum aktif" : "Kirim pengingat ke semua tabungan aktif"}
            >
              {sendingReminders
                ? <><Clock className="h-4 w-4 animate-spin" /> Mengirim...</>
                : <><Send className="h-4 w-4" /> Kirim Semua Pengingat</>
              }
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Tidak ada tabungan ditemukan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jamaah</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Tenor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((plan: any) => {
                        const pct = plan.target_amount > 0 ? ((plan.paid_amount || 0) / plan.target_amount) * 100 : 0;
                        return (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <p className="font-medium">{plan.customer?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{plan.customer?.phone}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{plan.package?.name}</p>
                              <p className="text-xs text-muted-foreground">{plan.package?.code}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-bold">{formatCurrency(plan.target_amount)}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(plan.monthly_amount)}/bln</p>
                            </TableCell>
                            <TableCell>
                              <div className="w-28 space-y-1">
                                <Progress value={pct} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(plan.paid_amount || 0)} ({pct.toFixed(0)}%)
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p>{plan.tenor_months} bln</p>
                              <p className="text-xs text-muted-foreground">{formatDate(plan.target_date)}</p>
                            </TableCell>
                            <TableCell>{statusBadge(plan.status ?? "")}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1.5 flex-wrap">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                  onClick={() => { setDetailPlan(plan); }}>
                                  <Eye className="h-3.5 w-3.5" /> Detail
                                </Button>
                                {plan.status === "active" && (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                      onClick={() => { setManualPayPlan(plan); setManualAmount(String(plan.monthly_amount || "")); }}>
                                      <DollarSign className="h-3.5 w-3.5" /> Bayar
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                      onClick={() => sendPlanReminder(plan)}
                                      title="Kirim pengingat cicilan via WhatsApp">
                                      <Bell className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {plan.status === "completed" && (
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => { setConvPlan(plan); }}>
                                    <ArrowRight className="h-3.5 w-3.5" /> Konversi
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Pending Verification ── */}
        <TabsContent value="pending" className="space-y-4">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
                <p>Tidak ada pembayaran yang menunggu verifikasi.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingPayments.map((pay: any) => (
                <Card key={pay.id} className="border-yellow-200 bg-yellow-50/40 dark:bg-yellow-950/10">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Receipt className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">{pay.savings_plan?.customer?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{pay.savings_plan?.package?.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pay.payment_code} · {pay.payment_date ? formatDate(pay.payment_date) : "-"}
                            {pay.payment_method && ` · ${pay.payment_method}`}
                          </p>
                          {pay.notes && <p className="text-xs text-muted-foreground italic">"{pay.notes}"</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">{formatCurrency(pay.amount)}</p>
                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 gap-1"
                          onClick={() => { setPendingVerify(pay); setVerifyAction("verify"); setRejectReason(""); }}>
                          <CheckCircle className="h-3.5 w-3.5" /> Terima
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 gap-1"
                          onClick={() => { setPendingVerify(pay); setVerifyAction("reject"); setRejectReason(""); }}>
                          <XCircle className="h-3.5 w-3.5" /> Tolak
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailPlan} onOpenChange={open => { if (!open) setDetailPlan(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Tabungan</DialogTitle>
          </DialogHeader>
          {detailPlan && (
            <div className="space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg text-sm">
                <div><p className="text-muted-foreground">Jamaah</p><p className="font-semibold">{detailPlan.customer?.full_name}</p></div>
                <div><p className="text-muted-foreground">Paket</p><p className="font-semibold">{detailPlan.package?.name}</p></div>
                <div><p className="text-muted-foreground">Target</p><p className="font-bold text-lg">{formatCurrency(detailPlan.target_amount)}</p></div>
                <div><p className="text-muted-foreground">Terkumpul</p><p className="font-bold text-lg text-green-600">{formatCurrency(detailPlan.paid_amount || 0)}</p></div>
                <div><p className="text-muted-foreground">Cicilan/Bulan</p><p className="font-semibold">{formatCurrency(detailPlan.monthly_amount)}</p></div>
                <div><p className="text-muted-foreground">Tenor</p><p className="font-semibold">{detailPlan.tenor_months} bulan</p></div>
                <div><p className="text-muted-foreground">Target Lunas</p><p className="font-semibold">{formatDate(detailPlan.target_date)}</p></div>
                <div><p className="text-muted-foreground">Status</p>{statusBadge(detailPlan.status ?? "")}</div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>Progress</span>
                  <span className="font-semibold">
                    {detailPlan.target_amount > 0 ? (((detailPlan.paid_amount || 0) / detailPlan.target_amount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <Progress value={detailPlan.target_amount > 0 ? ((detailPlan.paid_amount || 0) / detailPlan.target_amount) * 100 : 0} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  Sisa: {formatCurrency(Math.max(0, detailPlan.target_amount - (detailPlan.paid_amount || 0)))}
                </p>
              </div>

              {/* Bank accounts info */}
              {bankAccounts.length > 0 && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm">
                  <p className="font-semibold flex items-center gap-1.5 mb-2">
                    <BanknoteIcon className="h-4 w-4 text-blue-600" /> Rekening Pembayaran
                  </p>
                  {bankAccounts.map((b: any) => (
                    <div key={b.id} className="flex gap-4">
                      <p className="text-muted-foreground w-24">{b.bank_name}</p>
                      <p className="font-mono font-semibold">{b.account_number}</p>
                      <p>{b.account_name}</p>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Payment history */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4" /> Riwayat Pembayaran
                </h3>
                {loadingDetailPay ? (
                  <Skeleton className="h-24" />
                ) : detailPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Belum ada pembayaran.</p>
                ) : (
                  <div className="space-y-2">
                    {detailPayments.map((pay: any) => (
                      <div key={pay.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{pay.payment_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {pay.payment_date ? formatDate(pay.payment_date) : "-"} · {pay.payment_method || "Transfer"}
                          </p>
                          {pay.notes && <p className="text-xs text-muted-foreground italic">"{pay.notes}"</p>}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold">{formatCurrency(pay.amount)}</p>
                          {payBadge(pay.status ?? "")}
                          {(pay.status === "pending") && (
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => { setPendingVerify(pay); setVerifyAction("verify"); setRejectReason(""); }}>
                                Terima
                              </Button>
                              <Button size="sm" variant="destructive" className="h-6 text-xs"
                                onClick={() => { setPendingVerify(pay); setVerifyAction("reject"); setRejectReason(""); }}>
                                Tolak
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailPlan?.status === "active" && (
              <Button variant="outline" onClick={() => { setManualPayPlan(detailPlan); setManualAmount(String(detailPlan.monthly_amount || "")); setDetailPlan(null); }}>
                <DollarSign className="h-4 w-4 mr-1" /> Catat Pembayaran
              </Button>
            )}
            {detailPlan?.status === "completed" && (
              <Button className="bg-green-600 hover:bg-green-700"
                onClick={() => { setConvPlan(detailPlan); setDetailPlan(null); }}>
                <ArrowRight className="h-4 w-4 mr-1" /> Konversi ke Booking
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Verify/Reject Confirm Dialog ── */}
      <Dialog open={!!pendingVerify} onOpenChange={open => { if (!open) { setPendingVerify(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{verifyAction === "verify" ? "Terima Pembayaran" : "Tolak Pembayaran"}</DialogTitle>
          </DialogHeader>
          {pendingVerify && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><strong>Jamaah:</strong> {pendingVerify.savings_plan?.customer?.full_name ?? "-"}</p>
                <p><strong>Jumlah:</strong> {formatCurrency(pendingVerify.amount)}</p>
                <p><strong>Kode:</strong> {pendingVerify.payment_code}</p>
              </div>
              {verifyAction === "reject" && (
                <div className="space-y-2">
                  <Label>Alasan Penolakan</Label>
                  <Textarea
                    placeholder="Tuliskan alasan penolakan..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingVerify(null)}>Batal</Button>
            <Button
              onClick={() => verifyPayMutation.mutate()}
              disabled={verifyPayMutation.isPending || (verifyAction === "reject" && !rejectReason)}
              className={verifyAction === "verify" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {verifyPayMutation.isPending ? "Menyimpan..." : verifyAction === "verify" ? "✅ Konfirmasi Terima" : "❌ Tolak Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Payment Dialog ── */}
      <Dialog open={!!manualPayPlan} onOpenChange={open => { if (!open) { setManualPayPlan(null); setManualAmount(""); setManualNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Manual</DialogTitle>
          </DialogHeader>
          {manualPayPlan && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-semibold">{manualPayPlan.customer?.full_name}</p>
                <p className="text-muted-foreground">Cicilan disarankan: <strong>{formatCurrency(manualPayPlan.monthly_amount)}</strong></p>
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah (Rp)</Label>
                <Input
                  type="number"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                  placeholder="Masukkan jumlah"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {[manualPayPlan.monthly_amount, manualPayPlan.monthly_amount * 2, manualPayPlan.monthly_amount * 3].map(v => (
                    <button key={v} type="button" className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 border"
                      onClick={() => setManualAmount(String(v))}>
                      {formatCurrency(v)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Metode</Label>
                <Select value={manualMethod} onValueChange={setManualMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan (opsional)</Label>
                <Input value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="Misal: Cicilan bulan Mei" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManualPayPlan(null)}>Batal</Button>
            <Button onClick={() => manualPayMutation.mutate()} disabled={manualPayMutation.isPending || !manualAmount}>
              {manualPayMutation.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Conversion Dialog ── */}
      <Dialog open={!!convPlan} onOpenChange={open => { if (!open) { setConvPlan(null); setConvDepartureId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konversi ke Booking</DialogTitle>
          </DialogHeader>
          {convPlan && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-sm">
                <p className="font-semibold">{convPlan.customer?.full_name}</p>
                <p className="text-muted-foreground">{convPlan.package?.name}</p>
                <p className="text-green-700 font-semibold mt-1">Total lunas: {formatCurrency(convPlan.paid_amount || 0)}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Pilih Jadwal Keberangkatan</Label>
                <Select value={convDepartureId} onValueChange={setConvDepartureId}>
                  <SelectTrigger>
                    <SelectValue placeholder={convDepartures.length === 0 ? "Tidak ada jadwal tersedia" : "Pilih jadwal..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {convDepartures.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {formatDate(d.departure_date)} — {formatDate(d.return_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConvPlan(null)}>Batal</Button>
            <Button
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending || !convDepartureId}
              className="bg-green-600 hover:bg-green-700"
            >
              {convertMutation.isPending ? "Memproses..." : "✅ Buat Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Enrollment Dialog ── */}
      <Dialog open={enrollOpen} onOpenChange={open => { setEnrollOpen(open); if (!open) { setEnrollCustomerId(""); setEnrollPackageId(""); setEnrollTenor(12); setEnrollDp(0); setEnrollCustomerSearch(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Daftarkan Tabungan Jamaah</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer search */}
            <div className="space-y-1.5">
              <Label>Pilih Jamaah</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau HP..."
                  value={enrollCustomerSearch}
                  onChange={e => { setEnrollCustomerSearch(e.target.value); setEnrollCustomerId(""); }}
                  className="pl-9"
                />
              </div>
              {enrollCustomerSearch && !enrollCustomerId && (
                <ScrollArea className="h-40 border rounded-lg">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">Tidak ditemukan</p>
                  ) : (
                    <div className="p-1">
                      {filteredCustomers.slice(0, 10).map((c: any) => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md"
                          onClick={() => { setEnrollCustomerId(c.id); setEnrollCustomerSearch(c.full_name); }}>
                          <p className="font-medium">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
              {enrollCustomerId && (
                <p className="text-xs text-green-600">✅ {filteredCustomers.find((c: any) => c.id === enrollCustomerId)?.full_name ?? enrollCustomerSearch} dipilih</p>
              )}
            </div>

            {/* Package */}
            <div className="space-y-1.5">
              <Label>Paket Tabungan</Label>
              <Select value={enrollPackageId} onValueChange={setEnrollPackageId}>
                <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
                <SelectContent>
                  {savingsPackages.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.savings_target)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tenor */}
            <div className="space-y-1.5">
              <Label>Tenor</Label>
              <div className="flex gap-2">
                {TENOR_OPTIONS.map(t => (
                  <button key={t} type="button"
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${enrollTenor === t ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"}`}
                    onClick={() => setEnrollTenor(t)}>
                    {t} bln
                  </button>
                ))}
              </div>
            </div>

            {/* DP */}
            <div className="space-y-1.5">
              <Label>Down Payment (Rp) — opsional</Label>
              <Input type="number" value={enrollDp || ""} onChange={e => setEnrollDp(Number(e.target.value) || 0)} placeholder="0" />
              {enrollTarget > 0 && (
                <div className="flex gap-1.5">
                  {[0.1, 0.2, 0.25, 0.3].map(pct => (
                    <button key={pct} type="button"
                      className="text-xs px-2 py-1 rounded bg-muted border hover:bg-muted/80"
                      onClick={() => setEnrollDp(Math.round(enrollTarget * pct))}>
                      {(pct * 100).toFixed(0)}% = {formatCurrency(Math.round(enrollTarget * pct))}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            {enrollTarget > 0 && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Target</span><span className="font-semibold">{formatCurrency(enrollTarget)}</span>
                <span className="text-muted-foreground">Cicilan/Bulan</span><span className="font-bold text-primary text-base">{formatCurrency(enrollMonthly)}</span>
                <span className="text-muted-foreground">Tenor</span><span className="font-semibold">{enrollTenor} bulan</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Batal</Button>
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending || !enrollCustomerId || !enrollPackageId}
            >
              {enrollMutation.isPending ? "Menyimpan..." : "Daftarkan Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
