import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  XCircle, Eye, AlertCircle, Loader2, Pencil, Trash 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { generateInvoice, type InvoiceData } from "@/lib/document-generator";
import { generateTransactionForm, DEFAULT_TEMPLATE, type PaymentInfoBlock } from "@/lib/transaction-form-generator";
import { useAuth } from "@/hooks/useAuth";
import { ManagePaymentModal } from "@/components/admin/ManagePaymentModal";
import { ChangePackageDialogV2 } from "@/components/admin/ChangePackageDialogV2";
import { ChangeRoomTypeDialog } from "@/components/admin/ChangeRoomTypeDialog";
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
  
  // Payment management state
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showManagePaymentModal, setShowManagePaymentModal] = useState(false);
  const [showChangePackageDialog, setShowChangePackageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeRoomTypeDialog, setShowChangeRoomTypeDialog] = useState(false);

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

  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          departure:departures(
            *,
            package:packages(*),
            departure_airport:airports!departures_departure_airport_id_fkey(code, name, city),
            arrival_airport:airports!departures_arrival_airport_id_fkey(code, name, city)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
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

    const invoiceData = {
      invoiceNumber: `INV-${booking.booking_code}`,
      invoiceDate: new Date(booking.created_at || new Date()),
      dueDate: booking.payment_deadline ? new Date(booking.payment_deadline) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      customer: {
        name: booking.customer.full_name || '-',
        address: [booking.customer.address, booking.customer.city, booking.customer.province].filter(Boolean).join(', ') || '-',
        phone: booking.customer.phone || '-',
        email: booking.customer.email || undefined,
      },
      items: [
        {
          description: `Paket ${pkg?.name || 'Umrah'} - Kamar ${getRoomTypeLabel(booking.room_type)} (${paxLabel})\nKeberangkatan: ${departure?.departure_date ? formatDate(departure.departure_date) : '-'}`,
          quantity: booking.total_pax || 1,
          unitPrice: booking.base_price / (booking.total_pax || 1),
          total: booking.base_price,
        },
        ...(booking.addons_price && booking.addons_price > 0 ? [{
          description: 'Biaya Tambahan / Add-ons',
          quantity: 1,
          unitPrice: booking.addons_price,
          total: booking.addons_price,
        }] : []),
      ],
      subtotal: booking.base_price + (booking.addons_price || 0),
      discount: booking.discount_amount || undefined,
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

  const handlePrintTransactionForm = async () => {
    if (!booking || !booking.customer) return;

    const departure = booking.departure as any;
    const pkg = departure?.package;

    // Build template: use saved template or default
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
        }
      : DEFAULT_TEMPLATE;

    // Build passenger list from booking_passengers
    const passengerList = (passengers ?? []).map((p: any) => {
      const basePrice = booking.base_price / (booking.total_pax || 1);
      const discount = booking.discount_amount
        ? booking.discount_amount / (booking.total_pax || 1)
        : 0;
      return {
        name: p.customer?.full_name ?? p.full_name ?? "-",
        roomType: getRoomTypeLabel(booking.room_type),
        basePrice,
        additionalCost: booking.addons_price
          ? booking.addons_price / (booking.total_pax || 1)
          : 0,
        discount,
        totalBill: basePrice - discount + (booking.addons_price ? booking.addons_price / (booking.total_pax || 1) : 0),
      };
    });

    // If no passengers recorded, add booking holder
    if (passengerList.length === 0) {
      const basePrice = booking.base_price / (booking.total_pax || 1);
      const discount = booking.discount_amount ? booking.discount_amount / (booking.total_pax || 1) : 0;
      passengerList.push({
        name: booking.customer.full_name ?? "-",
        roomType: getRoomTypeLabel(booking.room_type),
        basePrice,
        additionalCost: 0,
        discount,
        totalBill: basePrice - discount,
      });
    }

    const formData = {
      transactionCode: booking.booking_code ?? `TRX-${booking.id.slice(0, 8).toUpperCase()}`,
      customerCode: (booking.customer as any)?.customer_code ?? "-",
      transactionDate: new Date(booking.created_at ?? new Date()),
      referenceAgent: (booking as any).agent_name ?? (booking as any).agent?.full_name ?? undefined,
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
        pricePerPax: booking.base_price / (booking.total_pax || 1),
        paxCount: booking.total_pax ?? 1,
        roomCount: Math.ceil((booking.total_pax ?? 1) / 2),
      }],
      discounts: booking.discount_amount
        ? [{ label: (booking as any).discount_label ?? "DISKON", amount: booking.discount_amount }]
        : undefined,
      totalPrice: booking.total_price,
      notes: booking.notes ?? undefined,
      passengers: passengerList,
    };

    const company = {
      name: companyInfo?.name ?? "PT. Umrah Haji Travel",
      address: companyInfo?.address ?? "-",
      phone: companyInfo?.phone ?? "-",
      email: companyInfo?.email ?? "-",
      logo: companyInfo?.logo ?? undefined,
    };

    try {
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
    } catch (e: any) {
      toast.error("Gagal generate form transaksi: " + e.message);
    }
  };

  const handleStatusChange = (status: BookingStatus) => {
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

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Booking tidak ditemukan</h2>
        <Button asChild className="mt-4">
          <Link to="/admin/bookings">Kembali ke Daftar Booking</Link>
        </Button>
      </div>
    );
  }

  const customer = booking.customer as any;
  const departure = booking.departure as any;
  const pkg = departure?.package;

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
                <Badge variant={getStatusBadgeVariant(booking.booking_status ?? '')} className="px-3 py-1 text-xs uppercase tracking-wider font-bold">
                  {getBookingStatusLabel(booking.booking_status ?? '')}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dibuat pada {formatDate(booking.created_at ?? '')}
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
                    <p className="text-sm flex items-center gap-2 font-medium">
                      <Phone className="h-3.5 w-3.5 text-primary/60" />
                      {customer?.phone || '-'}
                    </p>
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-semibold">{getRoomTypeLabel(booking.room_type)}</Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[10px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setShowChangeRoomTypeDialog(true)}
                        >
                          <Pencil className="h-3 w-3" />
                          Ubah
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
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span>Berangkat: {departure?.departure_date ? formatDate(departure.departure_date) : '-'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section: Passengers Manifest */}
          <Card className="overflow-hidden border-none shadow-md">
            <div className="bg-indigo-500/5 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2 text-indigo-600">
                <Users className="h-5 w-5" />
                Daftar Jamaah (Manifest)
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-bold">{passengers?.length || 0} Terdaftar</Badge>
              </div>
            </div>
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
        </div>

        {/* Sidebar: Financial Summary & Quick Actions */}
        <div className="space-y-6">
          {/* Payment Summary Card */}
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="bg-slate-900 text-white p-6">
              <h3 className="font-bold text-sm uppercase tracking-widest opacity-70 mb-4">Ringkasan Pembayaran</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="opacity-70">Harga Paket</span>
                  <span className="font-medium">{formatCurrency(booking.base_price)}</span>
                </div>
                {(booking.addons_price || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Tambahan</span>
                    <span className="font-medium">{formatCurrency(booking.addons_price || 0)}</span>
                  </div>
                )}
                {(booking.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Diskon</span>
                    <span className="font-medium">-{formatCurrency(booking.discount_amount || 0)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                  <span className="text-xs uppercase font-bold opacity-60">Total Tagihan</span>
                  <span className="text-xl font-black">{formatCurrency(booking.total_price)}</span>
                </div>
              </div>
            </div>
            <CardContent className="p-6 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Telah Dibayar</span>
                <span className="text-emerald-600 font-bold">{formatCurrency(booking.paid_amount || 0)}</span>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 flex justify-between items-center">
                <span className="text-xs font-bold text-destructive uppercase tracking-tighter">Sisa Tagihan</span>
                <span className="text-lg font-black text-destructive">{formatCurrency(booking.remaining_amount || 0)}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span>Progress Pelunasan</span>
                  <span>{Math.round(((booking.paid_amount || 0) / booking.total_price) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round(((booking.paid_amount || 0) / booking.total_price) * 100))}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-muted/50 px-6 py-3 border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aksi Cepat</h3>
            </div>
            <CardContent className="p-4 space-y-2">
              <Button className="w-full justify-start h-10 font-bold text-xs" variant="outline" onClick={handlePrintInvoice}>
                <Printer className="h-4 w-4 mr-3 text-primary" />
                CETAK INVOICE PDF
              </Button>
              <Button className="w-full justify-start h-10 font-bold text-xs" variant="outline" onClick={handlePrintTransactionForm}>
                <FileText className="h-4 w-4 mr-3 text-amber-600" />
                FORM TRANSAKSI UMRAH
              </Button>
              <Button 
                className="w-full justify-start h-10 font-bold text-xs" 
                variant="outline" 
                onClick={() => setShowManagePaymentModal(true)}
              >
                <CreditCard className="h-4 w-4 mr-3 text-emerald-600" />
                KELOLA PEMBAYARAN
              </Button>
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  className="w-full h-9 text-[10px] font-bold" 
                  variant="secondary"
                  onClick={() => sendNotificationMutation.mutate('booking_confirmed')}
                  disabled={sendNotificationMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5 mr-2 text-blue-600" />
                  NOTIF WA
                </Button>
                <Button 
                  className="w-full h-9 text-[10px] font-bold" 
                  variant="secondary"
                  onClick={() => sendNotificationMutation.mutate('payment_received')}
                  disabled={sendNotificationMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5 mr-2 text-amber-600" />
                  REMINDER
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Buat Surat — quick document generation from booking data */}
          <BookingDocumentActions booking={booking} companyInfo={companyInfo} />

          {booking.notes && (
            <Card className="border-none shadow-md bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-amber-700">
                  <FileText className="h-4 w-4" />
                  Catatan Admin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed italic text-muted-foreground">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mt-2">
        <Card className="border-none shadow-md overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b flex items-center gap-2">
            <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Timeline Aktivitas</h2>
          </div>
          <CardContent className="p-6">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-5 ml-10">
                {/* Booking Created */}
                <div className="relative">
                  <div className="absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 border-2 border-primary/30">
                    <span className="text-[10px] font-bold text-primary">+</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Booking Dibuat</p>
                    <p className="text-[11px] text-muted-foreground">{booking.created_at ? formatDate(booking.created_at) : '-'} — oleh sistem</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Kode: <span className="font-mono font-semibold">{booking.booking_code}</span></p>
                  </div>
                </div>
                {/* Payment Events */}
                {payments && payments.length > 0 && [...payments].reverse().map((pay: any) => (
                  <div key={pay.id} className="relative">
                    <div className={`absolute -left-[46px] flex items-center justify-center w-7 h-7 rounded-full border-2 ${pay.status === 'paid' || pay.status === 'verified' ? 'bg-green-100 border-green-400' : pay.status === 'pending' ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-100 border-gray-400'}`}>
                      <span className="text-[10px] font-bold text-emerald-700">₫</span>
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
                {/* Current Status */}
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
    </div>
  );
}
