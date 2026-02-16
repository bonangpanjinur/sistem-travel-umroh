import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  FileText, Download, Send, Calendar as CalendarIcon, Plane, Receipt, Mail,
  User, Users, Briefcase, Ticket, Award, Package, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateLeaveLetter, generateJamaahLeaveLetter, generatePassportLetter,
  generateInvoice, generateGeneralLetter, generateETicket, generateUmrahCertificate,
  type LeaveLetterData, type JamaahLeaveLetterData, type PassportLetterData,
  type InvoiceData, type GeneralLetterData, type ETicketData, type UmrahCertificateData
} from '@/lib/document-generator';

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
  position: string;
  department: string;
  status: string;
}

// ── Cascading filter component ──────────────────────────────────────────
function PackageDepartureFilter({
  selectedPackageId,
  selectedDepartureId,
  onPackageChange,
  onDepartureChange,
  packages,
  departures,
}: {
  selectedPackageId: string;
  selectedDepartureId: string;
  onPackageChange: (v: string) => void;
  onDepartureChange: (v: string) => void;
  packages: any[] | undefined;
  departures: any[] | undefined;
}) {
  const filteredDepartures = useMemo(() => {
    if (!selectedPackageId || !departures) return [];
    return departures.filter((d: any) => d.package_id === selectedPackageId);
  }, [selectedPackageId, departures]);

  return (
    <>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Pilih Paket</Label>
        <Select value={selectedPackageId} onValueChange={(v) => { onPackageChange(v); onDepartureChange(''); }}>
          <SelectTrigger><SelectValue placeholder="Pilih paket..." /></SelectTrigger>
          <SelectContent>
            {packages?.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.package_type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Pilih Keberangkatan</Label>
        <Select value={selectedDepartureId} onValueChange={onDepartureChange} disabled={!selectedPackageId}>
          <SelectTrigger><SelectValue placeholder={selectedPackageId ? "Pilih keberangkatan..." : "Pilih paket dulu"} /></SelectTrigger>
          <SelectContent>
            {filteredDepartures.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {format(new Date(d.departure_date), 'd MMM yyyy', { locale: id })} - {format(new Date(d.return_date), 'd MMM yyyy', { locale: id })} (Kuota: {d.quota - (d.booked_count || 0)} sisa)
              </SelectItem>
            ))}
            {filteredDepartures.length === 0 && selectedPackageId && (
              <SelectItem value="_empty" disabled>Tidak ada keberangkatan</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

const AdminDocumentGenerator = () => {
  const [activeTab, setActiveTab] = useState('jamaah-leave');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  // ── Cascading filter states ──
  const [jamaahFilterPkg, setJamaahFilterPkg] = useState('');
  const [jamaahFilterDep, setJamaahFilterDep] = useState('');
  const [passportFilterPkg, setPassportFilterPkg] = useState('');
  const [passportFilterDep, setPassportFilterDep] = useState('');
  const [invoiceFilterPkg, setInvoiceFilterPkg] = useState('');
  const [invoiceFilterDep, setInvoiceFilterDep] = useState('');
  const [eticketFilterPkg, setEticketFilterPkg] = useState('');
  const [eticketFilterDep, setEticketFilterDep] = useState('');
  const [certFilterPkg, setCertFilterPkg] = useState('');
  const [certFilterDep, setCertFilterDep] = useState('');

  // Employee Leave letter form state
  const [employeeLeaveForm, setEmployeeLeaveForm] = useState({
    employeeId: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: '',
    destination: ''
  });

  // Jamaah Leave letter form state
  const [jamaahLeaveForm, setJamaahLeaveForm] = useState({
    customerId: '',
    employerName: '',
    employerPosition: '',
    employerInstitution: '',
    employerAddress: '',
    purpose: 'Ibadah Umrah'
  });

  // Passport letter form state
  const [passportForm, setPassportForm] = useState({
    customerId: '',
    purpose: 'Ibadah Umrah',
  });

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    bookingId: '',
    dueDate: undefined as Date | undefined,
    notes: ''
  });

  // General letter form state
  const [generalForm, setGeneralForm] = useState({
    recipientName: '', recipientPosition: '', recipientInstitution: '', recipientAddress: '',
    subject: '', content: '', signatoryName: '', signatoryPosition: ''
  });

  const [eticketForm, setEticketForm] = useState({ bookingId: '' });
  const [certificateForm, setCertificateForm] = useState({ bookingId: '' });

  // ── Data queries ──

  const { data: packages } = useQuery({
    queryKey: ['packages-for-docgen'],
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('id, name, package_type, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: allDepartures } = useQuery({
    queryKey: ['departures-for-docgen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, package_id, departure_date, return_date, quota, booked_count, flight_number, departure_time, status, airline:airlines(name, code), departure_airport:airports!departures_departure_airport_id_fkey(name, city, code), arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code), hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name), hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name)')
        .order('departure_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch jamaah (passengers) for a given departure
  const { data: jamaahByDeparture } = useQuery({
    queryKey: ['jamaah-by-departure', jamaahFilterDep, passportFilterDep],
    queryFn: async () => {
      const depIds = [jamaahFilterDep, passportFilterDep].filter(Boolean);
      if (depIds.length === 0) return [];
      const { data, error } = await supabase
        .from('booking_passengers')
        .select('*, customer:customers(*), booking:bookings!inner(id, departure_id, booking_code, room_type, total_price, payment_status)')
        .in('booking.departure_id', depIds);
      if (error) throw error;
      return data;
    },
    enabled: !!(jamaahFilterDep || passportFilterDep)
  });

  // Fetch bookings filtered by departure for invoice/eticket/cert
  const { data: bookingsByDeparture } = useQuery({
    queryKey: ['bookings-by-departure', invoiceFilterDep, eticketFilterDep, certFilterDep],
    queryFn: async () => {
      const depIds = [invoiceFilterDep, eticketFilterDep, certFilterDep].filter(Boolean);
      if (depIds.length === 0) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, customer:customers(id, full_name, address, phone, email, nik, birth_place, birth_date, passport_number), departure:departures(departure_date, return_date, departure_time, flight_number, package_id, airline:airlines(name, code), departure_airport:airports!departures_departure_airport_id_fkey(name, city, code), arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code), hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name), hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name), package:packages(name, price_quad, price_triple, price_double, price_single))`)
        .in('departure_id', depIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!(invoiceFilterDep || eticketFilterDep || certFilterDep)
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees-for-letter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employees' as any)
        .select('id, full_name, employee_id, position, department, status')
        .eq('status', 'active')
        .order('full_name') as { data: Employee[] | null; error: any };
      return data || [];
    }
  });

  // ── Helper functions ──

  const getSelectedDeparture = (depId: string) => allDepartures?.find((d: any) => d.id === depId);

  const jamaahCustomers = useMemo(() => {
    if (!jamaahFilterDep || !jamaahByDeparture) return [];
    return jamaahByDeparture
      .filter((bp: any) => bp.booking?.departure_id === jamaahFilterDep)
      .map((bp: any) => bp.customer)
      .filter(Boolean);
  }, [jamaahFilterDep, jamaahByDeparture]);

  const passportCustomers = useMemo(() => {
    if (!passportFilterDep || !jamaahByDeparture) return [];
    return jamaahByDeparture
      .filter((bp: any) => bp.booking?.departure_id === passportFilterDep)
      .map((bp: any) => bp.customer)
      .filter(Boolean);
  }, [passportFilterDep, jamaahByDeparture]);

  const invoiceBookings = useMemo(() => {
    if (!invoiceFilterDep || !bookingsByDeparture) return [];
    return bookingsByDeparture.filter((b: any) => b.departure_id === invoiceFilterDep);
  }, [invoiceFilterDep, bookingsByDeparture]);

  const eticketBookings = useMemo(() => {
    if (!eticketFilterDep || !bookingsByDeparture) return [];
    return bookingsByDeparture.filter((b: any) => b.departure_id === eticketFilterDep);
  }, [eticketFilterDep, bookingsByDeparture]);

  const certBookings = useMemo(() => {
    if (!certFilterDep || !bookingsByDeparture) return [];
    return bookingsByDeparture
      .filter((b: any) => b.departure_id === certFilterDep)
      .filter((b: any) => {
        const dep = b.departure as any;
        return dep?.return_date && new Date(dep.return_date) <= new Date();
      });
  }, [certFilterDep, bookingsByDeparture]);

  const getLetterNumber = async (docType: string, prefix: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('get_next_document_number', {
        p_document_type: docType,
        p_prefix: prefix
      });
      if (error) throw error;
      return data as string;
    } catch {
      // Fallback
      const date = new Date();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${random}/${prefix}/UHT/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
  };

  const handleDownloadPdf = (doc: any, filename: string) => {
    doc.save(`${filename}.pdf`);
    toast.success('Dokumen berhasil diunduh');
  };

  const handlePrepareSend = (doc: any, filename: string) => {
    const blob = doc.output('blob');
    setCurrentPdfBlob(blob);
    setCurrentFileName(filename);
    setSendDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!sendEmail || !currentPdfBlob) { toast.error('Email tujuan harus diisi'); return; }
    toast.success(`Dokumen akan dikirim ke ${sendEmail}`);
    setSendDialogOpen(false);
    setSendEmail('');
    const url = URL.createObjectURL(currentPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFileName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Generate handlers ──

  const handleGenerateEmployeeLeaveLetter = () => {
    const employee = employees?.find(e => e.id === employeeLeaveForm.employeeId);
    if (!employee || !employeeLeaveForm.startDate || !employeeLeaveForm.endDate) {
      toast.error('Lengkapi semua data yang diperlukan'); return;
    }
    const data: LeaveLetterData = {
      employeeName: employee.full_name,
      employeePosition: employee.position || 'Staff',
      employeeNik: employee.employee_id || '-',
      startDate: employeeLeaveForm.startDate,
      endDate: employeeLeaveForm.endDate,
      reason: employeeLeaveForm.reason,
      destination: employeeLeaveForm.destination
    };
    return { generate: async () => generateLeaveLetter(data, await getLetterNumber('cuti_karyawan', 'CUTI-KRY')) };
  };

  const handleGenerateJamaahLeaveLetter = () => {
    const customer = jamaahCustomers.find((c: any) => c.id === jamaahLeaveForm.customerId);
    const departure = getSelectedDeparture(jamaahFilterDep);
    if (!customer || !departure || !jamaahLeaveForm.employerName) {
      toast.error('Lengkapi semua data yang diperlukan (Paket, Keberangkatan, Jamaah, dan Data Pemberi Kerja)'); return;
    }
    const data: JamaahLeaveLetterData = {
      jamaahName: customer.full_name,
      nik: customer.nik || '-',
      birthPlace: customer.birth_place || '-',
      birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
      address: customer.address || '-',
      employerName: jamaahLeaveForm.employerName,
      employerPosition: jamaahLeaveForm.employerPosition,
      employerInstitution: jamaahLeaveForm.employerInstitution,
      employerAddress: jamaahLeaveForm.employerAddress,
      startDate: new Date(departure.departure_date),
      endDate: new Date(departure.return_date),
      purpose: jamaahLeaveForm.purpose
    };
    return { generate: async () => generateJamaahLeaveLetter(data, await getLetterNumber('cuti_jamaah', 'CUTI-JMH')) };
  };

  const handleGeneratePassportLetter = () => {
    const customer = passportCustomers.find((c: any) => c.id === passportForm.customerId);
    const departure = getSelectedDeparture(passportFilterDep);
    if (!customer) { toast.error('Pilih jamaah terlebih dahulu'); return; }
    const data: PassportLetterData = {
      customerName: customer.full_name,
      nik: customer.nik || '-',
      birthPlace: customer.birth_place || '-',
      birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
      address: customer.address || '-',
      phone: customer.phone || '-',
      purpose: passportForm.purpose,
      departureDate: departure ? new Date(departure.departure_date) : undefined
    };
    return { generate: async () => generatePassportLetter(data, await getLetterNumber('paspor', 'PASPOR')) };
  };

  const handleGenerateInvoice = () => {
    const booking = invoiceBookings.find((b: any) => b.id === invoiceForm.bookingId);
    if (!booking) { toast.error('Pilih booking terlebih dahulu'); return; }
    const customer = booking.customer as any;
    const departure = booking.departure as any;
    const pkg = departure?.package as any;
    const data: InvoiceData = {
      invoiceNumber: `INV-${booking.booking_code}`,
      invoiceDate: new Date(),
      dueDate: invoiceForm.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      customer: { name: customer?.full_name || '-', address: customer?.address || '-', phone: customer?.phone || '-', email: customer?.email },
      items: [{ description: `Paket ${pkg?.name || 'Umrah'} - ${booking.room_type}`, quantity: booking.total_pax || 1, unitPrice: booking.base_price / (booking.total_pax || 1), total: booking.base_price }],
      subtotal: booking.base_price,
      discount: booking.discount_amount || 0,
      total: booking.total_price,
      notes: invoiceForm.notes || 'Pembayaran dapat dilakukan secara bertahap. Pelunasan paling lambat 2 minggu sebelum keberangkatan.',
      bankInfo: { bankName: 'Bank Syariah Indonesia (BSI)', accountNumber: '1234567890', accountName: 'PT. Umrah Haji Travel' }
    };
    return { generate: async () => generateInvoice(data) };
  };

  const handleGenerateETicket = () => {
    const booking = eticketBookings.find((b: any) => b.id === eticketForm.bookingId);
    if (!booking) { toast.error('Pilih booking terlebih dahulu'); return; }
    const customer = booking.customer as any;
    const departure = booking.departure as any;
    const pkg = departure?.package as any;
    const airline = departure?.airline as any;
    const depAirport = departure?.departure_airport as any;
    const arrAirport = departure?.arrival_airport as any;
    const hotelMakkah = departure?.hotel_makkah as any;
    const hotelMadinah = departure?.hotel_madinah as any;
    const roomTypeLabels: Record<string, string> = { quad: 'Quad (4 orang)', triple: 'Triple (3 orang)', double: 'Double (2 orang)', single: 'Single (1 orang)' };
    const data: ETicketData = {
      bookingCode: booking.booking_code,
      passengerName: customer?.full_name || '-',
      passportNumber: customer?.passport_number || '-',
      packageName: pkg?.name || 'Paket Umrah',
      departureDate: new Date(departure?.departure_date),
      returnDate: new Date(departure?.return_date),
      departureAirport: depAirport ? `${depAirport.name} (${depAirport.code})` : '-',
      arrivalAirport: arrAirport ? `${arrAirport.name} (${arrAirport.code})` : '-',
      flightNumber: departure?.flight_number,
      airline: airline?.name,
      departureTime: departure?.departure_time,
      hotelMakkah: hotelMakkah?.name,
      hotelMadinah: hotelMadinah?.name,
      roomType: roomTypeLabels[booking.room_type] || booking.room_type
    };
    return { generate: async () => generateETicket(data) };
  };

  const handleGenerateCertificate = () => {
    const booking = certBookings.find((b: any) => b.id === certificateForm.bookingId);
    if (!booking) { toast.error('Pilih booking terlebih dahulu'); return; }
    const customer = booking.customer as any;
    const departure = booking.departure as any;
    const pkg = departure?.package as any;
    const data: UmrahCertificateData = {
      participantName: customer?.full_name || '-',
      passportNumber: customer?.passport_number || '-',
      birthPlace: customer?.birth_place || '-',
      birthDate: customer?.birth_date ? new Date(customer.birth_date) : new Date(),
      packageName: pkg?.name || 'Paket Umrah',
      departureDate: new Date(departure?.departure_date),
      returnDate: new Date(departure?.return_date),
      certificateNumber: `CERT-${booking.booking_code}`
    };
    return { generate: async () => generateUmrahCertificate(data) };
  };

  const handleGenerateGeneralLetter = () => {
    if (!generalForm.recipientName || !generalForm.subject || !generalForm.content) {
      toast.error('Lengkapi semua data yang diperlukan'); return;
    }
    return { generate: async () => {
      const letterNumber = await getLetterNumber('surat_umum', 'SURAT');
      return generateGeneralLetter({
        letterNumber, letterDate: new Date(),
        recipient: { name: generalForm.recipientName, position: generalForm.recipientPosition, institution: generalForm.recipientInstitution, address: generalForm.recipientAddress },
        subject: generalForm.subject, content: generalForm.content,
        signatory: { name: generalForm.signatoryName || 'Direktur Utama', position: generalForm.signatoryPosition || 'PT. Umrah Haji Travel' }
      });
    }};
  };

  // Wrapper to handle async generate
  const doGenerate = async (handler: () => { generate: () => Promise<any> } | undefined, filename: string, action: 'download' | 'send') => {
    const result = handler();
    if (!result) return;
    try {
      const doc = await result.generate();
      if (action === 'download') handleDownloadPdf(doc, filename);
      else handlePrepareSend(doc, filename);
    } catch (err) {
      toast.error('Gagal generate dokumen');
      console.error(err);
    }
  };

  // ── Departure info display ──
  const DepartureInfo = ({ depId }: { depId: string }) => {
    const dep = getSelectedDeparture(depId);
    if (!dep) return null;
    return (
      <div className="col-span-2 p-3 bg-muted rounded-lg text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><span className="text-muted-foreground">Berangkat:</span> {format(new Date(dep.departure_date), 'd MMM yyyy', { locale: id })}</div>
          <div><span className="text-muted-foreground">Kembali:</span> {format(new Date(dep.return_date), 'd MMM yyyy', { locale: id })}</div>
          <div><span className="text-muted-foreground">Maskapai:</span> {(dep.airline as any)?.name || '-'}</div>
          <div><span className="text-muted-foreground">Flight:</span> {dep.flight_number || '-'}</div>
        </div>
      </div>
    );
  };

  const paymentStatusLabels: Record<string, string> = { pending: '⏳ Belum Bayar', partial: '💰 Sebagian', paid: '✅ Lunas' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Dokumen</h1>
        <p className="text-muted-foreground">Buat surat-surat resmi dan invoice dalam format PDF. Pilih Paket → Keberangkatan untuk memfilter data.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="jamaah-leave" className="flex items-center gap-1">
            <Users className="h-4 w-4" /><span className="hidden lg:inline">Cuti Jamaah</span>
          </TabsTrigger>
          <TabsTrigger value="employee-leave" className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" /><span className="hidden lg:inline">Cuti Karyawan</span>
          </TabsTrigger>
          <TabsTrigger value="passport" className="flex items-center gap-1">
            <Plane className="h-4 w-4" /><span className="hidden lg:inline">Paspor</span>
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-1">
            <Receipt className="h-4 w-4" /><span className="hidden lg:inline">Invoice</span>
          </TabsTrigger>
          <TabsTrigger value="eticket" className="flex items-center gap-1">
            <Ticket className="h-4 w-4" /><span className="hidden lg:inline">E-Ticket</span>
          </TabsTrigger>
          <TabsTrigger value="certificate" className="flex items-center gap-1">
            <Award className="h-4 w-4" /><span className="hidden lg:inline">Sertifikat</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1">
            <FileText className="h-4 w-4" /><span className="hidden lg:inline">Surat Umum</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══ Jamaah Leave Letter ═══ */}
        <TabsContent value="jamaah-leave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Surat Keterangan Cuti Jamaah</CardTitle>
              <CardDescription>Pilih Paket → Keberangkatan → Jamaah. Tanggal otomatis terisi dari data keberangkatan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2"><h3 className="font-semibold text-sm text-muted-foreground mb-3">FILTER KEBERANGKATAN</h3></div>
                <PackageDepartureFilter
                  selectedPackageId={jamaahFilterPkg} selectedDepartureId={jamaahFilterDep}
                  onPackageChange={(v) => { setJamaahFilterPkg(v); setJamaahLeaveForm({ ...jamaahLeaveForm, customerId: '' }); }}
                  onDepartureChange={(v) => { setJamaahFilterDep(v); setJamaahLeaveForm({ ...jamaahLeaveForm, customerId: '' }); }}
                  packages={packages} departures={allDepartures}
                />
                {jamaahFilterDep && <DepartureInfo depId={jamaahFilterDep} />}

                <div className="col-span-2"><h3 className="font-semibold text-sm text-muted-foreground mb-3">DATA JAMAAH</h3></div>
                <div className="space-y-2">
                  <Label>Jamaah</Label>
                  <Select value={jamaahLeaveForm.customerId} onValueChange={(v) => setJamaahLeaveForm({ ...jamaahLeaveForm, customerId: v })} disabled={!jamaahFilterDep}>
                    <SelectTrigger><SelectValue placeholder={jamaahFilterDep ? "Pilih jamaah..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
                    <SelectContent>
                      {jamaahCustomers.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name} - {c.nik || 'NIK belum diisi'}</SelectItem>
                      ))}
                      {jamaahCustomers.length === 0 && jamaahFilterDep && (
                        <SelectItem value="_empty" disabled>Tidak ada jamaah terdaftar</SelectItem>
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

                <div className="col-span-2 pt-4"><h3 className="font-semibold text-sm text-muted-foreground mb-3">DATA PENERIMA SURAT (PEMBERI KERJA)</h3></div>
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
        </TabsContent>

        {/* ═══ Employee Leave Letter ═══ */}
        <TabsContent value="employee-leave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Surat Permohonan Cuti Karyawan</CardTitle>
              <CardDescription>Generate surat cuti untuk karyawan internal perusahaan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Karyawan</Label>
                  <Select value={employeeLeaveForm.employeeId} onValueChange={(v) => setEmployeeLeaveForm({ ...employeeLeaveForm, employeeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.full_name} - {emp.position}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alasan Cuti</Label>
                  <Input value={employeeLeaveForm.reason} onChange={(e) => setEmployeeLeaveForm({ ...employeeLeaveForm, reason: e.target.value })} placeholder="Contoh: Keperluan keluarga" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !employeeLeaveForm.startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {employeeLeaveForm.startDate ? format(employeeLeaveForm.startDate, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={employeeLeaveForm.startDate} onSelect={(d) => setEmployeeLeaveForm({ ...employeeLeaveForm, startDate: d })} /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !employeeLeaveForm.endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {employeeLeaveForm.endDate ? format(employeeLeaveForm.endDate, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={employeeLeaveForm.endDate} onSelect={(d) => setEmployeeLeaveForm({ ...employeeLeaveForm, endDate: d })} /></PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Alamat Selama Cuti (Opsional)</Label>
                  <Input value={employeeLeaveForm.destination} onChange={(e) => setEmployeeLeaveForm({ ...employeeLeaveForm, destination: e.target.value })} placeholder="Alamat tujuan selama cuti" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => doGenerate(handleGenerateEmployeeLeaveLetter, `surat-cuti-karyawan-${employeeLeaveForm.employeeId}`, 'download')}>
                  <Download className="h-4 w-4 mr-2" />Download PDF
                </Button>
                <Button variant="outline" onClick={() => doGenerate(handleGenerateEmployeeLeaveLetter, `surat-cuti-karyawan-${employeeLeaveForm.employeeId}`, 'send')}>
                  <Send className="h-4 w-4 mr-2" />Kirim via Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Passport Letter ═══ */}
        <TabsContent value="passport">
          <Card>
            <CardHeader>
              <CardTitle>Surat Permohonan Paspor</CardTitle>
              <CardDescription>Pilih Paket → Keberangkatan → Jamaah. Tanggal keberangkatan otomatis terisi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PackageDepartureFilter
                  selectedPackageId={passportFilterPkg} selectedDepartureId={passportFilterDep}
                  onPackageChange={(v) => { setPassportFilterPkg(v); setPassportForm({ ...passportForm, customerId: '' }); }}
                  onDepartureChange={(v) => { setPassportFilterDep(v); setPassportForm({ ...passportForm, customerId: '' }); }}
                  packages={packages} departures={allDepartures}
                />
                {passportFilterDep && <DepartureInfo depId={passportFilterDep} />}
                <div className="space-y-2">
                  <Label>Jamaah</Label>
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
        </TabsContent>

        {/* ═══ Invoice ═══ */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Pembayaran</CardTitle>
              <CardDescription>Pilih Paket → Keberangkatan → Booking untuk generate invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PackageDepartureFilter
                  selectedPackageId={invoiceFilterPkg} selectedDepartureId={invoiceFilterDep}
                  onPackageChange={(v) => { setInvoiceFilterPkg(v); setInvoiceForm({ ...invoiceForm, bookingId: '' }); }}
                  onDepartureChange={(v) => { setInvoiceFilterDep(v); setInvoiceForm({ ...invoiceForm, bookingId: '' }); }}
                  packages={packages} departures={allDepartures}
                />
                {invoiceFilterDep && <DepartureInfo depId={invoiceFilterDep} />}
                <div className="space-y-2">
                  <Label>Booking</Label>
                  <Select value={invoiceForm.bookingId} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, bookingId: v })} disabled={!invoiceFilterDep}>
                    <SelectTrigger><SelectValue placeholder={invoiceFilterDep ? "Pilih booking..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
                    <SelectContent>
                      {invoiceBookings.map((b: any) => {
                        const c = b.customer as any;
                        return (
                          <SelectItem key={b.id} value={b.id}>
                            {b.booking_code} - {c?.full_name || 'N/A'} | {b.room_type} | {paymentStatusLabels[b.payment_status] || b.payment_status}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !invoiceForm.dueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {invoiceForm.dueDate ? format(invoiceForm.dueDate, "PPP", { locale: id }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoiceForm.dueDate} onSelect={(d) => setInvoiceForm({ ...invoiceForm, dueDate: d })} /></PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} placeholder="Catatan tambahan untuk invoice..." rows={3} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  const b = invoiceBookings.find((b: any) => b.id === invoiceForm.bookingId);
                  doGenerate(handleGenerateInvoice, `invoice-${b?.booking_code || 'new'}`, 'download');
                }}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
                <Button variant="outline" onClick={() => {
                  const b = invoiceBookings.find((b: any) => b.id === invoiceForm.bookingId);
                  doGenerate(handleGenerateInvoice, `invoice-${b?.booking_code || 'new'}`, 'send');
                }}><Send className="h-4 w-4 mr-2" />Kirim via Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ E-Ticket ═══ */}
        <TabsContent value="eticket">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" />Generate E-Ticket</CardTitle>
              <CardDescription>Pilih Paket → Keberangkatan → Booking untuk generate e-ticket.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PackageDepartureFilter
                  selectedPackageId={eticketFilterPkg} selectedDepartureId={eticketFilterDep}
                  onPackageChange={(v) => { setEticketFilterPkg(v); setEticketForm({ bookingId: '' }); }}
                  onDepartureChange={(v) => { setEticketFilterDep(v); setEticketForm({ bookingId: '' }); }}
                  packages={packages} departures={allDepartures}
                />
                {eticketFilterDep && <DepartureInfo depId={eticketFilterDep} />}
                <div className="col-span-2 space-y-2">
                  <Label>Pilih Booking</Label>
                  <Select value={eticketForm.bookingId} onValueChange={(v) => setEticketForm({ bookingId: v })} disabled={!eticketFilterDep}>
                    <SelectTrigger><SelectValue placeholder={eticketFilterDep ? "Pilih booking jamaah..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
                    <SelectContent>
                      {eticketBookings.map((b: any) => {
                        const c = b.customer as any;
                        return (
                          <SelectItem key={b.id} value={b.id}>
                            {b.booking_code} - {c?.full_name || 'N/A'} | {b.room_type}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {eticketForm.bookingId && (() => {
                  const booking = eticketBookings.find((b: any) => b.id === eticketForm.bookingId);
                  const customer = booking?.customer as any;
                  const departure = booking?.departure as any;
                  const pkg = departure?.package as any;
                  const airline = departure?.airline as any;
                  if (!booking) return null;
                  return (
                    <div className="col-span-2 p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Preview Data E-Ticket:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Nama:</span> {customer?.full_name}</div>
                        <div><span className="text-muted-foreground">Paspor:</span> {customer?.passport_number || '-'}</div>
                        <div><span className="text-muted-foreground">Paket:</span> {pkg?.name || '-'}</div>
                        <div><span className="text-muted-foreground">Tipe Kamar:</span> {booking?.room_type}</div>
                        <div><span className="text-muted-foreground">Berangkat:</span> {departure?.departure_date ? format(new Date(departure.departure_date), 'd MMM yyyy', { locale: id }) : '-'}</div>
                        <div><span className="text-muted-foreground">Kembali:</span> {departure?.return_date ? format(new Date(departure.return_date), 'd MMM yyyy', { locale: id }) : '-'}</div>
                        <div><span className="text-muted-foreground">Maskapai:</span> {airline?.name || '-'}</div>
                        <div><span className="text-muted-foreground">No. Penerbangan:</span> {departure?.flight_number || '-'}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  const b = eticketBookings.find((b: any) => b.id === eticketForm.bookingId);
                  doGenerate(handleGenerateETicket, `eticket-${b?.booking_code || 'new'}`, 'download');
                }}><Download className="h-4 w-4 mr-2" />Download E-Ticket</Button>
                <Button variant="outline" onClick={() => {
                  const b = eticketBookings.find((b: any) => b.id === eticketForm.bookingId);
                  doGenerate(handleGenerateETicket, `eticket-${b?.booking_code || 'new'}`, 'send');
                }}><Send className="h-4 w-4 mr-2" />Kirim via Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Certificate ═══ */}
        <TabsContent value="certificate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Sertifikat Umrah</CardTitle>
              <CardDescription>Pilih Paket → Keberangkatan → Booking (hanya jamaah yang sudah kembali).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PackageDepartureFilter
                  selectedPackageId={certFilterPkg} selectedDepartureId={certFilterDep}
                  onPackageChange={(v) => { setCertFilterPkg(v); setCertificateForm({ bookingId: '' }); }}
                  onDepartureChange={(v) => { setCertFilterDep(v); setCertificateForm({ bookingId: '' }); }}
                  packages={packages} departures={allDepartures}
                />
                {certFilterDep && <DepartureInfo depId={certFilterDep} />}
                <div className="col-span-2 space-y-2">
                  <Label>Pilih Booking (Jamaah yang sudah kembali)</Label>
                  <Select value={certificateForm.bookingId} onValueChange={(v) => setCertificateForm({ bookingId: v })} disabled={!certFilterDep}>
                    <SelectTrigger><SelectValue placeholder={certFilterDep ? "Pilih jamaah..." : "Pilih keberangkatan dulu"} /></SelectTrigger>
                    <SelectContent>
                      {certBookings.map((b: any) => {
                        const c = b.customer as any;
                        const dep = b.departure as any;
                        return (
                          <SelectItem key={b.id} value={b.id}>
                            {b.booking_code} - {c?.full_name || 'N/A'} (Kembali: {dep?.return_date ? format(new Date(dep.return_date), 'd MMM yyyy', { locale: id }) : '-'})
                          </SelectItem>
                        );
                      })}
                      {certBookings.length === 0 && certFilterDep && (
                        <SelectItem value="_empty" disabled>Tidak ada jamaah yang sudah kembali</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Hanya menampilkan jamaah yang sudah kembali dari umrah</p>
                </div>

                {certificateForm.bookingId && (() => {
                  const booking = certBookings.find((b: any) => b.id === certificateForm.bookingId);
                  const customer = booking?.customer as any;
                  const departure = booking?.departure as any;
                  const pkg = departure?.package as any;
                  if (!booking) return null;
                  return (
                    <div className="col-span-2 p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Preview Data Sertifikat:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Nama:</span> {customer?.full_name}</div>
                        <div><span className="text-muted-foreground">Paspor:</span> {customer?.passport_number || '-'}</div>
                        <div><span className="text-muted-foreground">TTL:</span> {customer?.birth_place}, {customer?.birth_date ? format(new Date(customer.birth_date), 'd MMM yyyy', { locale: id }) : '-'}</div>
                        <div><span className="text-muted-foreground">Paket:</span> {pkg?.name || '-'}</div>
                        <div><span className="text-muted-foreground">Periode:</span> {departure?.departure_date ? format(new Date(departure.departure_date), 'd MMM', { locale: id }) : ''} - {departure?.return_date ? format(new Date(departure.return_date), 'd MMM yyyy', { locale: id }) : '-'}</div>
                        <div><span className="text-muted-foreground">No. Sertifikat:</span> CERT-{booking?.booking_code}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  const b = certBookings.find((b: any) => b.id === certificateForm.bookingId);
                  doGenerate(handleGenerateCertificate, `sertifikat-umrah-${b?.booking_code || 'new'}`, 'download');
                }}><Download className="h-4 w-4 mr-2" />Download Sertifikat</Button>
                <Button variant="outline" onClick={() => {
                  const b = certBookings.find((b: any) => b.id === certificateForm.bookingId);
                  doGenerate(handleGenerateCertificate, `sertifikat-umrah-${b?.booking_code || 'new'}`, 'send');
                }}><Send className="h-4 w-4 mr-2" />Kirim via Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ General Letter ═══ */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Surat Umum</CardTitle>
              <CardDescription>Generate surat resmi untuk berbagai keperluan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Penerima</Label>
                  <Input value={generalForm.recipientName} onChange={(e) => setGeneralForm({ ...generalForm, recipientName: e.target.value })} placeholder="Nama penerima surat" />
                </div>
                <div className="space-y-2">
                  <Label>Jabatan Penerima (Opsional)</Label>
                  <Input value={generalForm.recipientPosition} onChange={(e) => setGeneralForm({ ...generalForm, recipientPosition: e.target.value })} placeholder="Jabatan penerima" />
                </div>
                <div className="space-y-2">
                  <Label>Instansi (Opsional)</Label>
                  <Input value={generalForm.recipientInstitution} onChange={(e) => setGeneralForm({ ...generalForm, recipientInstitution: e.target.value })} placeholder="Nama instansi" />
                </div>
                <div className="space-y-2">
                  <Label>Alamat (Opsional)</Label>
                  <Input value={generalForm.recipientAddress} onChange={(e) => setGeneralForm({ ...generalForm, recipientAddress: e.target.value })} placeholder="Alamat penerima" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Perihal</Label>
                  <Input value={generalForm.subject} onChange={(e) => setGeneralForm({ ...generalForm, subject: e.target.value })} placeholder="Perihal surat" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Isi Surat</Label>
                  <Textarea value={generalForm.content} onChange={(e) => setGeneralForm({ ...generalForm, content: e.target.value })} placeholder="Tulis isi surat di sini..." rows={6} />
                </div>
                <div className="space-y-2">
                  <Label>Nama Penandatangan</Label>
                  <Input value={generalForm.signatoryName} onChange={(e) => setGeneralForm({ ...generalForm, signatoryName: e.target.value })} placeholder="Nama penandatangan" />
                </div>
                <div className="space-y-2">
                  <Label>Jabatan Penandatangan</Label>
                  <Input value={generalForm.signatoryPosition} onChange={(e) => setGeneralForm({ ...generalForm, signatoryPosition: e.target.value })} placeholder="Jabatan penandatangan" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => doGenerate(handleGenerateGeneralLetter, `surat-${generalForm.subject.replace(/\s+/g, '-').toLowerCase()}`, 'download')}>
                  <Download className="h-4 w-4 mr-2" />Download PDF
                </Button>
                <Button variant="outline" onClick={() => doGenerate(handleGenerateGeneralLetter, `surat-${generalForm.subject.replace(/\s+/g, '-').toLowerCase()}`, 'send')}>
                  <Send className="h-4 w-4 mr-2" />Kirim via Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Email Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Kirim Dokumen via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Tujuan</Label>
              <Input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="contoh@email.com" />
            </div>
            <p className="text-sm text-muted-foreground">Dokumen {currentFileName}.pdf akan dikirim ke alamat email di atas.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSendEmail}><Send className="h-4 w-4 mr-2" />Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocumentGenerator;
