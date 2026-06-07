import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCancellationRule } from "@/hooks/useCancellationRule";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  FileOutput, Download, RefreshCcw, Package, Calendar, Star,
  MapPin, Plane, Hotel, CheckCircle2, Info, Printer
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminProposalGenerator() {
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedDepartureId, setSelectedDepartureId] = useState("any");
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [notes, setNotes] = useState("");
  const [showPriceDetail, setShowPriceDetail] = useState(true);
  const [showItinerary, setShowItinerary] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { data: packages = [], isLoading: pkgLoading } = useQuery({
    queryKey: ["proposal-packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select(`
          id, name, description, price, duration_days, is_featured,
          package_type:package_types(name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star_rating),
          airline:airlines(name),
          includes, excludes, notes
        `)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const selectedPkg: any = (packages as any[]).find(p => p.id === selectedPackageId);

  const { data: departures = [] } = useQuery({
    queryKey: ["proposal-departures", selectedPackageId],
    enabled: !!selectedPackageId,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select(`id, departure_date, return_date, quota, booked_count, price_adult, price_child, price_infant, status, seat_class`)
        .eq("package_id", selectedPackageId)
        .gte("departure_date", format(new Date(), "yyyy-MM-dd"))
        .order("departure_date");
      return data || [];
    },
  });

  const selectedDep: any = selectedDepartureId !== "any"
    ? (departures as any[]).find(d => d.id === selectedDepartureId)
    : (departures as any[])[0];

  const { data: itinerary = [] } = useQuery({
    queryKey: ["proposal-itinerary", selectedDepartureId, selectedPackageId],
    enabled: !!selectedDepartureId && selectedDepartureId !== "any",
    queryFn: async () => {
      const { data } = await supabase
        .from("departure_itineraries")
        .select("day_number, title, description, location")
        .eq("departure_id", selectedDepartureId)
        .order("day_number");
      return data || [];
    },
  });

  const { rule: cancelRule } = useCancellationRule(selectedPackageId || null);

  async function generatePDF() {
    if (!selectedPkg) { toast.error("Pilih paket terlebih dahulu"); return; }
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210;
      const margin = 15;

      // ── Cover ───────────────────────────────────────────────────
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, W, 70, "F");
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 67, W, 3, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text("PROPOSAL PERJALANAN IBADAH", W / 2, 20, { align: "center" });
      doc.setFontSize(22); doc.setFont("helvetica", "bold");
      doc.text(selectedPkg.name, W / 2, 34, { align: "center" });
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      if (selectedPkg.duration_days) doc.text(`Durasi ${selectedPkg.duration_days} Hari`, W / 2, 44, { align: "center" });
      if (selectedPkg.package_type?.name) doc.text(selectedPkg.package_type.name, W / 2, 53, { align: "center" });
      doc.setFontSize(8);
      doc.text(`Disiapkan untuk: ${customerName || "Calon Jamaah"}${companyName ? " — " + companyName : ""}`, W / 2, 63, { align: "center" });

      // ── Info boxes ───────────────────────────────────────────────
      doc.setTextColor(30, 30, 30);
      let y = 80;
      const infoItems = [
        { label: "Paket", value: selectedPkg.name },
        { label: "Tipe", value: selectedPkg.package_type?.name || "—" },
        { label: "Durasi", value: selectedPkg.duration_days ? `${selectedPkg.duration_days} hari` : "—" },
        { label: "Hotel Makkah", value: selectedPkg.hotel_makkah?.name ? `${selectedPkg.hotel_makkah.name}${selectedPkg.hotel_makkah.star_rating ? ` (${selectedPkg.hotel_makkah.star_rating}⭐)` : ""}` : "—" },
        { label: "Hotel Madinah", value: selectedPkg.hotel_madinah?.name ? `${selectedPkg.hotel_madinah.name}${selectedPkg.hotel_madinah.star_rating ? ` (${selectedPkg.hotel_madinah.star_rating}⭐)` : ""}` : "—" },
        { label: "Maskapai", value: selectedPkg.airline?.name || "—" },
      ];
      if (selectedDep?.departure_date) {
        infoItems.push({ label: "Keberangkatan", value: format(parseISO(selectedDep.departure_date), "dd MMMM yyyy", { locale: idLocale }) });
        if (selectedDep.return_date) infoItems.push({ label: "Kepulangan", value: format(parseISO(selectedDep.return_date), "dd MMMM yyyy", { locale: idLocale }) });
        if (selectedDep.quota) infoItems.push({ label: "Sisa Kursi", value: `${selectedDep.quota - (selectedDep.booked_count || 0)} dari ${selectedDep.quota}` });
      }
      if (salesperson) infoItems.push({ label: "Marketing", value: salesperson });
      infoItems.push({ label: "Tanggal Proposal", value: format(new Date(), "dd MMMM yyyy", { locale: idLocale }) });

      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.setFillColor(30, 58, 138);
      doc.rect(margin, y - 5, W - margin * 2, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.text("INFORMASI PAKET", margin + 2, y + 1);
      y += 10;

      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
      infoItems.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? [245, 248, 255] : [255, 255, 255];
        doc.setFillColor(...(bgColor as [number, number, number]));
        doc.rect(margin, y, W - margin * 2, 7, "F");
        doc.setFont("helvetica", "bold"); doc.text(item.label + ":", margin + 2, y + 5);
        doc.setFont("helvetica", "normal"); doc.text(item.value, margin + 45, y + 5);
        y += 7;
      });
      y += 5;

      // ── Harga ────────────────────────────────────────────────────
      if (showPriceDetail) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, y, W - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("HARGA PAKET", margin + 2, y + 5.5);
        y += 10;

        const priceRows: [string, string, string][] = [];
        const adultPrice = selectedDep?.price_adult || selectedPkg.price;
        if (adultPrice) priceRows.push(["Dewasa (Adult)", "/ pax", formatCurrency(adultPrice)]);
        if (selectedDep?.price_child) priceRows.push(["Anak (Child, 2–12 thn)", "/ pax", formatCurrency(selectedDep.price_child)]);
        if (selectedDep?.price_infant) priceRows.push(["Bayi (Infant, <2 thn)", "/ pax", formatCurrency(selectedDep.price_infant)]);

        autoTable(doc, {
          startY: y,
          head: [["Tipe Penumpang", "Satuan", "Harga"]],
          body: priceRows,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 30] },
          columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable?.finalY + 6 || y + 30;

        doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "italic");
        doc.text("* Harga sudah termasuk akomodasi, transportasi, dan biaya ibadah sesuai paket.", margin, y);
        y += 8;
      }

      // ── Termasuk & Tidak Termasuk ────────────────────────────────
      if (selectedPkg.includes || selectedPkg.excludes) {
        if (y > 220) { doc.addPage(); y = 20; }
        const includesArr: string[] = selectedPkg.includes
          ? (Array.isArray(selectedPkg.includes) ? selectedPkg.includes : selectedPkg.includes.split("\n").filter(Boolean))
          : [];
        const excludesArr: string[] = selectedPkg.excludes
          ? (Array.isArray(selectedPkg.excludes) ? selectedPkg.excludes : selectedPkg.excludes.split("\n").filter(Boolean))
          : [];

        if (includesArr.length || excludesArr.length) {
          doc.setFillColor(30, 58, 138);
          doc.rect(margin, y, W - margin * 2, 8, "F");
          doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
          doc.text("TERMASUK & TIDAK TERMASUK", margin + 2, y + 5.5);
          y += 10;
          doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
          if (includesArr.length) {
            doc.setFont("helvetica", "bold"); doc.text("Sudah Termasuk:", margin, y); y += 5;
            doc.setFont("helvetica", "normal");
            includesArr.slice(0, 12).forEach(item => { doc.text(`✓  ${item}`, margin + 3, y); y += 5; });
          }
          if (excludesArr.length) {
            y += 2;
            doc.setFont("helvetica", "bold"); doc.text("Tidak Termasuk:", margin, y); y += 5;
            doc.setFont("helvetica", "normal");
            excludesArr.slice(0, 8).forEach(item => { doc.text(`✗  ${item}`, margin + 3, y); y += 5; });
          }
          y += 4;
        }
      }

      // ── Itinerary ────────────────────────────────────────────────
      if (showItinerary && (itinerary as any[]).length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, y, W - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("PROGRAM PERJALANAN", margin + 2, y + 5.5);
        y += 10;
        autoTable(doc, {
          startY: y,
          head: [["Hari", "Program", "Lokasi"]],
          body: (itinerary as any[]).map((it: any) => [
            `Hari ${it.day_number}`,
            it.title + (it.description ? `\n${it.description.slice(0, 80)}${it.description.length > 80 ? "..." : ""}` : ""),
            it.location || "—",
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 58, 138] },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: { 0: { cellWidth: 20 }, 2: { cellWidth: 35 } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable?.finalY + 6 || y + 30;
      }

      // ── Kebijakan Pembatalan ─────────────────────────────────────
      const sections = cancelRule?.sections ?? [];
      if (showTerms && sections.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, y, W - margin * 2, 8, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("SYARAT & KEBIJAKAN PEMBATALAN", margin + 2, y + 5.5);
        y += 12;
        sections.forEach((section: any) => {
          if (y > 245) { doc.addPage(); y = 20; }
          doc.setTextColor(30, 30, 30);
          doc.setFontSize(10); doc.setFont("helvetica", "bold");
          doc.text(section.title || "", margin, y); y += 6;
          doc.setFontSize(8); doc.setFont("helvetica", "normal");
          (section.items || []).filter((i: string) => i?.trim()).forEach((item: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            const lines = doc.splitTextToSize(`• ${item}`, W - margin * 2 - 4);
            lines.forEach((line: string) => { doc.text(line, margin + 3, y); y += 5; });
          });
          y += 3;
        });
      }

      // ── Catatan ──────────────────────────────────────────────────
      if (notes) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFillColor(255, 248, 220);
        doc.rect(margin, y, W - margin * 2, 6 + notes.split("\n").length * 5, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(120, 80, 0);
        doc.text("Catatan Khusus:", margin + 2, y + 5); y += 8;
        doc.setFont("helvetica", "normal");
        doc.splitTextToSize(notes, W - margin * 2 - 4).forEach((line: string) => {
          doc.text(line, margin + 2, y); y += 5;
        });
        y += 4;
      }

      // ── Footer ───────────────────────────────────────────────────
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 284, W, 13, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text("Vinstour Travel  |  Perjalanan Suci Anda", margin, 291);
        doc.text(`Halaman ${i} dari ${pages}`, W - margin, 291, { align: "right" });
      }

      const filename = `Proposal_${selectedPkg.name.replace(/[^a-zA-Z0-9]/g, "_")}_${customerName ? customerName.replace(/[^a-zA-Z0-9]/g, "_") + "_" : ""}${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(filename);
      toast.success("Proposal PDF berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal generate PDF: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/10 rounded-xl">
          <FileOutput className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Generator Proposal & Rate Card</h1>
          <p className="text-muted-foreground text-sm">Buat proposal PDF profesional per paket untuk calon jamaah / instansi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" />Pilih Paket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Paket Umroh / Haji</Label>
                <Select value={selectedPackageId} onValueChange={v => { setSelectedPackageId(v); setSelectedDepartureId("any"); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
                  <SelectContent>
                    {pkgLoading ? <SelectItem value="loading" disabled>Memuat...</SelectItem> : (packages as any[]).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.is_featured && "⭐ "}{p.name}
                        {p.duration_days ? ` (${p.duration_days}h)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPkg && (
                <>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1.5">
                    <div className="flex gap-2 flex-wrap">
                      {selectedPkg.package_type?.name && <Badge variant="secondary" className="text-xs">{selectedPkg.package_type.name}</Badge>}
                      {selectedPkg.is_featured && <Badge className="text-xs bg-amber-100 text-amber-700 border-0">Featured</Badge>}
                    </div>
                    <p className="text-muted-foreground text-xs">{selectedPkg.description?.slice(0, 120)}</p>
                    <p className="font-bold">Mulai {formatCurrency(selectedPkg.price)}</p>
                  </div>

                  {(departures as any[]).length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jadwal Keberangkatan (opsional)</Label>
                      <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
                        <SelectTrigger><SelectValue placeholder="Pilih jadwal..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Tampilkan semua jadwal</SelectItem>
                          {(departures as any[]).map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {format(parseISO(d.departure_date), "dd MMM yyyy", { locale: idLocale })}
                              {" — "}{d.quota - (d.booked_count || 0)} seat tersedia
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Data Penerima Proposal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Calon Jamaah / Kontak</Label>
                <Input placeholder="Bapak/Ibu ..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Instansi / Perusahaan (opsional)</Label>
                <Input placeholder="PT. / Yayasan / —" value={companyName} onChange={e => setCompanyName(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Marketing / Sales (opsional)</Label>
                <Input placeholder="Nama staff Vinstour" value={salesperson} onChange={e => setSalesperson(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catatan Khusus (opsional)</Label>
                <Textarea placeholder="Promo spesial, instruksi khusus, dll..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="text-sm" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Pilih Konten yang Ditampilkan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Detail harga (dewasa, anak, bayi)", state: showPriceDetail, set: setShowPriceDetail },
                { label: "Program perjalanan / itinerary", state: showItinerary, set: setShowItinerary },
                { label: "Syarat & kebijakan pembatalan", state: showTerms, set: setShowTerms },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <Switch checked={item.state} onCheckedChange={item.set} />
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedPkg && (
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-800">Preview Ringkasan Proposal</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-muted-foreground w-28">Paket</span><span className="font-semibold">{selectedPkg.name}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-28">Penerima</span><span className="font-semibold">{customerName || "—"}</span></div>
                {companyName && <div className="flex gap-2"><span className="text-muted-foreground w-28">Instansi</span><span className="font-semibold">{companyName}</span></div>}
                {selectedDep?.departure_date && (
                  <div className="flex gap-2"><span className="text-muted-foreground w-28">Jadwal</span><span className="font-semibold">{format(parseISO(selectedDep.departure_date), "dd MMM yyyy", { locale: idLocale })}</span></div>
                )}
                <div className="flex gap-2"><span className="text-muted-foreground w-28">Harga Mulai</span><span className="font-bold text-amber-800">{formatCurrency(selectedDep?.price_adult || selectedPkg.price)}</span></div>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {showPriceDetail && <p>✓ Detail harga</p>}
                  {showItinerary && (itinerary as any[]).length > 0 && <p>✓ Program perjalanan ({(itinerary as any[]).length} hari)</p>}
                  {showTerms && (cancelRule?.sections?.length ?? 0) > 0 && <p>✓ Kebijakan pembatalan ({cancelRule!.sections.length} seksi)</p>}
                  {notes && <p>✓ Catatan khusus</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base"
            onClick={generatePDF}
            disabled={!selectedPackageId || generating}
          >
            {generating ? (
              <><RefreshCcw className="h-5 w-5 mr-2 animate-spin" />Generating PDF...</>
            ) : (
              <><Download className="h-5 w-5 mr-2" />Download Proposal PDF</>
            )}
          </Button>

          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-xs">
              PDF proposal siap dibagikan ke calon jamaah via WhatsApp, email, atau cetak. Itinerary hanya tampil jika sudah diisi di halaman keberangkatan.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
