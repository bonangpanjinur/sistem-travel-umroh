import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Ticket, Download, Loader2, Users, CheckSquare,
  Plane, Hotel, CalendarDays, QrCode, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateSingleBoardingPass,
  generateBulkBoardingPass,
  type BoardingPassPassenger,
  type BoardingPassData,
} from "@/lib/boarding-pass-generator";
import type { CompanyInfo } from "@/lib/document-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  passengers: any[];
  booking: any;
  hotelAirlineData?: {
    hotelMakkah?:  { name: string; city?: string; star_rating?: number } | null;
    hotelMadinah?: { name: string; city?: string; star_rating?: number } | null;
    airline?:      { name: string; code?: string } | null;
  } | null;
  companyInfo: CompanyInfo;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy", { locale: localeId }); }
  catch { return d; }
}

function roomLabel(rt?: string | null) {
  const m: Record<string, string> = {
    single: "Single", double: "Double", triple: "Triple",
    quad: "Quad", quint: "Quint",
  };
  return rt ? (m[rt.toLowerCase()] ?? rt) : "—";
}

function paxLabel(pt: string) {
  return pt === "adult" ? "Dewasa" : pt === "child" ? "Anak" : "Bayi";
}

function starStr(n?: number | null) {
  return n ? "★".repeat(n) : "";
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
}

// ─── Boarding pass card (visual preview) ──────────────────────────────────────

