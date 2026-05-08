import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Stamp, Award, Ticket, FileText, ClipboardSignature } from "lucide-react";
import {
  generatePassportLetter,
  generateJamaahLeaveLetter,
  generateUmrahCertificate,
  generateETicket,
  generateGeneralLetter,
  type JamaahLeaveLetterData,
  type UmrahCertificateData,
  type ETicketData,
  type GeneralLetterData,
  type CompanyInfo,
} from "@/lib/document-generator";

interface Props {
  booking: any;
  companyInfo: CompanyInfo;
}

type DialogType = "cuti-jamaah" | "general-letter" | null;

export function BookingDocumentActions({ booking, companyInfo }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const customer = booking?.customer as any;
  const departure = booking?.departure as any;
  const pkg = departure?.package;

  // ── Surat Paspor ──────────────────────────────────────────────────────────
  const handlePassportLetter = async () => {
    if (!customer) return;
    setLoading("passport");
    try {
      const doc = await generatePassportLetter(
        {
          customerName: customer.full_name || "-",
          nik: customer.nik || "-",
          birthPlace: customer.birth_place || "-",
          birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
          address:
            [customer.address, customer.city, customer.province]
              .filter(Boolean)
              .join(", ") || "-",
          phone: customer.phone || "-",
          purpose: pkg?.package_type === "haji" ? "Ibadah Haji" : "Ibadah Umrah",
          departureDate: departure?.departure_date
            ? new Date(departure.departure_date)
            : undefined,
        },
        `PASPOR/${new Date().getFullYear()}/${booking.booking_code}`,
        companyInfo
      );
      doc.save(`surat-paspor-${customer.full_name?.replace(/\s+/g, "-") ?? "jamaah"}.pdf`);
      toast.success("Surat permohonan paspor berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat surat paspor");
    } finally {
      setLoading(null);
    }
  };

  // ── Sertifikat Umrah ──────────────────────────────────────────────────────
  const handleCertificate = async () => {
    if (!customer) return;
    setLoading("certificate");
    try {
      const certData: UmrahCertificateData = {
        participantName: customer.full_name || "-",
        passportNumber: customer.passport_number || "-",
        birthPlace: customer.birth_place || "-",
        birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
        packageName: pkg?.name || "-",
        departureDate: departure?.departure_date
          ? new Date(departure.departure_date)
          : new Date(),
        returnDate: departure?.return_date
          ? new Date(departure.return_date)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        certificateNumber: `CERT/${new Date().getFullYear()}/${booking.booking_code}`,
      };
      const doc = await generateUmrahCertificate(certData, companyInfo);
      doc.save(
        `sertifikat-umrah-${customer.full_name?.replace(/\s+/g, "-") ?? "jamaah"}.pdf`
      );
      toast.success("Sertifikat Umrah berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat sertifikat");
    } finally {
      setLoading(null);
    }
  };

  // ── E-Ticket ──────────────────────────────────────────────────────────────
  const handleETicket = async () => {
    if (!customer || !departure) return;
    setLoading("eticket");
    try {
      const ticketData: ETicketData = {
        bookingCode: booking.booking_code || "-",
        passengerName: customer.full_name || "-",
        passportNumber: customer.passport_number || "-",
        packageName: pkg?.name || "-",
        departureDate: departure.departure_date
          ? new Date(departure.departure_date)
          : new Date(),
        returnDate: departure.return_date
          ? new Date(departure.return_date)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        departureAirport:
          departure.departure_airport?.city ||
          departure.departure_airport?.code ||
          "Jakarta",
        arrivalAirport:
          departure.arrival_airport?.city ||
          departure.arrival_airport?.code ||
          "Jeddah",
        flightNumber: departure.flight_number || undefined,
        airline: pkg?.airline?.name || undefined,
        departureTime: departure.departure_time || undefined,
        hotelMakkah: departure.hotel_makkah || pkg?.hotel_makkah || undefined,
        hotelMadinah: departure.hotel_madinah || pkg?.hotel_madinah || undefined,
        roomType: booking.room_type || "quad",
        seatNumber: undefined,
      };
      const doc = await generateETicket(ticketData, companyInfo);
      doc.save(
        `eticket-${booking.booking_code || customer.full_name?.replace(/\s+/g, "-")}.pdf`
      );
      toast.success("E-Ticket berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat e-ticket");
    } finally {
      setLoading(null);
    }
  };

  // ── Surat Cuti Jamaah — dialog state ─────────────────────────────────────
  const [cutiForm, setCutiForm] = useState({
    employerName: "",
    employerPosition: "",
    employerInstitution: "",
    employerAddress: "",
    startDate: departure?.departure_date
      ? departure.departure_date.slice(0, 10)
      : "",
    endDate: departure?.return_date
      ? departure.return_date.slice(0, 10)
      : "",
    purpose: pkg?.package_type === "haji" ? "Haji" : "Umrah",
  });

  const handleCutiJamaah = async () => {
    if (!customer) return;
    setLoading("cuti");
    try {
      const data: JamaahLeaveLetterData = {
        jamaahName: customer.full_name || "-",
        nik: customer.nik || "-",
        birthPlace: customer.birth_place || "-",
        birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
        address:
          [customer.address, customer.city, customer.province]
            .filter(Boolean)
            .join(", ") || "-",
        employerName: cutiForm.employerName || "-",
        employerPosition: cutiForm.employerPosition || undefined,
        employerInstitution: cutiForm.employerInstitution || "-",
        employerAddress: cutiForm.employerAddress || "-",
        startDate: cutiForm.startDate ? new Date(cutiForm.startDate) : new Date(),
        endDate: cutiForm.endDate ? new Date(cutiForm.endDate) : new Date(),
        purpose: cutiForm.purpose,
        departureDate: departure?.departure_date
          ? new Date(departure.departure_date)
          : undefined,
      };
      const doc = await generateJamaahLeaveLetter(
        data,
        `CUTI/${new Date().getFullYear()}/${booking.booking_code}`,
        companyInfo
      );
      doc.save(
        `surat-cuti-${customer.full_name?.replace(/\s+/g, "-") ?? "jamaah"}.pdf`
      );
      toast.success("Surat cuti jamaah berhasil diunduh");
      setOpenDialog(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat surat cuti");
    } finally {
      setLoading(null);
    }
  };

  // ── Surat Umum — dialog state ─────────────────────────────────────────────
  const [generalForm, setGeneralForm] = useState({
    recipientName: "",
    recipientPosition: "",
    recipientInstitution: "",
    recipientAddress: "",
    subject: "",
    content: "",
    signatoryName: "",
    signatoryPosition: "Pimpinan",
  });

  const handleGeneralLetter = async () => {
    if (!generalForm.recipientName || !generalForm.subject || !generalForm.content) {
      toast.error("Lengkapi field yang wajib diisi");
      return;
    }
    setLoading("general");
    try {
      const data: GeneralLetterData = {
        letterNumber: `SURAT/${new Date().getFullYear()}/${booking.booking_code}`,
        letterDate: new Date(),
        recipient: {
          name: generalForm.recipientName,
          position: generalForm.recipientPosition || undefined,
          institution: generalForm.recipientInstitution || undefined,
          address: generalForm.recipientAddress || undefined,
        },
        subject: generalForm.subject,
        content: generalForm.content,
        signatory: {
          name: generalForm.signatoryName || companyInfo.name,
          position: generalForm.signatoryPosition || "Pimpinan",
        },
      };
      const doc = await generateGeneralLetter(data, companyInfo);
      doc.save(`surat-${booking.booking_code}-${Date.now()}.pdf`);
      toast.success("Surat berhasil diunduh");
      setOpenDialog(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat surat");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (key: string) => loading === key;

  return (
    <>
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-violet-500/5 px-6 py-3 border-b">
          <h3 className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Buat Surat
          </h3>
        </div>
        <CardContent className="p-4 space-y-2">
          {/* Surat Paspor — direct */}
          <Button
            className="w-full justify-start h-10 font-bold text-xs"
            variant="outline"
            onClick={handlePassportLetter}
            disabled={!!loading}
          >
            {isLoading("passport") ? (
              <Loader2 className="h-4 w-4 mr-3 animate-spin text-violet-600" />
            ) : (
              <Stamp className="h-4 w-4 mr-3 text-violet-600" />
            )}
            SURAT PASPOR
          </Button>

          {/* Surat Cuti Jamaah — dialog */}
          <Button
            className="w-full justify-start h-10 font-bold text-xs"
            variant="outline"
            onClick={() => setOpenDialog("cuti-jamaah")}
            disabled={!!loading}
          >
            <ClipboardSignature className="h-4 w-4 mr-3 text-orange-500" />
            SURAT CUTI JAMAAH
          </Button>

          <Separator className="my-1" />

          {/* Sertifikat Umrah — direct */}
          <Button
            className="w-full justify-start h-10 font-bold text-xs"
            variant="outline"
            onClick={handleCertificate}
            disabled={!!loading}
          >
            {isLoading("certificate") ? (
              <Loader2 className="h-4 w-4 mr-3 animate-spin text-emerald-600" />
            ) : (
              <Award className="h-4 w-4 mr-3 text-emerald-600" />
            )}
            SERTIFIKAT UMRAH
          </Button>

          {/* E-Ticket — direct */}
          <Button
            className="w-full justify-start h-10 font-bold text-xs"
            variant="outline"
            onClick={handleETicket}
            disabled={!!loading}
          >
            {isLoading("eticket") ? (
              <Loader2 className="h-4 w-4 mr-3 animate-spin text-sky-600" />
            ) : (
              <Ticket className="h-4 w-4 mr-3 text-sky-600" />
            )}
            E-TICKET
          </Button>

          {/* Surat Umum — dialog */}
          <Button
            className="w-full justify-start h-10 font-bold text-xs"
            variant="outline"
            onClick={() => setOpenDialog("general-letter")}
            disabled={!!loading}
          >
            <FileText className="h-4 w-4 mr-3 text-slate-500" />
            SURAT UMUM
          </Button>
        </CardContent>
      </Card>

      {/* ── Dialog: Surat Cuti Jamaah ───────────────────────────────────────── */}
      <Dialog open={openDialog === "cuti-jamaah"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardSignature className="h-5 w-5 text-orange-500" />
              Surat Cuti Ibadah — {customer?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider">Data Jamaah (dari booking)</p>
              <p className="font-medium">{customer?.full_name} · NIK: {customer?.nik || "-"}</p>
              <p className="text-muted-foreground">{[customer?.address, customer?.city].filter(Boolean).join(", ") || "-"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tgl Mulai Cuti <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={cutiForm.startDate}
                  onChange={(e) => setCutiForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tgl Selesai Cuti <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={cutiForm.endDate}
                  onChange={(e) => setCutiForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tujuan Ibadah</Label>
              <Select
                value={cutiForm.purpose}
                onValueChange={(v) => setCutiForm((f) => ({ ...f, purpose: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umrah">Umrah</SelectItem>
                  <SelectItem value="Haji">Haji</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instansi/Atasan yang Dituju</p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Atasan / Pejabat <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Bpk/Ibu ..."
                value={cutiForm.employerName}
                onChange={(e) => setCutiForm((f) => ({ ...f, employerName: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Jabatan Atasan</Label>
              <Input
                placeholder="Manajer HRD, Kepala Sekolah, dll."
                value={cutiForm.employerPosition}
                onChange={(e) => setCutiForm((f) => ({ ...f, employerPosition: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Instansi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="PT. ABC, Dinas XYZ, dll."
                value={cutiForm.employerInstitution}
                onChange={(e) => setCutiForm((f) => ({ ...f, employerInstitution: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alamat Instansi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Jl. ..."
                value={cutiForm.employerAddress}
                onChange={(e) => setCutiForm((f) => ({ ...f, employerAddress: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Batal</Button>
            <Button
              onClick={handleCutiJamaah}
              disabled={isLoading("cuti")}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading("cuti") && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Buat & Unduh PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Surat Umum ───────────────────────────────────────────────── */}
      <Dialog open={openDialog === "general-letter"} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Surat Umum — {booking?.booking_code}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tujuan Surat</p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kepada (Nama) <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Kepala Kantor Imigrasi, Kepala Dinas, dll."
                value={generalForm.recipientName}
                onChange={(e) => setGeneralForm((f) => ({ ...f, recipientName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jabatan Penerima</Label>
                <Input
                  placeholder="Jabatan..."
                  value={generalForm.recipientPosition}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, recipientPosition: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Instansi Penerima</Label>
                <Input
                  placeholder="Instansi..."
                  value={generalForm.recipientInstitution}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, recipientInstitution: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alamat Penerima</Label>
              <Input
                placeholder="Jl. ..."
                value={generalForm.recipientAddress}
                onChange={(e) => setGeneralForm((f) => ({ ...f, recipientAddress: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Perihal / Judul Surat <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Permohonan Rekomendasi, Keterangan Keberangkatan, dll."
                value={generalForm.subject}
                onChange={(e) => setGeneralForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Isi Surat <span className="text-destructive">*</span></Label>
              <Textarea
                rows={5}
                placeholder="Dengan hormat, ..."
                value={generalForm.content}
                onChange={(e) => setGeneralForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Penandatangan</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nama Penandatangan</Label>
                <Input
                  placeholder={companyInfo.name}
                  value={generalForm.signatoryName}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, signatoryName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jabatan</Label>
                <Input
                  value={generalForm.signatoryPosition}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, signatoryPosition: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Batal</Button>
            <Button
              onClick={handleGeneralLetter}
              disabled={isLoading("general")}
            >
              {isLoading("general") && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Buat & Unduh PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
