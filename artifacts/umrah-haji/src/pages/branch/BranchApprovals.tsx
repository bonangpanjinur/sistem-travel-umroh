import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useApprovalRequests, useApprovalAction, ApprovalRequest } from "@/hooks/useApprovalWorkflow";
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, Wifi, WifiOff,
  RefreshCcw, Eye, Percent
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  refund: "Refund", discount: "Diskon", cancellation: "Pembatalan", vendor_invoice: "Invoice Vendor",
};

export default function BranchApprovals() {
  const [selected, setSelected]   = useState<ApprovalRequest | null>(null);
  const [note, setNote]           = useState("");
  const [isLive, setIsLive]       = useState(false);

  const { data: requests = [], isLoading, refetch } = useApprovalRequests({ status: "pending" });
  const approvalAction = useApprovalAction();

  useEffect(() => {
    const channel = supabase
      .channel("branch-approvals-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_requests" }, () => refetch())
      .subscribe((s: string) => setIsLive(s === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const handleAction = async (action: "approved" | "rejected") => {
    if (!selected) return;
    await approvalAction.mutateAsync({
      requestId: selected.id, action,
      actorRole: "branch_manager",
      level: selected.current_level,
      notes: note,
      newStatus: action,
    });
    setSelected(null); setNote("");
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-amber-500" />Approval Cabang</h1>
          <p className="text-muted-foreground text-sm">Persetujuan diskon dan pembatalan dari agen di cabang Anda</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isLive ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200"}`}>
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isLive ? "Live" : "Offline"}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !requests.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Tidak ada approval pending. Pastikan tabel approval_requests sudah dibuat di Supabase.
                  </TableCell>
                </TableRow>
              ) : requests.map(r => (
                <TableRow key={r.id} className="bg-amber-50/30">
                  <TableCell className="text-xs">
                    <p className="font-medium">{format(parseISO(r.created_at), "dd MMM HH:mm")}</p>
                    <p className="text-muted-foreground">{formatDistanceToNow(parseISO(r.created_at), { locale: localeId, addSuffix: true })}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[r.type] || r.type}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">
                    {r.amount ? formatCurrency(r.amount) : r.percentage ? `${r.percentage}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">{r.reason}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">Menunggu</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(r); setNote(""); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              Review Approval
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted p-3 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Tipe</p><p className="font-medium">{TYPE_LABELS[selected.type]}</p></div>
                <div><p className="text-xs text-muted-foreground">Nilai</p><p className="font-medium">{selected.amount ? formatCurrency(selected.amount) : selected.percentage ? `${selected.percentage}%` : "—"}</p></div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Alasan</p>
                <p className="text-sm">{selected.reason}</p>
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Catatan keputusan..." className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={approvalAction.isPending} onClick={() => handleAction("approved")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Setujui
                </Button>
                <Button variant="destructive" className="flex-1" disabled={approvalAction.isPending} onClick={() => handleAction("rejected")}>
                  <XCircle className="h-4 w-4 mr-1" /> Tolak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
