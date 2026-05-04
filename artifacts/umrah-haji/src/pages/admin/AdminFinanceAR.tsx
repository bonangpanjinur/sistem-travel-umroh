import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, DollarSign, TrendingUp, AlertCircle, Bell, Send } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export default function AdminFinanceAR() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAR, setEditingAR] = useState<any>(null);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    due_date: "",
    notes: "",
  });

  // Fetch AR data (receivables from customers)
  const { data: arData = [], isLoading } = useQuery({
    queryKey: ["admin-ar"],
    queryFn: async () => {
      // Get bookings with customer info — limit to most recent 200 for UI responsiveness
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          total_price,
          paid_amount,
          payment_status,
          created_at,
          customer:customers(full_name, phone, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (error) throw error;
      
      // Transform to AR format
      return data?.map(b => {
        const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
        return {
          id: b.id,
          booking_code: b.booking_code,
          customer_name: customer?.full_name || "Unknown",
          customer_phone: customer?.phone,
          customer_email: customer?.email,
          total_amount: b.total_price,
          paid_amount: b.paid_amount || 0,
          outstanding: (b.total_price || 0) - (b.paid_amount || 0),
          status: b.payment_status,
          created_at: b.created_at,
        };
      }) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Calculate summary
  const totalAR = arData.reduce((sum, ar) => sum + (ar.outstanding || 0), 0);
  const totalPaid = arData.reduce((sum, ar) => sum + (ar.paid_amount || 0), 0);
  const totalBookings = arData.reduce((sum, ar) => sum + (ar.total_amount || 0), 0);

  const filtered = arData.filter(ar => {
    const matchSearch = ar.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ar.booking_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || 
      (statusFilter === "outstanding" && ar.outstanding > 0) ||
      (statusFilter === "paid" && ar.outstanding === 0);
    return matchSearch && matchStatus;
  });

  const handleOpenDialog = () => {
    setEditingAR(null);
    setFormData({
      description: "",
      amount: "",
      due_date: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAR(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Piutang Jamaah (AR)</h1>
          <p className="text-muted-foreground">Kelola piutang cicilan dari jamaah berdasarkan booking</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Booking</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBookings)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Piutang Tertunggak</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAR)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jamaah</p>
                <p className="text-2xl font-bold">{arData.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama jamaah atau booking code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="outstanding">Tertunggak</SelectItem>
            <SelectItem value="paid">Lunas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Tidak ada data piutang ditemukan</CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Code</TableHead>
                <TableHead>Nama Jamaah</TableHead>
                <TableHead>Total Booking</TableHead>
                <TableHead>Sudah Dibayar</TableHead>
                <TableHead>Piutang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ar) => (
                <TableRow key={ar.id}>
                  <TableCell className="font-medium">{ar.booking_code}</TableCell>
                  <TableCell>
                    <div>{ar.customer_name}</div>
                    {ar.customer_phone && (
                      <div className="text-sm text-muted-foreground">{ar.customer_phone}</div>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(ar.total_amount)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(ar.paid_amount)}</TableCell>
                  <TableCell className={ar.outstanding > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                    {formatCurrency(ar.outstanding)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ar.outstanding === 0 ? "default" : "secondary"}>
                      {ar.outstanding === 0 ? "Lunas" : "Tertunggak"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(ar.created_at!), "dd MMM yyyy", { locale: localeId })}
                  </TableCell>
                  <TableCell className="text-right">
                    {ar.outstanding > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Send in-app notification
                            const { data: customerData } = await supabase
                              .from('customers')
                              .select('user_id')
                              .eq('full_name', ar.customer_name)
                              .limit(1)
                              .maybeSingle();

                            if (customerData?.user_id) {
                              await supabase.from('notifications').insert({
                                user_id: customerData.user_id,
                                title: 'Pengingat Pembayaran',
                                message: `Anda memiliki piutang sebesar ${formatCurrency(ar.outstanding)} untuk booking ${ar.booking_code}. Segera lakukan pembayaran.`,
                                type: 'warning',
                                link: '/customer/bookings',
                              });
                              toast.success(`Reminder berhasil dikirim ke ${ar.customer_name}`);
                            } else {
                              toast.error('User ID jamaah tidak ditemukan');
                            }
                          } catch (err: any) {
                            toast.error('Gagal mengirim reminder: ' + err.message);
                          }
                        }}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Reminder
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">ℹ️ Informasi Piutang Jamaah</p>
          <p>Halaman ini menampilkan ringkasan piutang dari jamaah berdasarkan booking mereka. Piutang tertunggak adalah selisih antara total booking dan jumlah pembayaran yang sudah diterima.</p>
        </CardContent>
      </Card>
    </div>
  );
}
