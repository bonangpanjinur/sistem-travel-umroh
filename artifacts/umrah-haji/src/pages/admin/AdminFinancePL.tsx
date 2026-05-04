import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type DepartureRow = Database["public"]["Tables"]["departures"]["Row"];
type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type VendorCostRow = Database["public"]["Tables"]["vendor_costs"]["Row"];
type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];

interface DepartureQueryResult extends Pick<DepartureRow, "id" | "departure_date" | "return_date" | "quota" | "booked_count"> {
  package: Pick<PackageRow, "name" | "code"> | null;
}

interface BookingQueryResult extends Pick<BookingRow, "departure_id" | "total_price" | "paid_amount"> {}

interface VendorCostQueryResult extends Pick<VendorCostRow, "id" | "departure_id" | "vendor_id" | "cost_type" | "description" | "amount" | "due_date" | "paid_amount" | "status"> {
  vendor: Pick<VendorRow, "name" | "vendor_type"> | null;
}

interface DeparturePL extends DepartureQueryResult {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  costs: VendorCostQueryResult[];
}

interface Vendor extends Pick<VendorRow, "id" | "name" | "vendor_type"> {}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  TrendingUp, TrendingDown, DollarSign, Receipt, 
  Plane, Plus, AlertTriangle, CheckCircle2,
  FileText, Loader2
} from "lucide-react";
import { exportToPDF } from "@/lib/export-utils";

const COST_TYPES = [
  { value: 'ACCOMMODATION', label: 'Akomodasi Hotel' },
  { value: 'FLIGHT', label: 'Tiket Pesawat' },
  { value: 'VISA', label: 'Visa' },
  { value: 'MEALS', label: 'Konsumsi' },
  { value: 'TRANSPORT', label: 'Transportasi' },
  { value: 'OTHER', label: 'Lainnya' },
];



