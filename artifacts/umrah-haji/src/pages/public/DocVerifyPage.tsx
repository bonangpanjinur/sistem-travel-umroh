import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CheckCircle2, XCircle, FileText, Calendar, User,
  Package, AlertTriangle, ShieldCheck, Home
} from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || "";

async function fetchVerify(token: string) {
  const r = await fetch(`${BASE}/documents/verify/${token}`);
  if (!r.ok) throw new Error("Token tidak valid atau dokumen tidak ditemukan");
  return r.json();
}

const DOC_LABELS: Record<string, string> = {
  eticket: "E-Ticket Perjalanan",
  invoice: "Invoice / Kwitansi Pembayaran",
  certificate: "Sertifikat Umrah",
  jamaah_leave: "Surat Izin Jamaah",
  passport_letter: "Surat Pengantar Paspor",
  employee_leave: "Surat Izin Karyawan",
  general_letter: "Surat Umum",
  lunas: "Surat Keterangan Lunas",
  mahram: "Surat Mahram",
  itinerary: "Itinerary Perjalanan",
};

export default function DocVerifyPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["doc-verify", token],
    queryFn: () => fetchVerify(token!),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verifikasi Dokumen</h1>
          <p className="text-gray-500 text-sm mt-1">Pemeriksaan keaslian dokumen perjalanan</p>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-red-700 mb-2">Dokumen Tidak Ditemukan</h2>
              <p className="text-red-600 text-sm">
                Token verifikasi tidak valid, sudah kadaluarsa, atau dokumen telah dihapus.
                Pastikan Anda memindai QR code yang benar dari dokumen asli.
              </p>
              <Badge variant="destructive" className="mt-4">Tidak Valid</Badge>
            </CardContent>
          </Card>
        )}

        {data && (
          <Card className="border-emerald-200 bg-white shadow-md">
            <CardHeader className="pb-3 border-b border-emerald-100 bg-emerald-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Dokumen Terverifikasi
                </CardTitle>
                <Badge className="bg-emerald-600 text-white">ASLI</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Jenis Dokumen</p>
                  <p className="font-semibold text-gray-800">
                    {DOC_LABELS[data.doc_type] || data.doc_type}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Nama Jamaah</p>
                  <p className="font-semibold text-gray-800">{data.customer_name || "-"}</p>
                </div>
              </div>

              {data.booking_code && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Kode Booking</p>
                    <p className="font-semibold text-gray-800 font-mono">{data.booking_code}</p>
                  </div>
                </div>
              )}

              {data.package_name && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Paket Perjalanan</p>
                    <p className="font-semibold text-gray-800">{data.package_name}</p>
                  </div>
                </div>
              )}

              {data.departure_date && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Tanggal Keberangkatan</p>
                    <p className="font-semibold text-gray-800">
                      {format(new Date(data.departure_date), "d MMMM yyyy", { locale: localeId })}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Diterbitkan: {data.issued_at
                    ? format(new Date(data.issued_at), "d MMM yyyy, HH:mm", { locale: localeId })
                    : "-"}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">Token: {token?.slice(0, 16)}...</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900">
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Layanan verifikasi dokumen Vinstour Travel — resmi dan terpercaya
        </p>
      </div>
    </div>
  );
}
