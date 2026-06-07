import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAllAgentMemberships, useAllBranchMemberships, useApproveMembership, useRejectMembership } from "@/hooks/useMemberships";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Eye, Building2, UserSquare2, Clock, Search, RefreshCw, Trophy, Crown, Star, Medal } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

// ─── Tier helpers ─────────────────────────────────────────────────────────────
const TIER_META: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  platinum: { label: "Platinum", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-300", icon: Crown },
  gold:     { label: "Gold",     color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-300",  icon: Trophy },
  silver:   { label: "Silver",   color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-300",  icon: Star },
  bronze:   { label: "Bronze",   color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: Medal },
};

function TierBadge({ tier }: { tier: string }) {
  const m = TIER_META[tier] ?? TIER_META.bronze;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.color} ${m.border}`}>
      <Icon className="h-3 w-3" />{m.label}
    </span>
  );
}

// ─── Membership status helpers ────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; variant: any; icon: any }> = {
  pending:  { label: "Menunggu",  variant: "secondary", icon: Clock },
  active:   { label: "Aktif",     variant: "default",   icon: CheckCircle2 },
  expired:  { label: "Expired",   variant: "outline",   icon: XCircle },
  rejected: { label: "Ditolak",   variant: "destructive", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const Icon = s.icon;
  return (
    <Badge variant={s.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

function ProofDialog({ url, open, onClose }: { url: string; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bukti Pembayaran</DialogTitle></DialogHeader>
        {url ? (
          url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <img src={url} alt="Bukti bayar" className="w-full rounded-lg" />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{url}</a>
          )
        ) : (
          <p className="text-muted-foreground text-sm">Tidak ada bukti pembayaran</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; loading: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tolak Keanggotaan</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Alasan Penolakan</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Tulis alasan penolakan..." rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={loading || !reason.trim()}>
            {loading ? "Memproses..." : "Tolak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Agent Memberships Tab ────────────────────────────────────────────────────
function AgentMembershipsTab() {
  const { data = [], isLoading, refetch } = useAllAgentMemberships();
  const approve = useApproveMembership();
  const reject = useRejectMembership();
  const [search, setSearch] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);

  const filtered = data.filter(m => {
    const term = search.toLowerCase();
    return (
      m.agents?.company_name?.toLowerCase().includes(term) ||
      m.agents?.agent_code?.toLowerCase().includes(term) ||
      m.membership_plans?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari agen..." className="pl-10" />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Belum ada data keanggotaan agen</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{m.agents?.company_name || "—"}</span>
                      <span className="text-xs text-muted-foreground font-mono">{m.agents?.agent_code}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                      <span>Paket: <strong>{m.membership_plans?.name}</strong> ({formatCurrency(Number(m.membership_plans?.price_yearly || 0))}/thn)</span>
                      {m.start_date && <span>Aktif: {formatDate(m.start_date)} — {m.end_date ? formatDate(m.end_date) : "?"}</span>}
                      <span>Daftar: {formatDate(m.created_at)}</span>
                    </div>
                    {m.rejection_reason && <p className="text-xs text-destructive">Alasan tolak: {m.rejection_reason}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {m.payment_proof_url && (
                      <Button size="sm" variant="outline" onClick={() => setProofUrl(m.payment_proof_url)}>
                        <Eye className="h-4 w-4 mr-1" />Bukti
                      </Button>
                    )}
                    {m.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => approve.mutate({ id: m.id, type: 'agent', planId: m.plan_id })} disabled={approve.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="h-4 w-4 mr-1" />Setujui
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectTarget(m)} disabled={reject.isPending}>
                          <XCircle className="h-4 w-4 mr-1" />Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProofDialog url={proofUrl || ""} open={!!proofUrl} onClose={() => setProofUrl(null)} />
      <RejectDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        loading={reject.isPending}
        onConfirm={reason => {
          if (!rejectTarget) return;
          reject.mutate({ id: rejectTarget.id, type: 'agent', reason }, { onSuccess: () => setRejectTarget(null) });
        }}
      />
    </div>
  );
}

// ─── Branch Memberships Tab ───────────────────────────────────────────────────
function BranchMembershipsTab() {
  const { data = [], isLoading, refetch } = useAllBranchMemberships();
  const approve = useApproveMembership();
  const reject = useRejectMembership();
  const [search, setSearch] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);

  const filtered = data.filter(m => {
    const term = search.toLowerCase();
    return (
      m.branches?.name?.toLowerCase().includes(term) ||
      m.branches?.code?.toLowerCase().includes(term) ||
      m.membership_plans?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari cabang..." className="pl-10" />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Belum ada data keanggotaan cabang</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{m.branches?.name || "—"}</span>
                      <span className="text-xs text-muted-foreground font-mono">{m.branches?.code}</span>
                      {m.branches?.city && <span className="text-xs text-muted-foreground">{m.branches.city}</span>}
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                      <span>Paket: <strong>{m.membership_plans?.name}</strong> ({formatCurrency(Number(m.membership_plans?.price_yearly || 0))}/thn)</span>
                      {m.start_date && <span>Aktif: {formatDate(m.start_date)} — {m.end_date ? formatDate(m.end_date) : "?"}</span>}
                      <span>Daftar: {formatDate(m.created_at)}</span>
                    </div>
                    {m.rejection_reason && <p className="text-xs text-destructive">Alasan tolak: {m.rejection_reason}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {m.payment_proof_url && (
                      <Button size="sm" variant="outline" onClick={() => setProofUrl(m.payment_proof_url)}>
                        <Eye className="h-4 w-4 mr-1" />Bukti
                      </Button>
                    )}
                    {m.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => approve.mutate({ id: m.id, type: 'branch', planId: m.plan_id })} disabled={approve.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle2 className="h-4 w-4 mr-1" />Setujui
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectTarget(m)} disabled={reject.isPending}>
                          <XCircle className="h-4 w-4 mr-1" />Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProofDialog url={proofUrl || ""} open={!!proofUrl} onClose={() => setProofUrl(null)} />
      <RejectDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        loading={reject.isPending}
        onConfirm={reason => {
          if (!rejectTarget) return;
          reject.mutate({ id: rejectTarget.id, type: 'branch', reason }, { onSuccess: () => setRejectTarget(null) });
        }}
      />
    </div>
  );
}

// ─── Agent Tier Tab ───────────────────────────────────────────────────────────
const TIER_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

function AgentTierTab() {
  const qc = useQueryClient();

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['agent-tier-stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/agents/tiers/stats');
      if (!res.ok) throw new Error('Failed to fetch tier stats');
      const data = await res.json();
      return data.stats as Array<{
        tier: string;
        count: string;
        avg_bookings: string;
        max_bookings: string;
        last_updated: string | null;
      }>;
    },
    staleTime: 60_000,
  });

  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['agent-tier-config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/agents/tiers/config');
      if (!res.ok) throw new Error('Failed to fetch tier config');
      const data = await res.json();
      return data.config as Array<{
        tier: string;
        min_bookings: number;
        label: string;
        color: string;
        description: string;
        updated_at: string;
      }>;
    },
    staleTime: 60_000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/agents/tiers/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const e = await res.json(); throw e; }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Refresh selesai: ${data.total_processed} agen diproses, ${data.total_changed} tier berubah`);
      refetchStats();
      refetchConfig();
      qc.invalidateQueries({ queryKey: ['agent-tier-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.error || "Gagal refresh tier agen");
    },
  });

  const [editTier, setEditTier] = useState<string | null>(null);
  const [editMinBookings, setEditMinBookings] = useState<number>(0);

  const updateConfigMutation = useMutation({
    mutationFn: async ({ tier, min_bookings }: { tier: string; min_bookings: number }) => {
      const res = await fetch(`/api/v1/agents/tiers/config/${tier}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_bookings }),
      });
      if (!res.ok) { const e = await res.json(); throw e; }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Konfigurasi threshold tier diperbarui");
      setEditTier(null);
      refetchConfig();
    },
    onError: (err: any) => {
      toast.error(err?.error || "Gagal update konfigurasi tier");
    },
  });

  const statsByTier = Object.fromEntries((statsData ?? []).map(s => [s.tier, s]));
  const configByTier = Object.fromEntries((configData ?? []).map(c => [c.tier, c]));

  const totalAgents = (statsData ?? []).reduce((sum, s) => sum + Number(s.count), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Membership Tier Otomatis</h3>
          <p className="text-sm text-muted-foreground">
            Tier naik otomatis berdasarkan jumlah booking confirmed/completed.
            Refresh berjalan setiap malam pukul 02:00 WIB.
          </p>
        </div>
        <Button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          {refreshMutation.isPending ? "Memproses..." : "Refresh Sekarang"}
        </Button>
      </div>

      {/* Distribusi Tier */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TIER_ORDER.map(tier => {
          const m = TIER_META[tier];
          const Icon = m.icon;
          const stat = statsByTier[tier];
          const cfg = configByTier[tier];
          const count = stat ? Number(stat.count) : 0;
          const pct = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0;
          return (
            <Card key={tier} className={`border-2 ${m.border}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`h-4 w-4 ${m.color}`} />
                      <span className={`text-sm font-semibold ${m.color}`}>{m.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">agen ({pct}%)</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Min. booking</p>
                    <p className="font-semibold text-sm">{cfg?.min_bookings ?? '—'}</p>
                  </div>
                </div>
                {stat && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    Rata-rata: {Math.round(Number(stat.avg_bookings ?? 0))} booking
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Konfigurasi Threshold */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Konfigurasi Threshold Tier</CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading || statsLoading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Memuat konfigurasi...</div>
          ) : (
            <div className="space-y-2">
              {TIER_ORDER.map(tier => {
                const cfg = configByTier[tier];
                const m = TIER_META[tier];
                const Icon = m.icon;
                if (!cfg) return null;
                const isEditing = editTier === tier;
                return (
                  <div key={tier} className={`flex items-center gap-4 p-3 rounded-lg border ${m.bg} ${m.border}`}>
                    <Icon className={`h-5 w-5 flex-shrink-0 ${m.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${m.color}`}>{cfg.label}</span>
                        <TierBadge tier={tier} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{cfg.description}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Min booking:</span>
                            <Input
                              type="number"
                              min={0}
                              value={editMinBookings}
                              onChange={e => setEditMinBookings(Number(e.target.value))}
                              className="w-20 h-7 text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={updateConfigMutation.isPending}
                            onClick={() => updateConfigMutation.mutate({ tier, min_bookings: editMinBookings })}
                          >
                            Simpan
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditTier(null)}>
                            Batal
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-semibold tabular-nums">≥ {cfg.min_bookings} booking</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setEditTier(tier); setEditMinBookings(cfg.min_bookings); }}
                          >
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keterangan */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Cara kerja sistem tier otomatis:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Tier naik/turun otomatis saat booking berstatus <strong>confirmed</strong> atau <strong>completed</strong></li>
            <li>Trigger database aktif real-time setiap ada perubahan booking</li>
            <li>Batch refresh dijalankan setiap malam pukul 02:00 WIB via cron job</li>
            <li>Gunakan tombol <strong>"Refresh Sekarang"</strong> untuk recalculate manual</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminMemberships() {
  const { data: agentData = [] } = useAllAgentMemberships();
  const { data: branchData = [] } = useAllBranchMemberships();

  const agentPending = agentData.filter(m => m.status === 'pending').length;
  const branchPending = branchData.filter(m => m.status === 'pending').length;
  const agentActive = agentData.filter(m => m.status === 'active').length;
  const branchActive = branchData.filter(m => m.status === 'active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Keanggotaan</h1>
        <p className="text-muted-foreground">Kelola pendaftaran, persetujuan keanggotaan, dan tier otomatis agen</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Agen Aktif", value: agentActive, icon: UserSquare2, color: "text-emerald-600" },
          { label: "Agen Pending", value: agentPending, icon: Clock, color: "text-amber-600" },
          { label: "Cabang Aktif", value: branchActive, icon: Building2, color: "text-blue-600" },
          { label: "Cabang Pending", value: branchPending, icon: Clock, color: "text-orange-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <UserSquare2 className="h-4 w-4" />
            Keanggotaan Agen
            {agentPending > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs">{agentPending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <Building2 className="h-4 w-4" />
            Keanggotaan Cabang
            {branchPending > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs">{branchPending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-2">
            <Trophy className="h-4 w-4" />
            Tier Agen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="agents"   className="mt-4"><AgentMembershipsTab /></TabsContent>
        <TabsContent value="branches" className="mt-4"><BranchMembershipsTab /></TabsContent>
        <TabsContent value="tiers"    className="mt-4"><AgentTierTab /></TabsContent>
      </Tabs>
    </div>
  );
}
