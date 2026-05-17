import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activityLogger";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, getRoomTypeLabel, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { 
  ArrowLeft, User, Calendar, Plane, CreditCard, FileText, 
  Users, Phone, Mail, MapPin, Printer, Send, CheckCircle, 
  XCircle, Eye, AlertCircle, Loader2, Pencil, Trash,
  Copy, CheckCheck, MessageCircle, Building2, UserCheck,
  Shield, ShieldAlert, ShieldCheck, ExternalLink, Clock3,
  Stethoscope, Baby, BriefcaseMedical, RotateCcw, Wallet,
  TriangleAlert
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { generateInvoice, type InvoiceDataExtended } from "@/lib/document-generator";
import { generateTransactionForm, previewTransactionForm, DEFAULT_TEMPLATE, type PaymentInfoBlock, type CancellationPolicy } from "@/lib/transaction-form-generator";
import { DocumentPreviewModal } from "@/components/admin/DocumentPreviewModal";
import { useAuth } from "@/hooks/useAuth";
import { ManagePaymentModal } from "@/components/admin/ManagePaymentModal";
import { ChangePackageDialogV2 } from "@/components/admin/ChangePackageDialogV2";
import { ChangeRoomTypeDialog } from "@/components/admin/ChangeRoomTypeDialog";
import { RoomTypeAssignmentDialog } from "@/components/admin/RoomTypeAssignmentDialog";
import { useWhatsAppNotifier } from "@/hooks/useWhatsAppNotifier";
import { useEmailNotifier } from "@/hooks/useEmailNotifier";
import { BookingDocumentActions } from "@/components/admin/BookingDocumentActions";
import { BulkPassengerExport } from "@/components/admin/BulkPassengerExport";
import { BookingDocumentHistory } from "@/components/admin/BookingDocumentHistory";
import { useDocumentLogger } from "@/hooks/useDocumentLogger";
import { format as dfFormat } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { autoCalculateCommission } from "@/hooks/useAutoCommission";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const BOOKING_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Terkonfirmasi' },
  { value: 'processing', label: 'Dalam Proses' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'refunded', label: 'Dikembalikan' },
];

const REFUND_METHODS = [
  { value: 'transfer_bank',  label: 'Transfer Bank' },
  { value: 'tunai',          label: 'Tunai (Cash)' },
  { value: 'dana',           label: 'DANA' },
  { value: 'gopay',          label: 'GoPay' },
  { value: 'ovo',            label: 'OVO' },
  { value: 'shopeepay',      label: 'ShopeePay' },
  { value: 'kartu_kredit',   label: 'Kartu Kredit' },
  { value: 'lainnya',        label: 'Lainnya' },
];

const CANCELLATION_REASONS = [
  'Permintaan jamaah',
  'Dokumen tidak lengkap',
  'Pembayaran tidak dilunasi',
  'Force majeure / keadaan darurat',
  'Perubahan rencana keluarga',
  'Masalah kesehatan',
  'Alasan pekerjaan',
  'Lainnya',
];

