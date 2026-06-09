import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FileText, Send, Mail, Users, Briefcase, Plane, Receipt, Ticket, Award, Package, MessageCircle, Loader2 } from 'lucide-react';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import {
  generateLeaveLetter, generateJamaahLeaveLetter, generatePassportLetter,
  generateInvoice, generateGeneralLetter, generateETicket, generateUmrahCertificate,
  type LeaveLetterData, type JamaahLeaveLetterData, type PassportLetterData,
  type InvoiceDataExtended, type ETicketData, type UmrahCertificateData,
} from '@/lib/document-generator';
import { BulkDocumentTab } from '@/components/document-generator/BulkDocumentTab';
import { DepartureInfo } from '@/components/document-generator/shared';
import { JamaahLeaveTab } from '@/components/document-generator/JamaahLeaveTab';
import { EmployeeLeaveTab } from '@/components/document-generator/EmployeeLeaveTab';
import { PassportLetterTab } from '@/components/document-generator/PassportLetterTab';
import { InvoiceTab } from '@/components/document-generator/InvoiceTab';
import { ETicketTab } from '@/components/document-generator/ETicketTab';
import { CertificateTab } from '@/components/document-generator/CertificateTab';
import { GeneralLetterTab } from '@/components/document-generator/GeneralLetterTab';

interface Employee {
  id: string; full_name: string; employee_code: string; position: string; department: string; is_active: boolean;
}

