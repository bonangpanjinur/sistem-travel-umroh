import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send, Award } from 'lucide-react';
import { PackageDepartureFilter, DepartureInfo } from './shared';

interface Props {
  certFilterPkg: string; setCertFilterPkg: (v: string) => void;
  certFilterDep: string; setCertFilterDep: (v: string) => void;
  certYear: string; setCertYear: (v: string) => void;
  certMonth: string; setCertMonth: (v: string) => void;
  packages: any[] | undefined;
  allDepartures: any[] | undefined;
  certBookings: any[];
  certificateForm: { bookingId: string; };
  setCertificateForm: (v: any) => void;
  getSelectedDeparture: (id: string) => any;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateCertificate: () => any;
}

export function CertificateTab({
  certFilterPkg, setCertFilterPkg, certFilterDep, setCertFilterDep,
  certYear, setCertYear, certMonth, setCertMonth,
  packages, allDepartures, certBookings, certificateForm, setCertificateForm,
  getSelectedDeparture, doGenerate, handleGenerateCertificate,
}: Props) {
  const dep = getSelectedDeparture(certFilterDep);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Sertifikat Umrah</CardTitle>
        <CardDescription>Hanya menampilkan booking yang sudah kembali (return_date ≤ hari ini).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PackageDepartureFilter
            selectedPackageId={certFilterPkg} selectedDepartureId={certFilterDep}
            filterYear={certYear} filterMonth={certMonth}
            onPackageChange={(v) => { setCertFilterPkg(v); setCertificateForm({ bookingId: '' }); }}
            onDepartureChange={(v) => { setCertFilterDep(v); setCertificateForm({ bookingId: '' }); }}
            onYearChange={setCertYear} onMonthChange={setCertMonth}
            packages={packages} departures={allDepartures}
          />
          {certFilterDep && <DepartureInfo dep={dep} />}
          <div className="space-y-2">
            <Label>Booking Selesai ({certBookings.length})</Label>
            <Select value={certificateForm.bookingId} onValueChange={(v) => setCertificateForm({ bookingId: v })} disabled={!certFilterDep}>
              <SelectTrigger><SelectValue placeholder={certFilterDep ? "Pilih booking..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
              <SelectContent>
                {certBookings.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.booking_code} - {b.customer?.full_name}</SelectItem>
                ))}
                {certBookings.length === 0 && certFilterDep && (
                  <SelectItem value="_empty" disabled>Belum ada yang selesai</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateCertificate, `sertifikat-${certificateForm.bookingId}`, 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateCertificate, `sertifikat-${certificateForm.bookingId}`, 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
