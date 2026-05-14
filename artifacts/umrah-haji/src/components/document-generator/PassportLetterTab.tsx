import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send, Plane, Search } from 'lucide-react';
import { PackageDepartureFilter, DepartureInfo } from './shared';

interface Props {
  passportFilterPkg: string; setPassportFilterPkg: (v: string) => void;
  passportFilterDep: string; setPassportFilterDep: (v: string) => void;
  passportYear: string; setPassportYear: (v: string) => void;
  passportMonth: string; setPassportMonth: (v: string) => void;
  passportSearch: string; setPassportSearch: (v: string) => void;
  packages: any[] | undefined;
  allDepartures: any[] | undefined;
  passportCustomers: any[];
  passportForm: { customerId: string; purpose: string; };
  setPassportForm: (v: any) => void;
  getSelectedDeparture: (id: string) => any;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGeneratePassportLetter: () => any;
}

export function PassportLetterTab({
  passportFilterPkg, setPassportFilterPkg, passportFilterDep, setPassportFilterDep,
  passportYear, setPassportYear, passportMonth, setPassportMonth,
  passportSearch, setPassportSearch,
  packages, allDepartures, passportCustomers, passportForm, setPassportForm,
  getSelectedDeparture, doGenerate, handleGeneratePassportLetter,
}: Props) {
  const dep = getSelectedDeparture(passportFilterDep);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5" />Surat Permohonan Paspor</CardTitle>
        <CardDescription>Filter Tahun/Bulan → Paket → Keberangkatan → Jamaah.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PackageDepartureFilter
            selectedPackageId={passportFilterPkg} selectedDepartureId={passportFilterDep}
            filterYear={passportYear} filterMonth={passportMonth}
            onPackageChange={(v) => { setPassportFilterPkg(v); setPassportForm({ ...passportForm, customerId: '' }); }}
            onDepartureChange={(v) => { setPassportFilterDep(v); setPassportForm({ ...passportForm, customerId: '' }); }}
            onYearChange={setPassportYear} onMonthChange={setPassportMonth}
            packages={packages} departures={allDepartures}
          />
          {passportFilterDep && <DepartureInfo dep={dep} />}
          <div className="col-span-full md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari jamaah..." value={passportSearch}
                onChange={(e) => setPassportSearch(e.target.value)} className="pl-10" disabled={!passportFilterDep} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Jamaah ({passportCustomers.length} ditemukan)</Label>
            <Select value={passportForm.customerId} onValueChange={(v) => setPassportForm({ ...passportForm, customerId: v })} disabled={!passportFilterDep}>
              <SelectTrigger><SelectValue placeholder={passportFilterDep ? "Pilih jamaah..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
              <SelectContent>
                {passportCustomers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} - {c.nik || 'NIK belum diisi'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tujuan Perjalanan</Label>
            <Select value={passportForm.purpose} onValueChange={(v) => setPassportForm({ ...passportForm, purpose: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ibadah Umrah">Ibadah Umrah</SelectItem>
                <SelectItem value="Ibadah Haji">Ibadah Haji</SelectItem>
                <SelectItem value="Ibadah Umrah dan Haji">Ibadah Umrah dan Haji</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGeneratePassportLetter, `surat-paspor-${passportForm.customerId}`, 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGeneratePassportLetter, `surat-paspor-${passportForm.customerId}`, 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
