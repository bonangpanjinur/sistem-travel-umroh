import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type AgentCommission = Database["public"]["Tables"]["agent_commissions"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface BookingWithCustomer extends Booking {
  customer: Pick<Customer, "full_name"> | null;
}

interface AgentCommissionWithBooking extends AgentCommission {
  booking: Pick<BookingWithCustomer, "booking_code" | "total_price" | "customer"> | null;
}
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { DollarSign, TrendingUp, Clock, CheckCircle, FileDown, FileSpreadsheet, Percent, GitMerge } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function AgentCommissions() {
  const { user } = useAuth();

  const { data: agentData } = useQuery<Pick<Database["public"]["Tables"]["agents"]["Row"], "id" | "commission_rate" | "company_name"> | null>({
    queryKey: ['agent-profile-comm', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, commission_rate, company_name')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['agent-commissions', agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select(`
          id,
          commission_amount,
          commission_rate,
          status,
          created_at,
          paid_at,
          notes,
          booking:bookings(
            booking_code,
            total_price,
            customer:customers(full_name)
          )
        `)
        .eq('agent_id', agentData!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = {
    total: commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    pending: commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    approved: commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    paid: commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
  };

  const { data: overrideCommissions = [] } = useQuery({
    queryKey: ['agent-override-mine', agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data: d } = await (supabase as any)
        .from('agent_override_commissions')
        .select(`
          id, override_percentage, override_amount, status, created_at, paid_at, notes,
          sub_agent:agents!sub_agent_id(id, company_name, contact_name, agent_code),
          booking:bookings!booking_id(booking_code, total_price)
        `)
        .eq('agent_id', agentData!.id)
        .order('created_at', { ascending: false });
      return d ?? [];
    },
  });

  const overrideStats = {
    total: overrideCommissions.reduce((s: number, c: any) => s + Number(c.override_amount || 0), 0),
    pending: overrideCommissions.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.override_amount || 0), 0),
    paid: overrideCommissions.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + Number(c.override_amount || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Dibayar</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Disetujui</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { paid: 'Dibayar', approved: 'Disetujui', pending: 'Pending', rejected: 'Ditolak' };
    return map[status] || status;
  };

  const exportExcel = () => {
    if (!commissions?.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const rows = commissions.map((c, idx) => ({
      'No': idx + 1,
      'Tanggal': format(new Date(c.created_at), 'dd/MM/yyyy'),
      'Kode Booking': c.booking?.booking_code || '-',
      'Jamaah': c.booking?.customer?.full_name || '-',
      'Nilai Booking (Rp)': Number(c.booking?.total_price || 0),
      'Rate (%)': Number(c.commission_rate || agentData?.commission_rate || 0),
      'Komisi (Rp)': Number(c.commission_amount),
      'Status': getStatusLabel(c.status),
      'Tanggal Dibayar': c.paid_at ? format(new Date(c.paid_at), 'dd/MM/yyyy') : '-',
      'Catatan': c.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 16 }, { wch: 28 },
      { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
      { wch: 16 }, { wch: 30 },
    ];

    // Summary sheet
    const summaryRows = [
      { 'Keterangan': 'Agen / Perusahaan', 'Nilai': agentData?.company_name || '-' },
      { 'Keterangan': 'Total Komisi', 'Nilai': stats.total },
      { 'Keterangan': 'Sudah Dibayar', 'Nilai': stats.paid },
      { 'Keterangan': 'Disetujui (Belum Bayar)', 'Nilai': stats.approved },
      { 'Keterangan': 'Pending', 'Nilai': stats.pending },
      { 'Keterangan': 'Jumlah Transaksi', 'Nilai': commissions.length },
      { 'Keterangan': 'Dicetak', 'Nilai': format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId }) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, ws, 'Detail Komisi');
    XLSX.writeFile(wb, `Laporan_Komisi_Agen_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    toast.success("Laporan Excel berhasil diunduh");
  };

  const exportPDF = () => {
    if (!commissions?.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Komisi Agen', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Agen: ${agentData?.company_name || '-'}`, 14, 26);
    doc.text(`Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}`, 14, 32);

    // Summary row
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatCurrency(stats.total)}   |   Dibayar: ${formatCurrency(stats.paid)}   |   Pending: ${formatCurrency(stats.pending)}`, 14, 40);

    autoTable(doc, {
      startY: 46,
      head: [['No', 'Tanggal', 'Kode Booking', 'Jamaah', 'Nilai Booking', 'Komisi', 'Status', 'Tgl Dibayar']],
      body: commissions.map((c, idx) => [
        idx + 1,
        format(new Date(c.created_at), 'dd/MM/yy'),
        c.booking?.booking_code || '-',
        c.booking?.customer?.full_name || '-',
        formatCurrency(Number(c.booking?.total_price || 0)),
        formatCurrency(Number(c.commission_amount)),
        getStatusLabel(c.status),
        c.paid_at ? format(new Date(c.paid_at), 'dd/MM/yy') : '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 246, 255] },
    });

    doc.save(`Laporan_Komisi_Agen_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    toast.success("Laporan PDF berhasil diunduh");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Komisi Saya</h1>
          <p className="text-muted-foreground">Riwayat dan status komisi Anda</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={isLoading || !commissions?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={isLoading || !commissions?.length}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Komisi</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pending)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Komisi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : commissions?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada riwayat komisi
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Jamaah</TableHead>
                  <TableHead>Nilai Booking</TableHead>
                  <TableHead>Komisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tgl Dibayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions?.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.created_at), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell className="font-mono">
                      {commission.booking?.booking_code || '-'}
                    </TableCell>
                    <TableCell>
                      {commission.booking?.customer?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(commission.booking?.total_price || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(commission.commission_amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(commission.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {commission.paid_at
                        ? format(new Date(commission.paid_at), "dd MMM yyyy", { locale: localeId })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* Override Komisi dari Sub-Agen */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GitMerge className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-semibold">Override Komisi dari Sub-Agen</h2>
          <span className="text-xs text-muted-foreground">(pendapatan override sebagai agen induk)</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Override</p>
                  <p className="text-xl font-bold text-violet-700">{formatCurrency(overrideStats.total)}</p>
                </div>
                <div className="p-3 rounded-full bg-violet-100">
                  <Percent className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(overrideStats.pending)}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(overrideStats.paid)}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Override</CardTitle>
          </CardHeader>
          <CardContent>
            {overrideCommissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Belum ada override komisi dari sub-agen Anda
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Sub-Agen</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Override %</TableHead>
                    <TableHead>Jumlah Override</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tgl Dibayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrideCommissions.map((oc: any) => (
                    <TableRow key={oc.id}>
                      <TableCell className="text-sm">
                        {format(new Date(oc.created_at), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{oc.sub_agent?.company_name || oc.sub_agent?.contact_name || '—'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{oc.sub_agent?.agent_code || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {oc.booking?.booking_code || '—'}
                      </TableCell>
                      <TableCell className="font-semibold text-violet-700">
                        {oc.override_percentage}%
                      </TableCell>
                      <TableCell className="font-semibold text-violet-700">
                        {formatCurrency(oc.override_amount || 0)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(oc.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {oc.paid_at ? format(new Date(oc.paid_at), "dd MMM yyyy", { locale: localeId }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
