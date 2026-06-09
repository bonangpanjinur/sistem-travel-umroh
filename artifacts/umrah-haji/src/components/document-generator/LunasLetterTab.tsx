import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface LunasForm {
  bookingId: string;
  notes: string;
}

interface Props {
  invoiceFilterPkg: string; setInvoiceFilterPkg: (v: string) => void;
  invoiceFilterDep: string; setInvoiceFilterDep: (v: string) => void;
  invoiceYear: string; setInvoiceYear: (v: string) => void;
  invoiceMonth: string; setInvoiceMonth: (v: string) => void;
  packages: any[];
  allDepartures: any[];
  invoiceBookings: any[];
  lunasForm: LunasForm;
  setLunasForm: (v: any) => void;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateSuratLunas: () => any;
  getSelectedDeparture: (depId: string) => any;
}

const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
const MONTHS = [
  { v: '1', l: 'Januari' }, { v: '2', l: 'Februari' }, { v: '3', l: 'Maret' },
  { v: '4', l: 'April' }, { v: '5', l: 'Mei' }, { v: '6', l: 'Juni' },
  { v: '7', l: 'Juli' }, { v: '8', l: 'Agustus' }, { v: '9', l: 'September' },
  { v: '10', l: 'Oktober' }, { v: '11', l: 'November' }, { v: '12', l: 'Desember' },
];

function formatCurrency(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function LunasLetterTab({
  invoiceFilterPkg, setInvoiceFilterPkg,
  invoiceFilterDep, setInvoiceFilterDep,
  invoiceYear, setInvoiceYear,
  invoiceMonth, setInvoiceMonth,
  packages, allDepartures,
  invoiceBookings,
  lunasForm, setLunasForm,
  doGenerate, handleGenerateSuratLunas,
  getSelectedDeparture,
}: Props) {
  const up = (patch: Partial<LunasForm>) => setLunasForm({ ...lunasForm, ...patch });

  const filteredDeps = (allDepartures || []).filter((d: any) => {
    const dep = d as any;
    if (invoiceFilterPkg && dep.package_id !== invoiceFilterPkg) return false;
    if (invoiceYear && invoiceYear !== 'all') {
      const y = new Date(dep.departure_date).getFullYear();
      if (String(y) !== invoiceYear) return false;
    }
    if (invoiceMonth && invoiceMonth !== 'all') {
      const m = new Date(dep.departure_date).getMonth() + 1;
      if (String(m) !== invoiceMonth) return false;
    }
    return true;
  });

  const paidBookings = invoiceBookings.filter(
    (b: any) => (b.paid_amount || 0) >= b.total_price
  );

  const selectedBooking = paidBookings.find((b: any) => b.id === lunasForm.bookingId);
  const dep = getSelectedDeparture(invoiceFilterDep);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Surat Keterangan Lunas
        </CardTitle>
        <CardDescription>
          Generate surat keterangan lunas untuk booking yang sudah selesai dibayar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tahun</Label>
            <Select value={invoiceYear} onValueChange={setInvoiceYear}>
              <SelectTrigger><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bulan</Label>
            <Select value={invoiceMonth} onValueChange={setInvoiceMonth}>
              <SelectTrigger><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Paket</Label>
            <Select value={invoiceFilterPkg} onValueChange={v => { setInvoiceFilterPkg(v); setInvoiceFilterDep(''); up({ bookingId: '' }); }}>
              <SelectTrigger><SelectValue placeholder="Semua paket" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua</SelectItem>
                {(packages || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Keberangkatan</Label>
            <Select value={invoiceFilterDep} onValueChange={v => { setInvoiceFilterDep(v); up({ bookingId: '' }); }}>
              <SelectTrigger><SelectValue placeholder="Pilih keberangkatan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Pilih —</SelectItem>
                {filteredDeps.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {new Date(d.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {dep && (
          <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-0.5">
            <p className="font-medium">{(dep.package as any)?.name || 'Keberangkatan'}</p>
            <p className="text-muted-foreground text-xs">
              {new Date(dep.departure_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
              {dep.flight_number && ` · ${dep.flight_number}`}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>
            Pilih Booking (Lunas)
            {invoiceFilterDep && (
              <span className="ml-2 text-xs text-muted-foreground">
                {paidBookings.length} booking lunas ditemukan
              </span>
            )}
          </Label>
          <Select
            value={lunasForm.bookingId}
            onValueChange={v => up({ bookingId: v })}
            disabled={!invoiceFilterDep}
          >
            <SelectTrigger>
              <SelectValue placeholder={invoiceFilterDep ? 'Pilih booking lunas' : 'Pilih keberangkatan dulu'} />
            </SelectTrigger>
            <SelectContent>
              {paidBookings.map((b: any) => {
                const cust = b.customer as any;
                return (
                  <SelectItem key={b.id} value={b.id}>
                    {cust?.full_name || b.booking_code} — {b.booking_code}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedBooking && (
          <div className="rounded-md border p-3 bg-green-50 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{(selectedBooking.customer as any)?.full_name}</p>
              <Badge className="bg-green-100 text-green-800 text-xs border-0">LUNAS</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {selectedBooking.booking_code} · Total: {formatCurrency(selectedBooking.total_price)} · Bayar: {formatCurrency(selectedBooking.paid_amount || 0)}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Catatan tambahan (opsional)</Label>
          <Textarea
            value={lunasForm.notes}
            onChange={e => up({ notes: e.target.value })}
            placeholder="Catatan khusus yang akan muncul di surat..."
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => doGenerate(handleGenerateSuratLunas, `keterangan-lunas-${selectedBooking?.booking_code || ''}`, 'download')}
            disabled={!selectedBooking}
          >
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => doGenerate(handleGenerateSuratLunas, `keterangan-lunas-${selectedBooking?.booking_code || ''}`, 'send')}
            disabled={!selectedBooking}
          >
            <Send className="h-4 w-4 mr-2" />Kirim via WA/Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
