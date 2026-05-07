import { useParams, Link, useNavigate } from "react-router-dom";
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
  Download, FileDown, Trash2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import {
  generateJamaahLeaveLetter, generatePassportLetter,
  type JamaahLeaveLetterData, type PassportLetterData
} from "@/lib/document-generator";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Upload } from "lucide-react";

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
  const { id: customerId } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { company: companyInfo } = useCompanyInfo();
  
  // State for document verification
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [leaveLetterOpen, setLeaveLetterOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [leaveForm, setLeaveForm] = useState({
    employerName: "", employerPosition: "", employerInstitution: "", employerAddress: "",
    startDate: "", endDate: "", purpose: "Umrah"
  });

  // Quick generate letter handlers
  const handleQuickGenerateLeaveLetter = async () => {
    if (!customer) return;
    setLeaveLetterOpen(true);
  };

  const handleGenerateLeaveLetterConfirm = () => {
    if (!customer) return;
    try {
      const data: JamaahLeaveLetterData = {
        jamaahName: customer.full_name,
        nik: customer.nik || '-',
        birthPlace: customer.birth_place || '-',
        birthDate: customer.birth_date ? new Date(customer.birth_date) : new Date(),
        address: customer.address || '-',
        employerName: leaveForm.employerName || '-',
        employerPosition: leaveForm.employerPosition || undefined,
        employerInstitution: leaveForm.employerInstitution || '-',
        employerAddress: leaveForm.employerAddress || '-',
        startDate: leaveForm.startDate ? new Date(leaveForm.startDate) : new Date(),
        endDate: leaveForm.endDate ? new Date(leaveForm.endDate) : new Date(),
        purpose: leaveForm.purpose,
      };
      const doc = generateJamaahLeaveLetter(data, `CUTI-JMH/${new Date().getFullYear()}`, companyInfo);
      doc.save(`surat-cuti-${customer.full_name.replace(/\s+/g, '-')}.pdf`);
      toast.success('Surat cuti jamaah berhasil diunduh');
      setLeaveLetterOpen(false);
    } catch (err) {
      toast.error('Gagal generate surat');
      console.error(err);
    }
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
      const doc = generatePassportLetter(data, `PASPOR/${new Date().getFullYear()}`, companyInfo);
      doc.save(`surat-paspor-${customer.full_name.replace(/\s+/g, '-')}.pdf`);
      toast.success('Surat permohonan paspor berhasil diunduh');
    } catch (err) {
      toast.error('Gagal generate surat');
      console.error(err);
    }
  };

  // Mutation for deleting customer
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Data jamaah berhasil dihapus');
      setDeleteDialogOpen(false);
      navigate('/admin/customers');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus data jamaah');
    },
  });

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
          document_type_id,
          document_type:document_types(id, name, code)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all document types so we can offer upload for any missing one
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('is_required', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Upload handler — used by both "upload missing" + "replace existing"
  const handleUploadDocument = async (file: File, documentTypeId: string) => {
    if (!customerId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }
    setUploadingDocType(documentTypeId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/${documentTypeId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(fileName);

      const existing = documents?.find((d: any) => d.document_type_id === documentTypeId);
      if (existing) {
        const { error: updErr } = await supabase
          .from('customer_documents')
          .update({ file_url: urlData.publicUrl, file_name: file.name, status: 'uploaded', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('customer_documents').insert({
          customer_id: customerId,
          document_type_id: documentTypeId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          status: 'uploaded',
        });
        if (insErr) throw insErr;
      }
      toast.success('Dokumen berhasil diupload');
      queryClient.invalidateQueries({ queryKey: ['admin-customer-documents', customerId] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal upload dokumen');
    } finally {
      setUploadingDocType(null);
    }
  };

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

  if (customerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Jamaah tidak ditemukan</h2>
        <Button asChild className="mt-4">
          <Link to="/admin/customers">Kembali ke Daftar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/admin/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.full_name}</h1>
            <p className="text-muted-foreground">Detail profil dan dokumen jamaah</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditCustomerDialog 
            customer={customer} 
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] })}
          />
          <Button 
            variant="outline" 
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Jamaah
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profil Jamaah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center pb-4 border-b">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold mb-2">
                {customer.full_name.charAt(0)}
              </div>
              <Badge variant={customer.is_tour_leader ? "default" : "secondary"}>
                {customer.is_tour_leader ? "Tour Leader" : "Jamaah"}
              </Badge>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Nomor Telepon</p>
                  <p className="text-sm font-medium">{customer.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{customer.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">NIK</p>
                  <p className="text-sm font-medium">{customer.nik || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Tempat, Tgl Lahir</p>
                  <p className="text-sm font-medium">
                    {customer.birth_place || '-'}, {customer.birth_date ? format(new Date(customer.birth_date), 'dd MMMM yyyy', { locale: id }) : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Alamat</p>
                  <p className="text-sm font-medium">{customer.address || '-'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Status Tour Leader</Label>
                  <p className="text-xs text-muted-foreground">Aktifkan jika jamaah adalah TL</p>
                </div>
                <Switch 
                  checked={customer.is_tour_leader ?? false}
                  onCheckedChange={(checked) => toggleTourLeaderMutation.mutate(checked)}
                  disabled={toggleTourLeaderMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">Dokumen</TabsTrigger>
              <TabsTrigger value="bookings">Riwayat Booking</TabsTrigger>
              <TabsTrigger value="letters">Generate Surat</TabsTrigger>
            </TabsList>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Dokumen Persyaratan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documentsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <>
                    {/* Per-type upload grid */}
                    <div className="space-y-3">
                      {documentTypes?.map((dt: any) => {
                        const existing = documents?.find((d: any) => d.document_type_id === dt.id);
                        const isUploading = uploadingDocType === dt.id;
                        const status = existing ? (STATUS_CONFIG[existing.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending) : null;
                        const StatusIcon = status?.icon;
                        return (
                          <div key={dt.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{dt.name}</p>
                                {dt.is_required && <Badge variant="outline" className="text-[10px]">Wajib</Badge>}
                                {existing && status && StatusIcon && (
                                  <Badge className={status.color} variant="outline">
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {status.label}
                                  </Badge>
                                )}
                              </div>
                              {existing?.file_name && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{existing.file_name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {existing && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    title="Lihat"
                                    onClick={() => setPreviewDoc(existing)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" title="Verifikasi">
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => { setSelectedDoc(existing); setVerifyDialogOpen(true); }}>
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Verifikasi
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedDoc(existing); setRejectDialogOpen(true); }}>
                                        <XCircle className="h-4 w-4 mr-2 text-red-600" /> Tolak
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                              <Label htmlFor={`doc-upload-${dt.id}`} className="cursor-pointer">
                                <Button type="button" variant={existing ? 'outline' : 'default'} size="sm" asChild disabled={isUploading}>
                                  <span>
                                    {isUploading ? (
                                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Upload...</>
                                    ) : (
                                      <><Upload className="h-4 w-4 mr-1" /> {existing ? 'Ganti' : 'Upload'}</>
                                    )}
                                  </span>
                                </Button>
                              </Label>
                              <input
                                id={`doc-upload-${dt.id}`}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadDocument(file, dt.id);
                                  e.target.value = '';
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {(!documentTypes || documentTypes.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>Belum ada jenis dokumen yang dikonfigurasi</p>
                        </div>
                      )}
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
              {/* Legacy detail table — keep historical uploads in one place */}
              {documents && documents.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-base">Riwayat Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jenis Dokumen</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tgl Upload</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc: any) => {
                          const status = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                          const StatusIcon = status.icon;
                          
                          return (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium">
                                {doc.document_type?.name || 'Dokumen'}
                              </TableCell>
                              <TableCell>
                                <Badge className={status.color} variant="outline">
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    title="Lihat File"
                                    onClick={() => setPreviewDoc(doc)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Riwayat Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : !bookings || bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Belum ada riwayat booking</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Paket & Tgl</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking: any) => {
                          const status = BOOKING_STATUS_CONFIG[booking.booking_status] || { label: booking.booking_status, color: "bg-gray-100" };
                          
                          return (
                            <TableRow key={booking.id}>
                              <TableCell className="font-mono text-xs font-bold">
                                {booking.booking_code}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {booking.departure?.package?.name || 'Paket'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {booking.departure?.departure_date ? format(new Date(booking.departure.departure_date), 'dd MMM yyyy') : '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={status.color} variant="outline">
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(booking.total_price)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link to={`/admin/bookings/${booking.id}`}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Letters Tab */}
            <TabsContent value="letters" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generate Surat Otomatis</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-dashed">
                    <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileDown className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Surat Permohonan Paspor</h4>
                        <p className="text-xs text-muted-foreground">Generate surat rekomendasi pembuatan paspor untuk jamaah</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={handleQuickGeneratePassportLetter}>
                        Generate PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Surat Izin Cuti</h4>
                        <p className="text-xs text-muted-foreground">Generate surat permohonan izin cuti kerja untuk jamaah</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={handleQuickGenerateLeaveLetter}>
                        Isi Data & Generate
                      </Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memverifikasi dokumen <strong>{selectedDoc?.document_type?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>Batal</Button>
            <Button 
              onClick={() => verifyMutation.mutate({ docId: selectedDoc.id, status: 'verified' })}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ya, Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Dokumen</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan untuk dokumen <strong>{selectedDoc?.document_type?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Alasan Penolakan</Label>
            <Textarea 
              id="reason" 
              placeholder="Contoh: Foto buram, data tidak sesuai..." 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
            <Button 
              variant="destructive"
              onClick={() => verifyMutation.mutate({ docId: selectedDoc.id, status: 'rejected', notes: rejectReason })}
              disabled={verifyMutation.isPending || !rejectReason}
            >
              {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tolak Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveLetterOpen} onOpenChange={setLeaveLetterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Data Surat Izin Cuti</DialogTitle>
            <DialogDescription>Lengkapi data pekerjaan jamaah untuk generate surat cuti.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Atasan / HRD</Label>
              <Input placeholder="Nama lengkap" value={leaveForm.employerName} onChange={e => setLeaveForm({...leaveForm, employerName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Jabatan Atasan</Label>
              <Input placeholder="Contoh: HR Manager" value={leaveForm.employerPosition} onChange={e => setLeaveForm({...leaveForm, employerPosition: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Nama Instansi / Perusahaan</Label>
              <Input placeholder="Nama PT / Instansi" value={leaveForm.employerInstitution} onChange={e => setLeaveForm({...leaveForm, employerInstitution: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Alamat Instansi</Label>
              <Input placeholder="Alamat lengkap kantor" value={leaveForm.employerAddress} onChange={e => setLeaveForm({...leaveForm, employerAddress: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Mulai Cuti</Label>
              <Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai Cuti</Label>
              <Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveLetterOpen(false)}>Batal</Button>
            <Button onClick={handleGenerateLeaveLetterConfirm}>Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Hapus Data Jamaah
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data profil dan dokumen jamaah akan dihapus secara permanen dari sistem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteCustomerMutation.mutate()}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

      {/* Document Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview Dokumen - {previewDoc?.document_type?.name || 'Dokumen'}
            </DialogTitle>
          </DialogHeader>
          
          {previewDoc && (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Jenis Dokumen</p>
                  <p className="font-medium">{previewDoc.document_type?.name || 'Dokumen'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama File</p>
                  <p className="font-medium text-sm truncate">{previewDoc.file_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Upload</p>
                  <p className="font-medium">{format(new Date(previewDoc.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div>
                    {(() => {
                      const status = STATUS_CONFIG[previewDoc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                      const StatusIcon = status.icon;
                      return (
                        <Badge className={status.color} variant="outline">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              <div>
                <Label className="mb-2 block">Preview Dokumen</Label>
                {previewDoc.file_url ? (
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    {previewDoc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={previewDoc.file_url} 
                        alt="Document" 
                        className="max-h-[500px] w-full object-contain"
                      />
                    ) : previewDoc.file_url.match(/\.pdf$/i) ? (
                      <div className="p-8 text-center">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">File PDF tidak dapat ditampilkan dalam preview</p>
                        <a 
                          href={previewDoc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          <Download className="h-4 w-4" />
                          Buka PDF
                        </a>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">Format file tidak didukung untuk preview</p>
                        <a 
                          href={previewDoc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          <Download className="h-4 w-4" />
                          Buka File
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">File tidak tersedia</p>
                )}
              </div>

              {/* Notes if rejected */}
              {previewDoc.notes && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Catatan:
                  </p>
                  <p className="text-sm mt-1">{previewDoc.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
