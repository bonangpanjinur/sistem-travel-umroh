import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { 
  Luggage, Plus, Search, QrCode, Tag, 
  ScanLine, CheckCircle2, MapPin, Clock 
} from "lucide-react";
import { toast } from "sonner";

const LUGGAGE_STATUS = [
  { value: 'registered', label: 'Terdaftar', color: 'bg-muted text-muted-foreground', icon: Tag },
  { value: 'airport_checkin', label: 'Check-in Bandara', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: MapPin },
  { value: 'loaded', label: 'Dimuat Pesawat', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: Clock },
  { value: 'arrived', label: 'Tiba di Tujuan', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: MapPin },
  { value: 'hotel_lobby', label: 'Lobby Hotel', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', icon: MapPin },
  { value: 'delivered', label: 'Diterima Jamaah', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: CheckCircle2 },
];

interface LuggageItem {
  id: string;
  tag_code: string;
  weight_kg: number | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  customer: { id: string; full_name: string; phone: string | null } | null;
}

export default function LuggagePage() {
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [weightKg, setWeightKg] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scannedLuggage, setScannedLuggage] = useState<LuggageItem | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: departures } = useQuery({
    queryKey: ['luggage-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id,
          departure_date,
          package:packages(name)
        `)
        .gte('departure_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: luggageList, isLoading } = useQuery({
    queryKey: ['luggage-list', selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('luggage')
        .select(`
          id,
          tag_code,
          weight_kg,
          status,
          created_at,
          updated_at,
          customer:customers(id, full_name, phone)
        `)
        .eq('departure_id', selectedDeparture)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LuggageItem[];
    },
  });

  const { data: passengers } = useQuery({
    queryKey: ['luggage-passengers', selectedDeparture],
    enabled: !!selectedDeparture && addDialogOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`
          customer:customers(id, full_name),
          booking:bookings!inner(departure_id, booking_status)
        `)
        .eq('booking.departure_id', selectedDeparture)
        .eq('booking.booking_status', 'confirmed');

      if (error) throw error;
      return data;
    },
  });

  const addLuggage = useMutation({
    mutationFn: async () => {
      const tagCode = `LUG-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from('luggage')
        .insert({
          customer_id: selectedCustomer,
          departure_id: selectedDeparture,
          tag_code: tagCode,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          status: 'registered',
        });

      if (error) throw error;
      return tagCode;
    },
    onSuccess: (tagCode) => {
      toast.success(`Luggage berhasil ditambahkan: ${tagCode}`);
      setAddDialogOpen(false);
      setSelectedCustomer("");
      setWeightKg("");
      queryClient.invalidateQueries({ queryKey: ['luggage-list'] });
    },
    onError: () => {
      toast.error("Gagal menambahkan luggage");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('luggage')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ['luggage-list'] });
      if (scannedLuggage) {
        setScannedLuggage(null);
        setScanCode("");
      }
    },
    onError: () => {
      toast.error("Gagal memperbarui status");
    },
  });

  const handleScanSubmit = async () => {
    if (!scanCode.trim()) return;
    
    const { data, error } = await supabase
      .from('luggage')
      .select(`
        id,
        tag_code,
        weight_kg,
        status,
        created_at,
        updated_at,
        customer:customers(id, full_name, phone)
      `)
      .eq('tag_code', scanCode.trim().toUpperCase())
      .single();
    
    if (error || !data) {
      toast.error("Kode luggage tidak ditemukan");
      setScannedLuggage(null);
      return;
    }
    
    setScannedLuggage(data as LuggageItem);
    toast.success(`Luggage ditemukan: ${data.tag_code}`);
  };

  const handleQuickStatusUpdate = (newStatus: string) => {
    if (scannedLuggage) {
      updateStatus.mutate({ id: scannedLuggage.id, status: newStatus });
    }
  };

  const filteredLuggage = luggageList?.filter(l => 
    l.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.tag_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const s = LUGGAGE_STATUS.find(st => st.value === status);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge>{status}</Badge>;
  };

  const getStatusStats = () => {
    if (!luggageList) return {};
    return LUGGAGE_STATUS.reduce((acc, s) => {
      acc[s.value] = luggageList.filter(l => l.status === s.value).length;
      return acc;
    }, {} as Record<string, number>);
  };

  const statusStats = getStatusStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Luggage Tracking</h1>
          <p className="text-muted-foreground">Kelola dan lacak koper jamaah dengan QR</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScanDialogOpen(true)}>
            <ScanLine className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          {selectedDeparture && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Luggage
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Keberangkatan</label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan" />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.package as { name: string } | null)?.name} - {format(new Date(d.departure_date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama jamaah atau kode tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Stats */}
      {selectedDeparture && luggageList && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {LUGGAGE_STATUS.map((s) => {
            const IconComponent = s.icon;
            return (
              <Card key={s.value} className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${s.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{statusStats[s.value] || 0}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Luggage List */}
      {selectedDeparture && (
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Daftar</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Luggage className="h-5 w-5" />
                  Daftar Luggage ({filteredLuggage?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredLuggage?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Belum ada luggage terdaftar
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag Code</TableHead>
                        <TableHead>Jamaah</TableHead>
                        <TableHead>Berat (kg)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Update Terakhir</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLuggage?.map((luggage) => (
                        <TableRow key={luggage.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono font-semibold">{luggage.tag_code}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{luggage.customer?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{luggage.customer?.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{luggage.weight_kg || '-'}</TableCell>
                          <TableCell>{getStatusBadge(luggage.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {luggage.updated_at 
                              ? format(new Date(luggage.updated_at), "dd/MM HH:mm")
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={luggage.status}
                              onValueChange={(value) => updateStatus.mutate({ id: luggage.id, status: value })}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LUGGAGE_STATUS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {LUGGAGE_STATUS.map((status, idx) => {
                    const items = luggageList?.filter(l => l.status === status.value) || [];
                    const IconComponent = status.icon;
                    return (
                      <div key={status.value} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full ${status.color}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          {idx < LUGGAGE_STATUS.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <h4 className="font-semibold">{status.label}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {items.length} koper
                          </p>
                          {items.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {items.slice(0, 10).map(item => (
                                <Badge key={item.id} variant="outline" className="text-xs">
                                  {item.tag_code}
                                </Badge>
                              ))}
                              {items.length > 10 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{items.length - 10} lainnya
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Luggage Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Luggage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Jamaah</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jamaah" />
                </SelectTrigger>
                <SelectContent>
                  {passengers?.map((p) => (
                    <SelectItem key={(p.customer as { id: string })?.id} value={(p.customer as { id: string })?.id}>
                      {(p.customer as { full_name: string })?.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Berat (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={() => addLuggage.mutate()}
              disabled={!selectedCustomer || addLuggage.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scan Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={(open) => {
        setScanDialogOpen(open);
        if (!open) {
          setScanCode("");
          setScannedLuggage(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan Kode Luggage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Masukkan atau Scan Kode Tag</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={scanInputRef}
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                  placeholder="LUG-XXXXXX"
                  className="font-mono"
                  autoFocus
                />
                <Button onClick={handleScanSubmit}>Cari</Button>
              </div>
            </div>

            {scannedLuggage && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-bold font-mono">{scannedLuggage.tag_code}</code>
                    {getStatusBadge(scannedLuggage.status)}
                  </div>
                  <div className="text-sm">
                    <p><strong>Jamaah:</strong> {scannedLuggage.customer?.full_name}</p>
                    <p><strong>Berat:</strong> {scannedLuggage.weight_kg || '-'} kg</p>
                  </div>
                  <div className="border-t pt-3">
                    <Label className="text-xs text-muted-foreground">Update Status Cepat</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {LUGGAGE_STATUS.filter(s => s.value !== scannedLuggage.status).map((s) => {
                        const IconComponent = s.icon;
                        return (
                          <Button
                            key={s.value}
                            variant="outline"
                            size="sm"
                            className="justify-start"
                            onClick={() => handleQuickStatusUpdate(s.value)}
                          >
                            <IconComponent className="h-3 w-3 mr-1" />
                            {s.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
