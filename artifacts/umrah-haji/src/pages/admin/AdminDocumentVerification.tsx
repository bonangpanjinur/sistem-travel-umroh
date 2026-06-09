import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  FileText, Search, CheckCircle, XCircle, Clock,
  Eye, AlertTriangle, FileCheck, Filter, Users, Building2,
  Plane, CheckSquare, Square, Loader2, ExternalLink
} from "lucide-react";

export default function AdminDocumentVerification() {
  const queryClient = useQueryClient();

  // ── Filter states ──
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [departureFilter, setDepartureFilter] = useState<string>("all");

  // ── Detail dialog ──
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── Bulk select ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"verified" | "rejected">("verified");

  // ── Data: documents ──
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
      return data ?? [];
    },
  });

  // ── Data: document types ──
  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('document_types').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Data: departures (for departure filter) ──
  const { data: departures } = useQuery({
    queryKey: ['departures-for-docverify'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, package:packages(name)')
        .order('departure_date', { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Data: bookings (to map customer_id → departure_id) ──
  const { data: bookings } = useQuery({
    queryKey: ['bookings-for-docverify'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('customer_id, departure_id')
        .not('booking_status', 'eq', 'cancelled');
      if (error) throw error;
      return data ?? [];
    },
    enabled: departureFilter !== 'all',
  });

  // customer_id → Set<departure_id>
  const customerDepartureMap = useMemo(() => {
    if (!bookings) return new Map<string, Set<string>>();
    const m = new Map<string, Set<string>>();
    for (const b of bookings) {
      if (!b.customer_id || !b.departure_id) continue;
      if (!m.has(b.customer_id)) m.set(b.customer_id, new Set());
      m.get(b.customer_id)!.add(b.departure_id);
    }
    return m;
  }, [bookings]);

  // ── Single verify mutation ──
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

      const doc = documents?.find((d: any) => d.id === docId);
      if (doc?.customer?.id) {
        const docName = doc.document_type?.name || "Dokumen";
        const notifTitle = status === 'verified' ? `Dokumen ${docName} Terverifikasi ✅` : `Dokumen ${docName} Ditolak ❌`;
        const notifMsg = status === 'verified'
          ? `Dokumen ${docName} Anda telah diverifikasi oleh admin.`
          : `Dokumen ${docName} Anda ditolak. Alasan: ${notes || 'Hubungi admin untuk info lebih lanjut'}.`;
        (supabase as any).from('customer_notifications').insert({ customer_id: doc.customer.id, type: 'document', title: notifTitle, message: notifMsg, is_read: false, metadata: { doc_id: docId, doc_status: status, doc_name: docName } });
      }
      return { status };
    },
    onSuccess: ({ status }) => {
      toast.success(status === 'verified' ? "Dokumen terverifikasi" : "Dokumen ditolak — notifikasi terkirim ke jamaah");
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      setSelectedDoc(null);
      setRejectReason("");
    },
    onError: (err: any) => toast.error(err.message || "Gagal memverifikasi"),
  });

  // ── Bulk verify mutation ──
  const bulkVerifyMutation = useMutation({
    mutationFn: async ({ ids, status, notes }: { ids: string[]; status: 'verified' | 'rejected'; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('customer_documents')
        .update({ status, notes: notes || null, verified_by: user?.id, verified_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;

      // Send notifications (fire-and-forget)
      const docsToNotify = documents?.filter((d: any) => ids.includes(d.id) && d.customer?.id) ?? [];
      for (const doc of docsToNotify) {
        const docName = doc.document_type?.name || "Dokumen";
        (supabase as any).from('customer_notifications').insert({
          customer_id: doc.customer.id,
          type: 'document',
          title: status === 'verified' ? `Dokumen ${docName} Terverifikasi ✅` : `Dokumen ${docName} Ditolak ❌`,
          message: status === 'verified'
            ? `Dokumen ${docName} Anda telah diverifikasi.`
            : `Dokumen ${docName} Anda ditolak. Alasan: ${notes || '-'}.`,
          is_read: false,
          metadata: { doc_id: doc.id, doc_status: status, doc_name: docName },
        });
      }
      return { count: ids.length, status };
    },
    onSuccess: ({ count, status }) => {
      toast.success(`${count} dokumen ${status === 'verified' ? 'diverifikasi' : 'ditolak'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      setSelectedIds(new Set());
      setBulkDialogOpen(false);
      setBulkRejectReason("");
    },
    onError: (err: any) => toast.error(err.message || "Gagal bulk verify"),
  });

  // ── Filtered list ──
  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc: any) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!doc.customer?.full_name?.toLowerCase().includes(s) && !doc.document_type?.name?.toLowerCase().includes(s)) return false;
      }
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (typeFilter !== "all" && doc.document_type_id !== typeFilter) return false;
      if (departureFilter !== "all") {
        const custDeps = customerDepartureMap.get(doc.customer?.id || "") ?? new Set();
        if (!custDeps.has(departureFilter)) return false;
      }
      return true;
    });
  }, [documents, searchTerm, statusFilter, typeFilter, departureFilter, customerDepartureMap]);

  // ── Bulk select helpers ──
  const allPageSelected = filteredDocs.length > 0 && filteredDocs.every((d: any) => selectedIds.has(d.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      filteredDocs.forEach((d: any) => next.delete(d.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredDocs.forEach((d: any) => next.add(d.id));
      setSelectedIds(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const openBulkDialog = (action: "verified" | "rejected") => {
    setBulkAction(action);
    setBulkDialogOpen(true);
  };

  const handleVerify = (status: 'verified' | 'rejected') => {
    if (status === 'rejected' && !rejectReason.trim()) { toast.error("Masukkan alasan penolakan"); return; }
    verifyMutation.mutate({ docId: selectedDoc.id, status, notes: status === 'rejected' ? rejectReason : undefined });
  };

  const handleBulkVerify = () => {
    if (bulkAction === 'rejected' && !bulkRejectReason.trim()) { toast.error("Masukkan alasan penolakan"); return; }
    bulkVerifyMutation.mutate({ ids: Array.from(selectedIds), status: bulkAction, notes: bulkAction === 'rejected' ? bulkRejectReason : undefined });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-orange-500 border-orange-200"><Clock className="h-3 w-3 mr-1" />Menunggu</Badge>;
      case 'verified': return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Terverifikasi</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: documents?.length || 0,
    pending: documents?.filter((d: any) => d.status === 'pending').length || 0,
    verified: documents?.filter((d: any) => d.status === 'verified').length || 0,
    rejected: documents?.filter((d: any) => d.status === 'rejected').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Verifikasi Dokumen</h1>
          <p className="text-muted-foreground">Verifikasi dokumen jamaah · Filter per keberangkatan · Bulk approve</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-sm text-muted-foreground">Menunggu</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div><p className="text-2xl font-bold">{stats.verified}</p><p className="text-sm text-muted-foreground">Terverifikasi</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div><p className="text-2xl font-bold">{stats.rejected}</p><p className="text-sm text-muted-foreground">Ditolak</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />Filter Dokumen
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama jamaah / tipe dokumen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="verified">Terverifikasi</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setSelectedIds(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Tipe Dokumen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {documentTypes?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departureFilter} onValueChange={(v) => { setDepartureFilter(v); setSelectedIds(new Set()); }}>
              <SelectTrigger>
                <Plane className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Semua Keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Keberangkatan</SelectItem>
                {departures?.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.package?.name} — {d.departure_date ? new Date(d.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {someSelected && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>{selectedIds.size} dokumen dipilih</span>
                <button className="text-muted-foreground hover:text-foreground text-xs underline ml-2" onClick={() => setSelectedIds(new Set())}>
                  Batalkan pilihan
                </button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => openBulkDialog("rejected")}>
                  <XCircle className="h-4 w-4 mr-1" />Tolak Semua
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openBulkDialog("verified")}>
                  <CheckCircle className="h-4 w-4 mr-1" />Verifikasi Semua
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : !filteredDocs || filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || departureFilter !== 'all'
                  ? 'Tidak ada dokumen yang cocok dengan filter.'
                  : 'Belum ada dokumen.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Pilih semua"
                      />
                    </TableHead>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Tipe Dokumen</TableHead>
                    <TableHead className="hidden md:table-cell">File</TableHead>
                    <TableHead className="hidden sm:table-cell">Tanggal Upload</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc: any) => (
                    <TableRow
                      key={doc.id}
                      className={selectedIds.has(doc.id) ? "bg-primary/5" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(doc.id)}
                          onCheckedChange={() => toggleOne(doc.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.customer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.customer?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.document_type?.name}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm truncate max-w-[150px]">{doc.file_name || 'Dokumen'}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="text-sm">{formatDate(doc.created_at ?? '')}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status ?? '')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedDoc(doc); setRejectReason(""); }}>
                          <Eye className="h-4 w-4 mr-1" />Lihat
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

      {/* Bulk Verify/Reject Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'verified' ? `Verifikasi ${selectedIds.size} Dokumen` : `Tolak ${selectedIds.size} Dokumen`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {bulkAction === 'verified'
                ? `Anda akan memverifikasi ${selectedIds.size} dokumen sekaligus. Notifikasi akan dikirim ke masing-masing jamaah.`
                : `Anda akan menolak ${selectedIds.size} dokumen sekaligus. Semua jamaah akan mendapat notifikasi penolakan.`}
            </p>
            {bulkAction === 'rejected' && (
              <div>
                <Label>Alasan Penolakan *</Label>
                <Textarea
                  className="mt-2"
                  placeholder="Contoh: Dokumen tidak terbaca / Foto buram / Format tidak sesuai"
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Batal</Button>
            <Button
              className={bulkAction === 'verified' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={bulkAction === 'rejected' ? 'destructive' : 'default'}
              onClick={handleBulkVerify}
              disabled={bulkVerifyMutation.isPending}
            >
              {bulkVerifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {bulkAction === 'verified' ? 'Ya, Verifikasi Semua' : 'Ya, Tolak Semua'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Document Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Dokumen</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
                <div>
                  <p className="text-muted-foreground">Jamaah</p>
                  <p className="font-medium">{selectedDoc.customer?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDoc.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipe Dokumen</p>
                  <p className="font-medium">{selectedDoc.document_type?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal Upload</p>
                  <p className="font-medium">{formatDate(selectedDoc.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
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
                      <div className="p-8 text-center space-y-3">
                        <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                        <div className="space-y-2">
                          <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-primary underline text-sm">
                            <ExternalLink className="h-4 w-4" />Buka Dokumen di Tab Baru
                          </a>
                          <p className="text-xs text-muted-foreground">PDF atau dokumen lainnya</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">File tidak tersedia</p>
                )}
              </div>

              {selectedDoc.notes && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />Catatan Sebelumnya:
                  </p>
                  <p className="text-sm mt-1">{selectedDoc.notes}</p>
                </div>
              )}

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
              <Button variant="destructive" onClick={() => handleVerify('rejected')} disabled={verifyMutation.isPending}>
                <XCircle className="h-4 w-4 mr-1" />Tolak
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleVerify('verified')} disabled={verifyMutation.isPending}>
                {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-1" />Verifikasi
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
