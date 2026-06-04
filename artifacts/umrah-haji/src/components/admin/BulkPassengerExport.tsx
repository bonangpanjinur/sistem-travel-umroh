import { useState } from "react";
import JSZip from "jszip";
import { useDocumentLogger } from "@/hooks/useDocumentLogger";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Users, Pencil, Download, Loader2, ClipboardSignature, Stamp, Award,
  PackageCheck, X,
} from "lucide-react";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  generatePassportLetter,
  generateUmrahCertificate,
  generateJamaahLeaveLetter,
  type JamaahLeaveLetterData,
  type CompanyInfo,
} from "@/lib/document-generator";

type DocType = "passport" | "certificate" | "cuti";

const DOC_TYPE_OPTIONS: { value: DocType; label: string; icon: typeof Stamp }[] = [
  { value: "passport", label: "Surat Paspor", icon: Stamp },
  { value: "certificate", label: "Sertifikat Umrah", icon: Award },
  { value: "cuti", label: "Surat Cuti Jamaah", icon: ClipboardSignature },
];

interface Props {
  passengers: any[];
  booking: any;
  companyInfo: CompanyInfo;
  bookingId: string;
}

export function BulkPassengerExport({ passengers, booking, companyInfo, bookingId }: Props) {
  const queryClient = useQueryClient();
  const { logDocument } = useDocumentLogger();
  const departure = booking?.departure as any;
  const pkg = departure?.package;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [docType, setDocType] = useState<DocType>("passport");
  const [isExporting, setIsExporting] = useState(false);
  const [showCutiDialog, setShowCutiDialog] = useState(false);
  const [cutiForm, setCutiForm] = useState({
    employerName: "",
    employerPosition: "",
    employerInstitution: "",
    employerAddress: "",
    startDate: departure?.departure_date ? departure.departure_date.slice(0, 10) : "",
    endDate: departure?.return_date ? departure.return_date.slice(0, 10) : "",
    purpose: pkg?.package_type === "haji" ? "Haji" : "Umrah",
  });

  const allSelected = passengers.length > 0 && selectedIds.size === passengers.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(passengers.map((p) => p.id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const selectedPassengers = passengers.filter((p) => selectedIds.has(p.id));

  // ── Core export logic ──────────────────────────────────────────────────────
  const runExport = async (paxList: any[]) => {
    setIsExporting(true);
    const zip = new JSZip();
    const year = new Date().getFullYear();
    let successCount = 0;
    let errorCount = 0;

    for (const p of paxList) {
      const c = p.customer as any;
      if (!c) continue;
      const safeName = (c.full_name || "jamaah").replace(/\s+/g, "-");

      try {
        if (docType === "passport") {
          const doc = await generatePassportLetter(
            {
              customerName: c.full_name || "-",
              nik: c.nik || "-",
              birthPlace: c.birth_place || "-",
              birthDate: c.birth_date ? new Date(c.birth_date) : new Date(),
              address: [c.address, c.city, c.province].filter(Boolean).join(", ") || "-",
              phone: c.phone || "-",
              purpose: pkg?.package_type === "haji" ? "Ibadah Haji" : "Ibadah Umrah",
              departureDate: departure?.departure_date
                ? new Date(departure.departure_date)
                : undefined,
            },
            `PASPOR/${year}/${booking.booking_code}`,
            companyInfo
          );
          zip.file(`surat-paspor-${safeName}.pdf`, doc.output("arraybuffer"));
          successCount++;
        } else if (docType === "certificate") {
          const doc = await generateUmrahCertificate(
            {
              participantName: c.full_name || "-",
              passportNumber: c.passport_number || "-",
              birthPlace: c.birth_place || "-",
              birthDate: c.birth_date ? new Date(c.birth_date) : new Date(),
              packageName: pkg?.name || "-",
              departureDate: departure?.departure_date
                ? new Date(departure.departure_date)
                : new Date(),
              returnDate: departure?.return_date
                ? new Date(departure.return_date)
                : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              certificateNumber: `CERT/${year}/${booking.booking_code}-${successCount + 1}`,
            },
            companyInfo
          );
          zip.file(`sertifikat-umrah-${safeName}.pdf`, doc.output("arraybuffer"));
          successCount++;
        } else if (docType === "cuti") {
          const data: JamaahLeaveLetterData = {
            jamaahName: c.full_name || "-",
            nik: c.nik || "-",
            birthPlace: c.birth_place || "-",
            birthDate: c.birth_date ? new Date(c.birth_date) : new Date(),
            address: [c.address, c.city, c.province].filter(Boolean).join(", ") || "-",
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
            `CUTI/${year}/${booking.booking_code}-${successCount + 1}`,
            companyInfo
          );
          zip.file(`surat-cuti-${safeName}.pdf`, doc.output("arraybuffer"));
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to generate doc for ${c.full_name}:`, err);
        errorCount++;
      }
    }

    if (successCount > 0) {
      const docTypeLabel = DOC_TYPE_OPTIONS.find((d) => d.value === docType)?.label ?? "Dokumen";
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulk-${docType}-${booking.booking_code}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `${successCount} ${docTypeLabel} berhasil diunduh${errorCount > 0 ? ` (${errorCount} gagal)` : ""}`
      );
      const bulkTypeMap: Record<DocType, "bulk_passport" | "bulk_certificate" | "bulk_cuti"> = {
        passport: "bulk_passport", certificate: "bulk_certificate", cuti: "bulk_cuti",
      };
      await logDocument({
        bookingId,
        documentType: bulkTypeMap[docType],
        documentLabel: `${docTypeLabel} (Bulk)`,
        jamaahName: null,
        isBulk: true,
        bulkCount: successCount,
      });
      queryClient.invalidateQueries({ queryKey: ["booking-document-logs", bookingId] });
    } else {
      toast.error("Semua dokumen gagal dibuat");
    }

    setIsExporting(false);
    setShowCutiDialog(false);
  };

  const handleExportClick = () => {
    if (selectedIds.size === 0) return;
    if (docType === "cuti") {
      setShowCutiDialog(true);
    } else {
      runExport(selectedPassengers);
    }
  };

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mx-6 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 px-4 py-3">
          <div className="flex items-center gap-2 mr-auto">
            <PackageCheck className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              {selectedIds.size} jamaah dipilih
            </span>
          </div>

          <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
            <SelectTrigger className="w-[200px] h-8 text-xs font-semibold bg-white dark:bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            onClick={handleExportClick}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isExporting ? "Membuat ZIP..." : "Unduh ZIP"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setSelectedIds(new Set())}
            title="Batalkan pilihan"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Passenger Table */}
      {passengers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Belum ada daftar jamaah</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                    aria-label="Pilih semua jamaah"
                  />
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Nama Lengkap</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Hubungan</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Kamar</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">No. Paspor</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.map((p) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <TableRow
                    key={p.id}
                    className={`hover:bg-muted/10 transition-colors cursor-pointer ${
                      isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                    }`}
                    onClick={() => toggleOne(p.id, !isSelected)}
                  >
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleOne(p.id, !!checked)}
                        aria-label={`Pilih ${p.customer?.full_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{p.customer?.full_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                          {p.customer?.gender === "male" ? "Laki-laki" : "Perempuan"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-bold bg-muted/50">
                        {(p as any).relationship || "Diri Sendiri"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const rt = (p as any).room_preference as string | undefined;
                        const colors: Record<string, string> = {
                          quad:   "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                          triple: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                          double: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
                          single: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                        };
                        const labels: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };
                        return rt ? (
                          <Badge className={`text-[10px] font-bold ${colors[rt] || ""}`}>{labels[rt] || rt}</Badge>
                        ) : <span className="text-muted-foreground text-xs">-</span>;
                      })()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.customer?.passport_number || "-"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <EditCustomerDialog
                        customer={p.customer}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ["booking-passengers", bookingId] });
                          queryClient.invalidateQueries({ queryKey: ["admin-booking", bookingId] });
                        }}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Cuti Dialog ────────────────────────────────────────────────────────── */}
      <Dialog open={showCutiDialog} onOpenChange={(o) => !o && setShowCutiDialog(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardSignature className="h-5 w-5 text-orange-500" />
              Surat Cuti — {selectedIds.size} Jamaah
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/40 border text-xs">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Data instansi ini berlaku untuk semua jamaah yang dipilih
              </p>
              <p className="text-muted-foreground">
                {selectedPassengers.map((p) => p.customer?.full_name).join(", ")}
              </p>
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Instansi / Atasan yang Dituju
            </p>

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
            <Button variant="outline" onClick={() => setShowCutiDialog(false)} disabled={isExporting}>
              Batal
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => runExport(selectedPassengers)}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? `Membuat ZIP (${selectedIds.size} file)...` : `Buat & Unduh ZIP (${selectedIds.size} surat)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
