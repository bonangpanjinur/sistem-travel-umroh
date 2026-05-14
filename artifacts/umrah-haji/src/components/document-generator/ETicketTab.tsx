import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send, Ticket } from 'lucide-react';
import { PackageDepartureFilter, DepartureInfo } from './shared';

interface Props {
  eticketFilterPkg: string; setEticketFilterPkg: (v: string) => void;
  eticketFilterDep: string; setEticketFilterDep: (v: string) => void;
  eticketYear: string; setEticketYear: (v: string) => void;
  eticketMonth: string; setEticketMonth: (v: string) => void;
  packages: any[] | undefined;
  allDepartures: any[] | undefined;
  eticketBookings: any[];
  eticketForm: { bookingId: string; };
  setEticketForm: (v: any) => void;
  getSelectedDeparture: (id: string) => any;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateETicket: () => any;
}

export function ETicketTab({
  eticketFilterPkg, setEticketFilterPkg, eticketFilterDep, setEticketFilterDep,
  eticketYear, setEticketYear, eticketMonth, setEticketMonth,
  packages, allDepartures, eticketBookings, eticketForm, setEticketForm,
  getSelectedDeparture, doGenerate, handleGenerateETicket,
}: Props) {
  const dep = getSelectedDeparture(eticketFilterDep);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" />E-Ticket Keberangkatan</CardTitle>
        <CardDescription>Filter Tahun/Bulan → Paket → Keberangkatan → Booking.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PackageDepartureFilter
            selectedPackageId={eticketFilterPkg} selectedDepartureId={eticketFilterDep}
            filterYear={eticketYear} filterMonth={eticketMonth}
            onPackageChange={(v) => { setEticketFilterPkg(v); setEticketForm({ bookingId: '' }); }}
            onDepartureChange={(v) => { setEticketFilterDep(v); setEticketForm({ bookingId: '' }); }}
            onYearChange={setEticketYear} onMonthChange={setEticketMonth}
            packages={packages} departures={allDepartures}
          />
          {eticketFilterDep && <DepartureInfo dep={dep} />}
          <div className="space-y-2">
            <Label>Booking ({eticketBookings.length})</Label>
            <Select value={eticketForm.bookingId} onValueChange={(v) => setEticketForm({ bookingId: v })} disabled={!eticketFilterDep}>
              <SelectTrigger><SelectValue placeholder={eticketFilterDep ? "Pilih booking..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
              <SelectContent>
                {eticketBookings.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.booking_code} - {b.customer?.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateETicket, `eticket-${eticketForm.bookingId}`, 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateETicket, `eticket-${eticketForm.bookingId}`, 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
