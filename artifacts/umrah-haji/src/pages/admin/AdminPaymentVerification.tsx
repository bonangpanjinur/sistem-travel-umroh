import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Eye, RefreshCw,
  Search, ExternalLink, Loader2, FileImage, AlertCircle, Download
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const API = "/api/v1/payments";

interface PendingPayment {
  id: string;
  payment_code: string;
  amount: number;
  status: "pending" | "verified" | "rejected";
  payment_method: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  notes: string | null;
  proof_url: string | null;
  rejection_notes: string | null;
  payment_date: string | null;
  verified_at: string | null;
  created_at: string;
  booking_code: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  customer_name: string | null;
  customer_phone: string | null;
}

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  pending:  { label: "Menunggu",   cls: "bg-amber-100  text-amber-800  border-amber-200",   Icon: Clock },
  verified: { label: "Disetujui", cls: "bg-green-100  text-green-800  border-green-200",   Icon: CheckCircle2 },
  rejected: { label: "Ditolak",   cls: "bg-red-100    text-red-800    border-red-200",     Icon: XCircle },
};

export default function AdminPaymentVerification() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const { data: payments = [], isLoading, refetch } = useQuery<PendingPayment[]>({
    queryKey: ["pending-proofs", filterStatus],
    queryFn: async () => {
      const r = await fetch(`${API}/pending-proofs?status=${filterStatus}&limit=100`);
      const d = await r.json();
      return d.payments || [];
    },
  });

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.booking_code || "").toLowerCase().includes(q) ||
           (p.customer_name || "").toLowerCase().includes(q) ||
           (p.payment_code || "").toLowerCase().includes(q);
  });

  const pendingCount = payments.filter(p => p.status === "pending").length;

  const verifyMutation = useMutation({
    mutationFn: async ({ paymentId, act, notes }: { paymentId: string; act: "approve" | "reject"; notes?: string }) => {
      const r = await fetch(`${API}/${paymentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, notes, verified_by: user?.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal");
      return d;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.act === "approve" ? "✅ Pembayaran disetujui" : "❌ Pembayaran ditolak");
      qc.invalidateQueries({ queryKey: ["pending-proofs"] });
      setSelectedPayment(null);
      setAction(null);
      setRejectionNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function handleVerify(act: "approve" | "reject") {
    if (!selectedPayment) return;
    if (act === "reject" && !rejectionNotes.trim()) {
      toast.error("Alasan penolakan wajib diisi"); return;
    }
    verifyMutation.mutate({
      paymentId: selectedPayment.id,
      act,
      notes: act === "reject" ? rejectionNotes : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Verifikasi Transfer
            {pendingCount > 0 && filterStatus === "pending" && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 ml-1">{pendingCount} menunggu</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Review dan verifikasi bukti transfer pembayaran dari jamaah
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Cari kode booking, nama, atau kode pembayaran..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="verified">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Tidak ada pembayaran {filterStatus === "pending" ? "yang menunggu verifikasi" : "ditemukan"}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const cfg = STATUS_CFG[p.status] || STATUS_CFG.pending;
            const Icon = cfg.Icon;
            return (
              <Card
                key={p.id}
                className={cn("cursor-pointer hover:border-emerald-300 transition-all",
                  selectedPayment?.id === p.id && "border-emerald-400 bg-emerald-50/20"
                )}
                onClick={() => { setSelectedPayment(p); setAction(null); setRejectionNotes(""); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className={cn("p-2 rounded-full shrink-0", p.status === "pending" ? "bg-amber-100" : p.status === "verified" ? "bg-green-100" : "bg-red-100")}>
                      <Icon className={cn("h-4 w-4", p.status === "pending" ? "text-amber-600" : p.status === "verified" ? "text-green-600" : "text-red-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.customer_name || "—"}</span>
                        <span className="font-mono text-xs text-muted-foreground">{p.booking_code}</span>
                        <Badge className={cn("text-[10px] border", cfg.cls)}>
                          <Icon className="h-2.5 w-2.5 mr-1" />{cfg.label}
                        </Badge>
                        {p.proof_url && (
                          <Badge variant="outline" className="text-[10px]">
                            <FileImage className="h-2.5 w-2.5 mr-1" /> Ada bukti
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="font-semibold text-foreground">{formatCurrency(Number(p.amount))}</span>
                        {p.bank_name && <span>{p.bank_name}</span>}
                        {p.account_name && <span>a/n {p.account_name}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(p.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                        </span>
                      </div>
                      {p.rejection_notes && (
                        <p className="text-xs text-red-600 mt-1">Alasan: {p.rejection_notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Sisa setelah verifikasi</p>
                      <p className="font-semibold text-sm">{formatCurrency(Math.max(0, Number(p.remaining_amount) - Number(p.amount)))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Verification Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={v => { if (!v) { setSelectedPayment(null); setAction(null); } }}>
        {selectedPayment && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Pembayaran</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <span className="font-mono font-semibold">{selectedPayment.booking_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jamaah</span>
                  <span>{selectedPayment.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. HP</span>
                  <span>{selectedPayment.customer_phone || "—"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah Transfer</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(Number(selectedPayment.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Booking</span>
                  <span>{formatCurrency(Number(selectedPayment.total_price))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa Tagihan</span>
                  <span>{formatCurrency(Number(selectedPayment.remaining_amount))}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dari Bank</span>
                  <span>{selectedPayment.bank_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nama Pengirim</span>
                  <span>{selectedPayment.account_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode</span>
                  <span className="capitalize">{selectedPayment.payment_method}</span>
                </div>
                {selectedPayment.notes && (
                  <div>
                    <span className="text-muted-foreground">Catatan</span>
                    <p className="mt-0.5 text-xs bg-white border rounded p-2">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>

              {/* Proof image */}
              {selectedPayment.proof_url && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Bukti Transfer</Label>
                  {selectedPayment.proof_url.endsWith(".pdf") ? (
                    <a
                      href={selectedPayment.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 underline"
                    >
                      <Download className="h-4 w-4" /> Lihat PDF Bukti Transfer
                    </a>
                  ) : (
                    <div className="relative group">
                      <img
                        src={selectedPayment.proof_url}
                        alt="Bukti transfer"
                        className="w-full max-h-64 object-contain rounded-lg border bg-muted"
                      />
                      <a
                        href={selectedPayment.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded p-1 shadow text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Buka
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* No proof warning */}
              {!selectedPayment.proof_url && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs">
                    Tidak ada bukti transfer yang diupload. Verifikasi manual diperlukan.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current status */}
              {selectedPayment.status !== "pending" && (
                <Alert className={cn(
                  "border",
                  selectedPayment.status === "verified" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                )}>
                  <AlertDescription className={cn("text-sm",
                    selectedPayment.status === "verified" ? "text-green-800" : "text-red-800"
                  )}>
                    {selectedPayment.status === "verified"
                      ? `✅ Disetujui pada ${selectedPayment.verified_at ? format(parseISO(selectedPayment.verified_at), "dd MMM yyyy HH:mm", { locale: idLocale }) : "—"}`
                      : `❌ Ditolak — ${selectedPayment.rejection_notes || "—"}`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Rejection notes input */}
              {action === "reject" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-red-600 font-semibold">Alasan Penolakan *</Label>
                  <Textarea
                    className="h-20 resize-none text-sm border-red-200"
                    placeholder="Tuliskan alasan penolakan yang jelas untuk jamaah..."
                    value={rejectionNotes}
                    onChange={e => setRejectionNotes(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 flex-wrap">
              {selectedPayment.status === "pending" && (
                <>
                  {action !== "reject" && (
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setAction("reject")}
                      disabled={verifyMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Tolak
                    </Button>
                  )}
                  {action === "reject" && (
                    <Button variant="ghost" size="sm" onClick={() => setAction(null)}>
                      Batal
                    </Button>
                  )}
                  <Button
                    className={cn(action === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")}
                    onClick={() => handleVerify(action === "reject" ? "reject" : "approve")}
                    disabled={verifyMutation.isPending || (action === "reject" && !rejectionNotes.trim())}
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : action === "reject" ? (
                      <XCircle className="h-4 w-4 mr-1.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    )}
                    {action === "reject" ? "Konfirmasi Tolak" : "Setujui Pembayaran"}
                  </Button>
                </>
              )}
              {selectedPayment.status !== "pending" && (
                <Button variant="outline" onClick={() => setSelectedPayment(null)}>Tutup</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
