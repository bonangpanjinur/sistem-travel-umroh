import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "./format";
import { exportToExcel, exportToPDF } from "./export-utils";

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  partial: "Sebagian",
  paid: "Lunas",
  refunded: "Refund",
  failed: "Gagal",
};

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Dibayar",
};

export const PASSENGER_TYPE_LABELS: Record<string, string> = {
  adult: "Dewasa",
  dewasa: "Dewasa",
  child: "Anak",
  anak: "Anak",
  infant: "Bayi",
  bayi: "Bayi",
};

export const DOC_STATUS_LABELS: Record<string, string> = {
  complete: "Lengkap",
  partial: "Sebagian",
  none: "Kurang",
};

export const isGenderMale = (g: string | null) => 
  g === "male" || g === "laki-laki" || g === "L" || g === "pria";

// --- Columns Definitions ---

export const getBookingColumns = () => [
  { header: 'Kode Booking', accessor: 'booking_code', width: 18 },
  { header: 'Customer', accessor: (r: any) => r.customer?.full_name || '-', width: 25 },
  { header: 'Telepon', accessor: (r: any) => r.customer?.phone || '-', width: 15 },
  { header: 'Paket', accessor: (r: any) => r.departure?.package?.name || '-', width: 30 },
  { header: 'Keberangkatan', accessor: (r: any) => 
    r.departure?.departure_date ? format(new Date(r.departure.departure_date), 'd MMM yyyy', { locale: id }) : '-', width: 15 },
  { header: 'Pax', accessor: 'total_pax', width: 8 },
  { header: 'Tipe Kamar', accessor: 'room_type', width: 12 },
  { header: 'Total Harga', accessor: (r: any) => formatCurrency(r.total_price), width: 18 },
  { header: 'Dibayar', accessor: (r: any) => formatCurrency(r.paid_amount), width: 18 },
  { header: 'Sisa', accessor: (r: any) => formatCurrency(r.remaining_amount), width: 18 },
  { header: 'Status Booking', accessor: (r: any) => BOOKING_STATUS_LABELS[r.booking_status] || r.booking_status, width: 15 },
  { header: 'Status Bayar', accessor: (r: any) => PAYMENT_STATUS_LABELS[r.payment_status] || r.payment_status, width: 12 },
  { header: 'Tanggal', accessor: (r: any) => format(new Date(r.created_at), 'd MMM yyyy', { locale: id }), width: 12 },
];

export const getPaymentColumns = () => [
  { header: 'Kode Pembayaran', accessor: 'payment_code', width: 20 },
  { header: 'Kode Booking', accessor: (r: any) => r.booking?.booking_code || '-', width: 18 },
  { header: 'Customer', accessor: (r: any) => r.booking?.customer?.full_name || '-', width: 25 },
  { header: 'Metode', accessor: (r: any) => r.payment_method || '-', width: 15 },
  { header: 'Bank', accessor: (r: any) => r.bank_name || '-', width: 15 },
  { header: 'Jumlah', accessor: (r: any) => formatCurrency(r.amount), width: 18 },
  { header: 'Status', accessor: (r: any) => PAYMENT_STATUS_LABELS[r.status] || r.status, width: 12 },
  { header: 'Tanggal Bayar', accessor: (r: any) => format(new Date(r.created_at), 'd MMM yyyy', { locale: id }), width: 15 },
  { header: 'Tanggal Verifikasi', accessor: (r: any) => 
    r.verified_at ? format(new Date(r.verified_at), 'd MMM yyyy', { locale: id }) : '-', width: 15 },
];

export const getManifestColumns = () => [
  { header: "No", accessor: (r: any, i: number) => i + 1, width: 5 },
  { header: "Nama Lengkap", accessor: "full_name", width: 30 },
  { header: "L/P", accessor: (r: any) => isGenderMale(r.gender) ? "L" : "P", width: 5 },
  { header: "Tipe", accessor: (r: any) => PASSENGER_TYPE_LABELS[r.passenger_type || "adult"] || "Dewasa", width: 10 },
  { header: "Tgl Lahir", accessor: (r: any) => r.birth_date ? format(parseISO(r.birth_date), "dd/MM/yyyy") : "-", width: 12 },
  { header: "Kewarganegaraan", accessor: (r: any) => r.nationality || "Indonesia", width: 15 },
  { header: "No Paspor", accessor: (r: any) => r.passport_number || "-", width: 15 },
  { header: "Berlaku s.d.", accessor: (r: any) => r.passport_expiry ? format(parseISO(r.passport_expiry), "dd/MM/yyyy") : "-", width: 12 },
  { header: "No HP", accessor: (r: any) => r.phone || "-", width: 15 },
  { header: "Kode Booking", accessor: (r: any) => r.booking_code || "-", width: 15 },
  { header: "Tipe Kamar", accessor: (r: any) => r.room_preference || r.room_type || "-", width: 15 },
  { header: "No Kamar", accessor: (r: any) => r.room_number || "-", width: 10 },
  { header: "Status Dok.", accessor: (r: any) => DOC_STATUS_LABELS[r.doc_status] || "-", width: 12 },
];

export const getCommissionColumns = () => [
  { header: 'Agen', accessor: (r: any) => r.agent?.company_name || '-', width: 25 },
  { header: 'Kode Booking', accessor: (r: any) => r.booking?.booking_code || '-', width: 18 },
  { header: 'Jamaah', accessor: (r: any) => r.booking?.customer?.full_name || '-', width: 25 },
  { header: 'Komisi', accessor: (r: any) => formatCurrency(r.commission_amount || 0), width: 18 },
  { header: 'Status', accessor: (r: any) => COMMISSION_STATUS_LABELS[r.status] || r.status, width: 12 },
  { header: 'Tanggal', accessor: (r: any) => r.created_at ? format(parseISO(r.created_at), "dd/MM/yyyy") : "-", width: 15 },
];

// --- Export Functions ---

export const exportReport = (
  type: 'excel' | 'pdf',
  data: any[],
  columns: any[],
  filename: string,
  title: string,
  subtitle?: string
) => {
  if (type === 'excel') {
    exportToExcel(data, columns, filename);
  } else {
    exportToPDF(data, columns, filename, title, subtitle);
  }
};
