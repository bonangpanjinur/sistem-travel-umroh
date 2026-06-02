/**
 * DepartureMarginCalculator — Profit-margin dashboard + PDF export for a single departure.
 *
 * Shows HPP per pax (from departure_cost_items) vs. selling price per room type,
 * auto-computes gross margin, suggests minimum price, and exports a PDF summary.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Target, Package, AlertTriangle, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  return format(new Date(d), "dd MMMM yyyy", { locale: localeId });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomTier {
  key: string;
  label: string;
  emoji: string;
  price: number;
}

interface HppItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost_idr: number;
  total_cost_idr: number;
}

interface Props {
  departureId: string;
  paxCount: number;
  priceQuad: number;
  priceTriple: number;
  priceDouble: number;
  priceSingle: number;
  packageName?: string;
  departureDate?: string | null;
}

// ── MarginRow — one row per room type ─────────────────────────────────────────

interface MarginRowProps {
  tier: RoomTier;
  hppPerPax: number;
  targetMarginPct: number;
}

function MarginRow({ tier, hppPerPax, targetMarginPct }: MarginRowProps) {
  const sellPrice = tier.price;
  const grossMargin = sellPrice - hppPerPax;
  const marginPct = sellPrice > 0 ? (grossMargin / sellPrice) * 100 : 0;
  const suggestedMin =
    targetMarginPct < 100 && hppPerPax > 0
      ? hppPerPax / (1 - targetMarginPct / 100)
      : 0;
  const meetsTarget = marginPct >= targetMarginPct;
  const closeToTarget = !meetsTarget && marginPct >= targetMarginPct - 5;

  if (sellPrice === 0) return null;

  const statusColor = meetsTarget
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : closeToTarget
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";

  const StatusIcon = meetsTarget
    ? TrendingUp
    : closeToTarget
    ? Minus
    : TrendingDown;

  return (
    <div className={cn("rounded-lg border p-4 transition-all", statusColor)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">{tier.emoji}</span>
            <span className="font-semibold text-sm">{tier.label}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 border",
                meetsTarget
                  ? "border-emerald-400 text-emerald-700"
                  : closeToTarget
                  ? "border-amber-400 text-amber-700"
                  : "border-red-400 text-red-700"
              )}
            >
              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
              {meetsTarget
                ? "Sesuai target"
                : closeToTarget
                ? "Hampir target"
                : "Di bawah target"}
            </Badge>
          </div>
          <p className="text-xs mt-1 opacity-70">
            Harga jual:{" "}
            <strong className="opacity-100">{fmtRp(sellPrice)}</strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-tight">{pct(marginPct)}</p>
          <p className="text-[11px] opacity-70">Gross Margin</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="opacity-70">HPP per pax</span>
          <span className="font-medium">{fmtRp(hppPerPax)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Laba kotor</span>
          <span className={cn("font-medium", grossMargin < 0 ? "text-red-700" : "")}>
            {fmtRp(grossMargin)}
          </span>
        </div>
        {!meetsTarget && suggestedMin > 0 && (
          <div className="col-span-2 flex justify-between mt-1 border-t border-current/20 pt-1">
            <span className="opacity-70">
              Harga min. (target {targetMarginPct}%)
            </span>
            <span className="font-semibold">{fmtRp(suggestedMin)}</span>
          </div>
        )}
      </div>

      {/* Margin bar */}
      <div className="mt-3 h-1.5 rounded-full bg-current/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-current transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
        />
      </div>
    </div>
  );
}

// ── PDF generator ──────────────────────────────────────────────────────────────