function BoardingPassCard({
  passenger, data, small = false,
}: { passenger: BoardingPassPassenger; data: BoardingPassData; small?: boolean }) {
  const dep = fmtDate(data.departure_date);
  const ret = fmtDate(data.return_date);
  const roomVal = passenger.room_number
    ? `${roomLabel(passenger.room_type)} · No. ${passenger.room_number}`
    : roomLabel(passenger.room_type);

  return (
    <div className={cn(
      "rounded-xl overflow-hidden border border-teal-200 shadow-md select-none font-sans",
      small ? "text-[10px]" : "text-xs",
    )}>
      {/* Header */}
      <div className="bg-teal-600 text-white flex items-center justify-between px-4 py-2">
        <span className="font-bold tracking-wide text-[11px]">
          {data.company_name || "Vinstour Travel"}
        </span>
        <span className="font-semibold tracking-widest text-[10px] opacity-90">E-BOARDING PASS</span>
      </div>

      <div className="flex bg-white">
        {/* Left section */}
        <div className="flex-1 px-4 py-3 space-y-2.5">
          {/* Passenger name */}
          <div>
            <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Nama Penumpang</p>
            <p className={cn("font-black text-slate-800 uppercase leading-tight", small ? "text-[12px]" : "text-sm")}>
              {passenger.full_name || "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">No. Paspor</p>
              <p className="font-bold text-slate-700">{passenger.passport_number || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Kebangsaan</p>
              <p className="font-bold text-slate-700">{passenger.nationality || "INDONESIA"}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Tipe</p>
              <p className="font-bold text-slate-700">{paxLabel(passenger.passenger_type)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Kamar</p>
              <p className="font-bold text-slate-700">{roomVal}</p>
            </div>
          </div>

          {/* Booking code pill */}
          <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5">
            <Ticket className="h-3 w-3 text-teal-600" />
            <span className="text-[9px] text-teal-600 font-semibold uppercase tracking-wider">Kode Booking</span>
            <span className="font-black text-teal-800 tracking-widest">{data.booking_code}</span>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="flex flex-col items-center py-2">
          <div className="w-px flex-1 border-l-2 border-dashed border-slate-200" />
        </div>

        {/* Right section */}
        <div className="w-[130px] px-3 py-3 space-y-2 bg-slate-50">
          {data.airline_name && (
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase flex items-center gap-1">
                <Plane className="h-2.5 w-2.5" />Maskapai
              </p>
              <p className="font-bold text-slate-700 leading-tight">{data.airline_name}</p>
            </div>
          )}
          {data.departure_date && (
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase flex items-center gap-1">
                <CalendarDays className="h-2.5 w-2.5" />Berangkat
              </p>
              <p className="font-bold text-slate-700">{dep}</p>
            </div>
          )}
          {data.return_date && (
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Kembali</p>
              <p className="font-bold text-slate-700">{ret}</p>
            </div>
          )}
          {data.hotel_makkah && (
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase flex items-center gap-1">
                <Hotel className="h-2.5 w-2.5" />Hotel Makkah
              </p>
              <p className="font-bold text-slate-700 leading-tight">{data.hotel_makkah}</p>
            </div>
          )}
          {data.hotel_madinah && (
            <div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Hotel Madinah</p>
              <p className="font-bold text-slate-700 leading-tight">{data.hotel_madinah}</p>
            </div>
          )}

          {/* QR placeholder */}
          <div className="flex flex-col items-center pt-1">
            <div className="w-14 h-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
              <QrCode className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-[8px] text-slate-400 mt-1 text-center leading-tight">Scan untuk<br />verifikasi</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-teal-600 flex items-center justify-between px-4 py-1.5">
        <p className="text-[9px] text-white/80">
          {data.company_phone ? `${data.company_phone}  ·  ` : ""}
          Dokumen resmi perjalanan ibadah
        </p>
        <p className="text-[9px] font-bold text-white tracking-widest uppercase">
          {data.package_type === "haji" ? "IBADAH HAJI" : data.package_type === "wisata" ? "WISATA" : "IBADAH UMRAH"}
        </p>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function BoardingPassModal({ open, onClose, passengers, booking, hotelAirlineData, companyInfo }: Props) {
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set(passengers.map(p => p.id)));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [previewPaxId, setPreviewPaxId] = useState<string | null>(null);

  const departure = (booking as any)?.departure;
  const pkg       = departure?.package;

  // Build BoardingPassData from booking + hotelAirlineData
  const bpData: BoardingPassData = {
    booking_code:   booking?.booking_code || "—",
    package_name:   pkg?.name || null,
    package_type:   pkg?.package_type || null,
    departure_date: departure?.departure_date || null,
    return_date:    departure?.return_date || null,
    duration_days:  pkg?.duration_days || null,
    airline_name:
      hotelAirlineData?.airline?.name ||
      departure?.airline_name ||
      (departure?.package as any)?.airline?.name ||
      null,
    airline_code:   hotelAirlineData?.airline?.code || null,
    flight_number:  departure?.flight_number || null,
    hotel_makkah: (() => {
      const h = hotelAirlineData?.hotelMakkah;
      if (h?.name) return h.name + (h.star_rating ? ` ${starStr(h.star_rating)}` : "");
      return departure?.hotel_makkah || pkg?.hotel_makkah || null;
    })(),
    hotel_madinah: (() => {
      const h = hotelAirlineData?.hotelMadinah;
      if (h?.name) return h.name + (h.star_rating ? ` ${starStr(h.star_rating)}` : "");
      return departure?.hotel_madinah || pkg?.hotel_madinah || null;
    })(),
    public_token:  (booking as any)?.public_token || null,
    company_name:  companyInfo?.name || null,
    company_phone: companyInfo?.phone || null,
    accent_color:  "#0d9488",
  };

  // Build per-pax passenger object
  function buildPax(p: any): BoardingPassPassenger {
    const c = p.customer || {};
    return {
      full_name:       c.full_name       || p.full_name       || "—",
      passport_number: c.passport_number || p.passport_number || null,
      nationality:     c.nationality     || null,
      birth_date:      c.birth_date      || null,
      passenger_type:  p.passenger_type  || "adult",
      room_type:       p.room_preference || booking?.room_type || null,
      room_number:     p.room_number     || null,
      seat_number:     p.seat_number     || null,
      gender:          c.gender          || null,
    };
  }

  // ── Selection helpers ────────────────────────────────────────────────────────
  const allSelected = passengers.length > 0 && selectedIds.size === passengers.length;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(passengers.map(p => p.id)));
  }

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  }

  // ── Single download ──────────────────────────────────────────────────────────
  async function downloadOne(p: any) {
    setDownloadingId(p.id);
    try {
      const pax = buildPax(p);
      const doc = await generateSingleBoardingPass(pax, bpData);
      const safeName = (pax.full_name || "jamaah").replace(/\s+/g, "-").toLowerCase();
      doc.save(`boarding-pass-${safeName}.pdf`);
      toast.success(`Boarding pass ${pax.full_name} berhasil diunduh`);
    } catch (e: any) {
      toast.error("Gagal generate boarding pass: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  }

  // ── Bulk download as ZIP ─────────────────────────────────────────────────────
  async function downloadBulkZip() {
    const targets = passengers.filter(p => selectedIds.has(p.id));
    if (!targets.length) { toast.info("Pilih minimal satu jamaah"); return; }
    setIsBulkDownloading(true);
    try {
      const zip = new JSZip();
      let ok = 0;
      for (const p of targets) {
        try {
          const pax = buildPax(p);
          const doc = await generateSingleBoardingPass(pax, bpData);
          const safeName = (pax.full_name || "jamaah").replace(/\s+/g, "-").toLowerCase();
          zip.file(`boarding-pass-${safeName}.pdf`, doc.output("arraybuffer"));
          ok++;
        } catch { /* skip failed pax */ }
      }
      if (!ok) throw new Error("Semua boarding pass gagal dibuat");
      const blob = await zip.generateAsync({ type: "blob" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `boarding-pass-${booking?.booking_code || "bulk"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${ok} boarding pass berhasil diunduh sebagai ZIP`);
    } catch (e: any) {
      toast.error("Gagal download ZIP: " + e.message);
    } finally {
      setIsBulkDownloading(false);
    }
  }

  // ── Combined multi-page PDF ──────────────────────────────────────────────────
  async function downloadCombinedPdf() {
    const targets = passengers.filter(p => selectedIds.has(p.id));
    if (!targets.length) { toast.info("Pilih minimal satu jamaah"); return; }
    setIsBulkDownloading(true);
    try {
      const paxList = targets.map(buildPax);
      const doc = await generateBulkBoardingPass(paxList, bpData);
      doc.save(`boarding-pass-semua-${booking?.booking_code || "bulk"}.pdf`);
      toast.success(`PDF dengan ${paxList.length} boarding pass berhasil diunduh`);
    } catch (e: any) {
      toast.error("Gagal download PDF: " + e.message);
    } finally {
      setIsBulkDownloading(false);
    }
  }

  const previewPax = previewPaxId ? passengers.find(p => p.id === previewPaxId) : null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b bg-teal-500/5">
          <DialogTitle className="flex items-center gap-2 text-teal-700">
            <Ticket className="h-5 w-5" />
            Boarding Pass Digital
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate dan unduh boarding pass PDF per jamaah atau semua sekaligus
          </p>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Preview section */}
          {previewPax && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted-foreground">Preview Boarding Pass</p>
                <Button
                  variant="ghost" size="sm"
                  className="text-xs h-7"
                  onClick={() => setPreviewPaxId(null)}
                >Tutup preview</Button>
              </div>
              <BoardingPassCard passenger={buildPax(previewPax)} data={bpData} />
            </div>
          )}

          {/* Info: data completeness */}
          {(!bpData.departure_date || !bpData.hotel_makkah || !bpData.airline_name) && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <span className="text-base">⚠️</span>
              <div className="text-xs">
                <p className="font-semibold">Beberapa data belum lengkap</p>
                <p className="text-amber-700 mt-0.5">
                  {!bpData.departure_date && "Tanggal keberangkatan  "}
                  {!bpData.airline_name   && "Maskapai  "}
                  {!bpData.hotel_makkah  && "Hotel Makkah  "}
                  belum terisi — boarding pass tetap bisa digenerate dengan data yang tersedia.
                </p>
              </div>
            </div>
          )}

          {/* Bulk action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-muted/40 border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                id="select-all-pax"
              />
              <label htmlFor="select-all-pax" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Semua jamaah
                <Badge variant="secondary">{passengers.length}</Badge>
              </label>
              {selectedIds.size > 0 && selectedIds.size < passengers.length && (
                <span className="text-xs text-muted-foreground">{selectedIds.size} dipilih</span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
                onClick={downloadCombinedPdf}
                disabled={isBulkDownloading || selectedIds.size === 0}
              >
                {isBulkDownloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                1 PDF ({selectedIds.size} halaman)
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={downloadBulkZip}
                disabled={isBulkDownloading || selectedIds.size === 0}
              >
                {isBulkDownloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Download ZIP ({selectedIds.size})
              </Button>
            </div>
          </div>

          <Separator />

          {/* Per-passenger list */}
          {passengers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada data jamaah</p>
            </div>
          ) : (
            <div className="space-y-2">
              {passengers.map(p => {
                const c         = p.customer || {};
                const pax       = buildPax(p);
                const isChecked = selectedIds.has(p.id);
                const isLoading = downloadingId === p.id;
                const hasPpt    = !!pax.passport_number;
                const roomVal   = p.room_number
                  ? `${roomLabel(p.room_preference || booking?.room_type)} No.${p.room_number}`
                  : roomLabel(p.room_preference || booking?.room_type);

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                      isChecked
                        ? "border-teal-200 bg-teal-50/50"
                        : "border-border bg-background",
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={v => toggleOne(p.id, !!v)}
                    />

                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black shrink-0">
                      {initials(pax.full_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{pax.full_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {paxLabel(pax.passenger_type)}
                        </span>
                        {hasPpt ? (
                          <span className="text-xs text-muted-foreground font-mono">
                            {pax.passport_number}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Paspor belum diisi</span>
                        )}
                        <span className="text-xs text-muted-foreground">{roomVal}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-teal-700"
                        onClick={() => setPreviewPaxId(prev => prev === p.id ? null : p.id)}
                      >
                        <User className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
                        onClick={() => downloadOne(p)}
                        disabled={isLoading || isBulkDownloading}
                      >
                        {isLoading
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Download className="h-3.5 w-3.5" />}
                        PDF
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Flight summary footer */}
          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Ringkasan Penerbangan</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { icon: <Plane      className="h-3 w-3" />, label: "Maskapai",  value: bpData.airline_name  || "—" },
                { icon: <CalendarDays className="h-3 w-3"/>, label: "Berangkat", value: fmtDate(bpData.departure_date) },
                { icon: <Hotel      className="h-3 w-3" />, label: "Makkah",    value: hotelAirlineData?.hotelMakkah?.name || departure?.hotel_makkah || "—" },
                { icon: <Hotel      className="h-3 w-3" />, label: "Madinah",   value: hotelAirlineData?.hotelMadinah?.name || departure?.hotel_madinah || "—" },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                    {item.icon}{item.label}
                  </p>
                  <p className="font-semibold text-foreground truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
