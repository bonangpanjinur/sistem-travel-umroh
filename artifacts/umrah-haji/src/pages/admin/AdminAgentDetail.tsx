import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import {
  ArrowLeft, User, Building2, Phone, Mail, MapPin, CreditCard,
  TrendingUp, Users, DollarSign, BookOpen, ShieldOff, ShieldCheck,
  KeyRound, RefreshCw, Network, CheckCircle2, XCircle, Clock, BarChart3,
  Pencil, Save, X as XIcon, Percent, ImageIcon, BadgeCheck, ExternalLink,
  Wallet, Send, Eye, Link as LinkIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const API_BASE = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("sb-access-token") ||
    (() => { try { return JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").access_token; } catch { return null; } })();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request gagal");
  }
  return res.json();
}

const STATUS_COLOR: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-800",
  pending:   "bg-amber-100 text-amber-800",
  suspended: "bg-red-100 text-red-800",
  inactive:  "bg-gray-100 text-gray-800",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Aktif", pending: "Menunggu", suspended: "Ditangguhkan", inactive: "Nonaktif",
};

const COMMISSION_STATUS_COLOR: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  paid:     "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminAgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [suspendConfirm, setSuspendConfirm] = useState(false);
  const [activateConfirm, setActivateConfirm] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  // Override commission state
  const [editingOverride, setEditingOverride] = useState<string | null>(null);
  const [overridePct, setOverridePct] = useState<string>("");

  // Wallet/withdrawal state
  const [proofDialog, setProofDialog] = useState<{ id: string; amount: number } | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [rejectWdId, setRejectWdId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-agent-detail", id],
    queryFn: () => apiFetch(`/agents/${id}`),
    enabled: !!id,
  });

  const agent = data?.agent;
  const subAgents: any[] = data?.sub_agents ?? [];
  const bookings: any[] = data?.bookings ?? [];
  const commissions: any[] = data?.commissions ?? [];
  const stats = data?.stats;

  // Override commissions query
  const { data: overrideRows, refetch: refetchOverrides } = useQuery({
    queryKey: ["agent-override-commissions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_override_commissions" as any)
        .select("*")
        .eq("parent_agent_id", id as string);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!id,
  });

  const overrideMap = useMemo(() => {
    const m: Record<string, number> = {};
    (overrideRows ?? []).forEach((r: any) => {
      m[r.sub_agent_id] = r.override_percentage ?? 0;
    });
    return m;
  }, [overrideRows]);

  const saveOverrideMutation = useMutation({
    mutationFn: async ({ subAgentId, pct }: { subAgentId: string; pct: number }) => {
      const existing = (overrideRows ?? []).find((r: any) => r.sub_agent_id === subAgentId);
      if (existing) {
        const { error } = await supabase
          .from("agent_override_commissions" as any)
          .update({ override_percentage: pct, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agent_override_commissions" as any)
          .insert({ parent_agent_id: id, sub_agent_id: subAgentId, override_percentage: pct });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Override komisi berhasil disimpan");
      setEditingOverride(null);
      refetchOverrides();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (subAgentId: string) => {
      const existing = (overrideRows ?? []).find((r: any) => r.sub_agent_id === subAgentId);
      if (!existing) return;
      const { error } = await supabase
        .from("agent_override_commissions" as any)
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Override dihapus");
      refetchOverrides();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Withdrawal requests query
  const { data: withdrawals = [], refetch: refetchWithdrawals } = useQuery({
    queryKey: ["agent-withdrawals-admin", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("withdrawal_requests")
        .select("*")
        .eq("agent_id", agent?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agent?.id,
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async ({ wdId, proof, notes }: { wdId: string; proof: string; notes: string }) => {
      const { error } = await (supabase as any)
        .from("withdrawal_requests")
        .update({
          status: "processed",
          proof_url: proof || null,
          notes: notes || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", wdId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penarikan ditandai sebagai lunas");
      setProofDialog(null);
      setProofUrl("");
      setProofNotes("");
      refetchWithdrawals();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (wdId: string) => {
      const { error } = await (supabase as any)
        .from("withdrawal_requests")
        .update({ status: "rejected", processed_at: new Date().toISOString() })
        .eq("id", wdId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permintaan penarikan ditolak");
      setRejectWdId(null);
      refetchWithdrawals();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const WD_STATUS: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Menunggu",  cls: "bg-amber-100 text-amber-800" },
    approved:  { label: "Disetujui", cls: "bg-blue-100 text-blue-800" },
    processed: { label: "Lunas",     cls: "bg-emerald-100 text-emerald-800" },
    rejected:  { label: "Ditolak",   cls: "bg-red-100 text-red-800" },
  };

  const pendingWdCount = (withdrawals as any[]).filter((w: any) => w.status === "pending").length;

  const perfData = useMemo(() => {
    const months: { key: string; bulan: string; booking: number; revenue: number; komisi: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({
        key: format(d, "yyyy-MM"),
        bulan: format(d, "MMM yy", { locale: localeId }),
        booking: 0, revenue: 0, komisi: 0,
      });
    }
    bookings.forEach((b: any) => {
      if (!b.created_at) return;
      const key = b.created_at.slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) { m.booking++; m.revenue += Number(b.total_price || 0); }
    });
    commissions.forEach((c: any) => {
      if (!c.created_at) return;
      const key = c.created_at.slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) m.komisi += Number(c.commission_amount || 0);
    });
    return months;
  }, [bookings, commissions]);

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/agents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success("Status agen berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-agent-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
      setSuspendConfirm(false);
      setActivateConfirm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPassMutation = useMutation({
    mutationFn: (newPass: string) =>
      apiFetch(`/agents/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: newPass || undefined }) }),
    onSuccess: (data) => {
      toast.success(`Password berhasil direset. Password baru: ${data.tempPassword}`);
      setResetPassOpen(false);
      setNewPassword("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: (subId: string) =>
      apiFetch(`/agents/${subId}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Sub-agen berhasil diapprove dan akun dibuat");
      queryClient.invalidateQueries({ queryKey: ["admin-agent-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
      setApproveConfirm(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (subId: string) =>
      apiFetch(`/agents/${subId}/reject`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Sub-agen ditolak");
      queryClient.invalidateQueries({ queryKey: ["admin-agent-detail", id] });
      setRejectConfirm(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-6 text-center text-destructive">
        {(error as any)?.message ?? "Agen tidak ditemukan."}
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/admin/agents")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
          </Button>
        </div>
      </div>
    );
  }

  const isSuspended = agent.status === "suspended";
  const isPending = agent.status === "pending";

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{agent.company_name || agent.contact_name}</h1>
              <Badge className={STATUS_COLOR[agent.status] ?? "bg-gray-100 text-gray-800"}>
                {STATUS_LABEL[agent.status] ?? agent.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {agent.agent_code}
              {agent.branch_name && <span> · Cabang {agent.branch_name}</span>}
              {agent.parent_agent_code && <span> · Sub-Agen dari {agent.parent_company_name || agent.parent_agent_code}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setResetPassOpen(true)}>
            <KeyRound className="h-4 w-4 mr-1" /> Reset Password
          </Button>
          {isSuspended ? (
            <Button variant="default" size="sm" onClick={() => setActivateConfirm(true)}
              className="bg-emerald-600 hover:bg-emerald-700">
              <ShieldCheck className="h-4 w-4 mr-1" /> Aktifkan
            </Button>
          ) : !isPending ? (
            <Button variant="destructive" size="sm" onClick={() => setSuspendConfirm(true)}>
              <ShieldOff className="h-4 w-4 mr-1" /> Tangguhkan
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Booking", value: stats?.total_bookings ?? 0, icon: BookOpen, color: "text-blue-600" },
          { label: "Total Revenue", value: formatCurrency(stats?.total_revenue ?? 0), icon: TrendingUp, color: "text-emerald-600" },
          { label: "Total Komisi", value: formatCurrency(stats?.total_commission ?? 0), icon: DollarSign, color: "text-amber-600" },
          { label: "Total Jamaah", value: stats?.total_jamaah ?? 0, icon: Users, color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-sm">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="bookings">Booking</TabsTrigger>
          <TabsTrigger value="commissions">Komisi</TabsTrigger>
          <TabsTrigger value="sub_agents">
            Sub-Agen {subAgents.length > 0 && `(${subAgents.length})`}
          </TabsTrigger>
          {subAgents.filter((sa) => sa.status === "active").length > 0 && (
            <TabsTrigger value="override">
              <Percent className="h-3.5 w-3.5 mr-1" />Override Komisi
            </TabsTrigger>
          )}
          <TabsTrigger value="performa">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />Performa
          </TabsTrigger>
          <TabsTrigger value="wallet" className="relative">
            <Wallet className="h-3.5 w-3.5 mr-1" />Wallet
            {pendingWdCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white font-bold">
                {pendingWdCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Info */}
        <TabsContent value="info">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Data Kontak
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { icon: User, label: "Nama", value: agent.contact_name || agent.full_name },
                  { icon: Building2, label: "Perusahaan", value: agent.company_name },
                  { icon: Mail, label: "Email", value: agent.email },
                  { icon: Phone, label: "HP", value: agent.phone || agent.profile_phone },
                  { icon: MapPin, label: "Alamat", value: agent.address },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-medium">{value || "—"}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Info Agen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Kode Agen", value: agent.agent_code },
                  { label: "Rate Komisi", value: agent.commission_rate != null ? `${agent.commission_rate}%` : "—" },
                  { label: "Status", value: STATUS_LABEL[agent.status] ?? agent.status },
                  { label: "Cabang", value: agent.branch_name ?? "Independen" },
                  { label: "Level", value: agent.level === 2 ? "Sub-Agen" : "Agen Utama" },
                  { label: "Bergabung", value: agent.created_at ? format(new Date(agent.created_at), "d MMMM yyyy", { locale: localeId }) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* KTP Verification Card */}
          {(agent.ktp_number || agent.ktp_url || agent.status === 'pending') && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Verifikasi KTP
                  </CardTitle>
                  {agent.ktp_verified_at ? (
                    <Badge className="bg-emerald-100 text-emerald-800 gap-1">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Terverifikasi {format(new Date(agent.ktp_verified_at), "d MMM yyyy", { locale: localeId })}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                      <Clock className="h-3.5 w-3.5" /> Belum Diverifikasi
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Nomor KTP / NIK</span>
                    <span className="font-mono font-semibold text-base">
                      {agent.ktp_number || "—"}
                    </span>
                  </div>
                  {agent.ktp_url && (
                    <div className="flex items-center gap-2">
                      <a
                        href={agent.ktp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lihat Foto KTP
                      </a>
                    </div>
                  )}
                </div>

                {agent.ktp_url && (
                  <div className="rounded-lg overflow-hidden border bg-muted/30 max-w-sm">
                    <img
                      src={agent.ktp_url}
                      alt="Foto KTP"
                      className="w-full object-contain max-h-48"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {!agent.ktp_verified_at && (agent.ktp_number || agent.ktp_url) && (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      try {
                        await (supabase as any)
                          .from("agents")
                          .update({ ktp_verified_at: new Date().toISOString() })
                          .eq("id", agent.id);
                        queryClient.invalidateQueries({ queryKey: ["admin-agent-detail", id] });
                        toast.success("KTP berhasil diverifikasi.");
                      } catch {
                        toast.error("Gagal verifikasi KTP.");
                      }
                    }}
                  >
                    <BadgeCheck className="h-4 w-4" /> Tandai KTP Terverifikasi
                  </Button>
                )}

                {!agent.ktp_number && !agent.ktp_url && (
                  <p className="text-sm text-muted-foreground italic">
                    Agen belum mengunggah foto atau nomor KTP saat pendaftaran.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Booking */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Riwayat Booking ({bookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada booking.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Keberangkatan</TableHead>
                      <TableHead>Jamaah</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.booking_code}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{b.package_name ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {b.departure_date ? format(new Date(b.departure_date), "d MMM yyyy", { locale: localeId }) : "—"}
                        </TableCell>
                        <TableCell>{(b.adult_count ?? 0) + (b.child_count ?? 0)}</TableCell>
                        <TableCell>{formatCurrency(b.total_price ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{b.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Komisi */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Riwayat Komisi ({commissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada komisi.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.booking_code ?? "—"}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(c.commission_amount ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${COMMISSION_STATUS_COLOR[c.status] ?? ""}`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.created_at ? format(new Date(c.created_at), "d MMM yyyy", { locale: localeId }) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Sub-Agen */}
        <TabsContent value="sub_agents">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4" /> Jaringan Sub-Agen ({subAgents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subAgents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada sub-agen.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subAgents.map((sa) => (
                      <TableRow key={sa.id}>
                        <TableCell className="font-medium">{sa.company_name || sa.contact_name || sa.full_name}</TableCell>
                        <TableCell className="font-mono text-xs">{sa.agent_code}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sa.email}<br />{sa.phone}
                        </TableCell>
                        <TableCell>{sa.commission_rate ?? 0}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLOR[sa.status] ?? ""}`}>
                            {STATUS_LABEL[sa.status] ?? sa.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {sa.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs text-emerald-700 border-emerald-300"
                                  onClick={() => setApproveConfirm(sa.id)}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs text-red-700 border-red-300"
                                  onClick={() => setRejectConfirm(sa.id)}>
                                  <XCircle className="h-3 w-3 mr-1" /> Tolak
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                              <Link to={`/admin/agents/${sa.id}`}>Detail</Link>
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
        </TabsContent>

        {/* Tab Override Komisi */}
        <TabsContent value="override">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" /> Override Komisi Sub-Agen
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Persentase komisi yang dipotong dari sub-agen dan diteruskan ke agen induk.
              </p>
            </CardHeader>
            <CardContent>
              {subAgents.filter((sa) => sa.status === "active").length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Tidak ada sub-agen aktif.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sub-Agen</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Rate Komisi Sub-Agen</TableHead>
                      <TableHead>Override %</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subAgents.filter((sa) => sa.status === "active").map((sa) => {
                      const currentPct = overrideMap[sa.id] ?? 0;
                      const isEditing = editingOverride === sa.id;
                      return (
                        <TableRow key={sa.id}>
                          <TableCell className="font-medium">
                            {sa.company_name || sa.contact_name || sa.full_name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{sa.agent_code}</TableCell>
                          <TableCell>{sa.commission_rate ?? 0}%</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  value={overridePct}
                                  onChange={(e) => setOverridePct(e.target.value)}
                                  className="w-20 h-7 text-sm"
                                />
                                <span className="text-sm">%</span>
                              </div>
                            ) : (
                              <span className={currentPct > 0 ? "font-medium text-purple-700" : "text-muted-foreground"}>
                                {currentPct > 0 ? `${currentPct}%` : "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={saveOverrideMutation.isPending}
                                  onClick={() => {
                                    const pct = parseFloat(overridePct);
                                    if (isNaN(pct) || pct < 0 || pct > 100) {
                                      toast.error("Persentase harus antara 0–100");
                                      return;
                                    }
                                    saveOverrideMutation.mutate({ subAgentId: sa.id, pct });
                                  }}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  {saveOverrideMutation.isPending ? "Menyimpan…" : "Simpan"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => { setEditingOverride(null); setOverridePct(""); }}
                                >
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => { setEditingOverride(sa.id); setOverridePct(currentPct.toString()); }}
                                >
                                  <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                {currentPct > 0 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-destructive"
                                    disabled={deleteOverrideMutation.isPending}
                                    onClick={() => deleteOverrideMutation.mutate(sa.id)}
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Performa */}
        <TabsContent value="performa">
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Booking 6 Bulan Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={perfData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [v, "Booking"]} />
                    <Bar dataKey="booking" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Revenue & Komisi 6 Bulan Terakhir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={perfData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gKom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: any, name: string) => [formatCurrency(v), name === "revenue" ? "Revenue" : "Komisi"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#gRev)" strokeWidth={2} name="revenue" />
                    <Area type="monotone" dataKey="komisi" stroke="#f59e0b" fill="url(#gKom)" strokeWidth={2} name="komisi" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Wallet & Penarikan */}
        <TabsContent value="wallet">
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Permintaan", value: (withdrawals as any[]).length, cls: "" },
                { label: "Menunggu", value: (withdrawals as any[]).filter((w: any) => w.status === "pending").length, cls: "text-amber-600" },
                { label: "Sudah Lunas", value: (withdrawals as any[]).filter((w: any) => w.status === "processed").length, cls: "text-emerald-600" },
                { label: "Total Dicairkan", value: formatCurrency((withdrawals as any[]).filter((w: any) => w.status === "processed").reduce((s: number, w: any) => s + Number(w.amount), 0)), cls: "text-emerald-600" },
              ].map(({ label, value, cls }) => (
                <Card key={label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-lg font-bold ${cls}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" /> Permintaan Penarikan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(withdrawals as any[]).length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada permintaan penarikan dari agen ini.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Rekening</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bukti</TableHead>
                        <TableHead>Catatan</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(withdrawals as any[]).map((wd: any) => {
                        const s = WD_STATUS[wd.status] ?? { label: wd.status, cls: "" };
                        const bank = (wd.bank_details as any) ?? {};
                        return (
                          <TableRow key={wd.id}>
                            <TableCell className="text-xs">
                              {wd.created_at ? format(new Date(wd.created_at), "d MMM yyyy HH:mm", { locale: localeId }) : "—"}
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(Number(wd.amount))}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{bank.bank_name || "—"}</span><br />
                              {bank.account_number || bank.account_name || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {wd.proof_url ? (
                                <a href={wd.proof_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                                  <Eye className="h-3.5 w-3.5" />Lihat
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                              {wd.notes || "—"}
                            </TableCell>
                            <TableCell>
                              {wd.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs text-emerald-700 border-emerald-300"
                                    onClick={() => { setProofDialog({ id: wd.id, amount: Number(wd.amount) }); setProofUrl(""); setProofNotes(""); }}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />Tandai Lunas
                                  </Button>
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs text-red-700 border-red-300"
                                    onClick={() => setRejectWdId(wd.id)}>
                                    <XCircle className="h-3 w-3 mr-1" />Tolak
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Tandai Lunas + Input Bukti Transfer */}
      <Dialog open={!!proofDialog} onOpenChange={(o) => !o && setProofDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Lunas — {proofDialog ? formatCurrency(proofDialog.amount) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>URL Bukti Transfer <span className="text-muted-foreground">(opsional)</span></Label>
              <Input
                placeholder="https://... (link screenshot/struk)"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Tempelkan link gambar atau dokumen bukti transfer.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan <span className="text-muted-foreground">(opsional)</span></Label>
              <Textarea
                placeholder="Mis: Transfer BCA 08 Jun 2026 - Ref 12345"
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProofDialog(null)}>Batal</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveWithdrawalMutation.isPending}
              onClick={() => proofDialog && approveWithdrawalMutation.mutate({ wdId: proofDialog.id, proof: proofUrl, notes: proofNotes })}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {approveWithdrawalMutation.isPending ? "Menyimpan…" : "Simpan & Tandai Lunas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tolak Penarikan */}
      <AlertDialog open={!!rejectWdId} onOpenChange={(o) => !o && setRejectWdId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak permintaan penarikan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Status akan berubah menjadi "Ditolak". Agen dapat mengajukan permintaan baru jika diperlukan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rejectWdId && rejectWithdrawalMutation.mutate(rejectWdId)}>
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <AlertDialog open={suspendConfirm} onOpenChange={setSuspendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tangguhkan agen ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {agent.contact_name} tidak akan bisa login sampai diaktifkan kembali.
              Notifikasi WhatsApp akan dikirim ke agen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusMutation.mutate("suspended")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Tangguhkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={activateConfirm} onOpenChange={setActivateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan kembali agen?</AlertDialogTitle>
            <AlertDialogDescription>
              {agent.contact_name} akan bisa login dan menggunakan portal agen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusMutation.mutate("active")}>
              Ya, Aktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resetPassOpen} onOpenChange={setResetPassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password Agen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Kosongkan untuk generate password acak. Password baru akan dikirim via WhatsApp.
            </p>
            <Input
              placeholder="Password baru (opsional)"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPassOpen(false)}>Batal</Button>
            <Button onClick={() => resetPassMutation.mutate(newPassword)}
              disabled={resetPassMutation.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {resetPassMutation.isPending ? "Mereset…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!approveConfirm} onOpenChange={(o) => !o && setApproveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui sub-agen ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun user akan dibuat dan kredensial dikirim via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => approveConfirm && approveMutation.mutate(approveConfirm)}>
              Ya, Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejectConfirm} onOpenChange={(o) => !o && setRejectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak pendaftaran sub-agen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectConfirm && rejectMutation.mutate(rejectConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
