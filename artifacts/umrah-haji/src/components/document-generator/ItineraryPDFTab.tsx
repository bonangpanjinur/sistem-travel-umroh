import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Download, Loader2, Map, Calendar, Hotel, Clock, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

const supabase: any = supabaseRaw;

interface ItineraryActivity {
  time?: string;
  activity: string;
  location?: string;
  type?: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  description?: string;
  date?: string;
  activities?: ItineraryActivity[];
}

function parseItineraryDays(raw: any): ItineraryDay[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ItineraryDay[];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed as ItineraryDay[];
  } catch {}
  return [];
}

async function generateItineraryPDF(
  departure: any,
  pkg: any,
  itineraryDays: ItineraryDay[],
  company: any
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 18;
  const green = [22, 163, 74] as [number, number, number];
  const gold  = [180, 130, 40] as [number, number, number];
  const lightGray = [248, 250, 252] as [number, number, number];

  let y = 0;

  // ── Header ──
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ITINERARY PERJALANAN UMROH", W / 2, 14, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const companyName = company?.name || "Vinstour Travel";
  doc.text(companyName, W / 2, 21, { align: "center" });

  // Gold bar
  doc.setFillColor(...gold);
  doc.rect(0, 36, W, 2.5, "F");
  y = 46;

  // ── Paket Info ──
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(pkg?.name || "Paket Umroh", M, y);
  y += 7;

  doc.setFillColor(...lightGray);
  doc.roundedRect(M, y, W - 2 * M, 20, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const depDateStr = departure?.departure_date
    ? format(new Date(departure.departure_date), "d MMMM yyyy", { locale: localeId })
    : "-";
  const retDateStr = departure?.return_date
    ? format(new Date(departure.return_date), "d MMMM yyyy", { locale: localeId })
    : "-";
  const duration = pkg?.duration_days || "-";

  const infoPairs = [
    ["Keberangkatan", depDateStr],
    ["Kepulangan", retDateStr],
    ["Durasi", `${duration} Hari`],
    ["Hotel Makkah", (departure?.hotel_makkah as any)?.name || "-"],
    ["Hotel Madinah", (departure?.hotel_madinah as any)?.name || "-"],
  ];

  const colW = (W - 2 * M) / 2;
  infoPairs.forEach((pair, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * colW + 3;
    const iy = y + 4 + row * 7;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...green);
    doc.text(`${pair[0]}:`, x, iy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(pair[1], x + 30, iy);
  });
  y += 26;

  // ── Gold divider ──
  doc.setFillColor(...gold);
  doc.rect(M, y, W - 2 * M, 0.5, "F");
  y += 6;

  // ── Title "Jadwal Perjalanan" ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...green);
  doc.text("Jadwal Perjalanan", M, y);
  y += 7;

  // ── Day by day ──
  doc.setFontSize(9);

  for (const day of itineraryDays) {
    // Check page break
    if (y > 265) {
      doc.addPage();
      y = 20;
      // Small header on continuation pages
      doc.setFillColor(...green);
      doc.rect(0, 0, W, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${companyName} — Itinerary Perjalanan`, W / 2, 6.5, { align: "center" });
      doc.setTextColor(30, 30, 30);
      y = 16;
    }

    // Day header
    doc.setFillColor(...green);
    doc.roundedRect(M, y, W - 2 * M, 8, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Hari ${day.day}${day.date ? ` — ${day.date}` : ""}`, M + 4, y + 5.5);
    doc.setFont("helvetica", "normal");
    if (day.title) {
      doc.text(day.title, M + 35, y + 5.5);
    }
    y += 11;

    // Activities
    const activities = day.activities || [];
    if (activities.length === 0 && day.description) {
      // Just description
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(day.description, W - 2 * M - 6);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, M + 4, y);
        y += 5;
      });
    } else {
      for (const act of activities) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFillColor(245, 247, 250);
        doc.rect(M, y - 0.5, W - 2 * M, 7, "F");

        // Time column
        doc.setTextColor(...green);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(act.time || "—", M + 2, y + 4.5);

        // Activity
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const actText = act.activity + (act.location ? ` (${act.location})` : "");
        const actLines = doc.splitTextToSize(actText, W - 2 * M - 22);
        actLines.forEach((line: string, li: number) => {
          if (li > 0 && y > 270) { doc.addPage(); y = 20; }
          doc.text(line, M + 20, y + 4.5 + li * 4.5);
        });
        y += Math.max(8, actLines.length * 4.5 + 2);
      }
    }

    y += 4;
  }

  // ── Footer on last page ──
  if (y < 270) {
    doc.setFillColor(...gold);
    doc.rect(M, y, W - 2 * M, 0.5, "F");
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Diterbitkan oleh ${companyName} | ${format(new Date(), "d MMMM yyyy", { locale: localeId })}`,
      W / 2, y, { align: "center" }
    );
  }

  return doc;
}

export function ItineraryPDFTab({ allDepartures, packages }: { allDepartures?: any[]; packages?: any[] }) {
  const { company } = useCompanyInfo();
  const [selectedDep, setSelectedDep] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Load full departure data with itinerary template
  const { data: departure, isLoading } = useQuery({
    queryKey: ["dep-itinerary-full", selectedDep],
    enabled: !!selectedDep,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date,
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name),
          package:packages(id, name, duration_days, itinerary),
          itinerary_template:itinerary_templates(id, name, days, duration_days)
        `)
        .eq("id", selectedDep)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pkg = (departure as any)?.package;
  const itineraryTemplate = (departure as any)?.itinerary_template;

  // Resolve itinerary: prefer template.days, fallback to package.itinerary
  const rawDays = itineraryTemplate?.days || pkg?.itinerary;
  const days: ItineraryDay[] = parseItineraryDays(rawDays);

  // Build departure options
  const depOptions = (allDepartures || []).map((d: any) => ({
    id: d.id,
    label: `${d.departure_date ? format(new Date(d.departure_date), "d MMM yyyy", { locale: localeId }) : "?"} — ${(d.package as any)?.name || d.package_id || "-"}`,
  }));

  const handleGeneratePDF = async () => {
    if (!departure || !pkg) { toast.error("Pilih keberangkatan terlebih dahulu"); return; }
    setGeneratingPdf(true);
    try {
      const itDays = days.length > 0 ? days : generateDefaultDays(pkg, departure);
      const pdf = await generateItineraryPDF(departure, pkg, itDays, company);
      const safeName = (pkg?.name || "Itinerary").replace(/[^a-zA-Z0-9]/g, "_");
      const depStr = departure?.departure_date
        ? format(new Date((departure as any).departure_date), "yyyyMMdd")
        : "tanpa-tanggal";
      pdf.save(`Itinerary_${safeName}_${depStr}.pdf`);
      toast.success("Itinerary PDF berhasil diunduh!");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Pilih Keberangkatan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="w-5 h-5 text-emerald-600" />
            Generator Itinerary PDF
          </CardTitle>
          <CardDescription>
            Buat PDF itinerary perjalanan per keberangkatan. Data diambil dari template itinerary
            yang terhubung ke keberangkatan atau dari data paket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Pilih Keberangkatan</label>
            <Select value={selectedDep} onValueChange={setSelectedDep}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih keberangkatan..." />
              </SelectTrigger>
              <SelectContent>
                {depOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && selectedDep && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          {departure && !isLoading && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-800">{pkg?.name || "-"}</span>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                  {pkg?.duration_days || "?"} Hari
                </Badge>
              </div>
              <div className="text-xs text-emerald-700 grid grid-cols-2 gap-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {(departure as any).departure_date
                    ? format(new Date((departure as any).departure_date), "d MMM yyyy", { locale: localeId })
                    : "-"}
                </span>
                <span className="flex items-center gap-1">
                  <Hotel className="w-3 h-3" />
                  {(departure as any).hotel_makkah?.name || "-"}
                </span>
              </div>
              {itineraryTemplate && (
                <Badge className="bg-blue-100 text-blue-700 text-xs">
                  Template: {itineraryTemplate.name}
                </Badge>
              )}
              <div className="text-xs text-emerald-600">
                {days.length > 0
                  ? `${days.length} hari itinerary ditemukan`
                  : "Tidak ada data itinerary — itinerary default akan digunakan"}
              </div>
            </div>
          )}

          <Button
            onClick={handleGeneratePDF}
            disabled={!selectedDep || generatingPdf || isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {generatingPdf ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Membuat PDF...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Download Itinerary PDF</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview itinerary */}
      {days.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pratinjau Itinerary ({days.length} Hari)</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {days.map((day) => (
              <div key={day.day} className="py-3">
                <button
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {day.day}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{day.title || `Hari ke-${day.day}`}</p>
                      {day.date && <p className="text-xs text-muted-foreground">{day.date}</p>}
                    </div>
                  </div>
                  {expandedDay === day.day
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {expandedDay === day.day && (
                  <div className="mt-3 space-y-1.5 pl-10">
                    {day.description && (
                      <p className="text-xs text-gray-600">{day.description}</p>
                    )}
                    {(day.activities || []).map((act, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-emerald-600 font-medium w-12 shrink-0">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {act.time || "-"}
                        </span>
                        <span className="text-gray-700">
                          {act.activity}
                          {act.location && <span className="text-gray-400"> — {act.location}</span>}
                        </span>
                      </div>
                    ))}
                    {(!day.activities || day.activities.length === 0) && !day.description && (
                      <p className="text-xs text-gray-400 italic">Tidak ada detail aktivitas</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Generate default itinerary when no template data exists
function generateDefaultDays(pkg: any, departure: any): ItineraryDay[] {
  const days = pkg?.duration_days || 9;
  const startDate = departure?.departure_date ? new Date(departure.departure_date) : new Date();
  const defaultTitles = [
    "Keberangkatan dari Indonesia",
    "Tiba di Madinah — Arbain",
    "Ziarah Madinah",
    "Perjalanan ke Makkah — Check In Hotel",
    "Ibadah Umroh — Tawaf & Sa'i",
    "Ziarah Makkah & Ibadah",
    "Hari Bebas — Ibadah Mandiri",
    "Persiapan Kepulangan",
    "Tiba Kembali di Indonesia",
  ];

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      day: i + 1,
      date: format(date, "d MMMM yyyy", { locale: localeId }),
      title: defaultTitles[i] || `Hari ke-${i + 1}`,
      activities: [],
    };
  });
}
