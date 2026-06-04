import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send, Users, Search } from 'lucide-react';
import { PackageDepartureFilter, DepartureInfo } from './shared';

interface Props {
  jamaahFilterPkg: string; setJamaahFilterPkg: (v: string) => void;
  jamaahFilterDep: string; setJamaahFilterDep: (v: string) => void;
  jamaahYear: string; setJamaahYear: (v: string) => void;
  jamaahMonth: string; setJamaahMonth: (v: string) => void;
  jamaahSearch: string; setJamaahSearch: (v: string) => void;
  packages: any[] | undefined;
  allDepartures: any[] | undefined;
  jamaahCustomers: any[];
  jamaahLeaveForm: { customerId: string; employerName: string; employerPosition: string; employerInstitution: string; employerAddress: string; purpose: string; };
  setJamaahLeaveForm: (v: any) => void;
  getSelectedDeparture: (id: string) => any;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateJamaahLeaveLetter: () => any;
}

export function JamaahLeaveTab({
  jamaahFilterPkg, setJamaahFilterPkg, jamaahFilterDep, setJamaahFilterDep,
  jamaahYear, setJamaahYear, jamaahMonth, setJamaahMonth,
  jamaahSearch, setJamaahSearch,
  packages, allDepartures, jamaahCustomers, jamaahLeaveForm, setJamaahLeaveForm,
  getSelectedDeparture, doGenerate, handleGenerateJamaahLeaveLetter,
}: Props) {
  const dep = getSelectedDeparture(jamaahFilterDep);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Surat Keterangan Cuti Jamaah</CardTitle>
        <CardDescription>Filter Tahun/Bulan → Paket → Keberangkatan → Jamaah. Tanggal otomatis dari data keberangkatan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-full"><h3 className="font-semibold text-sm text-muted-foreground mb-1">FILTER KEBERANGKATAN</h3></div>
          <PackageDepartureFilter
            selectedPackageId={jamaahFilterPkg} selectedDepartureId={jamaahFilterDep}
            filterYear={jamaahYear} filterMonth={jamaahMonth}
            onPackageChange={(v) => { setJamaahFilterPkg(v); setJamaahLeaveForm({ ...jamaahLeaveForm, customerId: '' }); }}
            onDepartureChange={(v) => { setJamaahFilterDep(v); setJamaahLeaveForm({ ...jamaahLeaveForm, customerId: '' }); }}
            onYearChange={setJamaahYear} onMonthChange={setJamaahMonth}
            packages={packages} departures={allDepartures}
          />
          {jamaahFilterDep && <DepartureInfo dep={dep} />}

          <div className="col-span-full"><h3 className="font-semibold text-sm text-muted-foreground mb-1">DATA JAMAAH</h3></div>
          <div className="col-span-full md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari jamaah (nama, NIK, telepon)..." value={jamaahSearch}
                onChange={(e) => setJamaahSearch(e.target.value)} className="pl-10" disabled={!jamaahFilterDep} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Jamaah ({jamaahCustomers.length} ditemukan)</Label>
            <Select value={jamaahLeaveForm.customerId} onValueChange={(v) => setJamaahLeaveForm({ ...jamaahLeaveForm, customerId: v })} disabled={!jamaahFilterDep}>
              <SelectTrigger><SelectValue placeholder={jamaahFilterDep ? "Pilih jamaah..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
              <SelectContent>
                {jamaahCustomers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} - {c.nik || 'NIK belum diisi'}</SelectItem>
                ))}
                {jamaahCustomers.length === 0 && jamaahFilterDep && (
                  <SelectItem value="_empty" disabled>Tidak ada jamaah ditemukan</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tujuan Ibadah</Label>
            <Select value={jamaahLeaveForm.purpose} onValueChange={(v) => setJamaahLeaveForm({ ...jamaahLeaveForm, purpose: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ibadah Umrah">Ibadah Umrah</SelectItem>
                <SelectItem value="Ibadah Haji">Ibadah Haji</SelectItem>
                <SelectItem value="Ibadah Umrah dan Haji">Ibadah Umrah dan Haji</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-full pt-4"><h3 className="font-semibold text-sm text-muted-foreground mb-1">DATA PENERIMA SURAT (PEMBERI KERJA)</h3></div>
          <div className="space-y-2">
            <Label>Nama Pimpinan/HRD</Label>
            <Input value={jamaahLeaveForm.employerName} onChange={(e) => setJamaahLeaveForm({ ...jamaahLeaveForm, employerName: e.target.value })} placeholder="Nama penerima surat" />
          </div>
          <div className="space-y-2">
            <Label>Jabatan (Opsional)</Label>
            <Input value={jamaahLeaveForm.employerPosition} onChange={(e) => setJamaahLeaveForm({ ...jamaahLeaveForm, employerPosition: e.target.value })} placeholder="Contoh: Kepala HRD" />
          </div>
          <div className="space-y-2">
            <Label>Nama Instansi/Perusahaan</Label>
            <Input value={jamaahLeaveForm.employerInstitution} onChange={(e) => setJamaahLeaveForm({ ...jamaahLeaveForm, employerInstitution: e.target.value })} placeholder="Nama perusahaan/instansi" />
          </div>
          <div className="space-y-2">
            <Label>Alamat Instansi</Label>
            <Input value={jamaahLeaveForm.employerAddress} onChange={(e) => setJamaahLeaveForm({ ...jamaahLeaveForm, employerAddress: e.target.value })} placeholder="Alamat perusahaan/instansi" />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateJamaahLeaveLetter, `surat-cuti-jamaah-${jamaahLeaveForm.customerId}`, 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateJamaahLeaveLetter, `surat-cuti-jamaah-${jamaahLeaveForm.customerId}`, 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
