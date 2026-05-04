import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { 
  FileText, Search, CheckCircle, XCircle, Clock, 
  Eye, AlertTriangle, FileCheck, Filter
} from "lucide-react";

export default function AdminDocumentVerification() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_documents')
        .select(`
          *,
          customer:customers(id, full_name, phone, email),
          document_type:document_types(id, code, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ docId, status, notes }: { docId: string; status: 'verified' | 'rejected'; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('customer_documents')
        .update({ 
          status,
          notes: notes || null,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dokumen berhasil diverifikasi");
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      setSelectedDoc(null);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memverifikasi");
    },
  });

  const filteredDocs = documents?.filter(doc => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches = 
        doc.customer?.full_name?.toLowerCase().includes(search) ||
        doc.document_type?.name?.toLowerCase().includes(search);
      if (!matches) return false;
    }
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    if (typeFilter !== "all" && doc.document_type_id !== typeFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-500"><Clock className="h-3 w-3 mr-1" />Menunggu</Badge>;
      case 'verified':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Terverifikasi</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const stats = {
    total: documents?.length || 0,
    pending: documents?.filter(d => d.status === 'pending').length || 0,
    verified: documents?.filter(d => d.status === 'verified').length || 0,
    rejected: documents?.filter(d => d.status === 'rejected').length || 0,
  };

  const handleVerify = (status: 'verified' | 'rejected') => {
    if (status === 'rejected' && !rejectReason.trim()) {
      toast.error("Masukkan alasan penolakan");
      return;
    }
    
    verifyMutation.mutate({
      docId: selectedDoc.id,
      status,
      notes: status === 'rejected' ? rejectReason : undefined
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Verifikasi Dokumen</h1>
          <p className="text-muted-foreground">Verifikasi dokumen KTP, Paspor, dan lainnya</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Dokumen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Menunggu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-sm text-muted-foreground">Terverifikasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Ditolak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama jamaah..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="verified">Terverifikasi</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipe Dokumen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {documentTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !filteredDocs || filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Tidak ada dokumen yang cocok dengan filter.' 
                  : 'Belum ada dokumen yang perlu diverifikasi.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Tipe Dokumen</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Tanggal Upload</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.customer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.customer?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.document_type?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[150px]">{doc.file_name || 'Dokumen'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(doc.created_at)}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Lihat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Dokumen</DialogTitle>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Jamaah</p>
                  <p className="font-medium">{selectedDoc.customer?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Dokumen</p>
                  <p className="font-medium">{selectedDoc.document_type?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Upload</p>
                  <p className="font-medium">{formatDate(selectedDoc.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedDoc.status)}
                </div>
              </div>

              {/* Document Preview */}
              <div>
                <Label className="mb-2 block">Preview Dokumen</Label>
                {selectedDoc.file_url ? (
                  <div className="border rounded-lg overflow-hidden">
                    {selectedDoc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={selectedDoc.file_url} 
                        alt="Document" 
                        className="max-h-[400px] w-full object-contain bg-gray-100"
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <a 
                          href={selectedDoc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Buka Dokumen
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">File tidak tersedia</p>
                )}
              </div>

              {/* Previous notes */}
              {selectedDoc.notes && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Catatan Sebelumnya:
                  </p>
                  <p className="text-sm mt-1">{selectedDoc.notes}</p>
                </div>
              )}

              {/* Rejection reason */}
              {selectedDoc.status === 'pending' && (
                <div>
                  <Label>Alasan Penolakan (jika ditolak)</Label>
                  <Textarea 
                    placeholder="Masukkan alasan jika dokumen ditolak..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}

          {selectedDoc?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button 
                variant="destructive"
                onClick={() => handleVerify('rejected')}
                disabled={verifyMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Tolak
              </Button>
              <Button 
                onClick={() => handleVerify('verified')}
                disabled={verifyMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Verifikasi
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}