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
  ChevronLeft, ChevronRight, Eye, RefreshCw, TrendingUp,
  Zap, AlertCircle
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

  // Sinkronkan ulang booked_count dari data booking aktif (rekonsiliasi)
  const recalcMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('recalculate_departure_booked_count' as any, {
        p_departure_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Kuota keberangkatan berhasil disinkronkan');
      queryClient.invalidateQueries({ queryKey: ['admin-departures'] });
      queryClient.invalidateQueries({ queryKey: ['admin-departures-stats'] });
      queryClient.invalidateQueries({ queryKey: ['departures'] });
    },
    onError: (e: any) => toast.error('Gagal sinkronkan kuota: ' + (e?.message ?? 'unknown')),
  });

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
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Buka</Badge>;
      case 'closed':
        return <Badge variant="secondary">Tutup</Badge>;
      case 'full':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Penuh</Badge>;
      case 'departed':
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Berangkat</Badge>;
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
          <p className="font-semibold text-sm">{formatDate(dep.departure_date)}</p>
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
          <p className="font-semibold text-sm">Bulan {monthLabel}</p>
          <p className="text-xs text-muted-foreground">Tanggal belum ditentukan</p>
        </>
      );
    }
    return <p className="font-semibold text-sm text-muted-foreground italic">Tanggal belum ditentukan</p>;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jadwal Keberangkatan</h1>
          <p className="text-muted-foreground mt-1">Kelola dan pantau semua jadwal keberangkatan umroh</p>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => recalcMutation.mutate()}
                disabled={recalcMutation.isPending}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
                Sinkronkan
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hitung ulang kursi terisi dari data pesanan aktif</TooltipContent>
          </Tooltip>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {/* Stats Cards - Improved Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Jadwal</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-blue-200/50 rounded-lg">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terhubung Paket</p>
                <p className="text-3xl font-bold mt-2">{stats.linked}</p>
              </div>
              <div className="p-2.5 bg-emerald-200/50 rounded-lg">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Belum Terhubung</p>
                <p className="text-3xl font-bold mt-2">{stats.unlinked}</p>
              </div>
              <div className="p-2.5 bg-orange-200/50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Masih Buka</p>
                <p className="text-3xl font-bold mt-2">{stats.open}</p>
              </div>
              <div className="p-2.5 bg-green-200/50 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Jamaah</p>
                <p className="text-3xl font-bold mt-2">{stats.totalBooked}</p>
              </div>
              <div className="p-2.5 bg-purple-200/50 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Daftar Jadwal</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Kelola dan pantau semua jadwal keberangkatan</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 md:flex-none md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari jadwal atau paket..."
                  className="pl-10 bg-muted/50 border-0"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] bg-muted/50 border-0">
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
                <SelectTrigger className="w-[160px] bg-muted/50 border-0">
                  <SelectValue placeholder="Koneksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Koneksi</SelectItem>
                  <SelectItem value="linked">Terhubung Paket</SelectItem>
                  <SelectItem value="unlinked">Belum Terhubung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="font-semibold">Jadwal & Paket</TableHead>
                  <TableHead className="font-semibold">Penerbangan</TableHead>
                  <TableHead className="font-semibold">Hotel (Mk/Md)</TableHead>
                  <TableHead className="text-center font-semibold">Kuota</TableHead>
                  <TableHead className="text-center font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-border/30 hover:bg-transparent">
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : departures.length === 0 ? (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-8 w-8 opacity-40" />
                        <p className="font-medium">Tidak ada jadwal ditemukan</p>
                        <p className="text-sm">Mulai dengan membuat jadwal keberangkatan baru</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  departures.map((dep) => (
                    <TableRow 
                      key={dep.id}
                      className="border-b border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/departures/${dep.id}`)}
                    >
                      <TableCell>
                        <div className="space-y-2">
                          {getDepartureLabel(dep)}
                          {dep.package ? (
                            <div 
                              className="text-xs font-medium text-primary flex items-center gap-1.5 mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{dep.package.name} ({dep.package.code})</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50 mt-2">
                              ⚠ Belum Terhubung Paket
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Plane className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span>{dep.airline?.code || '-'} {dep.flight_number || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-medium">{dep.departure_airport?.code || '-'}</span>
                            <span className="text-muted-foreground/50">→</span>
                            <span className="font-medium">{dep.arrival_airport?.code || '-'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Hotel className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[120px] font-medium">{dep.hotel_makkah?.name || '-'}</span>
                            {dep.hotel_makkah?.star_rating && (
                              <span className="text-yellow-500 font-semibold">★{dep.hotel_makkah.star_rating}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Hotel className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[120px] font-medium">{dep.hotel_madinah?.name || '-'}</span>
                            {dep.hotel_madinah?.star_rating && (
                              <span className="text-yellow-500 font-semibold">★{dep.hotel_madinah.star_rating}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-2">
                          <div className="text-sm font-bold">
                            {dep.booked_count || 0} / {dep.quota || 0}
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, ((dep.booked_count || 0) / (dep.quota || 1)) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(((dep.booked_count || 0) / (dep.quota || 1)) * 100)}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(dep.status ?? '')}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Menampilkan <span className="font-semibold">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> - <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> dari <span className="font-semibold">{totalCount}</span> data
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
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
                        className="w-8 h-8"
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
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeparture ? 'Edit Jadwal Keberangkatan' : 'Tambah Jadwal Keberangkatan Baru'}</DialogTitle>
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