function generateMarginPDF(opts: {
  packageName: string;
  departureDate: string;
  paxCount: number;
  targetMargin: number;
  totalHPP: number;
  hppPerPax: number;
  tiers: RoomTier[];
  items: HppItem[];
}) {
  const {
    packageName,
    departureDate,
    paxCount,
    targetMargin,
    totalHPP,
    hppPerPax,
    tiers,
    items,
  } = opts;

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const now = format(new Date(), "dd MMMM yyyy, HH:mm", { locale: localeId });

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(21, 128, 61); // green-700
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Vinstour Travel", 14, 11);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ringkasan Margin Keuntungan — Keberangkatan", 14, 19);

  doc.setFontSize(9);
  doc.text(`Dicetak: ${now}`, pageW - 14, 19, { align: "right" });

  // ── Departure info bar ───────────────────────────────────────────────────────
  doc.setFillColor(240, 253, 244); // green-50
  doc.rect(0, 28, pageW, 16, "F");

  doc.setTextColor(21, 128, 61);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(packageName || "—", 14, 37);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const infoRight = [
    `Tanggal: ${departureDate}`,
    `Jamaah: ${paxCount} pax`,
    `Target Margin: ${targetMargin}%`,
  ].join("   •   ");
  doc.text(infoRight, 14, 43);

  let y = 54;

  // ── HPP Summary ──────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Ringkasan HPP", 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Keterangan", "Nilai"]],
    body: [
      ["Total HPP (semua item)", fmtRp(totalHPP)],
      [`HPP per Pax (÷ ${paxCount} jamaah)`, paxCount > 0 ? fmtRp(hppPerPax) : "—"],
      ["Jumlah Item HPP", `${items.length} item`],
      ["Target Margin", `${targetMargin}%`],
    ],
    headStyles: {
      fillColor: [21, 128, 61],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    theme: "striped",
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Margin per Tipe Kamar ────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Analisis Margin per Tipe Kamar", 14, y);
  y += 5;

  const tierRows = tiers.map((tier) => {
    const grossMargin = tier.price - hppPerPax;
    const marginPct =
      tier.price > 0 ? (grossMargin / tier.price) * 100 : 0;
    const meetsTarget = marginPct >= targetMargin;
    const closeToTarget = !meetsTarget && marginPct >= targetMargin - 5;
    const suggestedMin =
      targetMargin < 100 && hppPerPax > 0
        ? hppPerPax / (1 - targetMargin / 100)
        : 0;
    const status = meetsTarget
      ? "Sesuai Target"
      : closeToTarget
      ? "Hampir Target"
      : "Di Bawah Target";
    return {
      label: tier.label,
      price: tier.price,
      grossMargin,
      marginPct,
      status,
      meetsTarget,
      closeToTarget,
      suggestedMin,
    };
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [
      ["Tipe Kamar", "HPP/Pax", "Harga Jual", "Laba Kotor", "Margin %", "Status", "Harga Min."],
    ],
    body: tierRows.map((r) => [
      r.label,
      fmtRp(hppPerPax),
      fmtRp(r.price),
      fmtRp(r.grossMargin),
      `${r.marginPct.toFixed(1)}%`,
      r.status,
      !r.meetsTarget && r.suggestedMin > 0 ? fmtRp(r.suggestedMin) : "—",
    ]),
    headStyles: {
      fillColor: [21, 128, 61],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "center", fontStyle: "bold" },
      5: { halign: "center" },
      6: { halign: "right" },
    },
    didParseCell(data) {
      if (data.section === "body") {
        const row = tierRows[data.row.index];
        if (!row) return;
        if (row.meetsTarget) {
          data.cell.styles.textColor = [21, 128, 61];
        } else if (row.closeToTarget) {
          data.cell.styles.textColor = [180, 100, 0];
        } else {
          data.cell.styles.textColor = [185, 28, 28];
        }
        if (data.column.index === 5) {
          if (row.meetsTarget) {
            data.cell.styles.fillColor = [220, 252, 231];
          } else if (row.closeToTarget) {
            data.cell.styles.fillColor = [254, 243, 199];
          } else {
            data.cell.styles.fillColor = [254, 226, 226];
          }
          data.cell.styles.textColor = [30, 30, 30];
        }
      }
    },
    theme: "striped",
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── HPP Items Detail ─────────────────────────────────────────────────────────
  if (items.length > 0) {
    // Check if we need a new page
    if (y > 200) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Detail Item HPP", 14, y);
    y += 5;

    const categoryLabels: Record<string, string> = {
      ticket: "Tiket",
      hotel: "Hotel",
      visa: "Visa",
      transport: "Transportasi",
      guide: "Pembimbing",
      meals: "Konsumsi",
      insurance: "Asuransi",
      handling: "Handling",
      other: "Lain-lain",
    };

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["No", "Nama Item", "Kategori", "Qty", "Satuan", "Biaya/Unit", "Total"]],
      body: items.map((item, i) => [
        i + 1,
        item.name || "—",
        categoryLabels[item.category] || item.category || "—",
        item.quantity ?? "—",
        item.unit || "—",
        fmtRp(item.unit_cost_idr || 0),
        fmtRp(item.total_cost_idr || 0),
      ]),
      foot: [["", "", "", "", "", "TOTAL HPP", fmtRp(totalHPP)]],
      headStyles: {
        fillColor: [21, 128, 61],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      footStyles: {
        fillColor: [21, 128, 61],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        3: { halign: "center", cellWidth: 12 },
        5: { halign: "right" },
        6: { halign: "right", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      theme: "striped",
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Dokumen ini dibuat otomatis oleh sistem Vinstour Travel. Data HPP berdasarkan entri di modul keuangan.",
      14,
      footerY
    );
    doc.text(`Hal ${i} / ${pageCount}`, pageW - 14, footerY, {
      align: "right",
    });
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY - 3, pageW - 14, footerY - 3);
  }

  const safeName = (packageName || "Keberangkatan").replace(/\s+/g, "-");
  const safeDate = departureDate.replace(/\s+/g, "-");
  doc.save(`Margin-${safeName}-${safeDate}.pdf`);
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DepartureMarginCalculator({
  departureId,
  paxCount,
  priceQuad,
  priceTriple,
  priceDouble,
  priceSingle,
  packageName,
  departureDate,
}: Props) {
  const [targetMargin, setTargetMargin] = useState(20);
  const [exporting, setExporting] = useState(false);

  // Fetch HPP items (including name/category for PDF detail)
  const { data: items, isLoading } = useQuery<HppItem[]>({
    queryKey: ["departure-cost-items-full", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_cost_items")
        .select("id, name, category, unit, quantity, unit_cost_idr, total_cost_idr")
        .eq("departure_id", departureId)
        .order("category");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!departureId,
  });

  const totalHPP = useMemo(
    () =>
      (items || []).reduce(
        (s: number, i: HppItem) => s + (Number(i.total_cost_idr) || 0),
        0
      ),
    [items]
  );

  const hppPerPax = paxCount > 0 ? totalHPP / paxCount : 0;

  const tiers: RoomTier[] = [
    { key: "quad",   label: "Quad (4 orang)",   emoji: "👥", price: priceQuad },
    { key: "triple", label: "Triple (3 orang)",  emoji: "👤", price: priceTriple },
    { key: "double", label: "Double (2 orang)",  emoji: "🛏",  price: priceDouble },
    { key: "single", label: "Single (1 orang)",  emoji: "🌟", price: priceSingle },
  ].filter((t) => t.price > 0);

  const hasItems = items && items.length > 0;
  const canExport = hasItems && paxCount > 0 && tiers.length > 0;

  const handleExport = async () => {
    if (!canExport || !items) return;
    setExporting(true);
    try {
      generateMarginPDF({
        packageName: packageName || "Keberangkatan",
        departureDate: fmtDate(departureDate),
        paxCount,
        targetMargin,
        totalHPP,
        hppPerPax,
        tiers,
        items,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Kalkulator Margin Keuntungan
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perbandingan HPP per pax vs. harga jual per tipe kamar
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Target margin input */}
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs font-semibold whitespace-nowrap">
                Target Margin
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={targetMargin}
                  onChange={(e) =>
                    setTargetMargin(
                      Math.min(99, Math.max(0, Number(e.target.value)))
                    )
                  }
                  className="h-8 w-20 text-sm text-center pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            {/* Export PDF button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={!canExport || exporting}
              onClick={handleExport}
              title={
                !canExport
                  ? "Lengkapi HPP dan harga jual terlebih dahulu"
                  : "Unduh ringkasan margin sebagai PDF"
              }
            >
              <FileDown className="h-3.5 w-3.5" />
              {exporting ? "Memproses..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HPP summary bar */}
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
          {isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : hasItems ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total HPP ({items?.length} item)
                  </p>
                  <p className="font-bold text-destructive">{fmtRp(totalHPP)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  HPP per pax{" "}
                  {paxCount > 0 ? `(÷ ${paxCount} jamaah)` : ""}
                </p>
                <p className="font-bold text-destructive text-lg">
                  {paxCount > 0 ? fmtRp(hppPerPax) : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p>
                Belum ada item HPP. Tambahkan item di kartu{" "}
                <strong>HPP / Modal per Seat</strong> terlebih dahulu.
              </p>
            </div>
          )}
        </div>

        {/* Per room type grid */}
        {!hasItems || tiers.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
            {tiers.length === 0
              ? "Belum ada harga jual yang diset. Tambahkan harga di atas."
              : "Tambahkan item HPP untuk melihat kalkulasi margin."}
          </div>
        ) : paxCount === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            HPP per pax tidak dapat dihitung — jumlah jamaah saat ini 0.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tiers.map((tier) => (
              <MarginRow
                key={tier.key}
                tier={tier}
                hppPerPax={hppPerPax}
                targetMarginPct={targetMargin}
              />
            ))}
          </div>
        )}

        {/* Legend + export hint */}
        {hasItems && tiers.length > 0 && paxCount > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> ≥{" "}
                {targetMargin}% = sesuai target
              </span>
              <span className="flex items-center gap-1">
                <Minus className="h-3 w-3 text-amber-500" />{" "}
                {targetMargin - 5}–{targetMargin}% = hampir
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" /> &lt;{" "}
                {targetMargin - 5}% = di bawah
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <FileDown className="h-3 w-3" />
              PDF berisi detail {items?.length} item HPP + tabel per kamar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