const AdminDocumentGenerator = () => {
  const { company, bankAccount } = useCompanyInfo();
  const [activeTab, setActiveTab] = useState('jamaah-leave');
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sendChannel, setSendChannel] = useState<'email' | 'wa'>('email');
  const [sendingWA, setSendingWA] = useState(false);
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  // ── Filter states ──
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

  // ── Year/month filters ──
  const [jamaahYear, setJamaahYear] = useState('all'); const [jamaahMonth, setJamaahMonth] = useState('all');
  const [passportYear, setPassportYear] = useState('all'); const [passportMonth, setPassportMonth] = useState('all');
  const [invoiceYear, setInvoiceYear] = useState('all'); const [invoiceMonth, setInvoiceMonth] = useState('all');
  const [eticketYear, setEticketYear] = useState('all'); const [eticketMonth, setEticketMonth] = useState('all');
  const [certYear, setCertYear] = useState('all'); const [certMonth, setCertMonth] = useState('all');

  // ── Search ──
  const [jamaahSearch, setJamaahSearch] = useState('');
  const [passportSearch, setPassportSearch] = useState('');

  // ── Form states ──
  const [employeeLeaveForm, setEmployeeLeaveForm] = useState({ employeeId: '', startDate: undefined as Date | undefined, endDate: undefined as Date | undefined, reason: '', destination: '' });
  const [jamaahLeaveForm, setJamaahLeaveForm] = useState({ customerId: '', employerName: '', employerPosition: '', employerInstitution: '', employerAddress: '', purpose: 'Ibadah Umrah' });
  const [passportForm, setPassportForm] = useState({ customerId: '', purpose: 'Ibadah Umrah' });
  const [invoiceForm, setInvoiceForm] = useState({ bookingId: '', dueDate: undefined as Date | undefined, notes: '' });
  const [generalForm, setGeneralForm] = useState({ recipientName: '', recipientPosition: '', recipientInstitution: '', recipientAddress: '', subject: '', content: '', signatoryName: '', signatoryPosition: '' });
  const [eticketForm, setEticketForm] = useState({ bookingId: '' });
  const [certificateForm, setCertificateForm] = useState({ bookingId: '' });

  // ── Data queries ──
  const { data: packages } = useQuery({
    queryKey: ['packages-for-docgen'],
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('id, name, package_type, code').eq('is_active', true).order('name');
      if (error) throw error; return data;
    }
  });

  const { data: allDepartures } = useQuery({
    queryKey: ['departures-for-docgen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, package_id, departure_date, return_date, quota, booked_count, flight_number, departure_time, status, airline:airlines(name, code), departure_airport:airports!departures_departure_airport_id_fkey(name, city, code), arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code), hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name), hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name)')
        .order('departure_date', { ascending: false });
      if (error) throw error; return data;
    }
  });

  const { data: jamaahByDeparture } = useQuery({
    queryKey: ['jamaah-by-departure', jamaahFilterDep, passportFilterDep],
    queryFn: async () => {
      const depIds = [jamaahFilterDep, passportFilterDep].filter(Boolean);
      if (depIds.length === 0) return [];
      const { data, error } = await supabase
        .from('booking_passengers')
        .select('*, customer:customers(*), booking:bookings!inner(id, departure_id, booking_code, room_type, total_price, payment_status)')
        .in('booking.departure_id', depIds);
      if (error) throw error; return data;
    },
    enabled: !!(jamaahFilterDep || passportFilterDep)
  });

  const { data: bookingsByDeparture } = useQuery({
    queryKey: ['bookings-by-departure', invoiceFilterDep, eticketFilterDep, certFilterDep],
    queryFn: async () => {
      const depIds = [invoiceFilterDep, eticketFilterDep, certFilterDep].filter(Boolean);
      if (depIds.length === 0) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`id, booking_code, room_type, total_price, total_pax, base_price, discount_amount, paid_amount, remaining_amount, payment_status, created_at, agent_id, customer:customers(id, full_name, address, phone, email, nik, birth_place, birth_date, passport_number), departure:departures(departure_date, return_date, departure_time, flight_number, package_id, airline:airlines(name, code), departure_airport:airports!departures_departure_airport_id_fkey(name, city, code), arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code), hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name), hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name), package:packages(name, price_quad, price_triple, price_double, price_single))`)
        .in('departure_id', depIds).order('created_at', { ascending: false });
      if (error) throw error; return data;
    },
    enabled: !!(invoiceFilterDep || eticketFilterDep || certFilterDep)
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees-for-letter'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, full_name, employee_code, position, department, is_active').eq('is_active', true).order('full_name');
      return (data || []) as unknown as Employee[];
    }
  });

  // ── Derived data ──
  const getSelectedDeparture = (depId: string) => (allDepartures as any[])?.find((d: any) => d.id === depId);

  const jamaahCustomers = useMemo(() => {
    if (!jamaahFilterDep || !jamaahByDeparture) return [];
    let customers = (jamaahByDeparture as any[]).filter((bp: any) => bp.booking?.departure_id === jamaahFilterDep).map((bp: any) => bp.customer).filter(Boolean);
    if (jamaahSearch) {
      const s = jamaahSearch.toLowerCase();
      customers = customers.filter((c: any) => c.full_name?.toLowerCase().includes(s) || c.nik?.includes(s) || c.phone?.includes(s));
    }
    return customers;
  }, [jamaahFilterDep, jamaahByDeparture, jamaahSearch]);

  const passportCustomers = useMemo(() => {
    if (!passportFilterDep || !jamaahByDeparture) return [];
    let customers = (jamaahByDeparture as any[]).filter((bp: any) => bp.booking?.departure_id === passportFilterDep).map((bp: any) => bp.customer).filter(Boolean);
    if (passportSearch) {
      const s = passportSearch.toLowerCase();
      customers = customers.filter((c: any) => c.full_name?.toLowerCase().includes(s) || c.nik?.includes(s));
    }
    return customers;
  }, [passportFilterDep, jamaahByDeparture, passportSearch]);

  const invoiceBookings = useMemo(() => (!invoiceFilterDep || !bookingsByDeparture ? [] : (bookingsByDeparture as any[]).filter((b: any) => b.departure_id === invoiceFilterDep)), [invoiceFilterDep, bookingsByDeparture]);
  const eticketBookings = useMemo(() => (!eticketFilterDep || !bookingsByDeparture ? [] : (bookingsByDeparture as any[]).filter((b: any) => b.departure_id === eticketFilterDep)), [eticketFilterDep, bookingsByDeparture]);
  const certBookings = useMemo(() => (!certFilterDep || !bookingsByDeparture ? [] : (bookingsByDeparture as any[]).filter((b: any) => b.departure_id === certFilterDep && new Date((b.departure as any)?.return_date) <= new Date())), [certFilterDep, bookingsByDeparture]);

  // ── Helpers ──
  const getLetterNumber = async (docType: string, prefix: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('get_next_document_number', { p_document_type: docType, p_prefix: prefix });
      if (error) throw error; return data as string;
    } catch {
      const d = new Date();
      return `${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}/${prefix}/UHT/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  };

  const handleDownloadPdf = (doc: any, filename: string) => { doc.save(`${filename}.pdf`); toast.success('Dokumen berhasil diunduh'); };
  const handlePrepareSend = (doc: any, filename: string) => { setCurrentPdfBlob(doc.output('blob')); setCurrentFileName(filename); setSendDialogOpen(true); };

  const handleSendEmail = async () => {
    if (!sendEmail || !currentPdfBlob) { toast.error('Email tujuan harus diisi'); return; }
    toast.success(`Dokumen akan dikirim ke ${sendEmail}`);
    setSendDialogOpen(false); setSendEmail('');
    const url = URL.createObjectURL(currentPdfBlob);
    const a = document.createElement('a'); a.href = url; a.download = `${currentFileName}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendWA = async () => {
    if (!sendPhone.trim() || !currentPdfBlob) { toast.error('Nomor HP harus diisi'); return; }
    setSendingWA(true);
    try {
      // Upload PDF ke Supabase storage untuk mendapat URL yang bisa dibagikan
      const timestamp = Date.now();
      const path = `temp-wa/${timestamp}_${currentFileName}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('customer-documents')
        .upload(path, currentPdfBlob, { contentType: 'application/pdf', upsert: true });

      let docUrl = '';
      if (!upErr) {
        const { data: signedData } = await supabase.storage
          .from('customer-documents')
          .createSignedUrl(path, 3600); // 1 jam
        docUrl = signedData?.signedUrl || '';
      }

      const message = docUrl
        ? `Halo, berikut dokumen *${currentFileName}* dari Vinstour Travel:\n\n${docUrl}\n\n_Link aktif selama 1 jam. Silakan download segera._`
        : `Halo, dokumen *${currentFileName}* Anda dari Vinstour Travel sudah siap. Silakan login ke portal jamaah untuk download: ${window.location.origin}/jamaah/documents`;

      const res = await fetch('/api/documents/send-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ phone: sendPhone.trim(), message }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Dokumen berhasil dikirim via WhatsApp ke ${sendPhone}`);
        setSendDialogOpen(false); setSendPhone('');
        // Juga auto-download lokal sebagai backup
        const url = URL.createObjectURL(currentPdfBlob);
        const a = document.createElement('a'); a.href = url; a.download = `${currentFileName}.pdf`; a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(json.error || 'Gagal kirim WhatsApp');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal kirim WhatsApp');
    } finally {
      setSendingWA(false);
    }
  };

  const doGenerate = async (handler: () => { generate: () => Promise<any> } | undefined, filename: string, action: 'download' | 'send') => {
    const result = handler();
    if (!result) return;
    try {
      const doc = await result.generate();
      if (action === 'download') handleDownloadPdf(doc, filename); else handlePrepareSend(doc, filename);
    } catch (err) { toast.error('Gagal generate dokumen'); console.error(err); }
  };

  // ── Generate handlers ──
  const handleGenerateEmployeeLeaveLetter = () => {
    const emp = employees?.find(e => e.id === employeeLeaveForm.employeeId);
    if (!emp || !employeeLeaveForm.startDate || !employeeLeaveForm.endDate) { toast.error('Lengkapi semua data yang diperlukan'); return undefined; }
    const data: LeaveLetterData = { employeeName: emp.full_name, employeePosition: emp.position || 'Staff', employeeNik: emp.employee_code || '-', startDate: employeeLeaveForm.startDate, endDate: employeeLeaveForm.endDate, reason: employeeLeaveForm.reason, destination: employeeLeaveForm.destination };
    return { generate: async () => await generateLeaveLetter(data, await getLetterNumber('cuti_karyawan', 'CUTI-KRY'), company) };
  };

  const handleGenerateJamaahLeaveLetter = () => {
    const customer = jamaahCustomers.find((c: any) => c.id === jamaahLeaveForm.customerId);
    const departure = getSelectedDeparture(jamaahFilterDep);
    if (!customer || !departure || !jamaahLeaveForm.employerName) { toast.error('Lengkapi semua data yang diperlukan'); return undefined; }
    const data: JamaahLeaveLetterData = { jamaahName: customer.full_name, nik: customer.nik || '-', birthPlace: customer.birth_place || '-', birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(), address: customer.address || '-', employerName: jamaahLeaveForm.employerName, employerPosition: jamaahLeaveForm.employerPosition, employerInstitution: jamaahLeaveForm.employerInstitution, employerAddress: jamaahLeaveForm.employerAddress, startDate: new Date(departure.departure_date), endDate: new Date(departure.return_date), purpose: jamaahLeaveForm.purpose };
    return { generate: async () => await generateJamaahLeaveLetter(data, await getLetterNumber('cuti_jamaah', 'CUTI-JMH'), company) };
  };

  const handleGeneratePassportLetter = () => {
    const customer = passportCustomers.find((c: any) => c.id === passportForm.customerId);
    const departure = getSelectedDeparture(passportFilterDep);
    if (!customer) { toast.error('Pilih jamaah terlebih dahulu'); return undefined; }
    const data: PassportLetterData = { customerName: customer.full_name, nik: customer.nik || '-', birthPlace: customer.birth_place || '-', birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(), address: customer.address || '-', phone: customer.phone || '-', purpose: passportForm.purpose, departureDate: departure ? new Date(departure.departure_date) : undefined };
    return { generate: async () => await generatePassportLetter(data, await getLetterNumber('paspor', 'PASPOR'), company) };
  };

  const handleGenerateInvoice = () => {
    const booking = invoiceBookings.find((b: any) => b.id === invoiceForm.bookingId);
    if (!booking) { toast.error('Pilih booking terlebih dahulu'); return undefined; }
    const customer = booking.customer as any;
    const departure = booking.departure as any;
    const pkg = departure?.package as any;

    const roomTypeLabels: Record<string, string> = {
      single: 'Single (1 Orang)',
      double: 'Double (2 Orang)',
      triple: 'Triple (3 Orang)',
      quad: 'Quad (4 Orang)',
    };
    const roomLabel = roomTypeLabels[booking.room_type as string] || booking.room_type;
    const paxCount = booking.total_pax || 1;
    const pricePerPax = booking.base_price || 0;
    const totalBeforeDiscount = pricePerPax * paxCount;

    const pkgId = (departure?.package_id as string) ?? null;

    const baseData: Omit<InvoiceDataExtended, 'cancellationPolicy'> = {
      invoiceNumber: `INV-${booking.booking_code}`,
      invoiceDate: new Date(),
      dueDate: invoiceForm.dueDate || new Date(Date.now() + 7 * 86400000),
      customer: { name: customer?.full_name || '-', address: customer?.address || '-', phone: customer?.phone || '-', email: customer?.email },
      items: [{ description: `Paket ${pkg?.name || 'Umrah'} - Kamar ${roomLabel}`, quantity: paxCount, unitPrice: pricePerPax, total: totalBeforeDiscount }],
      subtotal: totalBeforeDiscount,
      discount: booking.discount_amount || 0,
      total: booking.total_price,
      paidAmount: booking.paid_amount || 0,
      remainingAmount: booking.remaining_amount || 0,
      paymentStatus: (booking.paid_amount || 0) >= booking.total_price ? 'paid' : (booking.paid_amount || 0) > 0 ? 'partial' : 'pending',
      packageName: pkg?.name,
      departureDate: departure?.departure_date ? new Date(departure.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
      passengerSummary: { adult: paxCount },
      notes: invoiceForm.notes || 'Pembayaran dapat dilakukan secara bertahap. Pelunasan paling lambat 2 minggu sebelum keberangkatan.',
      bankInfo: bankAccount ? { bankName: bankAccount.bank_name, accountNumber: bankAccount.account_number, accountName: bankAccount.account_name } : undefined,
      // QR transparansi → halaman detail booking jamaah
      verifyUrl: `${window.location.origin}/transaksi/${(booking as any).public_token || booking.id}`,
    };
    return {
      generate: async () => {
        // Fetch cancellation rule dari satu sumber kebenaran (API cancellation_rules)
        let cancellationPolicy: { id?: string; name: string; sections: { title: string; items: string[] }[] } | undefined;
        if (pkgId) {
          try {
            const res = await fetch(`/api/cancellation-rules/for-package/${pkgId}`);
            if (res.ok) {
              const json = await res.json();
              if (json.data) {
                cancellationPolicy = { id: json.data.id, name: json.data.name, sections: json.data.sections ?? [] };
              }
            }
          } catch { /* tanpa aturan pembatalan jika gagal */ }
        }
        // Fetch agent info (F-12) jika booking memiliki agent_id
        let agentName: string | undefined;
        let agentCode: string | undefined;
        if ((booking as any).agent_id) {
          try {
            const { data: agentData } = await supabase
              .from('agents')
              .select('id, company_name, agent_code')
              .eq('id', (booking as any).agent_id)
              .single();
            if (agentData) {
              agentName = (agentData as any).company_name || undefined;
              agentCode = (agentData as any).agent_code || undefined;
            }
          } catch { /* abaikan jika gagal */ }
        }
        return await generateInvoice({ ...baseData, cancellationPolicy, agentName, agentCode }, company);
      }
    };
  };

  const handleGenerateETicket = () => {
    const booking = eticketBookings.find((b: any) => b.id === eticketForm.bookingId);
    if (!booking) { toast.error('Pilih booking terlebih dahulu'); return undefined; }
    const customer = booking.customer as any; const departure = booking.departure as any;
    const data: ETicketData = { bookingCode: booking.booking_code, passengerName: customer?.full_name || '-', passportNumber: customer?.passport_number || '-', packageName: (departure?.package as any)?.name || 'Paket Umrah', departureDate: new Date(departure?.departure_date), returnDate: new Date(departure?.return_date), departureAirport: (departure?.departure_airport as any) ? `${(departure.departure_airport as any).name} (${(departure.departure_airport as any).code})` : '-', arrivalAirport: (departure?.arrival_airport as any) ? `${(departure.arrival_airport as any).name} (${(departure.arrival_airport as any).code})` : '-', flightNumber: departure?.flight_number, airline: (departure?.airline as any)?.name, departureTime: departure?.departure_time, hotelMakkah: (departure?.hotel_makkah as any)?.name, hotelMadinah: (departure?.hotel_madinah as any)?.name, roomType: ({ quad: 'Quad (4 orang)', triple: 'Triple (3 orang)', double: 'Double (2 orang)', single: 'Single (1 orang)' } as Record<string, string>)[booking.room_type] || booking.room_type };
    return { generate: async () => await generateETicket(data, company) };
  };

  const handleGenerateCertificate = () => {
    const booking = certBookings.find((b: any) => b.id === certificateForm.bookingId);
    if (!booking) { toast.error('Pilih booking terlebih dahulu'); return undefined; }
    const customer = booking.customer as any; const departure = booking.departure as any;
    const data: UmrahCertificateData = { participantName: customer?.full_name || '-', passportNumber: customer?.passport_number || '-', birthPlace: customer?.birth_place || '-', birthDate: customer?.birth_date ? new Date(customer.birth_date) : new Date(), packageName: (departure?.package as any)?.name || 'Paket Umrah', departureDate: new Date(departure?.departure_date), returnDate: new Date(departure?.return_date), certificateNumber: `CERT-${booking.booking_code}` };
    return { generate: async () => await generateUmrahCertificate(data, company) };
  };

  const handleGenerateGeneralLetter = () => {
    if (!generalForm.recipientName || !generalForm.subject || !generalForm.content) { toast.error('Lengkapi semua data yang diperlukan'); return undefined; }
    return { generate: async () => { const letterNumber = await getLetterNumber('surat_umum', 'SURAT'); return await generateGeneralLetter({ letterNumber, letterDate: new Date(), recipient: { name: generalForm.recipientName, position: generalForm.recipientPosition, institution: generalForm.recipientInstitution, address: generalForm.recipientAddress }, subject: generalForm.subject, content: generalForm.content, signatory: { name: generalForm.signatoryName || 'Direktur Utama', position: generalForm.signatoryPosition || company.name } }, company); } };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Dokumen</h1>
        <p className="text-muted-foreground">Buat surat-surat resmi dan invoice dalam format PDF. Gunakan filter Tahun, Bulan, Paket, dan Keberangkatan untuk mempersempit pilihan.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="bulk" className="flex items-center gap-1.5 font-semibold text-primary">
              <Package className="h-4 w-4" /><span>Generate Massal</span>
            </TabsTrigger>
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
        </div>

        <TabsContent value="bulk">
          <BulkDocumentTab
            jamaahFilterPkg={jamaahFilterPkg} jamaahFilterDep={jamaahFilterDep}
            setJamaahFilterPkg={setJamaahFilterPkg} setJamaahFilterDep={setJamaahFilterDep}
            jamaahSearch={jamaahSearch} setJamaahSearch={setJamaahSearch}
            jamaahYear={jamaahYear} jamaahMonth={jamaahMonth}
            setJamaahYear={setJamaahYear} setJamaahMonth={setJamaahMonth}
            packages={packages} allDepartures={allDepartures}
            jamaahCustomers={jamaahCustomers} jamaahByDeparture={jamaahByDeparture}
            getSelectedDeparture={getSelectedDeparture} getLetterNumber={getLetterNumber}
            handleDownloadPdf={handleDownloadPdf} company={company} bankAccount={bankAccount}
            DepartureInfo={({ depId }: { depId: string }) => <DepartureInfo dep={getSelectedDeparture(depId)} />}
          />
        </TabsContent>

        <TabsContent value="jamaah-leave">
          <JamaahLeaveTab
            jamaahFilterPkg={jamaahFilterPkg} setJamaahFilterPkg={setJamaahFilterPkg}
            jamaahFilterDep={jamaahFilterDep} setJamaahFilterDep={setJamaahFilterDep}
            jamaahYear={jamaahYear} setJamaahYear={setJamaahYear}
            jamaahMonth={jamaahMonth} setJamaahMonth={setJamaahMonth}
            jamaahSearch={jamaahSearch} setJamaahSearch={setJamaahSearch}
            packages={packages} allDepartures={allDepartures}
            jamaahCustomers={jamaahCustomers} jamaahLeaveForm={jamaahLeaveForm} setJamaahLeaveForm={setJamaahLeaveForm}
            getSelectedDeparture={getSelectedDeparture} doGenerate={doGenerate}
            handleGenerateJamaahLeaveLetter={handleGenerateJamaahLeaveLetter}
          />
        </TabsContent>

        <TabsContent value="employee-leave">
          <EmployeeLeaveTab
            employees={employees} employeeLeaveForm={employeeLeaveForm} setEmployeeLeaveForm={setEmployeeLeaveForm}
            doGenerate={doGenerate} handleGenerateEmployeeLeaveLetter={handleGenerateEmployeeLeaveLetter}
          />
        </TabsContent>

        <TabsContent value="passport">
          <PassportLetterTab
            passportFilterPkg={passportFilterPkg} setPassportFilterPkg={setPassportFilterPkg}
            passportFilterDep={passportFilterDep} setPassportFilterDep={setPassportFilterDep}
            passportYear={passportYear} setPassportYear={setPassportYear}
            passportMonth={passportMonth} setPassportMonth={setPassportMonth}
            passportSearch={passportSearch} setPassportSearch={setPassportSearch}
            packages={packages} allDepartures={allDepartures}
            passportCustomers={passportCustomers} passportForm={passportForm} setPassportForm={setPassportForm}
            getSelectedDeparture={getSelectedDeparture} doGenerate={doGenerate}
            handleGeneratePassportLetter={handleGeneratePassportLetter}
          />
        </TabsContent>

        <TabsContent value="invoice">
          <InvoiceTab
            invoiceFilterPkg={invoiceFilterPkg} setInvoiceFilterPkg={setInvoiceFilterPkg}
            invoiceFilterDep={invoiceFilterDep} setInvoiceFilterDep={setInvoiceFilterDep}
            invoiceYear={invoiceYear} setInvoiceYear={setInvoiceYear}
            invoiceMonth={invoiceMonth} setInvoiceMonth={setInvoiceMonth}
            packages={packages} allDepartures={allDepartures}
            invoiceBookings={invoiceBookings} invoiceForm={invoiceForm} setInvoiceForm={setInvoiceForm}
            getSelectedDeparture={getSelectedDeparture} doGenerate={doGenerate}
            handleGenerateInvoice={handleGenerateInvoice}
          />
        </TabsContent>

        <TabsContent value="eticket">
          <ETicketTab
            eticketFilterPkg={eticketFilterPkg} setEticketFilterPkg={setEticketFilterPkg}
            eticketFilterDep={eticketFilterDep} setEticketFilterDep={setEticketFilterDep}
            eticketYear={eticketYear} setEticketYear={setEticketYear}
            eticketMonth={eticketMonth} setEticketMonth={setEticketMonth}
            packages={packages} allDepartures={allDepartures}
            eticketBookings={eticketBookings} eticketForm={eticketForm} setEticketForm={setEticketForm}
            getSelectedDeparture={getSelectedDeparture} doGenerate={doGenerate}
            handleGenerateETicket={handleGenerateETicket}
          />
        </TabsContent>

        <TabsContent value="certificate">
          <CertificateTab
            certFilterPkg={certFilterPkg} setCertFilterPkg={setCertFilterPkg}
            certFilterDep={certFilterDep} setCertFilterDep={setCertFilterDep}
            certYear={certYear} setCertYear={setCertYear}
            certMonth={certMonth} setCertMonth={setCertMonth}
            packages={packages} allDepartures={allDepartures}
            certBookings={certBookings} certificateForm={certificateForm} setCertificateForm={setCertificateForm}
            getSelectedDeparture={getSelectedDeparture} doGenerate={doGenerate}
            handleGenerateCertificate={handleGenerateCertificate}
          />
        </TabsContent>

        <TabsContent value="general">
          <GeneralLetterTab
            generalForm={generalForm} setGeneralForm={setGeneralForm}
            doGenerate={doGenerate} handleGenerateGeneralLetter={handleGenerateGeneralLetter}
          />
        </TabsContent>
      </Tabs>

      {/* ── Send Dialog: Email & WhatsApp ── */}
      <Dialog open={sendDialogOpen} onOpenChange={(open) => { setSendDialogOpen(open); if (!open) { setSendChannel('email'); setSendEmail(''); setSendPhone(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Kirim Dokumen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">File: <span className="font-medium text-foreground">{currentFileName}.pdf</span></p>

            {/* Channel tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${sendChannel === 'email' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setSendChannel('email')}
              >
                <Mail className="h-4 w-4" />Email
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${sendChannel === 'wa' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setSendChannel('wa')}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />WhatsApp
              </button>
            </div>

            {sendChannel === 'email' ? (
              <div className="space-y-2">
                <Label>Email Tujuan</Label>
                <Input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="email@contoh.com" autoFocus />
                <p className="text-xs text-muted-foreground">PDF akan di-download dan siap dikirim manual via email.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <Input
                  type="tel"
                  value={sendPhone}
                  onChange={(e) => setSendPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  PDF akan diupload sementara dan link dikirim ke nomor WA jamaah. Pastikan Fonnte sudah dikonfigurasi di Pengaturan API.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Batal</Button>
            {sendChannel === 'email' ? (
              <Button onClick={handleSendEmail}>
                <Mail className="h-4 w-4 mr-2" />Kirim & Download
              </Button>
            ) : (
              <Button onClick={handleSendWA} disabled={sendingWA} className="bg-green-600 hover:bg-green-700">
                {sendingWA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                {sendingWA ? 'Mengirim...' : 'Kirim via WA'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocumentGenerator;