export default function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>() as { id: string };
  const navigate = useNavigate();
  const { user, hasRole, isAdmin, isSuperAdmin } = useAuth();
  const { company: companyInfo } = useCompanyInfo();
  const queryClient = useQueryClient();
  const waNotifier = useWhatsAppNotifier();
  const emailNotifier = useEmailNotifier();
  const { logDocument } = useDocumentLogger();
  
  // Permission check - use isAdmin() which includes super_admin, owner, branch_manager
  const isFinance = hasRole('finance');
  const canVerifyPayment = isAdmin() || isFinance;
  const canAddPayment = isAdmin() || isFinance || hasRole('agent');
  
  const [newStatus, setNewStatus] = useState<BookingStatus | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  
  // Payment management state
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showManagePaymentModal, setShowManagePaymentModal] = useState(false);
  const [showChangePackageDialog, setShowChangePackageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeRoomTypeDialog, setShowChangeRoomTypeDialog] = useState(false);
  const [showRoomTypeAssignmentDialog, setShowRoomTypeAssignmentDialog] = useState(false);

  // C1 — Edit notes inline
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // C2 — Edit payment deadline inline
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState('');

  // C5 — Assign room number per passenger
  const [editingRoomNumber, setEditingRoomNumber] = useState<string | null>(null); // passenger id
  const [roomNumberValue, setRoomNumberValue] = useState('');

  // Refund dialog state (D3)
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundMethod, setRefundMethod] = useState<string>('transfer_bank');
  const [refundAccountInfo, setRefundAccountInfo] = useState<string>('');
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [processRefundNow, setProcessRefundNow] = useState<boolean>(true);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(booking?.booking_code || '');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Booking berhasil dihapus");
      // Invalidate all admin-bookings queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      // Wait a moment for cache to be invalidated before navigating
      setTimeout(() => {
        navigate("/admin/bookings");
      }, 300);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus booking");
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Data pembayaran berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['booking-payments', id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus pembayaran");
    },
  });

  const { data: booking, isLoading, isError, error: bookingError } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: async () => {
      // Note: agent_id exists in bookings but has no FK constraint → fetch agent separately below
      // Try with airport FK column hints first
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          departure:departures(
            *,
            package:packages(*),
            departure_airport:airports!departure_airport_id(code, name, city),
            arrival_airport:airports!arrival_airport_id(code, name, city)
          ),
          branch:branches(id, name, code)
        `)
        .eq('id', id)
        .single();

      if (!error) return data;

      // Fallback: fetch without airport join if FK hint fails
      const { data: fallback, error: fallbackError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          departure:departures(
            *,
            package:packages(*)
          ),
          branch:branches(id, name, code)
        `)
        .eq('id', id)
        .single();

      if (fallbackError) throw fallbackError;
      return fallback;
    },
    enabled: !!id,
    retry: false,
  });

  // Fetch agent separately — no FK constraint from bookings→agents in schema
  const { data: bookingAgent } = useQuery({
    queryKey: ['booking-agent', (booking as any)?.agent_id],
    queryFn: async () => {
      const agentId = (booking as any)?.agent_id;
      if (!agentId) return null;
      const { data } = await (supabase as any)
        .from('agents')
        .select('id, company_name, agent_code, slug')
        .eq('id', agentId)
        .maybeSingle();
      return data as { id: string; company_name: string; agent_code: string; slug: string } | null;
    },
    enabled: !!(booking as any)?.agent_id,
  });

  const { data: passengers } = useQuery({
    queryKey: ['booking-passengers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('booking_id', id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['booking-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Separate query for sales profile (FK bookings_sales_id_fkey doesn't exist in schema)
  const { data: salesProfile } = useQuery({
    queryKey: ['booking-sales-profile', booking?.sales_id],
    queryFn: async () => {
      if (!(booking as any)?.sales_id) return null;
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .eq('id', (booking as any).sales_id)
        .maybeSingle();
      return data as { id: string; full_name: string } | null;
    },
    enabled: !!(booking as any)?.sales_id,
  });

  // Fetch booking status history — real timeline data (B1, D1)
  const { data: statusHistory } = useQuery({
    queryKey: ['booking-status-history', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('booking_status_history')
        .select('*, changed_by_profile:profiles(id, full_name)')
        .eq('booking_id', id)
        .order('created_at', { ascending: true });
      return (data || []) as Array<{
        id: string;
        booking_id: string;
        from_status: string | null;
        to_status: string;
        changed_by: string | null;
        notes: string | null;
        created_at: string;
        changed_by_profile?: { id: string; full_name: string } | null;
      }>;
    },
    enabled: !!id,
  });

  // Fetch customer documents for all passengers in this booking (C6)
  const { data: passengerDocs } = useQuery({
    queryKey: ['booking-passenger-docs', id],
    queryFn: async () => {
      if (!passengers || passengers.length === 0) return [];
      const customerIds = passengers.map((p: any) => p.customer_id || p.customer?.id).filter(Boolean);
      if (customerIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('customer_documents')
        .select('id, customer_id, document_type, status, file_url')
        .in('customer_id', customerIds);
      return (data || []) as Array<{ id: string; customer_id: string; document_type: string; status: string; file_url?: string }>;
    },
    enabled: !!id && !!passengers && passengers.length > 0,
  });

  // B2 — Fetch mahrams for all passengers in this booking
  const { data: passengerMahrams } = useQuery({
    queryKey: ['booking-passenger-mahrams', id],
    queryFn: async () => {
      if (!passengers || passengers.length === 0) return [];
      const customerIds = passengers.map((p: any) => p.customer_id || p.customer?.id).filter(Boolean);
      if (customerIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from('customer_mahrams')
        .select('id, customer_id, name, relationship, phone')
        .in('customer_id', customerIds);
      return (data || []) as Array<{ id: string; customer_id: string; name: string; relationship: string; phone?: string }>;
    },
    enabled: !!id && !!passengers && passengers.length > 0,
  });

  const { data: lineItems } = useQuery({
    queryKey: ['booking-line-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_line_items' as any)
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  // C7 — Fetch refunds for this booking
  const { data: bookingRefunds } = useQuery({
    queryKey: ['booking-refunds', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('refunds')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: false });
      return (data || []) as Array<{
        id: string; booking_id: string; amount: number; method: string;
        status: string; account_info?: string; notes?: string;
        reason?: string; created_at: string; processed_at?: string;
      }>;
    },
    enabled: !!id,
  });

  // Fetch bank accounts for invoice
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  // Fetch invoice template settings
  const { data: invoiceTemplate } = useQuery({
    queryKey: ['invoice-template-default'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('invoice_templates')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();
      return data;
    },
  });

  const { data: cancellationPolicy } = useQuery({
    queryKey: ['cancellation-policy-for-booking', id],
    queryFn: async () => {
      const packageId = (booking?.departure as any)?.package?.id;
      if (packageId) {
        const { data: pkgPolicy } = await (supabase as any)
          .from('cancellation_policies')
          .select('*')
          .eq('package_id', packageId)
          .maybeSingle();
        if (pkgPolicy) return pkgPolicy as { id: string; name: string; sections: { title: string; items: string[] }[] };
      }
      const { data: globalPolicy } = await (supabase as any)
        .from('cancellation_policies')
        .select('*')
        .eq('is_global', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return globalPolicy as { id: string; name: string; sections: { title: string; items: string[] }[] } | null;
    },
    enabled: !!booking,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: BookingStatus) => {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: status })
        .eq('id', id);
      if (error) throw error;
      return status;
    },
    onSuccess: async (status) => {
      toast.success("Status booking berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setShowStatusConfirm(false);
      setNewStatus(null);

      // Catat ke activity log (fire-and-forget)
      logActivity({
        entity_type: "booking",
        entity_id: id,
        action: "status_changed",
        new_value: status,
        metadata: { booking_id: id },
      });

      // === Kirim notifikasi in-app ke jamaah berdasarkan status baru ===
      const notifMap: Record<string, { title: string; message: string }> = {
        confirmed:   { title: "Booking Dikonfirmasi ✅", message: "Selamat! Booking Anda telah dikonfirmasi. Silakan lanjutkan proses pembayaran dan persiapan dokumen." },
        processing:  { title: "Booking Sedang Diproses 🔄", message: "Booking Anda sedang dalam proses oleh tim kami. Kami akan segera menghubungi Anda." },
        completed:   { title: "Perjalanan Selesai 🕋", message: "Alhamdulillah! Perjalanan Anda telah selesai. Mohon berikan feedback dan ulasan Anda." },
        cancelled:   { title: "Booking Dibatalkan ❌", message: "Booking Anda telah dibatalkan. Hubungi kami untuk informasi lebih lanjut atau refund." },
        refunded:    { title: "Refund Sedang Diproses 💰", message: "Permintaan refund Anda sedang diproses. Dana akan dikembalikan dalam 3-7 hari kerja." },
      };
      if (notifMap[status] && booking) {
        const customerId = (booking as any).customer?.id ?? (booking as any).customer_id;
        if (customerId) {
          await (supabase as any).from('customer_notifications').insert({
            customer_id: customerId,
            type: 'booking',
            title: notifMap[status].title,
            message: notifMap[status].message,
            is_read: false,
          }).then(() => {});
        }
      }

      if (status === 'completed') {
        toast.info('Sertifikat dapat digenerate sekarang dari halaman dokumen.');
      }
      // Auto-hitung komisi saat status dikonfirmasi
      if (status === 'confirmed') {
        try {
          const result = await autoCalculateCommission(id);
          if (result.skipped) {
            if (!result.message.includes('tidak memiliki agen') && !result.message.includes('sudah ada')) {
              toast.info(result.message);
            }
          } else {
            toast.success(`Komisi otomatis dicatat: Rp${result.agentAmount.toLocaleString('id-ID')}${result.parentAmount > 0 ? ` + royalti Rp${result.parentAmount.toLocaleString('id-ID')}` : ''}`);
            queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
          }
        } catch (commErr: any) {
          console.error('Auto commission failed:', commErr);
          toast.warning('Status diperbarui, tapi komisi gagal dicatat otomatis. Silakan catat manual di halaman Agent.');
        }

        // Kirim email konfirmasi booking
        if (booking) {
          const customer = (booking as any).customer as any;
          const dep = (booking as any).departure as any;
          const email = customer?.email;
          if (email) {
            emailNotifier.sendBookingConfirmation({
              to: email,
              customerName: customer.full_name || "Jamaah",
              bookingCode: booking.booking_code || id,
              packageName: dep?.packages?.name || "-",
              departureDate: dep?.departure_date
                ? new Date(dep.departure_date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                : "-",
              totalPrice: Number(booking.total_price || 0),
              silent: true,
            });
          }
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memperbarui status");
    },
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
      return { paymentId, status };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['booking-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Pembayaran berhasil diperbarui');
      setSelectedPayment(null);
      setShowProofDialog(false);

      // Kirim email konfirmasi pembayaran
      if (result.status === 'paid' && booking) {
        const customer = (booking as any).customer as any;
        const email = customer?.email;
        if (email) {
          emailNotifier.sendPaymentVerified({
            to: email,
            customerName: customer.full_name || "Jamaah",
            bookingCode: booking.booking_code || id,
            amount: Number(selectedPayment?.amount || 0),
            silent: true,
          });
        }
      }

      // Auto WA notification if trigger is enabled
      if (result.status === 'paid' && waNotifier.isReady) {
        const autoTriggers: Record<string, boolean> = (() => {
          try { return JSON.parse(localStorage.getItem("wa_auto_triggers") || "{}"); }
          catch { return {}; }
        })();

        if (autoTriggers.on_payment_verified && booking) {
          const customer = booking.customer as any;
          const phone = customer?.phone;
          if (phone) {
            const dep = booking.departure as any;
            const pkg = dep?.package;
            const depDate = dep?.departure_date
              ? dfFormat(new Date(dep.departure_date), "dd MMM yyyy", { locale: localeId })
              : "-";
            await waNotifier.sendPaymentConfirmation(phone, {
              nama: customer.full_name || "Jamaah",
              kode_booking: booking.booking_code || id,
              jumlah_bayar: formatCurrency(selectedPayment?.amount || 0),
              tanggal_bayar: dfFormat(new Date(), "dd MMM yyyy", { locale: localeId }),
              total_terbayar: formatCurrency(booking.paid_amount || 0),
              sisa_bayar: formatCurrency(booking.remaining_amount || 0),
              nomor_cs: companyInfo?.phone || "",
            });
          }
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memperbarui pembayaran');
    },
  });

  const handleApprovePayment = (payment: any) => {
    verifyPaymentMutation.mutate({ paymentId: payment.id, status: 'paid' });
  };

  // Send WhatsApp notification
  const sendNotificationMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch('/api/whatsapp/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, booking_id: id }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Gagal mengirim notifikasi');
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Notifikasi berhasil dikirim: ${data.sent || 0} terkirim`);
    },
    onError: (error: Error) => {
      toast.error("Gagal mengirim notifikasi: " + error.message);
    },
  });

  // C1 — Save notes inline
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase.from('bookings').update({ notes }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Catatan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      setEditingNotes(false);
    },
    onError: (err: any) => toast.error(err.message || 'Gagal menyimpan catatan'),
  });

  // C2 — Update payment deadline
  const updateDeadlineMutation = useMutation({
    mutationFn: async (deadline: string) => {
      const { error } = await supabase.from('bookings').update({ payment_deadline: deadline }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Batas bayar berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      setEditingDeadline(false);
    },
    onError: (err: any) => toast.error(err.message || 'Gagal memperbarui batas bayar'),
  });

  // C5 — Assign room number per passenger
  const updateRoomNumberMutation = useMutation({
    mutationFn: async ({ passengerId, roomNumber }: { passengerId: string; roomNumber: string }) => {
      const { error } = await (supabase as any)
        .from('booking_passengers')
        .update({ room_number: roomNumber || null })
        .eq('id', passengerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nomor kamar berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['booking-passengers', id] });
      setEditingRoomNumber(null);
      setRoomNumberValue('');
    },
    onError: (err: any) => toast.error(err.message || 'Gagal menyimpan nomor kamar'),
  });

  const handlePrintInvoice = async () => {
    if (!booking || !booking.customer) return;
    
    const departure = booking.departure as any;
    const pkg = departure?.package;
    const bank = bankAccounts?.[0];
    
    const paidAmount = booking.paid_amount || 0;
    const remainingAmount = booking.remaining_amount || Math.max(0, booking.total_price - paidAmount);
    const paymentStatus = paidAmount >= booking.total_price ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

    const paxBreakdown: string[] = [];
    if ((booking as any).adult_count > 0) paxBreakdown.push(`${(booking as any).adult_count} Dewasa`);
    if ((booking as any).child_count > 0) paxBreakdown.push(`${(booking as any).child_count} Anak`);
    if ((booking as any).infant_count > 0) paxBreakdown.push(`${(booking as any).infant_count} Bayi`);
    const paxLabel = paxBreakdown.length > 0 ? paxBreakdown.join(', ') : `${booking.total_pax || 1} Pax`;

    const paxCount = booking.total_pax || 1;
    // Ambil harga per orang dari harga tipe kamar di keberangkatan/paket (konsisten dengan transaction form)
    const rt = (booking.room_type || 'quad') as string;
    const fromDep = departure?.[`price_${rt}`] as number | null | undefined;
    const fromPkg = pkg?.[`price_${rt}`] as number | null | undefined;
    const pricePerPax = (fromDep && fromDep > 0 ? fromDep : null)
      ?? (fromPkg && fromPkg > 0 ? fromPkg : null)
      ?? (booking.base_price > 0 ? booking.base_price : Math.round((booking.total_price - (booking.discount_amount || 0) - (booking.addons_price || 0)) / paxCount));
    const totalBeforeDiscount = pricePerPax * paxCount;

    const activeCpForInvoice: CancellationPolicy | undefined = cancellationPolicy
      ? { id: cancellationPolicy.id, name: cancellationPolicy.name, sections: cancellationPolicy.sections ?? [] }
      : undefined;

    const invoiceData: InvoiceDataExtended = {
      invoiceNumber: `INV-${booking.booking_code}`,
      invoiceDate: new Date(booking.created_at || new Date()),
      dueDate: booking.payment_deadline ? new Date(booking.payment_deadline) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      customer: {
        name: booking.customer.full_name || '-',
        address: [booking.customer.address, booking.customer.city, booking.customer.province].filter(Boolean).join(', ') || '-',
        phone: booking.customer.phone || '-',
        email: booking.customer.email || undefined,
      },
      items: lineItems && lineItems.length > 0
        ? lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Math.abs(item.unit_price),
            total: Math.abs(item.total_price),
            isDiscount: item.item_type === 'discount'
          }))
        : passengers && passengers.length > 0
          ? [
              // Header row grouping the package + departure info
              {
                description: `Paket ${pkg?.name || 'Umrah'} — Keberangkatan: ${departure?.departure_date ? formatDate(departure.departure_date) : '-'}`,
                quantity: paxCount,
                unitPrice: pricePerPax,
                total: totalBeforeDiscount,
                isHeader: true,
              },
              // Per-passenger breakdown rows
              ...passengers.map((p: any) => {
                const pRt = (p.room_preference || booking.room_type || 'quad') as string;
                const pFromDep = departure?.[`price_${pRt}`] as number | null | undefined;
                const pFromPkg = pkg?.[`price_${pRt}`] as number | null | undefined;
                // Infants may have a dedicated price field on departure/package
                const infantOverride = p.passenger_type === 'infant'
                  ? ((departure as any)?.price_infant || (pkg as any)?.price_infant || 0)
                  : 0;
                const unitP = infantOverride > 0
                  ? infantOverride
                  : (pFromDep && pFromDep > 0 ? pFromDep : null)
                    ?? (pFromPkg && pFromPkg > 0 ? pFromPkg : null)
                    ?? pricePerPax;
                const typeLabel = p.passenger_type === 'adult' ? 'Dewasa' : p.passenger_type === 'child' ? 'Anak' : 'Bayi';
                const roomLabel = getRoomTypeLabel(pRt);
                return {
                  description: `  ${p.customer?.full_name || '-'} (${typeLabel}) — ${roomLabel}`,
                  quantity: 1,
                  unitPrice: unitP,
                  total: unitP,
                };
              }),
              ...(booking.addons_price && booking.addons_price > 0 ? [{
                description: 'Biaya Tambahan / Add-ons',
                quantity: 1,
                unitPrice: booking.addons_price,
                total: booking.addons_price,
              }] : []),
            ]
          : [
              {
                description: `Paket ${pkg?.name || 'Umrah'} - Kamar ${getRoomTypeLabel(booking.room_type)} (${paxLabel})\nKeberangkatan: ${departure?.departure_date ? formatDate(departure.departure_date) : '-'}`,
                quantity: paxCount,
                unitPrice: pricePerPax,
                total: totalBeforeDiscount,
              },
              ...(booking.addons_price && booking.addons_price > 0 ? [{
                description: 'Biaya Tambahan / Add-ons',
                quantity: 1,
                unitPrice: booking.addons_price,
                total: booking.addons_price,
              }] : []),
            ],
      subtotal: lineItems && lineItems.length > 0
        ? lineItems.filter(i => i.item_type !== 'discount').reduce((acc, i) => acc + Number(i.total_price), 0)
        : totalBeforeDiscount + (booking.addons_price || 0),
      discount: lineItems && lineItems.length > 0
        ? Math.abs(lineItems.filter(i => i.item_type === 'discount').reduce((acc, i) => acc + Number(i.total_price), 0)) || undefined
        : booking.discount_amount || undefined,
      total: booking.total_price,
      paidAmount,
      remainingAmount,
      paymentStatus: paymentStatus as any,
      packageName: pkg?.name || undefined,
      departureDate: departure?.departure_date ? formatDate(departure.departure_date) : undefined,
      passengerSummary: {
        adult: (booking as any).adult_count || undefined,
        child: (booking as any).child_count || undefined,
        infant: (booking as any).infant_count || undefined,
      },
      notes: booking.notes || undefined,
      bankInfo: bank ? {
        bankName: bank.bank_name,
        accountNumber: bank.account_number,
        accountName: bank.account_name,
      } : undefined,
      cancellationPolicy: activeCpForInvoice,
    };

    const doc = await generateInvoice(invoiceData, companyInfo);
    doc.save(`Invoice-${booking.booking_code}.pdf`);
    toast.success('Invoice berhasil di-download');
    await logDocument({
      bookingId: booking.id,
      documentType: "invoice",
      documentLabel: `Invoice ${invoiceData.invoiceNumber}`,
      jamaahName: booking.customer.full_name,
    });
    queryClient.invalidateQueries({ queryKey: ["booking-document-logs", booking.id] });
  };

  const [transactionFormPreview, setTransactionFormPreview] = useState<{ url: string; pageCount: number; warnings: string[] } | null>(null);
  const [trxPaperSize, setTrxPaperSize] = useState<"a4" | "letter">("a4");
  const [trxOrientation, setTrxOrientation] = useState<"portrait" | "landscape">("portrait");

  const handlePrintTransactionForm = async (mode: "download" | "preview" = "download") => {
    if (!booking || !booking.customer) return;

    const departure = booking.departure as any;
    const pkg = departure?.package;

    // Build template: use saved template or default
    // Derive correct per-pax price from departure/package room type pricing
    const rt = (booking.room_type || 'quad') as string;
    const fromDep = (departure as any)?.[`price_${rt}`] as number | null | undefined;
    const fromPkg = (pkg as any)?.[`price_${rt}`] as number | null | undefined;
    const derivedPricePerPax = (fromDep || fromPkg) ?? (booking.base_price / (booking.total_pax || 1));

    const activeCancellationPolicy: CancellationPolicy | undefined = cancellationPolicy
      ? { id: cancellationPolicy.id, name: cancellationPolicy.name, sections: cancellationPolicy.sections ?? [] }
      : undefined;

    const tmpl = invoiceTemplate
      ? {
          accentColor: invoiceTemplate.accent_color ?? "#1e3a5f",
          fontFamily: invoiceTemplate.font_family ?? "helvetica",
          headerStyle: invoiceTemplate.header_style ?? "centered",
          showLogo: invoiceTemplate.show_logo ?? true,
          showPassengerList: invoiceTemplate.show_passenger_list ?? true,
          showSignature: invoiceTemplate.show_signature ?? true,
          leftSignatureLabel: invoiceTemplate.left_signature_label ?? "PETUGAS",
          rightSignatureLabel: invoiceTemplate.right_signature_label ?? "PEMESAN",
          paymentInfoBlocks: (invoiceTemplate.payment_info_blocks as PaymentInfoBlock[]) ?? [],
          termsText: invoiceTemplate.terms_text ?? "",
          footerText: invoiceTemplate.footer_text ?? "",
          cancellationPolicy: activeCancellationPolicy,
          paperSize: trxPaperSize,
          orientation: trxOrientation,
        }
      : { ...DEFAULT_TEMPLATE, cancellationPolicy: activeCancellationPolicy, paperSize: trxPaperSize, orientation: trxOrientation };

    // Build passenger list using derived room-type price
    const passengerList = (passengers ?? []).map((p: any) => {
      const discount = booking.discount_amount
        ? booking.discount_amount / (booking.total_pax || 1)
        : 0;
      return {
        name: p.customer?.full_name ?? p.full_name ?? "-",
        roomType: getRoomTypeLabel(booking.room_type),
        basePrice: derivedPricePerPax,
        additionalCost: booking.addons_price
          ? booking.addons_price / (booking.total_pax || 1)
          : 0,
        discount,
        totalBill: derivedPricePerPax - discount + (booking.addons_price ? booking.addons_price / (booking.total_pax || 1) : 0),
      };
    });

    // If no passengers recorded, add booking holder
    if (passengerList.length === 0) {
      const discount = booking.discount_amount ? booking.discount_amount / (booking.total_pax || 1) : 0;
      passengerList.push({
        name: booking.customer.full_name ?? "-",
        roomType: getRoomTypeLabel(booking.room_type),
        basePrice: derivedPricePerPax,
        additionalCost: 0,
        discount,
        totalBill: derivedPricePerPax - discount,
      });
    }

    const formData = {
      transactionCode: booking.booking_code ?? `TRX-${booking.id.slice(0, 8).toUpperCase()}`,
      customerCode: (booking.customer as any)?.customer_code ?? "-",
      transactionDate: new Date(booking.created_at ?? new Date()),
      referenceAgent: (booking as any).agent_name ?? bookingAgent?.company_name ?? undefined,
      customerName: booking.customer.full_name ?? "-",
      customerAddress: [
        (booking.customer as any).address,
        (booking.customer as any).city,
        (booking.customer as any).province,
      ].filter(Boolean).join(", ") || "-",
      customerPhone: (booking.customer as any).phone ?? "-",
      packageName: pkg?.name ?? "-",
      packageType: pkg?.package_type ?? (pkg as any)?.type ?? "-",
      umrahSeason: (departure as any)?.umrah_season ?? "-",
      programDays: pkg?.duration_days ? `${pkg.duration_days} HARI` : "-",
      departureDate: departure?.departure_date ? new Date(departure.departure_date) : undefined,
      returnDate: departure?.return_date ? new Date(departure.return_date) : undefined,
      hotelMakkah: (departure as any)?.hotel_makkah ?? pkg?.hotel_makkah ?? undefined,
      hotelMadinah: (departure as any)?.hotel_madinah ?? pkg?.hotel_madinah ?? undefined,
      airline: (departure as any)?.airline_name ?? (departure as any)?.airline?.name ?? undefined,
      airport: departure?.departure_airport
        ? `${departure.departure_airport.name} (${departure.departure_airport.code})`
        : undefined,
      roomCombinations: [{
        roomType: getRoomTypeLabel(booking.room_type),
        pricePerPax: derivedPricePerPax,
        paxCount: booking.total_pax ?? 1,
        roomCount: Math.ceil((booking.total_pax ?? 1) / 2),
      }],
      discounts: booking.discount_amount
        ? [{ label: (booking as any).discount_label ?? "DISKON", amount: booking.discount_amount }]
        : undefined,
      totalPrice: booking.total_price,
      notes: booking.notes ?? undefined,
      passengers: passengerList,
      paymentStatus: booking.payment_status ?? undefined,
    };

    const company = {
      name: companyInfo?.name ?? "PT. Umrah Haji Travel",
      address: companyInfo?.address ?? "-",
      phone: companyInfo?.phone ?? "-",
      email: companyInfo?.email ?? "-",
      logo: companyInfo?.logo ?? undefined,
    };

    try {
      if (mode === "preview") {
        if (transactionFormPreview) URL.revokeObjectURL(transactionFormPreview.url);
        const result = await previewTransactionForm(formData, company, tmpl);
        setTransactionFormPreview(result);
      } else {
        const doc = await generateTransactionForm(formData, company, tmpl);
        doc.save(`FormTransaksi-${booking.booking_code}.pdf`);
        toast.success("Form Transaksi berhasil di-download");
        await logDocument({
          bookingId: booking.id,
          documentType: "invoice",
          documentLabel: `Form Transaksi ${booking.booking_code}`,
          jamaahName: booking.customer.full_name,
        });
        queryClient.invalidateQueries({ queryKey: ["booking-document-logs", booking.id] });
      }
    } catch (e: any) {
      toast.error("Gagal generate form transaksi: " + e.message);
    }
  };

  // Mutation: proses pembatalan + refund (D3)
  const processRefundMutation = useMutation({
    mutationFn: async ({ withRefund }: { withRefund: boolean }) => {
      const prevStatus = (booking as any)?.booking_status ?? 'unknown';
      const targetStatus: BookingStatus = withRefund ? 'refunded' : 'cancelled';

      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: targetStatus })
        .eq('id', id);
      if (error) throw error;

      // Buat record refund dan ambil ID-nya agar bisa dicatat di activity log
      let refundId: string | null = null;
      if (withRefund && refundAmount > 0) {
        const { data: refundData, error: refundError } = await (supabase as any)
          .from('refunds')
          .insert({
            booking_id: id,
            customer_id: (booking as any)?.customer_id || (booking as any)?.customer?.id,
            amount: refundAmount,
            refund_method: refundMethod,
            account_info: refundAccountInfo || null,
            reason: cancellationReason || null,
            status: 'pending',
            created_by: user?.id,
          })
          .select('id')
          .single();
        if (!refundError && refundData) {
          refundId = refundData.id as string;
        }
      }

      return { withRefund, targetStatus, prevStatus, refundId };
    },
    onSuccess: async ({ withRefund, targetStatus, prevStatus, refundId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setShowRefundDialog(false);

      if (withRefund) {
        toast.success(`Booking dibatalkan — refund ${formatCurrency(refundAmount)} via ${REFUND_METHODS.find(m => m.value === refundMethod)?.label} sedang diproses`);
      } else {
        toast.success('Booking berhasil dibatalkan tanpa refund');
      }

      // === Activity log — booking dibatalkan ===
      logActivity({
        entity_type: 'booking',
        entity_id: id,
        action: withRefund ? 'cancelled_with_refund' : 'cancelled_no_refund',
        old_value: prevStatus,
        new_value: targetStatus,
        notes: cancellationReason || undefined,
        metadata: {
          booking_id: id,
          booking_code: (booking as any)?.booking_code ?? null,
          with_refund: withRefund,
          refund_amount: withRefund ? refundAmount : 0,
          refund_method: withRefund ? refundMethod : null,
          refund_account_info: withRefund && refundAccountInfo ? refundAccountInfo : null,
        },
      });

      // === Activity log — refund pertama kali dibuat ===
      if (withRefund && refundId) {
        logActivity({
          entity_type: 'refund',
          entity_id: refundId,
          action: 'refund_created',
          new_value: 'pending',
          notes: cancellationReason || undefined,
          metadata: {
            booking_id: id,
            booking_code: (booking as any)?.booking_code ?? null,
            amount: refundAmount,
            refund_method: refundMethod,
            account_info: refundAccountInfo || null,
            customer_id: (booking as any)?.customer?.id ?? (booking as any)?.customer_id ?? null,
          },
        });
      }

      // Notifikasi in-app ke jamaah
      const customerId = (booking as any)?.customer?.id ?? (booking as any)?.customer_id;
      if (customerId) {
        const refundMethodLabel = REFUND_METHODS.find(m => m.value === refundMethod)?.label || refundMethod;
        const notifMsg = withRefund
          ? `Booking Anda telah dibatalkan. Refund sebesar ${formatCurrency(refundAmount)} akan diproses melalui ${refundMethodLabel} dalam 3-7 hari kerja.${refundAccountInfo ? ` Detail: ${refundAccountInfo}` : ''}`
          : `Booking Anda telah dibatalkan. ${cancellationReason ? `Alasan: ${cancellationReason}.` : ''} Hubungi kami untuk informasi lebih lanjut.`;
        await (supabase as any).from('customer_notifications').insert({
          customer_id: customerId,
          type: 'booking',
          title: withRefund ? 'Booking Dibatalkan — Refund Diproses 💰' : 'Booking Dibatalkan ❌',
          message: notifMsg,
          is_read: false,
        });
      }

      // Reset form state
      setRefundAmount(0);
      setRefundMethod('transfer_bank');
      setRefundAccountInfo('');
      setCancellationReason('');
      setProcessRefundNow(true);
      setNewStatus(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memproses pembatalan');
    },
  });

  const handleStatusChange = (status: BookingStatus) => {
    if (status === 'cancelled') {
      // Intercept: tampilkan dialog refund
      setRefundAmount((booking as any)?.paid_amount || 0);
      setProcessRefundNow(((booking as any)?.paid_amount || 0) > 0);
      setShowRefundDialog(true);
      setNewStatus(status);
      return;
    }
    setNewStatus(status);
    setShowStatusConfirm(true);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'default';
      case 'cancelled':
      case 'refunded':
        return 'destructive';
      case 'processing':
        return 'outline';
      default:
        return 'secondary';
    }
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError) {
    const errMsg = (bookingError as any)?.message || String(bookingError);
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="h-12 w-12 text-destructive mb-2" />
        <h2 className="text-xl font-semibold">Gagal memuat data booking</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">{errMsg}</p>
        <p className="text-xs text-muted-foreground">ID: {id}</p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
          <Button asChild>
            <Link to="/admin/bookings">Kembali ke Daftar Booking</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Booking tidak ditemukan</h2>
        <p className="text-sm text-muted-foreground mt-1">ID booking <code className="bg-muted px-1 rounded text-xs">{id}</code> tidak ada di database.</p>
        <Button asChild className="mt-4">
          <Link to="/admin/bookings">Kembali ke Daftar Booking</Link>
        </Button>
      </div>
    );
  }

  const customer = booking.customer as any;
  const departure = booking.departure as any;
  const pkg = departure?.package;

  // Derive correct base price from package room-type pricing
  const derivedBasePrice = (() => {
    const rt = (booking.room_type || 'quad') as string;
    const fromDep = (departure as any)?.[`price_${rt}`] as number | null | undefined;
    const fromPkg = (pkg as any)?.[`price_${rt}`] as number | null | undefined;
    const pricePerPax = (fromDep || fromPkg) ?? (booking.base_price > booking.total_price / 2 && (booking.total_pax ?? 0) > 1 ? Math.round(booking.base_price / (booking.total_pax ?? 1)) : booking.base_price);
    return pricePerPax * (booking.total_pax || 1);
  })();

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Status Bar */}
      <div className="bg-white dark:bg-slate-950 border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="mt-1">
              <Link to="/admin/bookings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{booking.booking_code}</h1>
                <button
                  onClick={handleCopyCode}
                  title="Salin kode booking"
                  className="inline-flex items-center gap-1 text-xs font-mono bg-muted hover:bg-muted/80 px-2 py-1 rounded-md border transition-colors"
                >
                  {codeCopied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={codeCopied ? 'text-emerald-600' : 'text-muted-foreground'}>{codeCopied ? 'Disalin!' : 'Salin'}</span>
                </button>
                <Badge variant={getStatusBadgeVariant(booking.booking_status ?? '')} className="px-3 py-1 text-xs uppercase tracking-wider font-bold">
                  {getBookingStatusLabel(booking.booking_status ?? '')}
                </Badge>
                {/* A4 — payment_status badge terpisah */}
                {(booking as any).payment_status && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    (booking as any).payment_status === 'paid' || (booking as any).payment_status === 'verified'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                      : (booking as any).payment_status === 'partial'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800'
                      : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
                  }`}>
                    💳 {getPaymentStatusLabel((booking as any).payment_status)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dibuat pada {formatDate(booking.created_at ?? '')}
                {/* A2 — nama staf yang menginput booking */}
                {salesProfile?.full_name && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/5 border border-primary/10 rounded-full px-2 py-0.5 text-primary/70">
                    <UserCheck className="h-3 w-3" />
                    Diinput: {salesProfile.full_name}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2 rounded-lg border border-dashed">
            <div className="text-xs font-semibold text-muted-foreground px-2 uppercase tracking-widest">Update Status</div>
            <Select 
              value={booking.booking_status ?? undefined} 
              onValueChange={(val) => handleStatusChange(val as BookingStatus)}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Ubah Status" />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Customer Info */}
          <Card className="overflow-hidden border-none shadow-md">
            <div className="bg-primary/5 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2 text-primary">
                <User className="h-5 w-5" />
                Informasi Pemesan
              </h2>
              <EditCustomerDialog 
                customer={customer} 
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-booking', id] })}
                trigger={
                  <Button variant="outline" size="sm" className="bg-background shadow-sm hover:bg-primary hover:text-primary-foreground transition-all">
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit Data
                  </Button>
                }
              />
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Nama Lengkap</p>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {customer?.full_name || '-'}
                    </p>
                  </div>
                  <div className="group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">No. WhatsApp</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm flex items-center gap-2 font-medium">
                        <Phone className="h-3.5 w-3.5 text-primary/60" />
                        {customer?.phone || '-'}
                      </p>
                      {customer?.phone && (
                        <a
                          href={`https://wa.me/62${customer.phone.replace(/^0/, '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 transition-colors"
                          title="Buka WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Chat WA
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Email</p>
                    <p className="text-sm flex items-center gap-2 font-medium">
                      <Mail className="h-3.5 w-3.5 text-primary/60" />
                      {customer?.email || '-'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="group">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Alamat Lengkap</p>
                    <p className="text-sm leading-relaxed font-medium flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary/60 mt-0.5" />
                      {[customer?.address, customer?.city, customer?.province].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Package & Departure */}
          <Card className="overflow-hidden border-none shadow-md">
            <div className="bg-amber-500/5 px-6 py-4 border-b">
              <h2 className="font-bold flex items-center gap-2 text-amber-600">
                <Plane className="h-5 w-5" />
                Detail Paket & Keberangkatan
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Nama Paket</p>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold text-primary">{pkg?.name || '-'}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => setShowChangePackageDialog(true)}
                      >
                        <Pencil className="h-3 w-3" />
                        Pindah Paket
                      </Button>
                      {(isAdmin() || isSuperAdmin()) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash className="h-3 w-3" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Tipe Kamar</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Show all unique room types from passengers if available */}
                        {passengers && passengers.length > 0 ? (() => {
                          const rtColors: Record<string, string> = {
                            quad:   "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                            triple: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                            double: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
                            single: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                          };
                          const rtLabels: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };
                          const counts: Record<string, number> = {};
                          passengers.forEach((p: any) => {
                            const rt = p.room_preference || booking.room_type || "quad";
                            counts[rt] = (counts[rt] || 0) + 1;
                          });
                          return Object.entries(counts).map(([rt, count]) => (
                            <Badge key={rt} className={`text-[10px] font-bold ${rtColors[rt] || ""}`}>
                              {rtLabels[rt] || rt} ×{count}
                            </Badge>
                          ));
                        })() : (
                          <Badge variant="outline" className="font-semibold">{getRoomTypeLabel(booking.room_type)}</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setShowRoomTypeAssignmentDialog(true)}
                        >
                          <Pencil className="h-3 w-3" />
                          Atur Per Jamaah
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Jumlah Jamaah</p>
                      <p className="text-sm font-bold">{booking.total_pax || 1} Orang</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Dari</p>
                      <p className="text-lg font-black">{departure?.departure_airport?.code || '-'}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-4">
                      <div className="w-full border-t-2 border-dashed border-primary/30 relative">
                        <Plane className="h-4 w-4 text-primary absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-950 rounded-full" />
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground mt-2">{departure?.package?.airline?.name || '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Ke</p>
                      <p className="text-lg font-black">{departure?.arrival_airport?.code || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 font-medium">
                      <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Berangkat: <strong>{departure?.departure_date ? formatDate(departure.departure_date) : '-'}</strong></span>
                    </div>
                    {departure?.return_date && (
                      <div className="flex items-center gap-3 font-medium">
                        <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Kembali: <strong>{formatDate(departure.return_date)}</strong></span>
                      </div>
                    )}
                    {pkg?.duration_days && (
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span className="text-lg">🕐</span>
                        <span>Durasi: <strong>{pkg.duration_days} Hari</strong></span>
                      </div>
                    )}
                  </div>
                  {/* Hotel info */}
                  {(departure?.hotel_makkah || pkg?.hotel_makkah || departure?.hotel_madinah || pkg?.hotel_madinah) && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 space-y-1.5 text-xs">
                      <p className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight text-[10px]">Info Hotel</p>
                      {(departure?.hotel_makkah || pkg?.hotel_makkah) && (
                        <p className="flex items-start gap-2 text-foreground">
                          <span className="font-semibold text-muted-foreground shrink-0">Makkah:</span>
                          <span>{departure?.hotel_makkah || pkg?.hotel_makkah}</span>
                        </p>
                      )}
                      {(departure?.hotel_madinah || pkg?.hotel_madinah) && (
                        <p className="flex items-start gap-2 text-foreground">
                          <span className="font-semibold text-muted-foreground shrink-0">Madinah:</span>
                          <span>{departure?.hotel_madinah || pkg?.hotel_madinah}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* D2 — Warning if registered passengers < total_pax */}
          {passengers !== undefined && (passengers?.length || 0) < (booking.total_pax || 1) && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Data Jamaah Belum Lengkap</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Booking ini untuk <strong>{booking.total_pax} jamaah</strong>, namun baru <strong>{passengers?.length || 0} jamaah</strong> yang terdaftar. Segera lengkapi manifest.
                </p>
              </div>
            </div>
          )}

          {/* Section: Passengers Manifest */}
          <Card className="overflow-hidden border-none shadow-md">
            <div className="bg-indigo-500/5 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2 text-indigo-600">
                <Users className="h-5 w-5" />
                Daftar Jamaah (Manifest)
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-bold">{passengers?.length || 0}/{booking.total_pax || 1} Jamaah</Badge>
              </div>
            </div>

            {/* A7, A10, C6 — Enhanced passenger detail table */}
            {passengers && passengers.length > 0 && (
              <div className="px-4 pt-4 pb-2">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">#</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Nama</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Tipe</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Kamar</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Dok.</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Mahram</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">No. Kamar</th>
                        <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground">Permintaan Khusus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {passengers.map((p: any, idx: number) => {
                        const passengerType = (p.passenger_type || 'adult') as string;
                        const passengerTypeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                          adult:  { label: 'Dewasa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', icon: <UserCheck className="h-3 w-3" /> },
                          child:  { label: 'Anak',   color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: <Users className="h-3 w-3" /> },
                          infant: { label: 'Bayi',   color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300', icon: <Baby className="h-3 w-3" /> },
                        };
                        const typeInfo = passengerTypeLabels[passengerType] || passengerTypeLabels.adult;
                        const rtColors: Record<string, string> = {
                          quad: 'bg-purple-100 text-purple-800', triple: 'bg-blue-100 text-blue-800',
                          double: 'bg-emerald-100 text-emerald-800', single: 'bg-amber-100 text-amber-800',
                        };
                        const roomType = p.room_preference || booking.room_type || 'quad';
                        const customerId = p.customer_id || p.customer?.id;
                        const docsForPassenger = (passengerDocs || []).filter((d: any) => d.customer_id === customerId);
                        const hasKtp = docsForPassenger.some((d: any) => d.document_type === 'ktp' && d.status === 'approved');
                        const hasPassport = docsForPassenger.some((d: any) => d.document_type === 'passport' && d.status === 'approved');
                        const hasPhoto = docsForPassenger.some((d: any) => d.document_type === 'photo' && d.status === 'approved');
                        const docScore = [hasKtp, hasPassport, hasPhoto].filter(Boolean).length;
                        // B2 — mahrams for this passenger
                        const mahramForPassenger = (passengerMahrams || []).filter((m: any) => m.customer_id === customerId);
                        const isEditingRoom = editingRoomNumber === p.id;
                        return (
                          <tr key={p.id} className={cn("hover:bg-muted/20 transition-colors", p.is_main_passenger && "bg-primary/5")}>
                            <td className="px-3 py-2.5 text-muted-foreground font-mono">
                              {idx + 1}
                              {p.is_main_passenger && <span className="ml-1 text-[9px] font-bold text-primary/70 bg-primary/10 px-1 rounded">PIC</span>}
                            </td>
                            <td className="px-3 py-2.5 font-semibold max-w-[140px]">
                              <span className="truncate block">{p.full_name || p.customer?.full_name || '-'}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${typeInfo.color}`}>
                                {typeInfo.icon}
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${rtColors[roomType] || 'bg-muted text-muted-foreground'}`}>
                                {(roomType as string).charAt(0).toUpperCase() + (roomType as string).slice(1)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1" title={`KTP: ${hasKtp?'✓':'—'} | Passport: ${hasPassport?'✓':'—'} | Foto: ${hasPhoto?'✓':'—'}`}>
                                {docScore === 3
                                  ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                  : docScore === 0
                                  ? <ShieldAlert className="h-4 w-4 text-red-400" />
                                  : <Shield className="h-4 w-4 text-amber-500" />}
                                <span className={`text-[10px] font-bold ${docScore === 3 ? 'text-emerald-700' : docScore === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                  {docScore}/3
                                </span>
                              </div>
                            </td>
                            {/* B2 — Mahram column */}
                            <td className="px-3 py-2.5 max-w-[120px]">
                              {mahramForPassenger.length > 0 ? (
                                <div className="space-y-0.5">
                                  {mahramForPassenger.map((m: any) => (
                                    <div key={m.id} className="text-[10px]">
                                      <span className="font-semibold truncate block max-w-[100px]" title={m.name}>{m.name}</span>
                                      <span className="text-muted-foreground capitalize">{m.relationship}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">—</span>
                              )}
                            </td>
                            {/* C5 — Room Number (editable) */}
                            <td className="px-3 py-2.5">
                              {isEditingRoom ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={roomNumberValue}
                                    onChange={(e) => setRoomNumberValue(e.target.value)}
                                    placeholder="cth: 201"
                                    className="text-[10px] border rounded px-1.5 py-1 w-16 focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') updateRoomNumberMutation.mutate({ passengerId: p.id, roomNumber: roomNumberValue });
                                      if (e.key === 'Escape') { setEditingRoomNumber(null); setRoomNumberValue(''); }
                                    }}
                                  />
                                  <button
                                    onClick={() => updateRoomNumberMutation.mutate({ passengerId: p.id, roomNumber: roomNumberValue })}
                                    disabled={updateRoomNumberMutation.isPending}
                                    className="text-[9px] bg-emerald-600 text-white rounded px-1.5 py-1 hover:bg-emerald-700 disabled:opacity-50"
                                  >✓</button>
                                  <button
                                    onClick={() => { setEditingRoomNumber(null); setRoomNumberValue(''); }}
                                    className="text-[9px] text-muted-foreground hover:text-foreground"
                                  >✕</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] font-mono ${p.room_number ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                                    {p.room_number || '—'}
                                  </span>
                                  {isAdmin() && (
                                    <button
                                      onClick={() => { setEditingRoomNumber(p.id); setRoomNumberValue(p.room_number || ''); }}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Atur nomor kamar"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 max-w-[180px]">
                              {p.special_requests ? (
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                                  <BriefcaseMedical className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[140px]" title={p.special_requests}>{p.special_requests}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">Dok. = KTP / Passport / Foto terverifikasi. Export manifest lengkap di bawah.</p>
              </div>
            )}

            <CardContent className="p-0 pt-3">
              <BulkPassengerExport
                passengers={passengers || []}
                booking={booking}
                companyInfo={companyInfo}
                bookingId={id}
              />
            </CardContent>
          </Card>

          {/* Section: Document History */}
          <BookingDocumentHistory bookingId={id} />

          {/* Section: Payments History */}
          <Card className="overflow-hidden border-none shadow-md">
            <div className="bg-emerald-500/5 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2 text-emerald-600">
                <CreditCard className="h-5 w-5" />
                Riwayat Pembayaran
              </h2>
              <Button variant="outline" size="sm" className="bg-background text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setShowManagePaymentModal(true)}>
                Kelola Semua
              </Button>
            </div>
            <CardContent className="p-0">
              {!payments || payments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada riwayat pembayaran</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Kode & Tanggal</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Metode</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Jumlah</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Status</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const isPending = payment.status === 'pending';
                        return (
                          <TableRow key={payment.id} className={cn("hover:bg-muted/10 transition-colors", isPending && "bg-amber-50/30")}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono text-xs font-bold">{payment.payment_code}</span>
                                <span className="text-[10px] text-muted-foreground">{formatDate(payment.created_at || '')}</span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize text-xs font-medium">{payment.payment_method || '-'}</TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn("text-[10px] px-2 py-0.5 font-bold uppercase tracking-tighter", getPaymentBadgeClass(payment.status || 'pending'))}>
                                {getPaymentStatusLabel(payment.status || 'pending')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {isPending && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-7 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => handleApprovePayment(payment)}
                                    disabled={verifyPaymentMutation.isPending || !payment.proof_url}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                    Verify
                                  </Button>
                                )}
                                {payment.proof_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setShowProofDialog(true);
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
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

          {/* C7 — Pelacakan Refund (tampil jika status cancelled/refunded) */}
          {(['cancelled', 'refunded'].includes(booking.booking_status ?? '') || (bookingRefunds && bookingRefunds.length > 0)) && (
            <Card className="overflow-hidden border-none shadow-md border-l-4 border-l-orange-400">
              <div className="bg-orange-50 dark:bg-orange-950/20 px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <RotateCcw className="h-5 w-5" />
                  Pelacakan Refund
                </h2>
                {bookingRefunds && bookingRefunds.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200">
                    {bookingRefunds.length} Refund
                  </Badge>
                )}
              </div>
              <CardContent className="p-5">
                {bookingRefunds && bookingRefunds.length > 0 ? (
                  <div className="space-y-3">
                    {bookingRefunds.map((refund) => {
                      const statusColors: Record<string, string> = {
                        pending: 'bg-amber-100 text-amber-800 border-amber-200',
                        processing: 'bg-blue-100 text-blue-800 border-blue-200',
                        completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        rejected: 'bg-red-100 text-red-800 border-red-200',
                      };
                      const statusLabels: Record<string, string> = {
                        pending: 'Menunggu', processing: 'Diproses',
                        completed: 'Selesai', rejected: 'Ditolak',
                      };
                      return (
                        <div key={refund.id} className="p-4 rounded-lg border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-black text-orange-700 dark:text-orange-400">
                              {formatCurrency(refund.amount)}
                            </span>
                            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusColors[refund.status] || 'bg-muted text-muted-foreground border-border'}`}>
                              {statusLabels[refund.status] || refund.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="font-bold uppercase tracking-tight text-muted-foreground text-[9px]">Metode</span>
                              <p className="font-medium capitalize">{refund.method?.replace(/_/g, ' ') || '-'}</p>
                            </div>
                            {refund.account_info && (
                              <div>
                                <span className="font-bold uppercase tracking-tight text-muted-foreground text-[9px]">Info Rekening</span>
                                <p className="font-medium">{refund.account_info}</p>
                              </div>
                            )}
                            {refund.reason && (
                              <div className="col-span-2">
                                <span className="font-bold uppercase tracking-tight text-muted-foreground text-[9px]">Alasan</span>
                                <p className="font-medium">{refund.reason}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t">
                            <span>Dibuat: {dfFormat(new Date(refund.created_at), 'd MMM yyyy', { locale: localeId })}</span>
                            {refund.processed_at && (
                              <span>Diproses: {dfFormat(new Date(refund.processed_at), 'd MMM yyyy', { locale: localeId })}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RotateCcw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Belum ada refund tercatat</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {booking.booking_status === 'cancelled' 
                        ? `Booking dibatalkan. Jika ada pengembalian dana, proses melalui Kelola Pembayaran.`
                        : 'Refund akan muncul di sini jika telah diproses.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Financial Summary & Quick Actions */}
        <div className="space-y-6">
          {/* Payment Summary Card — Rinci */}
          <Card className="border-none shadow-lg overflow-hidden">
            {/* Header: Rincian Harga */}
            <div className="bg-slate-900 text-white p-5">
              <h3 className="font-bold text-xs uppercase tracking-widest opacity-60 mb-4">Rincian Tagihan</h3>
              <div className="space-y-2.5">
                {/* Line Items from booking_line_items table */}
                {lineItems && lineItems.length > 0 ? (
                  lineItems.map((item) => (
                    <div key={item.id} className={cn("flex justify-between text-sm", item.item_type === 'discount' && "text-emerald-400")}>
                      <span className="opacity-80">
                        {item.description} {item.quantity > 1 ? `(${item.quantity}x)` : ''}
                      </span>
                      <span className="font-semibold">
                        {item.total_price < 0 ? '−' : ''}{formatCurrency(Math.abs(item.total_price))}
                      </span>
                    </div>
                  ))
                ) : (
                  /* Fallback if no line items yet */
                  (() => {
                    const getPrice = (rt: string): number => {
                      const fromDep = (departure as any)?.[`price_${rt}`] as number | null | undefined;
                      const fromPkg = (pkg as any)?.[`price_${rt}`] as number | null | undefined;
                      return fromDep || fromPkg || 0;
                    };

                    const rtLabels: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };
                    const rt = (booking.room_type || 'quad') as string;
                    const pricePerPax = getPrice(rt) || (booking.base_price > booking.total_price / 2 && (booking.total_pax ?? 0) > 1 ? Math.round(booking.base_price / (booking.total_pax ?? 1)) : booking.base_price);
                    
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="opacity-80">
                          Paket {rtLabels[rt] || rt} ({booking.total_pax || 1} orang)
                        </span>
                        <span className="font-semibold">{formatCurrency(booking.total_price)}</span>
                      </div>
                    );
                  })()
                )}

                {/* Total */}
                <div className="pt-3 border-t border-white/15 flex justify-between items-end">
                  <span className="text-xs uppercase font-bold opacity-60">Total Tagihan</span>
                  <span className="text-xl font-black">{formatCurrency(booking.total_price)}</span>
                </div>
              </div>
            </div>

            {/* Body: Riwayat Pembayaran */}
            <CardContent className="p-0">
              {/* C2 — Batas Bayar (editable) */}
              <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/30 border-b flex justify-between items-center gap-2">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight shrink-0">Batas Bayar</span>
                {editingDeadline ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={deadlineValue}
                      onChange={(e) => setDeadlineValue(e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => updateDeadlineMutation.mutate(deadlineValue)}
                      disabled={updateDeadlineMutation.isPending || !deadlineValue}
                      className="text-[10px] font-bold bg-emerald-600 text-white rounded px-2 py-1 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updateDeadlineMutation.isPending ? '...' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => setEditingDeadline(false)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-1"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {(booking as any).payment_deadline
                        ? dfFormat(new Date((booking as any).payment_deadline), 'd MMM yyyy', { locale: localeId })
                        : <span className="text-muted-foreground italic">Belum diatur</span>}
                    </span>
                    {(isAdmin() || isFinance) && (
                      <button
                        onClick={() => {
                          setDeadlineValue((booking as any).payment_deadline ? (booking as any).payment_deadline.slice(0, 10) : '');
                          setEditingDeadline(true);
                        }}
                        className="text-amber-600 hover:text-amber-800 transition-colors"
                        title="Edit batas bayar"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Payment records */}
              {payments && payments.length > 0 ? (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Riwayat Pembayaran</p>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{payments.length} Transaksi</span>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full border rounded-lg overflow-hidden">
                    {[...payments].reverse().map((pay: any, idx: number) => {
                      const isSuccess = pay.status === 'paid' || pay.status === 'verified';
                      const isPending = pay.status === 'pending';
                      const isFailed = pay.status === 'failed' || pay.status === 'cancelled';
                      const paymentNo = payments.length - idx;
                      
                      return (
                        <AccordionItem key={pay.id} value={pay.id} className="border-b last:border-0">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between w-full pr-4 text-left">
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-muted-foreground w-4">#{paymentNo}</span>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[9px] h-4 px-1 uppercase font-bold border-none ${
                                      isSuccess ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                      : isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                    }`}>
                                      {pay.status === 'verified' ? 'Verified' : pay.status === 'paid' ? 'Lunas' : pay.status === 'pending' ? 'Pending' : pay.status}
                                    </Badge>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      {pay.payment_method?.toUpperCase() || '—'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {pay.created_at ? dfFormat(new Date(pay.created_at), 'd MMM yyyy', { locale: localeId }) : '-'}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-sm font-bold ${isSuccess ? 'text-slate-900 dark:text-white' : 'text-muted-foreground'}`}>
                                {formatCurrency(pay.amount)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-0 bg-muted/10">
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Metode Pembayaran</p>
                                <p className="text-xs font-semibold">{pay.payment_method?.toUpperCase() || '—'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Tanggal Transaksi</p>
                                <p className="text-xs font-semibold">{pay.created_at ? dfFormat(new Date(pay.created_at), 'PPP', { locale: localeId }) : '-'}</p>
                              </div>
                              <div className="col-span-2 space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Catatan / Keterangan</p>
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-xs text-muted-foreground italic bg-white dark:bg-slate-900 p-2 rounded border flex-1">
                                    {pay.notes || "Tidak ada catatan tambahan."}
                                  </p>
                                  {(isFailed || isSuccess) && (isSuperAdmin() || hasRole('owner')) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const msg = isSuccess
                                          ? "Pembayaran ini sudah berstatus LUNAS. Menghapus data ini akan mempengaruhi saldo tagihan booking. Lanjutkan?"
                                          : "Apakah Anda yakin ingin menghapus data pembayaran gagal ini?";
                                        if (confirm(msg)) {
                                          deletePaymentMutation.mutate(pay.id);
                                        }
                                      }}
                                      disabled={deletePaymentMutation.isPending}
                                    >
                                      <Trash className="h-3.5 w-3.5 mr-1.5" />
                                      Hapus
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ) : (
                <div className="px-5 py-4">
                  <p className="text-xs text-muted-foreground text-center italic">Belum ada pembayaran tercatat</p>
                </div>
              )}

              {/* Summary: paid / remaining */}
              <div className="px-5 pb-5 space-y-3">
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground font-medium">Total Dibayar</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(booking.paid_amount || 0)}</span>
                </div>
                <div className={`p-3 rounded-lg flex justify-between items-center ${
                  (booking.remaining_amount || 0) <= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-destructive/5 border border-destructive/10'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-tighter ${(booking.remaining_amount || 0) <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
                    {(booking.remaining_amount || 0) <= 0 ? 'Lunas' : 'Sisa Tagihan'}
                  </span>
                  <span className={`text-lg font-black ${(booking.remaining_amount || 0) <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
                    {formatCurrency(booking.remaining_amount || 0)}
                  </span>
                </div>

                {/* D5 — Progress Bar with milestones (DP 30%, Cicilan 50%, Lunas 100%) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                    <span>Progress Pelunasan</span>
                    <span>{Math.min(100, Math.round(((booking.paid_amount || 0) / booking.total_price) * 100))}%</span>
                  </div>
                  <div className="relative">
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((booking.paid_amount || 0) / booking.total_price) * 100))}%` }}
                      />
                    </div>
                    {/* Milestone markers */}
                    {[
                      { pct: 30, label: 'DP' },
                      { pct: 50, label: '50%' },
                    ].map(({ pct, label }) => {
                      const paid = Math.min(100, Math.round(((booking.paid_amount || 0) / booking.total_price) * 100));
                      const reached = paid >= pct;
                      return (
                        <div
                          key={pct}
                          className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                          style={{ left: `${pct}%` }}
                        >
                          <div className={`w-1 h-2.5 ${reached ? 'bg-emerald-700' : 'bg-muted-foreground/30'}`} />
                          <span className={`text-[8px] font-bold mt-0.5 ${reached ? 'text-emerald-700' : 'text-muted-foreground/50'}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground/70 font-medium">
                    <span>DP 30% = {formatCurrency(booking.total_price * 0.3)}</span>
                    <span>50% = {formatCurrency(booking.total_price * 0.5)}</span>
                  </div>
                </div>

                {/* Quick pay button */}
                <button
                  onClick={() => setShowManagePaymentModal(true)}
                  className="w-full text-xs font-bold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors"
                >
                  + Tambah / Kelola Pembayaran
                </button>
              </div>
            </CardContent>
          </Card>

          {/* A1 + A3 + D4 — Agent & Branch Info Panel */}
          {(bookingAgent || (booking as any).branch) && (
            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-violet-500/5 px-5 py-3 border-b">
                <h3 className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Info Agen & Cabang
                </h3>
              </div>
              <CardContent className="p-4 space-y-3">
                {bookingAgent && (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Agen</p>
                      <p className="text-sm font-bold text-foreground">{bookingAgent.company_name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{bookingAgent.agent_code}</p>
                    </div>
                    <Link
                      to={`/admin/agents`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 px-2 py-1 rounded border border-violet-200 dark:border-violet-800 transition-colors mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Lihat
                    </Link>
                  </div>
                )}
                {(booking as any).branch && (
                  <div className="flex items-start justify-between gap-2 pt-2 border-t">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Cabang</p>
                      <p className="text-sm font-bold text-foreground">{(booking as any).branch.name}</p>
                      {(booking as any).branch.code && (
                        <p className="text-[11px] font-mono text-muted-foreground">{(booking as any).branch.code}</p>
                      )}
                    </div>
                    <Link
                      to={`/admin/branches`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 transition-colors mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Lihat
                    </Link>
                  </div>
                )}
                {/* Link ke komisi agen */}
                {bookingAgent && (
                  <div className="pt-2 border-t">
                    <Link
                      to={`/agent/commissions`}
                      className="flex items-center justify-center gap-2 w-full text-[10px] font-bold text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-lg py-2 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Lihat Komisi Agen
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions Card */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-muted/50 px-6 py-3 border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aksi Cepat</h3>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button className="w-full justify-start h-11 font-bold text-xs border-2" variant="outline" onClick={handlePrintInvoice}>
                  <Printer className="h-4 w-4 mr-3 text-primary" />
                  CETAK INVOICE PDF
                </Button>
                
                <div className="space-y-2 p-3 rounded-lg border-2 border-dashed bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <Button 
                      className="flex-1 justify-start h-10 font-bold text-xs" 
                      variant="outline" 
                      onClick={() => handlePrintTransactionForm("download")}
                    >
                      <FileText className="h-4 w-4 mr-3 text-amber-600" />
                      FORM TRANSAKSI UMRAH
                    </Button>
                    <Button
                      className="h-10 px-3 font-bold text-xs shrink-0"
                      variant="secondary"
                      title="Pratinjau sebelum download"
                      onClick={() => handlePrintTransactionForm("preview")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={trxPaperSize} onValueChange={(v) => setTrxPaperSize(v as "a4" | "letter")}>
                      <SelectTrigger className="h-8 text-[11px] bg-background">
                        <SelectValue placeholder="Ukuran kertas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={trxOrientation} onValueChange={(v) => setTrxOrientation(v as "portrait" | "landscape")}>
                      <SelectTrigger className="h-8 text-[11px] bg-background">
                        <SelectValue placeholder="Orientasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full justify-start h-11 font-bold text-xs border-2" 
                  variant="outline" 
                  onClick={() => setShowManagePaymentModal(true)}
                >
                  <CreditCard className="h-4 w-4 mr-3 text-emerald-600" />
                  KELOLA PEMBAYARAN
                </Button>
              </div>

              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="w-full h-10 text-[10px] font-bold shadow-sm" 
                    variant="secondary"
                    onClick={() => sendNotificationMutation.mutate('booking_confirmed')}
                    disabled={sendNotificationMutation.isPending}
                  >
                    <Send className="h-3.5 w-3.5 mr-2 text-blue-600" />
                    NOTIF WA
                  </Button>
                  <Button 
                    className="w-full h-10 text-[10px] font-bold shadow-sm" 
                    variant="secondary"
                    onClick={() => sendNotificationMutation.mutate('payment_received')}
                    disabled={sendNotificationMutation.isPending}
                  >
                    <Send className="h-3.5 w-3.5 mr-2 text-amber-600" />
                    REMINDER
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buat Surat — quick document generation from booking data */}
          <BookingDocumentActions booking={booking} companyInfo={companyInfo} passengers={passengers || []} />

          {/* C1 — Catatan Admin (inline editable) */}
          <Card className="border-none shadow-md bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center justify-between gap-2 text-amber-700">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Catatan Admin
                </span>
                {!editingNotes && (isAdmin() || isFinance) && (
                  <button
                    onClick={() => { setNotesValue(booking.notes || ''); setEditingNotes(true); }}
                    className="text-amber-600 hover:text-amber-800 transition-colors"
                    title="Edit catatan"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Tambahkan catatan untuk booking ini..."
                    className="text-xs min-h-[80px] resize-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded border"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => updateNotesMutation.mutate(notesValue)}
                      disabled={updateNotesMutation.isPending}
                      className="text-[10px] font-bold bg-amber-600 text-white rounded px-3 py-1.5 hover:bg-amber-700 disabled:opacity-50"
                    >
                      {updateNotesMutation.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
                    </button>
                  </div>
                </div>
              ) : booking.notes ? (
                <p className="text-xs leading-relaxed italic text-muted-foreground">{booking.notes}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground/50">
                  Belum ada catatan.{(isAdmin() || isFinance) ? ' Klik ✏️ untuk menambahkan.' : ''}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Timeline — B1+D1: Real data from booking_status_history */}
      <div className="mt-2">
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Timeline Aktivitas
            </h2>
            {statusHistory && statusHistory.length > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Data nyata
              </span>
            )}
          </div>
          <CardContent className="p-6">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-5 ml-10">
                {/* Booking Created — always first */}
                <div className="relative">
                  <div className="absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border-2 border-primary/30">
                    <span className="text-[10px] font-bold text-primary">+</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Booking Dibuat</p>
                    <p className="text-[11px] text-muted-foreground">
                      {booking.created_at ? formatDate(booking.created_at) : '-'}
                      {/* A2 — staf yang menginput */}
                      {salesProfile?.full_name
                        ? ` — diinput oleh ${salesProfile.full_name}`
                        : ' — oleh sistem'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Kode: <span className="font-mono font-semibold">{booking.booking_code}</span></p>
                  </div>
                </div>

                {/* Real status history entries (B1, D1) */}
                {statusHistory && statusHistory.length > 0 ? (
                  statusHistory.map((entry) => {
                    const statusColors: Record<string, string> = {
                      confirmed: 'bg-green-100 border-green-400 dark:bg-green-900/40',
                      completed: 'bg-emerald-100 border-emerald-400 dark:bg-emerald-900/40',
                      cancelled: 'bg-red-100 border-red-400 dark:bg-red-900/40',
                      refunded:  'bg-orange-100 border-orange-400 dark:bg-orange-900/40',
                      processing:'bg-blue-100 border-blue-400 dark:bg-blue-900/40',
                      pending:   'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/40',
                    };
                    const colorClass = statusColors[entry.to_status] || 'bg-muted border-border';
                    return (
                      <div key={entry.id} className="relative">
                        <div className={`absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full border-2 ${colorClass}`}>
                          <span className="text-[10px] font-bold">→</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Status berubah → <span className="font-bold">{getBookingStatusLabel(entry.to_status)}</span>
                            {entry.from_status && (
                              <span className="font-normal text-muted-foreground"> (dari {getBookingStatusLabel(entry.from_status)})</span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {entry.created_at ? formatDate(entry.created_at) : '-'}
                            {entry.changed_by_profile?.full_name && (
                              <> — oleh <span className="font-semibold">{entry.changed_by_profile.full_name}</span></>
                            )}
                          </p>
                          {entry.notes && (
                            <p className="text-[11px] text-muted-foreground italic mt-0.5 border-l-2 border-muted pl-2">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Fallback to manual timeline if no status_history records yet */
                  <>
                    {payments && payments.length > 0 && [...payments].reverse().map((pay: any) => (
                      <div key={pay.id} className="relative">
                        <div className={`absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full border-2 ${pay.status === 'paid' || pay.status === 'verified' ? 'bg-green-100 border-green-400' : pay.status === 'pending' ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-100 border-gray-400'}`}>
                          <CreditCard className="h-3 w-3 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Pembayaran {pay.status === 'paid' || pay.status === 'verified' ? 'Diverifikasi' : pay.status === 'pending' ? 'Menunggu Verifikasi' : 'Dibatalkan'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{pay.created_at ? formatDate(pay.created_at) : '-'}</p>
                          <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{pay.amount ? formatCurrency(pay.amount) : '-'} via {pay.payment_method || '-'}</p>
                        </div>
                      </div>
                    ))}
                    <div className="relative">
                      <div className={`absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full border-2 ${booking.booking_status === 'completed' ? 'bg-green-100 border-green-400' : booking.booking_status === 'cancelled' ? 'bg-red-100 border-red-400' : 'bg-blue-100 border-blue-400'}`}>
                        <span className="text-[10px] font-bold text-blue-700">●</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Status Saat Ini</p>
                        <p className="text-[11px] text-muted-foreground">{booking.updated_at ? formatDate(booking.updated_at) : '-'}</p>
                        <p className="text-[11px] font-semibold mt-0.5">{getBookingStatusLabel(booking.booking_status ?? '')}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Payment events interspersed if status_history is present */}
                {statusHistory && statusHistory.length > 0 && payments && payments.length > 0 && (
                  [...payments].reverse().map((pay: any) => (
                    <div key={`pay-${pay.id}`} className="relative">
                      <div className={`absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full border-2 ${pay.status === 'paid' || pay.status === 'verified' ? 'bg-green-100 border-green-400' : pay.status === 'pending' ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-100 border-gray-400'}`}>
                        <CreditCard className="h-3 w-3 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Pembayaran {pay.status === 'paid' || pay.status === 'verified' ? 'Diverifikasi' : pay.status === 'pending' ? 'Menunggu Verifikasi' : 'Dibatalkan'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{pay.created_at ? formatDate(pay.created_at) : '-'}</p>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{pay.amount ? formatCurrency(pay.amount) : '-'} via {pay.payment_method || '-'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Change Confirmation */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Status Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin mengubah status booking ini menjadi "{BOOKING_STATUSES.find(s => s.value === newStatus)?.label}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowStatusConfirm(false)}>Batal</Button>
            <Button
              onClick={() => newStatus && updateStatusMutation.mutate(newStatus)}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ya, Ubah Status
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== REFUND DIALOG (D3) ========== */}
      <Dialog open={showRefundDialog} onOpenChange={(open) => { if (!open) { setShowRefundDialog(false); setNewStatus(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              Konfirmasi Pembatalan Booking
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {/* Alert box */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-3 text-sm text-orange-800 dark:text-orange-300 flex gap-2">
              <TriangleAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Booking <strong>{booking?.booking_code}</strong> atas nama <strong>{customer?.full_name}</strong> akan dibatalkan. Tindakan ini tidak dapat dibatalkan.
              </span>
            </div>

            {/* Jumlah terbayar */}
            <div className="rounded-lg bg-muted/50 border p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Dana yang sudah masuk</span>
              </div>
              <span className="font-bold text-base">{formatCurrency((booking as any)?.paid_amount || 0)}</span>
            </div>

            {/* Alasan pembatalan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alasan Pembatalan</Label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih alasan pembatalan…" />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle: proses refund? */}
            <div className={`rounded-lg border-2 p-4 space-y-4 transition-colors ${processRefundNow ? 'border-primary/30 bg-primary/5' : 'border-muted'}`}>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="process-refund"
                  checked={processRefundNow}
                  onCheckedChange={(v) => setProcessRefundNow(!!v)}
                />
                <Label htmlFor="process-refund" className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Proses refund kepada jamaah
                </Label>
              </div>

              {processRefundNow && (
                <div className="space-y-3 pl-7">
                  {/* Jumlah refund */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Jumlah Refund (Rp)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={(booking as any)?.paid_amount || 0}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      placeholder="0"
                    />
                    {refundAmount > ((booking as any)?.paid_amount || 0) && (
                      <p className="text-xs text-destructive">Jumlah refund melebihi jumlah yang sudah dibayar</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {[100, 75, 50, 25].map((pct) => {
                        const amt = Math.round(((booking as any)?.paid_amount || 0) * pct / 100);
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setRefundAmount(amt)}
                            className="text-[11px] font-semibold px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          >
                            {pct}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metode refund */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metode Refund</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REFUND_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nomor rekening / detail */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {refundMethod === 'transfer_bank' ? 'No. Rekening & Nama Bank' :
                       refundMethod === 'tunai' ? 'Catatan (lokasi/waktu penyerahan)' :
                       'No. Akun / Detail Refund'}
                    </Label>
                    <Textarea
                      rows={2}
                      value={refundAccountInfo}
                      onChange={(e) => setRefundAccountInfo(e.target.value)}
                      placeholder={
                        refundMethod === 'transfer_bank' ? 'Contoh: BCA 1234567890 a.n. Budi Santoso' :
                        refundMethod === 'tunai' ? 'Contoh: Di kantor cabang, Kamis 15 Mei 2025' :
                        'Masukkan detail akun penerima refund…'
                      }
                    />
                  </div>

                  {/* Preview notifikasi */}
                  {refundAmount > 0 && (
                    <div className="text-xs rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-2.5 text-emerald-800 dark:text-emerald-300">
                      <strong>Preview notifikasi ke jamaah:</strong><br />
                      Booking Anda telah dibatalkan. Refund sebesar <strong>{formatCurrency(refundAmount)}</strong> akan diproses melalui <strong>{REFUND_METHODS.find(m => m.value === refundMethod)?.label}</strong> dalam 3–7 hari kerja.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t mt-2">
            <Button
              variant="outline"
              onClick={() => { setShowRefundDialog(false); setNewStatus(null); }}
              disabled={processRefundMutation.isPending}
            >
              Batalkan
            </Button>
            <Button
              variant="destructive"
              disabled={
                processRefundMutation.isPending ||
                !cancellationReason ||
                (processRefundNow && refundAmount > ((booking as any)?.paid_amount || 0))
              }
              onClick={() => processRefundMutation.mutate({ withRefund: processRefundNow && refundAmount > 0 })}
            >
              {processRefundMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses…</>
                : processRefundNow && refundAmount > 0
                  ? <><RotateCcw className="h-4 w-4 mr-2" /> Batalkan & Proses Refund</>
                  : <><XCircle className="h-4 w-4 mr-2" /> Batalkan Booking</>
              }
            </Button>
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
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {selectedPayment?.status === 'pending' && (
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleApprovePayment(selectedPayment)}
                disabled={verifyPaymentMutation.isPending}
              >
                {verifyPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Setujui Pembayaran
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowProofDialog(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Payment Modal */}
      <ManagePaymentModal
        isOpen={showManagePaymentModal}
        onOpenChange={setShowManagePaymentModal}
        bookingId={id!}
        bookingCode={booking.booking_code}
        customerName={customer?.full_name || '-'}
        canAddPayment={canAddPayment}
        canVerifyPayment={canVerifyPayment}
      />

      {booking && (
        <ChangePackageDialogV2
          isOpen={showChangePackageDialog}
          onClose={() => setShowChangePackageDialog(false)}
          bookingId={id || ""}
          currentPackageId={booking?.departure?.package_id || ""}
          currentDepartureId={booking?.departure_id || ""}
          currentDepartureDate={booking?.departure?.departure_date || ""}
        />
      )}

      {booking && (
        <ChangeRoomTypeDialog
          isOpen={showChangeRoomTypeDialog}
          onClose={() => setShowChangeRoomTypeDialog(false)}
          bookingId={id || ""}
          currentRoomType={booking.room_type || "quad"}
          currentDepartureId={booking?.departure_id || ""}
          currentTotalPrice={booking.total_price || 0}
          totalPax={booking.total_pax || 1}
          paidAmount={booking.paid_amount || 0}
        />
      )}

      {/* Per-passenger room type assignment */}
      {booking && passengers && (
        <RoomTypeAssignmentDialog
          isOpen={showRoomTypeAssignmentDialog}
          onClose={() => setShowRoomTypeAssignmentDialog(false)}
          bookingId={id || ""}
          passengers={passengers}
          departure={departure}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus booking ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait termasuk penumpang dan pembayaran.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DocumentPreviewModal
        open={!!transactionFormPreview}
        onOpenChange={(o) => {
          if (!o && transactionFormPreview) {
            URL.revokeObjectURL(transactionFormPreview.url);
            setTransactionFormPreview(null);
          }
        }}
        documentUrl={transactionFormPreview?.url ?? ""}
        documentName={`FormTransaksi-${booking?.booking_code ?? "preview"}.pdf`}
        pageCount={transactionFormPreview?.pageCount}
        warnings={transactionFormPreview?.warnings}
      />
    </div>
  );
}
