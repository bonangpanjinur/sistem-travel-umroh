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
import { Link } from "react-router-dom";
import { 
  Calendar, Plus, Search, Plane, Users, Edit, Trash2, 
  CalendarDays, Hotel, Building2, Link2Off, MapPin,
  MessageCircle, Bell, Send, DollarSign, MoreVertical
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

export default function AdminDepartures() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [linkedFilter, setLinkedFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<any>(null);
  const [deleteDeparture, setDeleteDeparture] = useState<any>(null);
  const [itineraryDeparture, setItineraryDeparture] = useState<any>(null);

  const { data: departures, isLoading } = useQuery({
    queryKey: ['admin-all-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
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
        `)
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jadwal berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ['admin-all-departures'] });
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
      return data;
    },
    onSuccess: (data: { sent?: number; failed?: number; type?: string }) => {
      toast.success(`Notifikasi berhasil dikirim: ${data.sent || 0} terkirim, ${data.failed || 0} gagal`);
    },
    onError: (error: Error) => {
      toast.error("Gagal mengirim notifikasi: " + error.message);
    },
  });

  const months = departures 
    ? [...new Set(departures.map(d => d.departure_date ? d.departure_date.substring(0, 7) : null).filter(Boolean))]
        .sort()
        .map(m => {
          if (m?.startsWith('MONTH-')) {
            const monthVal = m.replace('MONTH-', '');
            const label = MONTHS.find(mon => mon.value === monthVal)?.label || monthVal;
            return { value: m, label: `Bulan ${label}` };
          }
          return { value: m, label: new Date(m + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) };
        })
    : [];

  const filteredDepartures = departures?.filter(dep => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        dep.package?.name?.toLowerCase().includes(search) ||
        dep.package?.code?.toLowerCase().includes(search) ||
        dep.flight_number?.toLowerCase().includes(search) ||
        dep.airline?.name?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (statusFilter !== "all" && dep.status !== statusFilter) return false;
    if (monthFilter !== "all") {
      if (!dep.departure_date || !dep.departure_date.startsWith(monthFilter)) return false;
    }
    if (linkedFilter === "linked" && !dep.package_id) return false;
    if (linkedFilter === "unlinked" && dep.package_id) return false;
    return true;
  });

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

  const stats = {
    total: departures?.length || 0,
    linked: departures?.filter(d => d.package_id).length || 0,
    unlinked: departures?.filter(d => !d.package_id).length || 0,
    open: departures?.filter(d => d.status === 'open').length || 0,
    totalBooked: departures?.reduce((sum, d) => sum + (d.booked_count || 0), 0) || 0,
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari paket, maskapai, atau no. penerbangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={linkedFilter} onValueChange={setLinkedFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Hubungan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="linked">Terhubung Paket</SelectItem>
                <SelectItem value="unlinked">Belum Terhubung</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="open">Buka</SelectItem>
                <SelectItem value="closed">Tutup</SelectItem>
                <SelectItem value="full">Penuh</SelectItem>
                <SelectItem value="departed">Sudah Berangkat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6 px-0">
          {isLoading ? (
            <div className="space-y-4 px-6">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !filteredDepartures || filteredDepartures.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || monthFilter !== 'all' || linkedFilter !== 'all'
                  ? 'Tidak ada jadwal yang cocok dengan filter.' 
                  : 'Belum ada jadwal keberangkatan.'}
              </p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                      <TableHead className="whitespace-nowrap">Paket</TableHead>
                      <TableHead className="whitespace-nowrap">Penerbangan</TableHead>
                      <TableHead className="whitespace-nowrap">Hotel</TableHead>
                      <TableHead className="whitespace-nowrap">Harga per Kamar</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Kuota</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartures.map((dep) => (
                      <TableRow key={dep.id}>
                        {/* Tanggal */}
                        <TableCell className="whitespace-nowrap">
                          {getDepartureLabel(dep)}
                        </TableCell>

                        {/* Paket */}
                        <TableCell>
                          {dep.package ? (
                            <div className="max-w-[160px]">
                              <Link 
                                to={`/admin/packages/${dep.package.id}`}
                                className="font-medium text-sm hover:text-primary hover:underline line-clamp-2"
                              >
                                {dep.package.name}
                              </Link>
                              <p className="text-xs text-muted-foreground">{dep.package.code}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                              <Link2Off className="h-3 w-3 mr-1" />
                              Belum
                            </Badge>
                          )}
                        </TableCell>

                        {/* Penerbangan */}
                        <TableCell>
                          <div className="space-y-0.5">
                            {dep.airline && (
                              <p className="text-sm font-medium truncate max-w-[120px]">{dep.airline.name}</p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{dep.departure_airport?.code || '-'}</span>
                              <Plane className="h-3 w-3 shrink-0" />
                              <span>{dep.arrival_airport?.code || '-'}</span>
                            </div>
                            {dep.flight_number && (
                              <p className="text-xs text-muted-foreground">{dep.flight_number}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Hotel - Gabung Makkah & Madinah */}
                        <TableCell>
                          <div className="space-y-1 max-w-[180px]">
                            {dep.hotel_makkah ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5">
                                    <Hotel className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span className="text-sm truncate">{dep.hotel_makkah.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Makkah: {dep.hotel_makkah.name} {'⭐'.repeat(dep.hotel_makkah.star_rating || 0)}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">Makkah: -</span>
                            )}
                            {dep.hotel_madinah ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5">
                                    <Hotel className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-sm truncate">{dep.hotel_madinah.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Madinah: {dep.hotel_madinah.name} {'⭐'.repeat(dep.hotel_madinah.star_rating || 0)}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">Madinah: -</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Harga per Kamar - Grid 2x2 */}
                        <TableCell>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs min-w-[140px]">
                            {[
                              { label: 'Q', value: dep.price_quad, full: 'Quad', color: 'text-blue-600' },
                              { label: 'T', value: dep.price_triple, full: 'Triple', color: 'text-emerald-600' },
                              { label: 'D', value: dep.price_double, full: 'Double', color: 'text-amber-600' },
                              { label: 'S', value: dep.price_single, full: 'Single', color: 'text-purple-600' },
                            ].map(p => (
                              <Tooltip key={p.label}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-default">
                                    <span className={`font-bold ${p.color}`}>{p.label}</span>
                                    <span className="font-medium tabular-nums">{formatShortCurrency(p.value)}</span>
                                  </div>
                                </TooltipTrigger>
                                {p.value && p.value > 0 && (
                                  <TooltipContent><p>{p.full}: {formatCurrency(p.value)}</p></TooltipContent>
                                )}
                              </Tooltip>
                            ))}
                          </div>
                        </TableCell>

                        {/* Kuota */}
                        <TableCell className="text-center">
                          {(() => {
                            const booked = dep.booked_count || 0;
                            const quota = dep.quota;
                            const pct = quota > 0 ? (booked / quota) * 100 : 0;
                            const color = pct >= 100 ? 'text-destructive' : pct >= 75 ? 'text-orange-600' : 'text-green-600';
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className={`text-sm font-bold ${color}`}>
                                    {booked}/{quota}
                                  </span>
                                </div>
                                <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-destructive' : pct >= 75 ? 'bg-orange-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(dep.status)}</TableCell>

                        {/* Aksi */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(dep)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setItineraryDeparture(dep)}>
                                <MapPin className="h-4 w-4 mr-2" />
                                Itinerary
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to="/admin/finance/pl">
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Lihat P&L
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => sendNotificationMutation.mutate({ departureId: dep.id, type: 'departure_reminder' })}
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                Pengingat Berangkat
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => sendNotificationMutation.mutate({ departureId: dep.id, type: 'welcome_umrah' })}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Ucapan Selamat
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteDeparture(dep)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDeparture ? 'Edit Keberangkatan' : 'Tambah Keberangkatan Baru'}
            </DialogTitle>
          </DialogHeader>
          <DepartureForm
            departureData={editingDeparture}
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDeparture} onOpenChange={() => setDeleteDeparture(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Keberangkatan?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus jadwal keberangkatan {deleteDeparture && (deleteDeparture.departure_date ? `tanggal ${formatDate(deleteDeparture.departure_date)}` : (deleteDeparture.month ? `bulan ${MONTHS.find(m => m.value === deleteDeparture.month)?.label}` : 'ini'))}? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteDeparture && deleteMutation.mutate(deleteDeparture.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Itinerary Dialog */}
      <Dialog open={!!itineraryDeparture} onOpenChange={() => setItineraryDeparture(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Itinerary Keberangkatan</DialogTitle>
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
    </div>
  );
}
