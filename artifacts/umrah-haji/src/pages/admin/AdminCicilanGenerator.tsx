import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CalendarRange, Download, Printer, RefreshCcw, Search,
  CheckCircle2, Info, CreditCard, Calendar, Users
} from "lucide-react";
import { format, addMonths, setDate, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Installment {
  no: number;
  dueDate: Date;
  amount: number;
  keterangan: string;
}

export default function AdminCicilanGenerator() {
  const [search, setSearch] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [tenor, setTenor] = useState("6");
  const [startDate, setStartDate] = useState(() => format(addMonths(new Date(), 1), "yyyy-MM") + "-01");
  const [dueDay, setDueDay] = useState("10");
  const [dpAmount, setDpAmount] = useState("");
  const [schedule, setSchedule] = useState<Installment[]>([]);
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["cicilan-gen-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, total_price, paid_amount, remaining_amount, created_at,
          customer:profiles(full_name, phone, email),
          departure:departures(departure_date, package:packages(name))
        `)
        .in("booking_status", ["confirmed", "pending", "waiting_payment"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (bookings as any[]).filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.booking_code?.toLowerCase().includes(q) ||
      b.customer?.full_name?.toLowerCase().includes(q) ||
      b.departure?.package?.name?.toLowerCase().includes(q)
    );
  });

  const selectedBooking = (bookings as any[]).find(b => b.id === selectedBookingId);

  const remaining = selectedBooking ? (selectedBooking.remaining_amount ?? Math.max(0, selectedBooking.total_price - (selectedBooking.paid_amount || 0))) : 0;
  const paidPct = selectedBooking ? Math.min(100, Math.round(((selectedBooking.paid_amount || 0) / selectedBooking.total_price) * 100)) : 0;
  const dp = dpAmount ? parseFloat(dpAmount) : 0;
  const toInstall = Math.max(0, remaining - dp);
  const perInstallment = parseInt(tenor) > 0 ? Math.ceil(toInstall / parseInt(tenor)) : 0;

  function generateSchedule() {
    if (!selectedBooking) { toast.error("Pilih booking terlebih dahulu"); return; }
    if (parseInt(tenor) < 1) { toast.error("Tenor tidak valid"); return; }
    const t = parseInt(tenor);
    const day = parseInt(dueDay);
    const result: Installment[] = [];
    const base = new Date(startDate);
    for (let i = 0; i < t; i++) {
      const month = addMonths(base, i);
      const due = setDate(month, Math.min(day, 28));
      const isLast = i === t - 1;
      const amount = isLast ? toInstall - perInstallment * (t - 1) : perInstallment;
      result.push({
        no: i + 1,
        dueDate: due,
        amount: Math.max(0, amount),
        keterangan: isLast ? "Pelunasan" : `Cicilan ${i + 1}`,
      });
    }
    setSchedule(result);
    setGenerated(true);
    toast.success(`Jadwal ${t} cicilan berhasil dibuat`);
  }

  async function saveSchedule() {
    if (!selectedBooking || schedule.length === 0) return;
    setSaving(true);
    try {
      const rows = schedule.map(s => ({
        booking_id: selectedBooking.id,
        installment_no: s.no,
        due_date: format(s.dueDate, "yyyy-MM-dd"),
        amount: s.amount,
        keterangan: s.keterangan,
        status: "pending",
      }));
      const { error } = await (supabase as any).from("booking_installment_schedules").insert(rows);
      if (error) {
        if (error.code === "42P01") {
          toast.warning("Tabel booking_installment_schedules belum ada di Supabase. Jalankan SQL migration terlebih dahulu.", { duration: 6000 });
        } else {
          throw error;
        }
      } else {
        toast.success("Jadwal cicilan berhasil disimpan ke database");
      }
    } catch (e: any) {
      toast.error("Gagal simpan: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function printSchedule() {
    if (!selectedBooking || schedule.length === 0) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, W, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("JADWAL CICILAN PEMBAYARAN", W / 2, 16, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Booking: ${selectedBooking.booking_code}  —  ${selectedBooking.customer?.full_name || ""}`, W / 2, 26, { align: "center" });
    doc.text(`Paket: ${selectedBooking.departure?.package?.name || ""}`, W / 2, 33, { align: "center" });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    const infoY = 48;
    doc.text(`Total Harga:`, 14, infoY); doc.text(formatCurrency(selectedBooking.total_price), 60, infoY);
    doc.text(`Sudah Dibayar:`, 110, infoY); doc.text(formatCurrency(selectedBooking.paid_amount || 0), 155, infoY);
    doc.text(`Sisa Tagihan:`, 14, infoY + 6); doc.text(formatCurrency(remaining), 60, infoY + 6);
    if (dp > 0) { doc.text(`DP Awal:`, 110, infoY + 6); doc.text(formatCurrency(dp), 155, infoY + 6); }

    autoTable(doc, {
      startY: 62,
      head: [["No", "Tanggal Jatuh Tempo", "Jumlah", "Keterangan", "Status"]],
      body: schedule.map(s => [
        s.no.toString(),
        format(s.dueDate, "dd MMMM yyyy", { locale: idLocale }),
        formatCurrency(s.amount),
        s.keterangan,
        "Belum Dibayar",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text(`Total Cicilan: ${formatCurrency(schedule.reduce((s, r) => s + r.amount, 0))}  |  Dicetak: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}  |  Vinstour Travel`, W / 2, finalY + 10, { align: "center" });
    doc.save(`Jadwal_Cicilan_${selectedBooking.booking_code}.pdf`);
    toast.success("PDF jadwal cicilan berhasil diunduh");
  }

  const totalScheduled = schedule.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-500/10 rounded-xl">
          <CalendarRange className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Generator Jadwal Cicilan</h1>
          <p className="text-muted-foreground text-sm">Buat jadwal cicilan otomatis per booking — cetak atau simpan ke database</p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Pilih booking yang memiliki sisa tagihan, atur tenor & tanggal jatuh tempo, lalu generate jadwal. PDF dapat langsung diberikan ke jamaah.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">1. Pilih Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 text-sm" placeholder="Cari nama / kode booking..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {isLoading ? (
                  <p className="text-xs text-center text-muted-foreground py-4">Memuat...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-4">Tidak ada booking ditemukan</p>
                ) : filtered.slice(0, 30).map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBookingId(b.id); setGenerated(false); setSchedule([]); }}
                    className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${selectedBookingId === b.id ? "bg-blue-50 border-blue-300 dark:bg-blue-950/30" : "hover:bg-muted border-transparent hover:border-border"}`}
                  >
                    <p className="font-mono font-semibold text-xs text-blue-700">{b.booking_code}</p>
                    <p className="font-medium truncate">{b.customer?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.departure?.package?.name || "—"}</p>
                    <p className="text-xs font-semibold text-red-600 mt-0.5">Sisa: {formatCurrency(b.remaining_amount ?? Math.max(0, b.total_price - (b.paid_amount || 0)))}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedBooking && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold">{selectedBooking.customer?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.departure?.package?.name || "—"}</p>
                    <p className="font-mono text-xs text-blue-700">{selectedBooking.booking_code}</p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{selectedBooking.booking_status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  <div><p className="text-xs text-muted-foreground">Total Harga</p><p className="font-bold">{formatCurrency(selectedBooking.total_price)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dibayar</p><p className="font-bold text-green-700">{formatCurrency(selectedBooking.paid_amount || 0)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Sisa Tagihan</p><p className="font-bold text-red-600">{formatCurrency(remaining)}</p></div>
                </div>
                <Progress value={paidPct} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{paidPct}% terbayar</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">2. Atur Parameter Cicilan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">DP Awal (opsional)</Label>
                <Input type="number" placeholder="0" value={dpAmount} onChange={e => { setDpAmount(e.target.value); setGenerated(false); }} className="text-sm" />
                <p className="text-xs text-muted-foreground">Bayar DP sekarang sebelum cicilan mulai</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tenor (jumlah cicilan)</Label>
                <Select value={tenor} onValueChange={v => { setTenor(v); setGenerated(false); }}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 6, 8, 10, 12, 18, 24].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}x cicilan</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mulai cicilan pertama</Label>
                <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setGenerated(false); }} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal jatuh tempo (tanggal berapa/bulan)</Label>
                <Select value={dueDay} onValueChange={v => { setDueDay(v); setGenerated(false); }}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 5, 10, 15, 20, 25, 28].map(d => (
                      <SelectItem key={d} value={d.toString()}>Tanggal {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBooking && (
                <div className="col-span-2 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <p className="text-muted-foreground">Sisa setelah DP: <span className="font-semibold text-foreground">{formatCurrency(toInstall)}</span></p>
                  <p className="text-muted-foreground">Per cicilan: <span className="font-semibold text-foreground">{formatCurrency(perInstallment)}</span> × {tenor}x</p>
                </div>
              )}
              <div className="col-span-2">
                <Button className="w-full" onClick={generateSchedule} disabled={!selectedBooking}>
                  <CalendarRange className="h-4 w-4 mr-2" />Generate Jadwal Cicilan
                </Button>
              </div>
            </CardContent>
          </Card>

          {generated && schedule.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Jadwal {schedule.length} Cicilan
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={printSchedule}>
                      <Printer className="h-3.5 w-3.5 mr-1" />PDF
                    </Button>
                    <Button size="sm" onClick={saveSchedule} disabled={saving}>
                      {saving ? <RefreshCcw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                      Simpan
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map(s => (
                      <TableRow key={s.no}>
                        <TableCell className="font-mono text-sm">{s.no}</TableCell>
                        <TableCell className="text-sm">{format(s.dueDate, "dd MMMM yyyy", { locale: idLocale })}</TableCell>
                        <TableCell className="font-semibold text-sm">{formatCurrency(s.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={s.keterangan === "Pelunasan" ? "default" : "outline"} className="text-xs">
                            {s.keterangan}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2} className="text-sm text-right">Total</TableCell>
                      <TableCell className="text-sm">{formatCurrency(totalScheduled)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