export default function AdminFinancePL() {
  const queryClient = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState<DeparturePL | null>(null);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [costFormData, setCostFormData] = useState({
    vendor_id: "",
    cost_type: "ACCOMMODATION",
    description: "",
    amount: "",
    due_date: "",
  });

  // Fetch departures with revenue and costs
  const { data: departures, isLoading } = useQuery({
    queryKey: ["admin-departures-pl"],
    queryFn: async (): Promise<DeparturePL[]> => {
      // Get departures
      const { data: deps, error: depError } = await supabase
        .from("departures")
        .select(`
          id,
          departure_date,
          return_date,
          quota,
          booked_count,
          package:packages(name, code)
        `)
        .gte("departure_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("departure_date", { ascending: false });
      
      if (depError) throw depError;
      const typedDeps: DepartureQueryResult[] = deps;
      const depIds = typedDeps.map(d => d.id);

      // Short-circuit if there are no relevant departures
      if (depIds.length === 0) return [];

      // Get bookings revenue per departure — limited to relevant departures only
      const { data: bookings, error: bookError } = await supabase
        .from("bookings")
        .select("departure_id, total_price, paid_amount")
        .in("departure_id", depIds);
      
      if (bookError) throw bookError;
      const typedBookings: BookingQueryResult[] = bookings;

      // Get vendor costs per departure — limited to relevant departures only
      const { data: costs, error: costError } = await supabase
        .from("vendor_costs")
        .select(`
          id,
          departure_id,
          vendor_id,
          vendor:vendors(name, vendor_type),
          cost_type,
          description,
          amount,
          due_date,
          paid_amount,
          status
        `)
        .in("departure_id", depIds);
      
      if (costError) throw costError;
      const typedCosts: VendorCostQueryResult[] = costs;

      // Calculate P&L for each departure
      return typedDeps?.map(dep => {
        const depBookings = typedBookings?.filter(b => b.departure_id === dep.id) || [];
        const depCosts = typedCosts?.filter(c => c.departure_id === dep.id) || [];
        
        const totalRevenue = depBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
        const totalCost = depCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
        const profit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          ...dep,
          totalRevenue,
          totalCost,
          profit,
          profitMargin,
          costs: depCosts,
        };
      }) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, vendor_type')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const addCostMutation = useMutation({
    mutationFn: async (data: { departure_id: string } & typeof costFormData) => {
      const { error } = await supabase
        .from('vendor_costs')
        .insert({
          departure_id: data.departure_id,
          vendor_id: data.vendor_id,
          cost_type: data.cost_type,
          description: data.description || null,
          amount: parseFloat(data.amount),
          due_date: data.due_date || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departures-pl'] });
      toast.success('Biaya vendor berhasil ditambahkan');
      setCostDialogOpen(false);
      setCostFormData({ vendor_id: "", cost_type: "ACCOMMODATION", description: "", amount: "", due_date: "" });
    },
    onError: (error: Error) => {
      toast.error('Gagal menambah biaya: ' + error.message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (costId: string) => {
      const { data: cost } = await supabase
        .from("vendor_costs")
        .select("amount")
        .eq("id", costId)
        .single();
      if (!cost) throw new Error("Cost not found");
      
      const { error } = await supabase
        .from('vendor_costs')
        .update({ 
          paid_amount: cost?.amount || 0,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', costId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departures-pl'] });
      toast.success('Biaya telah ditandai lunas');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Summary stats
  const totalRevenue = departures?.reduce((sum, d) => sum + d.totalRevenue, 0) || 0;
  const totalCost = departures?.reduce((sum, d) => sum + d.totalCost, 0) || 0;
  const totalProfit = totalRevenue - totalCost;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPL = async (e: React.MouseEvent, dep: DeparturePL) => {
    e.stopPropagation();
    setIsExporting(true);
    try {
      const filename = `Laba_Rugi_${dep.package?.code || 'DEP'}_${format(new Date(dep.departure_date), 'yyyyMMdd')}`;
      const title = `Laporan Laba Rugi per Keberangkatan`;
      const subtitle = `${dep.package?.name} (${format(new Date(dep.departure_date), 'd MMM yyyy', { locale: localeId })})`;

      const columns = [
        { header: 'Kategori', accessor: 'category', width: 40 },
        { header: 'Keterangan', accessor: 'description', width: 60 },
        { header: 'Jumlah', accessor: 'amount', width: 30 },
      ];

      const data = [
        { category: 'PENDAPATAN', description: 'Total Revenue (Booking)', amount: formatCurrency(dep.totalRevenue) },
        { category: '', description: '', amount: '' },
        { category: 'BIAYA VENDOR', description: '', amount: '' },
        ...dep.costs.map(c => ({
          category: '',
          description: `${COST_TYPES.find(t => t.value === c.cost_type)?.label || c.cost_type} - ${c.vendor?.name || 'Vendor'}`,
          amount: formatCurrency(c.amount)
        })),
        { category: '', description: 'Total Biaya', amount: formatCurrency(dep.totalCost) },
        { category: '', description: '', amount: '' },
        { category: 'RINGKASAN', description: 'Laba/Rugi Kotor', amount: formatCurrency(dep.profit) },
        { category: '', description: 'Margin Profit', amount: `${dep.profitMargin.toFixed(2)}%` },
      ];

      exportToPDF(data, columns, filename, title, subtitle);
      toast.success('Laporan PDF berhasil diunduh');
    } catch (error) {
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Upcoming payments
  const upcomingPayments = departures?.flatMap(d => 
    d.costs.filter(c => c.status !== 'paid' && c.due_date)
  ).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit & Loss per Keberangkatan</h1>
        <p className="text-muted-foreground">Monitor profitabilitas dan biaya vendor setiap keberangkatan</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Biaya Vendor</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <Receipt className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${totalProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <DollarSign className={`h-6 w-6 ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margin Rata-rata</p>
                <p className="text-2xl font-bold">
                  {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Departure P&L List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                P&L per Keberangkatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {departures?.map((dep) => (
                    <div 
                      key={dep.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDeparture?.id === dep.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedDeparture(dep)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">{dep.package?.name || 'Paket tidak diketahui'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: localeId })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8"
                            onClick={(e) => handleExportPL(e, dep)}
                            disabled={isExporting}
                          >
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                            PDF
                          </Button>
                          <Badge variant={dep.profit >= 0 ? "default" : "destructive"}>
                            {dep.profit >= 0 ? '+' : ''}{formatCurrency(dep.profit)}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-medium text-green-600">{formatCurrency(dep.totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cost</p>
                          <p className="font-medium text-red-600">{formatCurrency(dep.totalCost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Margin</p>
                          <p className="font-medium">{dep.profitMargin.toFixed(1)}%</p>
                        </div>
                      </div>
                      <Progress 
                        value={dep.profitMargin > 0 ? Math.min(dep.profitMargin, 100) : 0} 
                        className="mt-3 h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Payments & Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Jatuh Tempo Terdekat
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada pembayaran jatuh tempo
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{cost.vendor?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cost.due_date && format(new Date(cost.due_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(cost.amount)}</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-xs mt-1"
                          onClick={() => markPaidMutation.mutate(cost.id)}
                        >
                          Tandai Lunas
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Departure Details */}
          {selectedDeparture && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Detail Biaya</CardTitle>
                  <Button size="sm" onClick={() => setCostDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDeparture.costs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Belum ada biaya vendor
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDeparture.costs.map((cost) => (
                      <div key={cost.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{cost.vendor?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {COST_TYPES.find(t => t.value === cost.cost_type)?.label}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(cost.amount)}</p>
                          <Badge variant={cost.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {cost.status === 'paid' ? 'Lunas' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Cost Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Biaya Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedDeparture) {
              addCostMutation.mutate({
                departure_id: selectedDeparture.id,
                ...costFormData,
              });
            }
          }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select 
                  value={costFormData.vendor_id} 
                  onValueChange={(v) => setCostFormData({ ...costFormData, vendor_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jenis Biaya *</Label>
                <Select 
                  value={costFormData.cost_type} 
                  onValueChange={(v) => setCostFormData({ ...costFormData, cost_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jumlah (IDR) *</Label>
                <Input
                  type="number"
                  value={costFormData.amount}
                  onChange={(e) => setCostFormData({ ...costFormData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Jatuh Tempo</Label>
                <Input
                  type="date"
                  value={costFormData.due_date}
                  onChange={(e) => setCostFormData({ ...costFormData, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Input
                  value={costFormData.description}
                  onChange={(e) => setCostFormData({ ...costFormData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCostDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={addCostMutation.isPending || !costFormData.vendor_id}>
                {addCostMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
