import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  FileText, CreditCard, Eye, ExternalLink, CheckCircle,
  Clock, XCircle, AlertCircle, ShieldCheck, ShieldX, Loader2, Star, Pencil,
  Download, FileDown
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import {
  generateJamaahLeaveLetter, generatePassportLetter,
  type JamaahLeaveLetterData, type PassportLetterData
} from "@/lib/document-generator";

const STATUS_CONFIG = {
  pending: { label: "Menunggu", color: "bg-amber-100 text-amber-800", icon: Clock },
  uploaded: { label: "Terupload", color: "bg-blue-100 text-blue-800", icon: FileText },
  verified: { label: "Terverifikasi", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Kadaluarsa", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
};

const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800" },
  processing: { label: "Diproses", color: "bg-purple-100 text-purple-800" },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-800" },
  refunded: { label: "Refund", color: "bg-gray-100 text-gray-800" },
};

export default function AdminCustomerDetail() {
  const { id: customerId } = useParams();
  const queryClient = useQueryClient();
  
  // State for document verification
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Quick generate letter handlers
  const handleQuickGenerateLeaveLetter = async () => {
    if (!customer) return;
    // Need employer info - show toast with instructions
    toast.info('Untuk surat cuti jamaah, gunakan menu Generate Surat Lengkap yang memerlukan data pemberi kerja.');
    window.open(`/admin/documents-generator`, '_blank');
  };

  const handleQuickGeneratePassportLetter = async () => {
    if (!customer) return;
    try {
      const data: PassportLetterData = {
        customerName: customer.full_name,
        nik: customer.nik || '-',
        birthPlace: customer.birth_place || '-',
        birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
        address: customer.address || '-',
        phone: customer.phone || '-',
        purpose: 'Ibadah Umrah',
      };
      const doc = generatePassportLetter(data, `PASPOR/${new Date().getFullYear()}`);
      doc.save(`surat-paspor-${customer.full_name.replace(/\s+/g, '-')}.pdf`);
      toast.success('Surat permohonan paspor berhasil diunduh');
    } catch (err) {
      toast.error('Gagal generate surat');
      console.error(err);
    }
  };

  // Mutation for toggling tour leader status
  const toggleTourLeaderMutation = useMutation({
    mutationFn: async (isTourLeader: boolean) => {
      const { error } = await supabase
        .from('customers')
        .update({ is_tour_leader: isTourLeader })
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['tour-leaders-list'] });
      toast.success('Status Tour Leader berhasil diperbarui');
    },
    onError: () => {
      toast.error('Gagal memperbarui status Tour Leader');
    },
  });

  // Mutation for verifying document
  const verifyMutation = useMutation({
    mutationFn: async ({ docId, status, notes }: { docId: string; status: 'verified' | 'rejected'; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const updateData: any = {
        status,
        verified_at: new Date().toISOString(),
        verified_by: userData.user?.id,
      };
      
      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from('customer_documents')
        .update(updateData)
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-documents', customerId] });
      toast.success(
        variables.status === 'verified' 
          ? 'Dokumen berhasil diverifikasi' 
          : 'Dokumen ditolak'
      );
      setVerifyDialogOpen(false);
      setRejectDialogOpen(false);
      setSelectedDoc(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error('Gagal memperbarui status dokumen');
      console.error(error);
    },
  });

  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['admin-customer', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch customer documents
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['admin-customer-documents', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_documents')
        .select(`
          id,
          file_url,
          file_name,
          status,
          notes,
          created_at,
          verified_at,
          document_type:document_types(id, name, code)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch customer bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-customer-bookings', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_code,
          room_type,
          total_pax,
          total_price,
          paid_amount,
          booking_status,
          payment_status,
          created_at,
          departure:departures(
            id,
            departure_date,
            return_date,
            package:packages(id, name, code)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch payments for this customer's bookings
  const { data: payments } = useQuery({
    queryKey: ['admin-customer-payments', customerId],
    enabled: !!bookings && bookings.length > 0,
    queryFn: async () => {
      const bookingIds = bookings!.map(b => b.id);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (customerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Customer tidak ditemukan</p>
        <Button asChild className="mt-4">
          <Link to="/admin/customers">Kembali</Link>
        </Button>
      </div>
    );
  }

  // Check data completeness
  const dataCompleteness = {
    basic: !!(customer.full_name && customer.gender && customer.birth_date && customer.nik),
    contact: !!(customer.phone && customer.address),
    passport: !!(customer.passport_number && customer.passport_expiry),
    family: !!(customer.father_name && customer.mother_name),
    emergency: !!(customer.emergency_contact_name && customer.emergency_contact_phone),
  };
  
  const completedSections = Object.values(dataCompleteness).filter(Boolean).length;
  const totalSections = Object.keys(dataCompleteness).length;
  const isDataComplete = completedSections === totalSections;
  
  const missingFields: string[] = [];
  if (!customer.nik) missingFields.push("NIK");
  if (!customer.gender) missingFields.push("Jenis Kelamin");
  if (!customer.birth_date) missingFields.push("Tanggal Lahir");
  if (!customer.phone) missingFields.push("No. Telepon");
  if (!customer.address) missingFields.push("Alamat");
  if (!customer.passport_number) missingFields.push("No. Paspor");
  if (!customer.passport_expiry) missingFields.push("Masa Berlaku Paspor");
  if (!customer.father_name) missingFields.push("Nama Ayah");
  if (!customer.mother_name) missingFields.push("Nama Ibu");
  if (!customer.emergency_contact_name) missingFields.push("Kontak Darurat");

  const stats = {
    totalBookings: bookings?.length || 0,
    totalSpent: bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0,
    totalPaid: bookings?.reduce((sum, b) => sum + Number(b.paid_amount), 0) || 0,
    documentsVerified: documents?.filter(d => d.status === 'verified').length || 0,
    documentsTotal: documents?.length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Data Completeness Alert */}
      {!isDataComplete && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">Data Belum Lengkap</h4>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  {completedSections}/{totalSections} Terisi
                </Badge>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                Lengkapi data berikut agar jamaah dapat diproses untuk keberangkatan:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingFields.map((field) => (
                  <Badge key={field} variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/customers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{customer.full_name}</h1>
              {customer.is_tour_leader && (
                <Badge className="bg-amber-500 hover:bg-amber-600">
                  <Star className="h-3 w-3 mr-1" />
                  Tour Leader
                </Badge>
              )}
              {isDataComplete ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Data Lengkap
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-400 text-amber-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Belum Lengkap
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Detail informasi jamaah</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Generate Surat Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Generate Surat
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleQuickGenerateLeaveLetter()}>
                <FileText className="h-4 w-4 mr-2" />
                Surat Cuti Jamaah
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleQuickGeneratePassportLetter()}>
                <FileText className="h-4 w-4 mr-2" />
                Surat Permohonan Paspor
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/documents-generator">
                  <FileText className="h-4 w-4 mr-2" />
                  Buka Generator Lengkap
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tour Leader Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Star className={`h-4 w-4 ${customer.is_tour_leader ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Tour Leader</span>
            </div>
            <Switch
              checked={customer.is_tour_leader || false}
              onCheckedChange={(checked) => toggleTourLeaderMutation.mutate(checked)}
              disabled={toggleTourLeaderMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Booking</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Dibayar</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dokumen</p>
                <p className="text-2xl font-bold">{stats.documentsVerified}/{stats.documentsTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informasi Pribadi
          </CardTitle>
          <EditCustomerDialog 
            customer={customer} 
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] })}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Data
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Data Diri</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                  <p className="font-medium">{customer.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIK</p>
                  <p className="font-mono">{customer.nik || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jenis Kelamin</p>
                  <p>{customer.gender === 'male' ? 'Laki-laki' : customer.gender === 'female' ? 'Perempuan' : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tempat, Tanggal Lahir</p>
                  <p>
                    {customer.birth_place || '-'}, {customer.birth_date 
                      ? format(new Date(customer.birth_date), 'd MMMM yyyy', { locale: id })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Golongan Darah</p>
                  <p>{customer.blood_type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Pernikahan</p>
                  <p>{customer.marital_status || '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Kontak & Paspor</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{customer.phone || '-'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p>{customer.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No. Paspor</p>
                  <p className="font-mono">{customer.passport_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Masa Berlaku Paspor</p>
                  <p>
                    {customer.passport_expiry 
                      ? format(new Date(customer.passport_expiry), 'd MMMM yyyy', { locale: id })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Ayah</p>
                  <p>{customer.father_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Ibu</p>
                  <p>{customer.mother_name || '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground">Alamat & Kontak Darurat</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{customer.address || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {[customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Kontak Darurat</p>
                  <p className="font-medium">{customer.emergency_contact_name || '-'}</p>
                  <p className="text-sm">{customer.emergency_contact_phone || '-'}</p>
                  <p className="text-sm text-muted-foreground">{customer.emergency_contact_relation || '-'}</p>
                </div>
                {customer.mahram_name && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Mahram</p>
                    <p className="font-medium">{customer.mahram_name}</p>
                    <p className="text-sm text-muted-foreground">{customer.mahram_relation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Documents and Bookings */}
      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Riwayat Booking ({bookings?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Dokumen ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="payments">Pembayaran ({payments?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {bookingsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !bookings || bookings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Belum ada riwayat booking
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead>Keberangkatan</TableHead>
                        <TableHead>Pax</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => {
                        const departure = booking.departure as any;
                        const pkg = departure?.package;
                        const statusConfig = BOOKING_STATUS_CONFIG[booking.booking_status || 'pending'];
                        
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="font-mono font-semibold">
                              {booking.booking_code}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{pkg?.name || '-'}</p>
                                <p className="text-sm text-muted-foreground">{pkg?.code}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {departure?.departure_date 
                                ? format(new Date(departure.departure_date), 'd MMM yyyy', { locale: id })
                                : '-'}
                            </TableCell>
                            <TableCell>{booking.total_pax} orang</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{formatCurrency(booking.total_price)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Dibayar: {formatCurrency(booking.paid_amount)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig?.color}>
                                {statusConfig?.label || booking.booking_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/admin/bookings/${booking.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {documentsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !documents || documents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Belum ada dokumen yang diupload
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jenis Dokumen</TableHead>
                        <TableHead>Nama File</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal Upload</TableHead>
                        <TableHead>Verifikasi</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => {
                        const docType = doc.document_type as any;
                        const status = doc.status as keyof typeof STATUS_CONFIG;
                        const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConfig.icon;
                        const canVerify = status === 'uploaded' || status === 'pending';
                        
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              {docType?.name || '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {doc.file_name || 'Document'}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(doc.created_at), 'd MMM yyyy HH:mm', { locale: id })}
                            </TableCell>
                            <TableCell>
                              {doc.verified_at ? (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(doc.verified_at), 'd MMM yyyy', { locale: id })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {doc.file_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedDoc(doc);
                                      setVerifyDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {canVerify && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => verifyMutation.mutate({ docId: doc.id, status: 'verified' })}
                                      disabled={verifyMutation.isPending}
                                    >
                                      {verifyMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <ShieldCheck className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedDoc(doc);
                                        setRejectDialogOpen(true);
                                      }}
                                      disabled={verifyMutation.isPending}
                                    >
                                      <ShieldX className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!payments || payments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Belum ada riwayat pembayaran
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Pembayaran</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono font-semibold">
                            {payment.payment_code}
                          </TableCell>
                          <TableCell>{payment.payment_method || '-'}</TableCell>
                          <TableCell>{payment.bank_name || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              payment.status === 'paid' 
                                ? "bg-green-100 text-green-800"
                                : payment.status === 'pending'
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }>
                              {payment.status === 'paid' ? 'Lunas' : payment.status === 'pending' ? 'Pending' : 'Gagal'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.created_at), 'd MMM yyyy HH:mm', { locale: id })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Preview & Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Dokumen</DialogTitle>
            <DialogDescription>
              {(selectedDoc?.document_type as any)?.name || 'Dokumen'} - {selectedDoc?.file_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc?.file_url && (
            <div className="border rounded-lg overflow-hidden bg-muted">
              {selectedDoc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={selectedDoc.file_url}
                  alt="Document preview"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              ) : selectedDoc.file_url.match(/\.pdf$/i) ? (
                <iframe
                  src={selectedDoc.file_url}
                  className="w-full h-[500px]"
                  title="PDF Preview"
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Preview tidak tersedia untuk format file ini</p>
                  <Button onClick={() => window.open(selectedDoc.file_url, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buka di Tab Baru
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status Saat Ini</p>
              <Badge className={STATUS_CONFIG[selectedDoc?.status as keyof typeof STATUS_CONFIG]?.color || ''}>
                {STATUS_CONFIG[selectedDoc?.status as keyof typeof STATUS_CONFIG]?.label || selectedDoc?.status}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Tanggal Upload</p>
              <p className="font-medium">
                {selectedDoc?.created_at && format(new Date(selectedDoc.created_at), 'd MMMM yyyy HH:mm', { locale: id })}
              </p>
            </div>
            {selectedDoc?.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Catatan</p>
                <p>{selectedDoc.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => window.open(selectedDoc?.file_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Buka File
            </Button>
            {(selectedDoc?.status === 'uploaded' || selectedDoc?.status === 'pending') && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setVerifyDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Tolak
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => verifyMutation.mutate({ docId: selectedDoc.id, status: 'verified' })}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Verifikasi
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Document Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Dokumen</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan dokumen {(selectedDoc?.document_type as any)?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Alasan Penolakan</Label>
              <Textarea
                id="reject-reason"
                placeholder="Contoh: Foto dokumen tidak jelas, silakan upload ulang dengan kualitas lebih baik"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => verifyMutation.mutate({ 
                docId: selectedDoc?.id, 
                status: 'rejected', 
                notes: rejectReason 
              })}
              disabled={verifyMutation.isPending || !rejectReason.trim()}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldX className="h-4 w-4 mr-2" />
              )}
              Tolak Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
