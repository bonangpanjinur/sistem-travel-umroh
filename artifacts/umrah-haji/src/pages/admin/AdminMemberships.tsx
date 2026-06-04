import { useState } from "react";
import { useAllAgentMemberships, useAllBranchMemberships, useApproveMembership, useRejectMembership } from "@/hooks/useMemberships";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Eye, Building2, UserSquare2, Clock, Search, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

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
        <p className="text-muted-foreground">Kelola pendaftaran dan persetujuan keanggotaan agen dan cabang</p>
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
        </TabsList>
        <TabsContent value="agents" className="mt-4"><AgentMembershipsTab /></TabsContent>
        <TabsContent value="branches" className="mt-4"><BranchMembershipsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
