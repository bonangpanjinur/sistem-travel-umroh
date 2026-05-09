import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { useApprovalRequests, useApprovalAction, ApprovalRequest } from "@/hooks/useApprovalWorkflow";
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  ArrowUp, RefreshCcw, Wifi, WifiOff, DollarSign, Percent,
  FileText, Eye, MessageSquare
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  refund:         { label: "Refund",        color: "text-red-600" },
  discount:       { label: "Diskon",        color: "text-amber-600" },
  cancellation:   { label: "Pembatalan",    color: "text-orange-600" },
  vendor_invoice: { label: "Invoice Vendor",color: "text-blue-600" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
  pending:   { label: "Menunggu",    variant: "outline" },
  approved:  { label: "Disetujui",   variant: "secondary" },
  rejected:  { label: "Ditolak",     variant: "destructive" },
  escalated: { label: "Dieskalasi",  variant: "default" },
  cancelled: { label: "Dibatalkan",  variant: "outline" },
};

export default function AdminApprovals() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter]     = useState("pending");
  const [typeFilter, setTypeFilter]         = useState("all");
  const [selectedReq, setSelectedReq]       = useState<ApprovalRequest | null>(null);
  const [actionNote, setActionNote]         = useState("");
  const [isLive, setIsLive]                 = useState(false);
  const [flashNew, setFlashNew]             = useState(false);

  const { data: requests = [], isLoading, refetch } = useApprovalRequests({ status: statusFilter, type: typeFilter });
  const approvalAction = useApprovalAction();

  useEffect(() => {
    const channel = supabase
      .channel("admin-approvals-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "approval_requests" }, () => {
        refetch();
        setFlashNew(true);
        toast.info("Request approval baru masuk");
        setTimeout(() => setFlashNew(false), 3000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "approval_requests" }, () => {
        refetch();
      })
      .subscribe((s: string) => setIsLive(s === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const stats = {
    pending:   requests.filter(r => r.status === "pending").length,
    approved:  requests.filter(r => r.status === "approved").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
    escalated: requests.filter(r => r.status === "escalated").length,
  };

  const handleAction = async (action: "approved" | "rejected" | "escalated") => {
    if (!selectedReq) return;
    await approvalAction.mutateAsync({
      requestId:  selectedReq.id,
      action,
      actorRole:  "admin",
      level:      selectedReq.current_level,
      notes:      actionNote,
      newStatus:  action === "escalated" ? "escalated" : action,
    });
    setSelectedReq(null);
    setActionNote("");
  };

  return (
    <div className="space-y-6 pb-10">
      <div className={`flex items-center justify-between flex-wrap gap-4 p-3 rounded-xl ${flashNew ? "bg-amber-50 border border-amber-300" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl">
            <ClipboardCheck className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Approval Center</h1>
            <p className="text-muted-foreground text-sm">Kelola persetujuan refund, diskon, dan pembatalan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${isLive ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200"}`}>
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isLive ? "Live" : "Offline"}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCcw className="h-4 w-4 mr-1" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending",    value: stats.pending,   icon: Clock,         color: "text-amber-600",  bg: stats.pending > 0 ? "border-amber-200 bg-amber-50" : "" },
          { label: "Disetujui",  value: stats.approved,  icon: CheckCircle2,  color: "text-green-600",  bg: "" },
          { label: "Ditolak",    value: stats.rejected,  icon: XCircle,       color: "text-red-600",    bg: "" },
          { label: "Dieskalasi", value: stats.escalated, icon: ArrowUp,       color: "text-blue-600",   bg: "" },
        ].map(s => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color} flex-shrink-0`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !requests.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Tidak ada approval request. Tabel approval_requests perlu dibuat di Supabase.
                  </TableCell>
                </TableRow>
              ) : requests.map(r => (
                <TableRow key={r.id} className={r.status === "pending" ? "bg-amber-50/40" : ""}>
                  <TableCell className="text-xs">
                    <p className="font-medium">{format(parseISO(r.created_at), "dd MMM HH:mm")}</p>
                    <p className="text-muted-foreground">{formatDistanceToNow(parseISO(r.created_at), { locale: localeId, addSuffix: true })}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${TYPE_CONFIG[r.type]?.color}`}>{TYPE_CONFIG[r.type]?.label || r.type}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.reference_code || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {r.amount ? formatCurrency(r.amount) : r.percentage ? `${r.percentage}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{r.reason}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">{r.current_level}/{r.max_level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[r.status]?.variant || "outline"} className="text-xs">
                      {STATUS_CONFIG[r.status]?.label || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedReq(r); setActionNote(""); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReq} onOpenChange={v => { if (!v) setSelectedReq(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              Detail Approval — {TYPE_CONFIG[selectedReq?.type || ""]?.label}
            </DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted p-3 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Tipe</p><p className="font-medium">{TYPE_CONFIG[selectedReq.type]?.label}</p></div>
                <div><p className="text-xs text-muted-foreground">Referensi</p><p className="font-medium font-mono">{selectedReq.reference_code || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Nilai</p><p className="font-medium">{selectedReq.amount ? formatCurrency(selectedReq.amount) : selectedReq.percentage ? `${selectedReq.percentage}%` : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Level</p><p className="font-medium">{selectedReq.current_level} dari {selectedReq.max_level}</p></div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Alasan Pengajuan</p>
                <p className="text-sm">{selectedReq.reason}</p>
              </div>

              {selectedReq.status === "pending" && (
                <>
                  <div>
                    <Label>Catatan Keputusan</Label>
                    <Textarea value={actionNote} onChange={e => setActionNote(e.target.value)} rows={3} placeholder="Tulis catatan atau alasan keputusan..." className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-green-700 border-green-300"
                      disabled={approvalAction.isPending}
                      onClick={() => handleAction("approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Setujui
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-700 border-red-300"
                      disabled={approvalAction.isPending}
                      onClick={() => handleAction("rejected")}>
                      <XCircle className="h-4 w-4 mr-1" /> Tolak
                    </Button>
                    {selectedReq.current_level < selectedReq.max_level && (
                      <Button variant="outline" className="flex-1 text-blue-700 border-blue-300"
                        disabled={approvalAction.isPending}
                        onClick={() => handleAction("escalated")}>
                        <ArrowUp className="h-4 w-4 mr-1" /> Eskalasi
                      </Button>
                    )}
                  </div>
                </>
              )}

              {(selectedReq.actions?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Riwayat Aksi</p>
                  <div className="space-y-2">
                    {selectedReq.actions?.map(a => (
                      <div key={a.id} className="flex items-start gap-2 text-xs p-2 bg-muted/40 rounded">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium capitalize">{a.action}</span> oleh {a.actor_role} (Level {a.level})
                          {a.notes && <p className="text-muted-foreground mt-0.5">{a.notes}</p>}
                          <p className="text-muted-foreground">{format(parseISO(a.created_at), "dd MMM HH:mm")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
