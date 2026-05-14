import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, CalendarIcon, Filter } from 'lucide-react';
import { format, getYear, getMonth } from 'date-fns';
import { id } from 'date-fns/locale';

export interface PackageDepartureFilterProps {
  selectedPackageId: string;
  selectedDepartureId: string;
  filterYear: string;
  filterMonth: string;
  onPackageChange: (v: string) => void;
  onDepartureChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  packages: any[] | undefined;
  departures: any[] | undefined;
}

export function PackageDepartureFilter({
  selectedPackageId, selectedDepartureId, filterYear, filterMonth,
  onPackageChange, onDepartureChange, onYearChange, onMonthChange,
  packages, departures,
}: PackageDepartureFilterProps) {
  const filteredDepartures = useMemo(() => {
    if (!departures) return [];
    let filtered = departures;
    if (selectedPackageId) filtered = filtered.filter((d: any) => d.package_id === selectedPackageId);
    if (filterYear && filterYear !== 'all')
      filtered = filtered.filter((d: any) => getYear(new Date(d.departure_date)) === parseInt(filterYear));
    if (filterMonth && filterMonth !== 'all')
      filtered = filtered.filter((d: any) => getMonth(new Date(d.departure_date)) === parseInt(filterMonth));
    return filtered;
  }, [selectedPackageId, departures, filterYear, filterMonth]);

  const availableYears = useMemo(() => {
    if (!departures) return [];
    const years = [...new Set(departures.map((d: any) => getYear(new Date(d.departure_date))))];
    return years.sort((a, b) => b - a);
  }, [departures]);

  const months = [
    { value: '0', label: 'Januari' }, { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' }, { value: '3', label: 'April' },
    { value: '4', label: 'Mei' }, { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' }, { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' }, { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' }, { value: '11', label: 'Desember' },
  ];

  return (
    <>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Pilih Paket</Label>
        <Select value={selectedPackageId} onValueChange={(v) => { onPackageChange(v); onDepartureChange(''); }}>
          <SelectTrigger><SelectValue placeholder="Semua paket..." /></SelectTrigger>
          <SelectContent>
            {packages?.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.package_type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Tahun</Label>
        <Select value={filterYear} onValueChange={(v) => { onYearChange(v); onDepartureChange(''); }}>
          <SelectTrigger><SelectValue placeholder="Semua tahun" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {availableYears.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Bulan</Label>
        <Select value={filterMonth} onValueChange={(v) => { onMonthChange(v); onDepartureChange(''); }}>
          <SelectTrigger><SelectValue placeholder="Semua bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Pilih Keberangkatan</Label>
        <Select value={selectedDepartureId} onValueChange={onDepartureChange}>
          <SelectTrigger><SelectValue placeholder="Pilih keberangkatan..." /></SelectTrigger>
          <SelectContent>
            {filteredDepartures.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {format(new Date(d.departure_date), 'd MMM yyyy', { locale: id })} - {format(new Date(d.return_date), 'd MMM yyyy', { locale: id })} (Sisa: {d.quota - (d.booked_count || 0)})
              </SelectItem>
            ))}
            {filteredDepartures.length === 0 && (
              <SelectItem value="_empty" disabled>Tidak ada keberangkatan</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function DepartureInfo({ dep }: { dep: any }) {
  if (!dep) return null;
  return (
    <div className="col-span-full p-3 bg-muted rounded-lg text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div><span className="text-muted-foreground">Berangkat:</span> {format(new Date(dep.departure_date), 'd MMM yyyy', { locale: id })}</div>
        <div><span className="text-muted-foreground">Kembali:</span> {format(new Date(dep.return_date), 'd MMM yyyy', { locale: id })}</div>
        <div><span className="text-muted-foreground">Maskapai:</span> {(dep.airline as any)?.name || '-'}</div>
        <div><span className="text-muted-foreground">Flight:</span> {dep.flight_number || '-'}</div>
      </div>
    </div>
  );
}

export const paymentStatusLabels: Record<string, string> = {
  pending: '⏳ Belum Bayar',
  partial: '💰 Sebagian',
  paid: '✅ Lunas',
};
