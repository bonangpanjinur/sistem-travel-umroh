import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, getPaymentStatusLabel } from "@/lib/format";
import { 
  CheckCircle, XCircle, Eye, AlertCircle, Loader2, 
  CreditCard, Calendar, User, Search, Info, Plus, Upload
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

interface ManagePaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  canAddPayment?: boolean;
  canVerifyPayment?: boolean;
}

export function ManagePaymentModal({
  isOpen,
  onOpenChange,
  bookingId,
  bookingCode,
  customerName,
  canAddPayment = true,
  canVerifyPayment = false,
}: ManagePaymentModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Add payment form state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_method: "transfer",
    bank_name: "",
    account_number: "",
    notes: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, booking:bookings(customer_id, booking_code)')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!bookingId,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({
      paymentId, status, notes, customerId, paymentAmount,
    }: {
      paymentId: string;
      status: 'paid' | 'failed';
      notes?: string;
      customerId?: string;
      paymentAmount?: number;
    }) => {
      const { error } = await supabase
        .from('payments')
        .update({
          status,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          notes: notes || null,
        })
        .eq('id', paymentId);

      if (error) throw error;

      return { status, customerId, paymentAmount };
    },
    onSuccess: ({ status, customerId, paymentAmount }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-payments', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success(
        status === 'paid'
          ? 'Pembayaran dikonfirmasi — notifikasi terkirim ke jamaah'
          : 'Pembayaran ditolak — notifikasi terkirim ke jamaah'
      );
      setSelectedPayment(null);
      setShowRejectDialog(false);
      setShowProofDialog(false);
      setRejectReason("");

      // ── Notifikasi in-app ke jamaah ────────────────────────────────────
      if (customerId) {
        const amountFmt = formatCurrency(paymentAmount || 0);
        const bookingLabel = bookingCode ? ` untuk booking ${bookingCode}` : "";
        const notifTitle = status === 'paid'
          ? 'Pembayaran Dikonfirmasi ✅'
          : 'Bukti Pembayaran Ditolak ❌';
        const notifMessage = status === 'paid'
          ? `Pembayaran Anda sebesar ${amountFmt}${bookingLabel} telah dikonfirmasi oleh admin. Terima kasih!`
          : `Bukti pembayaran Anda sebesar ${amountFmt}${bookingLabel} ditolak.${variables.notes ? ` Alasan: ${variables.notes}.` : ""} Mohon upload ulang bukti yang valid.`;
        (supabase as any).from('customer_notifications').insert({
          customer_id: customerId,
          type: 'payment',
          title: notifTitle,
          message: notifMessage,
          is_read: false,
          metadata: {
            payment_id: variables.paymentId,
            booking_id: bookingId,
            booking_code: bookingCode,
            amount: paymentAmount,
            payment_status: status,
          },
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memperbarui pembayaran');
    },
  });

  const handleApprovePayment = (payment: any) => {
    verifyPaymentMutation.mutate({
      paymentId: payment.id,
      status: 'paid',
      customerId: (payment as any).booking?.customer_id,
      paymentAmount: payment.amount,
    });
  };

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: async (data: { amount: number; payment_method: string; bank_name?: string; account_number?: string; notes?: string; proofUrl?: string }) => {
      const proofUrl = data.proofUrl;
      const paymentCode = `PAY-${Date.now()}`;
      const { error } = await supabase.from('payments').insert({
        booking_id: bookingId,
        payment_code: paymentCode,
        amount: data.amount,
        payment_method: data.payment_method,
        bank_name: data.bank_name || null,
        account_number: data.account_number || null,
        notes: data.notes || null,
        proof_url: proofUrl || null,
        status: proofUrl ? 'pending' : 'paid', // If no proof, auto-approve
        verified_at: proofUrl ? null : new Date().toISOString(),
        verified_by: proofUrl ? null : user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-payments', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Pembayaran berhasil ditambahkan');
      setShowAddPayment(false);
      setNewPayment({
        amount: "",
        payment_method: "transfer",
        bank_name: "",
        account_number: "",
        notes: "",
      });
      setProofFile(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menambahkan pembayaran');
    },
  });

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) {
      toast.error("Masukkan jumlah yang valid");
      return;
    }

    let proofUrl: string | undefined;
    if (proofFile) {
      // Upload proof
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `payments/${bookingId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, proofFile);
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
        proofUrl = urlData.publicUrl;
      }
    }

    addPaymentMutation.mutate({ ...newPayment, amount, proofUrl });
  };

  const handleRejectPayment = () => {
    if (!selectedPayment) return;
    verifyPaymentMutation.mutate({ 
      paymentId: selectedPayment.id, 
      status: 'failed',
      notes: rejectReason 
    });
  };

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'verified':
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'failed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-6 w-6 text-primary" />
              Kelola Pembayaran
            </DialogTitle>
            <DialogDescription>
              Booking: <span className="font-mono font-bold text-foreground">{bookingCode}</span> • {customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {canAddPayment && (
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Riwayat Pembayaran</h3>
                <Button 
                  size="sm" 
                  onClick={() => setShowAddPayment(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pembayaran
                </Button>
              </div>
            )}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Memuat data pembayaran...</p>
              </div>
            ) : !payments || payments.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada riwayat pembayaran untuk booking ini.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Bukti</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const isPending = payment.status === 'pending';
                      return (
                        <TableRow key={payment.id} className={isPending ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                          <TableCell className="font-mono text-sm">{payment.payment_code}</TableCell>
                          <TableCell className="text-sm">{formatDate(payment.created_at || '')}</TableCell>
                          <TableCell className="text-sm capitalize">{payment.payment_method || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {payment.proof_url ? (
                              <button 
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowProofDialog(true);
                                }}
                                className="block w-8 h-8 rounded border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer bg-white"
                              >
                                <img 
                                  src={payment.proof_url} 
                                  alt="Bukti" 
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px] px-1.5 h-5">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Belum
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getPaymentBadgeClass(payment.status || 'pending')} text-[10px] px-1.5 h-5`}>
                              {getPaymentStatusLabel(payment.status || 'pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isPending && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handleApprovePayment(payment)}
                                    disabled={verifyPaymentMutation.isPending || !payment.proof_url}
                                    title="Setujui"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setShowRejectDialog(true);
                                    }}
                                    disabled={verifyPaymentMutation.isPending}
                                    title="Tolak"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {payment.proof_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowProofDialog(true);
                                  }}
                                  title="Lihat Bukti"
                                >
                                  <Eye className="h-4 w-4" />
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran - {selectedPayment?.payment_code}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {selectedPayment?.proof_url ? (
              <div className="relative w-full overflow-hidden rounded-lg border bg-muted/20">
                <img 
                  src={selectedPayment.proof_url} 
                  alt="Bukti Pembayaran" 
                  className="max-w-full max-h-[60vh] mx-auto object-contain"
                />
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Bukti pembayaran belum diupload</p>
              </div>
            )}
            
            <div className="w-full grid grid-cols-2 gap-4 text-sm border rounded-lg p-4 bg-muted/10">
              <div>
                <p className="text-muted-foreground">Metode</p>
                <p className="font-medium capitalize">{selectedPayment?.payment_method || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jumlah</p>
                <p className="font-bold text-primary">{formatCurrency(selectedPayment?.amount || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bank</p>
                <p className="font-medium">{selectedPayment?.bank_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tanggal</p>
                <p className="font-medium">{selectedPayment?.created_at ? formatDate(selectedPayment.created_at) : '-'}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {selectedPayment?.status === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowRejectDialog(true)}
                >
                  Tolak
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprovePayment(selectedPayment)}
                  disabled={verifyPaymentMutation.isPending}
                >
                  {verifyPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Setujui Pembayaran
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowProofDialog(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tolak Pembayaran</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan pembayaran ini agar jamaah dapat memperbaikinya.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Contoh: Bukti transfer tidak terbaca atau nominal tidak sesuai..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Batal</Button>
            <Button 
              variant="destructive"
              onClick={handleRejectPayment}
              disabled={!rejectReason || verifyPaymentMutation.isPending}
            >
              {verifyPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tolak Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Tambah Pembayaran Manual
            </DialogTitle>
            <DialogDescription>
              Input pembayaran dari Jamaah secara manual
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah Pembayaran *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Contoh: 10000000"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Metode Pembayaran</Label>
              <select
                id="payment_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newPayment.payment_method}
                onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
              >
                <option value="transfer">Transfer Bank</option>
                <option value="cash">Tunai</option>
                <option value="qr">QRIS</option>
                <option value="card">Kartu Kredit/Debit</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank (Opsional)</Label>
              <Input
                id="bank_name"
                placeholder="Contoh: BCA, Mandiri"
                value={newPayment.bank_name}
                onChange={(e) => setNewPayment({ ...newPayment, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor Rekening (Opsional)</Label>
              <Input
                id="account_number"
                placeholder="Contoh: 1234567890"
                value={newPayment.account_number}
                onChange={(e) => setNewPayment({ ...newPayment, account_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bukti Transfer (Opsional)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={proofInputRef}
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setProofFile(e.target.files[0]);
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => proofInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Pilih File
                </Button>
                {proofFile && (
                  <span className="text-sm text-muted-foreground">{proofFile.name}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan..."
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddPayment(false)}>Batal</Button>
            <Button 
              onClick={handleAddPayment}
              disabled={!newPayment.amount || addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Pembayaran
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
