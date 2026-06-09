import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bus, FileDown, FileSpreadsheet, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const COLORS = [
  "#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6",
  "#ec4899","#14b8a6","#f97316","#6366f1","#84cc16",
];

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}
async function apiFetch(path: string) {
  const token = await getToken();
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { const e = await res.json(); throw e; }
  return res.json();
}

interface Passenger {
  customer_id: string;
  full_name: string;
  gender: string;
  nik?: string;
  passport_number?: string;
  passport_expiry?: string;
  birth_date?: string;
  phone?: string;
  room_type?: string;
  booking_code?: string;
  payment_status?: string;
}

interface Subgroup {
  id: string;
  name: string;
  color?: string;
  member_count: number;
  member_customer_ids?: string[];
}

interface ManifestBusExportProps {
  departureId: string;
  departureName: string;
  departureDate?: string;
  flightNumber?: string;
  passengers: Passenger[];
}

export default function ManifestBusExport({
  departureId,
  departureName,
  departureDate,
  flightNumber,
  passengers,
}: ManifestBusExportProps) {
  const [open, setOpen] = useState(false);

  const { data: subgroupsData, isLoading } = useQuery({
    queryKey: ["manifest-bus-subgroups", departureId],
    enabled: open && !!departureId,
    queryFn: () => apiFetch(`/api/v1/guide/subgroups/${departureId}`),
  });

  const { data: membersMap } = useQuery({
    queryKey: ["manifest-bus-members-map", departureId, subgroupsData?.subgroups?.length],
    enabled: open && !!subgroupsData?.subgroups?.length,
    queryFn: async () => {
      const sgs: Subgroup[] = subgroupsData.subgroups;
      const map: Record<string, string[]> = {};
      await Promise.all(
        sgs.map(async (sg) => {
          const data = await apiFetch(`/api/v1/guide/subgroups/${sg.id}/members`);
          map[sg.id] = (data.members || []).map((m: any) => m.customer_id as string);
        })
      );
      return map;
    },
  });

  const subgroups: Subgroup[] = subgroupsData?.subgroups || [];

  function getGroupPassengers(sgId: string): Passenger[] {
    const ids = membersMap?.[sgId] || [];
    return ids.map((cid) => passengers.find((p) => p.customer_id === cid)).filter(Boolean) as Passenger[];
  }

  function getUnassigned(): Passenger[] {
    const allAssigned = new Set(Object.values(membersMap || {}).flat());
    return passengers.filter((p) => !allAssigned.has(p.customer_id));
  }

  const payLabel = (s?: string) => s === "paid" ? "LUNAS" : s === "partial" ? "DP" : "BELUM";
  const genderLabel = (g?: string) => (g === "L" || g === "male") ? "L" : "P";
  const fmtDate = (d?: string) => d ? format(new Date(d), "dd/MM/yy") : "-";

  function exportPDF() {
    if (!subgroups.length) { toast.error("Belum ada sub-grup untuk keberangkatan ini"); return; }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const headerInfo = `${departureName}${departureDate ? " — " + format(new Date(departureDate), "dd MMMM yyyy", { locale: localeId }) : ""}${flightNumber ? " | Flight: " + flightNumber : ""}`;

    let isFirst = true;
    const allGroups: { sg: Subgroup; paxs: Passenger[] }[] = [
      ...subgroups.map((sg, i) => ({ sg: { ...sg, _idx: i }, paxs: getGroupPassengers(sg.id) })),
    ] as any[];
    const unassigned = getUnassigned();
    if (unassigned.length > 0) {
      allGroups.push({
        sg: { id: "unassigned", name: "Belum Ditugaskan", color: "#6b7280", member_count: unassigned.length } as any,
        paxs: unassigned,
      });
    }

    allGroups.forEach(({ sg, paxs }, groupIdx) => {
      if (!isFirst) doc.addPage();
      isFirst = false;

      const color = sg.color || COLORS[groupIdx % COLORS.length];
      const hex = color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      doc.setFillColor(r, g, b);
      doc.rect(0, 0, 297, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`${sg.name}  —  ${paxs.length} Jamaah`, 12, 9);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(headerInfo, 12, 13.5);

      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 18,
        head: [["No", "Nama Lengkap", "L/P", "NIK", "No. Paspor", "Tgl Lahir", "Exp. Paspor", "Tipe Kamar", "Telepon", "Kode Booking", "Bayar"]],
        body: paxs.map((p, i) => [
          (i + 1).toString(),
          p.full_name || "-",
          genderLabel(p.gender),
          p.nik || "-",
          p.passport_number || "-",
          fmtDate(p.birth_date),
          fmtDate(p.passport_expiry),
          (p.room_type || "-").toUpperCase(),
          p.phone || "-",
          p.booking_code || "-",
          payLabel(p.payment_status),
        ]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 40 },
          2: { cellWidth: 8 },
          4: { cellWidth: 22 },
          5: { cellWidth: 16 },
          6: { cellWidth: 16 },
        },
        didDrawPage: (d) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(120);
          doc.text(
            `${sg.name} | Hal. ${d.pageNumber}/${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 4,
            { align: "center" }
          );
        },
      });
    });

    const filename = `ManifestBus_${departureName.replace(/\s+/g, "_")}_${departureDate || "nodate"}.pdf`;
    doc.save(filename);
    toast.success(`Manifest per bus berhasil di-download (${allGroups.length} halaman)`);
  }

  function exportExcel() {
    if (!subgroups.length) { toast.error("Belum ada sub-grup untuk keberangkatan ini"); return; }
    const wb = XLSX.utils.book_new();

    const allGroups: { name: string; paxs: Passenger[] }[] = [
      ...subgroups.map((sg) => ({ name: sg.name, paxs: getGroupPassengers(sg.id) })),
    ];
    const unassigned = getUnassigned();
    if (unassigned.length > 0) allGroups.push({ name: "Belum Ditugaskan", paxs: unassigned });

    allGroups.forEach(({ name, paxs }) => {
      const rows = paxs.map((p, i) => ({
        No: i + 1,
        "Nama Lengkap": p.full_name || "-",
        "L/P": genderLabel(p.gender),
        NIK: p.nik || "-",
        "No. Paspor": p.passport_number || "-",
        "Tgl Lahir": fmtDate(p.birth_date),
        "Exp. Paspor": fmtDate(p.passport_expiry),
        "Tipe Kamar": (p.room_type || "-").toUpperCase(),
        Telepon: p.phone || "-",
        "Kode Booking": p.booking_code || "-",
        Pembayaran: payLabel(p.payment_status),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [5, 30, 5, 18, 18, 14, 14, 12, 16, 16, 10].map((w) => ({ wch: w }));
      const sheetName = name.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const infoWs = XLSX.utils.aoa_to_sheet([
      ["Manifest per Bus/Grup"],
      ["Paket", departureName],
      ["Tgl Berangkat", departureDate ? format(new Date(departureDate), "dd MMMM yyyy", { locale: localeId }) : "-"],
      ["No. Penerbangan", flightNumber || "-"],
      ["Total Jamaah", passengers.length],
      ["Jumlah Grup", subgroups.length],
      ["", ""],
      ["Grup", "Jumlah"],
      ...allGroups.map((g) => [g.name, g.paxs.length]),
    ]);
    XLSX.utils.book_append_sheet(wb, infoWs, "Ringkasan");
    XLSX.utils.book_move_sheet(wb, "Ringkasan", 0);

    const filename = `ManifestBus_${departureName.replace(/\s+/g, "_")}_${departureDate || "nodate"}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Manifest Excel per bus berhasil di-download (${allGroups.length} sheet)`);
  }

  const ready = !isLoading && !!membersMap;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => setOpen(true)}
      >
        <Bus className="h-3.5 w-3.5" />
        Per Bus
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              Manifest per Bus / Sub-Grup
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{departureName}</span>
              {departureDate && (
                <span className="ml-1">
                  — {format(new Date(departureDate), "dd MMMM yyyy", { locale: localeId })}
                </span>
              )}
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Memuat sub-grup...</p>
            ) : subgroups.length === 0 ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Belum ada sub-grup</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Gunakan fitur "Bagi Otomatis" di halaman Sub-Grup Rombongan untuk membagi jamaah ke dalam bus/grup terlebih dahulu.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {subgroups.map((sg, i) => {
                  const paxCount = ready ? getGroupPassengers(sg.id).length : sg.member_count;
                  return (
                    <div
                      key={sg.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border"
                      style={{ borderLeft: `4px solid ${sg.color || COLORS[i % COLORS.length]}` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sg.color || COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium flex-1">{sg.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {paxCount} jamaah
                      </Badge>
                    </div>
                  );
                })}
                {ready && getUnassigned().length > 0 && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-gray-300">
                    <AlertCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground flex-1">Belum ditugaskan</span>
                    <Badge variant="outline" className="text-xs">
                      {getUnassigned().length} jamaah
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {subgroups.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!ready}
                  onClick={exportPDF}
                >
                  <FileDown className="h-4 w-4" />
                  {ready ? `PDF (${subgroups.length} bus)` : "Memuat..."}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={!ready}
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
