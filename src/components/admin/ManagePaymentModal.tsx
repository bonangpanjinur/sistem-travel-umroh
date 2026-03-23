import { useState } from "react";
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
import { formatCurrency, formatDate, getPaymentStatusLabel } from "@/lib/format";
import { 
  CheckCircle, XCircle, Eye, AlertCircle, Loader2, 
  CreditCard, Calendar, User, Search, Info
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
}

export function ManagePaymentModal({
  isOpen,
  onOpenChange,
  bookingId,
  bookingCode,
  customerName,
}: ManagePaymentModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!bookingId,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, status, notes }: { paymentId: string; status: 'paid' | 'failed'; notes?: string }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-payments', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Pembayaran berhasil diperbarui');
      setSelectedPayment(null);
      setShowRejectDialog(false);
      setShowProofDialog(false);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memperbarui pembayaran');
    },
  });

  const handleApprovePayment = (payment: any) => {
    verifyPaymentMutation.mutate({ paymentId: payment.id, status: 'verified' });
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
    </>
  );
}
