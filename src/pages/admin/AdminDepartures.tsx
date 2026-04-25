import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DepartureForm } from "@/components/admin/forms/DepartureForm";
import { formatDate, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { 
  Calendar, Plus, Search, Plane, Users, Edit, Trash2, 
  CalendarDays, Building2, Link2Off, MapPin, Hotel,
  MessageCircle, Bell, Send, DollarSign, MoreVertical,
  ChevronLeft, ChevronRight, Eye, RefreshCw
} from "lucide-react";
import { LinkItineraryForm } from "@/components/admin/forms/LinkItineraryForm";

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const ITEMS_PER_PAGE = 20;

export default function AdminDepartures() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [linkedFilter, setLinkedFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<any>(null);
  const [deleteDeparture, setDeleteDeparture] = useState<any>(null);
  const [itineraryDeparture, setItineraryDeparture] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Separate query for stats to avoid overhead on every page change
  const { data: statsData } = useQuery({
    queryKey: ['admin-departures-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, package_id, status, booked_count');
      if (error) throw error;
      return {
        total: data.length,
        linked: data.filter(d => d.package_id).length,
        unlinked: data.filter(d => !d.package_id).length,
        open: data.filter(d => d.status === 'open').length,
        totalBooked: data.reduce((sum, d) => sum + (d.booked_count || 0), 0),
      };
    }
  });

  const { data: departuresData, isLoading } = useQuery({
    queryKey: ['admin-departures', currentPage, searchTerm, statusFilter, monthFilter, linkedFilter],
    queryFn: async () => {
      let query = supabase
        .from('departures')
        .select(`
          *,
          package:packages(id, name, code, package_type),
          departure_airport:airports!departures_departure_airport_id_fkey(code, name),
          arrival_airport:airports!departures_arrival_airport_id_fkey(code, name),
          airline:airlines(code, name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
          muthawif:muthawifs(name),
          team_leader:customers!departures_team_leader_id_fkey(full_name)
        `, { count: 'exact' });

      // Apply Filters
      if (searchTerm) {
        query = query.or(`flight_number.ilike.%${searchTerm}%,package.name.ilike.%${searchTerm}%,package.code.ilike.%${searchTerm}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      if (monthFilter !== "all") {
        query = query.ilike('departure_date', `${monthFilter}%`);
      }
      if (linkedFilter === "linked") {
        query = query.not('package_id', 'is', null);
      } else if (linkedFilter === "unlinked") {
        query = query.is('package_id', null);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await query
        .order('departure_date', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { data, count };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jadwal berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ['admin-departures'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departures-stats'] });
      setDeleteDeparture(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal menghapus jadwal");
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ departureId, type }: { departureId: string; type: string }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: { type, departure_id: departureId }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Gagal mengirim notifikasi');
      return data;
    },
    onSuccess: (data: { sent?: number; failed?: number; type?: string }) => {
      toast.success(`Notifikasi berhasil dikirim: ${data.sent || 0} terkirim, ${data.failed || 0} gagal`);
    },
    onError: (error: Error) => {
      toast.error("Gagal mengirim notifikasi: " + error.message);
    },
  });

  const departures = departuresData?.data || [];
  const totalCount = departuresData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Buka</Badge>;
      case 'closed':
        return <Badge variant="secondary">Tutup</Badge>;
      case 'full':
        return <Badge variant="destructive">Penuh</Badge>;
      case 'departed':
        return <Badge variant="outline">Berangkat</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEdit = (departure: any) => {
    setEditingDeparture(departure);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDeparture(null);
  };

  const stats = statsData || {
    total: 0,
    linked: 0,
    unlinked: 0,
    open: 0,
    totalBooked: 0,
  };

  const formatShortCurrency = (value: number | null | undefined) => {
    if (!value || value <= 0) return '-';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
    return formatCurrency(value);
  };

  const getDepartureLabel = (dep: any) => {
    if (dep.departure_date) {
      return (
        <>
          <p className="font-medium text-sm">{formatDate(dep.departure_date)}</p>
          <p className="text-xs text-muted-foreground">
            s/d {formatDate(dep.return_date)}
          </p>
        </>
      );
    }
    if (dep.month) {
      const monthLabel = MONTHS.find(m => m.value === dep.month)?.label || dep.month;
      return (
        <>
          <p className="font-medium text-sm">Bulan {monthLabel}</p>
          <p className="text-xs text-muted-foreground">Tanggal belum ditentukan</p>
        </>
      );
    }
    return <p className="font-medium text-sm text-muted-foreground italic">Tanggal belum ditentukan</p>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Keberangkatan</h1>
          <p className="text-muted-foreground">Kelola semua jadwal keberangkatan</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.linked}</p>
                <p className="text-sm text-muted-foreground">Terhubung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Link2Off className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.unlinked}</p>
                <p className="text-sm text-muted-foreground">Belum Terhubung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Masih Buka</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalBooked}</p>
                <p className="text-sm text-muted-foreground">Total Jamaah</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Daftar Jadwal</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari jadwal..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="open">Buka</SelectItem>
                  <SelectItem value="closed">Tutup</SelectItem>
                  <SelectItem value="full">Penuh</SelectItem>
                  <SelectItem value="departed">Berangkat</SelectItem>
                </SelectContent>
              </Select>
              <Select value={linkedFilter} onValueChange={(val) => { setLinkedFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Koneksi Paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="linked">Terhubung Paket</SelectItem>
                  <SelectItem value="unlinked">Belum Terhubung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jadwal & Paket</TableHead>
                  <TableHead>Penerbangan</TableHead>
                  <TableHead>Hotel (Mk/Md)</TableHead>
                  <TableHead className="text-center">Kuota</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : departures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Tidak ada jadwal ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  departures.map((dep) => (
                    <TableRow 
                      key={dep.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/departures/${dep.id}`)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          {getDepartureLabel(dep)}
                          {dep.package ? (
                            <div 
                              className="text-xs font-medium text-primary flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Building2 className="h-3 w-3" />
                              {dep.package.name} ({dep.package.code})
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-200 bg-orange-50">
                              Belum Terhubung Paket
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Plane className="h-3 w-3" />
                            {dep.airline?.code || '-'} {dep.flight_number || ''}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{dep.departure_airport?.code || '-'}</span>
                            <span>→</span>
                            <span>{dep.arrival_airport?.code || '-'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Hotel className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">{dep.hotel_makkah?.name || '-'}</span>
                            <span className="text-yellow-500">★{dep.hotel_makkah?.star_rating || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Hotel className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">{dep.hotel_madinah?.name || '-'}</span>
                            <span className="text-yellow-500">★{dep.hotel_madinah?.star_rating || 0}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <div className="text-sm font-bold">
                            {dep.booked_count || 0} / {dep.quota || 0}
                          </div>
                          <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full" 
                              style={{ width: `${Math.min(100, ((dep.booked_count || 0) / (dep.quota || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(dep.status)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => navigate(`/admin/departures/${dep.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(dep)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setItineraryDeparture(dep)}>
                              <MapPin className="h-4 w-4 mr-2" /> Kelola Itinerary
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-primary"
                              onClick={() => sendNotificationMutation.mutate({ departureId: dep.id, type: 'departure_reminder' })}
                            >
                              <Bell className="h-4 w-4 mr-2" /> Pengingat Berangkat
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-primary"
                              onClick={() => sendNotificationMutation.mutate({ departureId: dep.id, type: 'manasik_info' })}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" /> Info Manasik
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteDeparture(dep)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} dari {totalCount} data
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum = currentPage;
                    if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    if (pageNum <= 0 || pageNum > totalPages) return null;

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeparture ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
          </DialogHeader>
          <DepartureForm 
            departureData={editingDeparture || undefined} 
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!itineraryDeparture} onOpenChange={(open) => !open && setItineraryDeparture(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Itinerary - {itineraryDeparture?.package?.name}</DialogTitle>
          </DialogHeader>
          {itineraryDeparture && (
            <LinkItineraryForm 
              departureId={itineraryDeparture.id} 
              departureDate={itineraryDeparture.departure_date}
              onSuccess={() => setItineraryDeparture(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDeparture} onOpenChange={(open) => !open && setDeleteDeparture(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Jadwal keberangkatan akan dihapus secara permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteDeparture.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
