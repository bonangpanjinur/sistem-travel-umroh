import { useState } from "react";
import { useBranchCommissions, useApproveBranchCommission, usePayBranchCommission } from "@/hooks/useBranchCommissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, DollarSign, Search, RefreshCw, Building2, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  pending:  { label: "Pending",   variant: "secondary" },
  approved: { label: "Disetujui", variant: "default" },
  paid:     { label: "Lunas",     variant: "outline" },
  rejected: { label: "Ditolak",   variant: "destructive" },
};

function PayDialog({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: (ref: string) => void; loading: boolean }) {
  const [ref, setRef] = useState("");
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tandai Komisi Lunas</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Referensi Pembayaran (opsional)</Label>
          <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="No. transfer / bukti bayar" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => onConfirm(ref)} disabled={loading}>
            {loading ? "Memproses..." : "Tandai Lunas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBranchCommissions() {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [payTarget, setPayTarget] = useState<any>(null);

  const branchId = selectedBranch === "all" ? undefined : selectedBranch;
  const { data = [], isLoading, refetch } = useBranchCommissions(branchId);
  const approve = useApproveBranchCommission();
  const pay = usePayBranchCommission();

  const filtered = data.filter(c => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      c.branches?.name?.toLowerCase().includes(term) ||
      c.bookings?.booking_code?.toLowerCase().includes(term) ||
      c.bookings?.customers?.full_name?.toLowerCase().includes(term);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPending = data.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalApproved = data.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPaid = data.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Komisi Cabang</h1>
        <p className="text-muted-foreground">Kelola dan bayarkan komisi untuk setiap cabang</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: totalPending, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Disetujui", value: totalApproved, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Lunas", value: totalPaid, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`rounded-lg p-3 ${s.bg}`}>
                <p className={`text-lg font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="pl-10" />
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Cabang</SelectItem>
            {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada data komisi cabang</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const sb = STATUS_BADGE[c.status] || STATUS_BADGE.pending;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{c.branches?.name || "—"}</span>
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                        <span>Booking: <strong>{c.bookings?.booking_code || "—"}</strong></span>
                        <span>Jamaah: {c.bookings?.customers?.full_name || "—"}</span>
                        <span>Rate: {c.commission_rate}%</span>
                        <span>Tanggal: {formatDate(c.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(Number(c.commission_amount))}</p>
                      </div>
                      <div className="flex gap-2">
                        {c.status === 'pending' && (
                          <Button size="sm" onClick={() => approve.mutate(c.id)} disabled={approve.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle2 className="h-4 w-4 mr-1" />Setujui
                          </Button>
                        )}
                        {c.status === 'approved' && (
                          <Button size="sm" onClick={() => setPayTarget(c)} disabled={pay.isPending}>
                            <CreditCard className="h-4 w-4 mr-1" />Bayar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PayDialog
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        loading={pay.isPending}
        onConfirm={ref => {
          if (!payTarget) return;
          pay.mutate({ id: payTarget.id, paymentReference: ref }, { onSuccess: () => setPayTarget(null) });
        }}
      />
    </div>
  );
}
