import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Send, Receipt, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PackageDepartureFilter, DepartureInfo, paymentStatusLabels } from './shared';

interface Props {
  invoiceFilterPkg: string; setInvoiceFilterPkg: (v: string) => void;
  invoiceFilterDep: string; setInvoiceFilterDep: (v: string) => void;
  invoiceYear: string; setInvoiceYear: (v: string) => void;
  invoiceMonth: string; setInvoiceMonth: (v: string) => void;
  packages: any[] | undefined;
  allDepartures: any[] | undefined;
  invoiceBookings: any[];
  invoiceForm: { bookingId: string; dueDate: Date | undefined; notes: string; };
  setInvoiceForm: (v: any) => void;
  getSelectedDeparture: (id: string) => any;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateInvoice: () => any;
}

export function InvoiceTab({
  invoiceFilterPkg, setInvoiceFilterPkg, invoiceFilterDep, setInvoiceFilterDep,
  invoiceYear, setInvoiceYear, invoiceMonth, setInvoiceMonth,
  packages, allDepartures, invoiceBookings, invoiceForm, setInvoiceForm,
  getSelectedDeparture, doGenerate, handleGenerateInvoice,
}: Props) {
  const dep = getSelectedDeparture(invoiceFilterDep);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Invoice Pembayaran</CardTitle>
        <CardDescription>Filter Tahun/Bulan → Paket → Keberangkatan → Booking.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PackageDepartureFilter
            selectedPackageId={invoiceFilterPkg} selectedDepartureId={invoiceFilterDep}
            filterYear={invoiceYear} filterMonth={invoiceMonth}
            onPackageChange={(v) => { setInvoiceFilterPkg(v); setInvoiceForm({ ...invoiceForm, bookingId: '' }); }}
            onDepartureChange={(v) => { setInvoiceFilterDep(v); setInvoiceForm({ ...invoiceForm, bookingId: '' }); }}
            onYearChange={setInvoiceYear} onMonthChange={setInvoiceMonth}
            packages={packages} departures={allDepartures}
          />
          {invoiceFilterDep && <DepartureInfo dep={dep} />}
          <div className="space-y-2">
            <Label>Booking ({invoiceBookings.length})</Label>
            <Select value={invoiceForm.bookingId} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, bookingId: v })} disabled={!invoiceFilterDep}>
              <SelectTrigger><SelectValue placeholder={invoiceFilterDep ? "Pilih booking..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
              <SelectContent>
                {invoiceBookings.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.booking_code} - {b.customer?.full_name} ({paymentStatusLabels[b.payment_status] || b.payment_status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jatuh Tempo (Opsional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !invoiceForm.dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoiceForm.dueDate ? format(invoiceForm.dueDate, "PPP", { locale: id }) : "Default: 7 hari"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={invoiceForm.dueDate} onSelect={(d) => setInvoiceForm({ ...invoiceForm, dueDate: d })} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="col-span-full space-y-2">
            <Label>Catatan Invoice (Opsional)</Label>
            <Textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} placeholder="Catatan tambahan untuk invoice..." rows={2} />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateInvoice, `invoice-${invoiceForm.bookingId}`, 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateInvoice, `invoice-${invoiceForm.bookingId}`, 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
