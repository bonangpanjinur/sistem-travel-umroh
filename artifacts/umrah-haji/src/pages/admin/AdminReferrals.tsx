import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { 
  Users, Share2, DollarSign, TrendingUp, 
  Plus, Copy, Check, Search 
} from "lucide-react";
import { toast } from "sonner";

interface ReferralCode {
  id: string;
  customer_id: string;
  code: string;
  commission_rate?: number;
  is_active: boolean;
  total_referrals: number;
  total_commission?: number;
  total_bonus_earned?: number;
  created_at: string;
  customer?: { full_name: string; phone: string | null };
}

interface ReferralUsage {
  id: string;
  referral_code_id: string;
  booking_id: string;
  referred_customer_id: string;
  booking_amount: number;
  commission_amount: number;
  commission_status: string;
  created_at: string;
  referral_code?: { code: string; customer?: { full_name: string } };
  referred_customer?: { full_name: string };
}

export default function AdminReferrals() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [commissionRate, setCommissionRate] = useState("2.5");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: referralCodes, isLoading } = useQuery({
    queryKey: ['admin-referral-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select(`
          *,
          customer:customers(full_name, phone)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((item: Record<string, unknown>) => ({
        ...item,
        total_commission: (item.total_commission as number) ?? 0,
        commission_rate: (item.commission_rate as number) ?? 2.5,
      })) as ReferralCode[];
    },
  });

  const { data: referralUsages } = useQuery({
    queryKey: ['admin-referral-usages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_usages')
        .select(`
          *,
          referral_code:referral_codes(code, customer:customers(full_name)),
          referred_customer:customers(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ReferralUsage[];
    },
  });

  const { data: eligibleCustomers } = useQuery({
    queryKey: ['eligible-referral-customers'],
    enabled: createDialogOpen,
    queryFn: async () => {
      // Get customers who have completed at least one booking
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const createReferralMutation = useMutation({
    mutationFn: async () => {
      // Generate a unique code based on customer and timestamp
      const codePrefix = selectedCustomer.substring(0, 4).toUpperCase();
      const codeSuffix = Date.now().toString(36).toUpperCase().slice(-6);
      const generatedCode = `REF-${codePrefix}${codeSuffix}`;
      
      const { error } = await supabase
        .from('referral_codes')
        .insert([{
          customer_id: selectedCustomer,
          commission_rate: parseFloat(commissionRate),
          code: generatedCode,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-codes'] });
      toast.success('Kode referral berhasil dibuat');
      setCreateDialogOpen(false);
      setSelectedCustomer("");
      setCommissionRate("2.5");
    },
    onError: (error: Error) => {
      toast.error('Gagal membuat kode: ' + error.message);
    },
  });

  const updateCommissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, string | null> = { commission_status: status };
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('referral_usages')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-usages'] });
      toast.success('Status komisi diperbarui');
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Kode disalin!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCodes = referralCodes?.filter(rc =>
    rc.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReferrals = referralCodes?.reduce((sum, rc) => sum + rc.total_referrals, 0) || 0;
  const totalCommission = referralCodes?.reduce((sum, rc) => sum + Number(rc.total_commission), 0) || 0;
  const activeReferrers = referralCodes?.filter(rc => rc.is_active).length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground">Kelola program referral jamaah alumni</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Kode Referral
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeReferrers}</p>
                <p className="text-xs text-muted-foreground">Referrer Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Share2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Total Referral</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Rp {(totalCommission / 1000000).toFixed(1)}jt</p>
                <p className="text-xs text-muted-foreground">Total Komisi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{referralUsages?.filter(u => u.commission_status === 'pending').length || 0}</p>
                <p className="text-xs text-muted-foreground">Komisi Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Codes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Kode Referral</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari referrer atau kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-center">Referrals</TableHead>
                <TableHead className="text-right">Total Komisi</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes?.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rc.customer?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{rc.customer?.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {rc.code}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyCode(rc.code)}
                      >
                        {copiedCode === rc.code ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{rc.commission_rate}%</TableCell>
                  <TableCell className="text-center">{rc.total_referrals}</TableCell>
                  <TableCell className="text-right font-medium">
                    Rp {Number(rc.total_commission).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rc.is_active ? "default" : "secondary"}>
                      {rc.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Usages */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penggunaan Referral</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Jamaah Baru</TableHead>
                <TableHead className="text-right">Nilai Booking</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralUsages?.map((usage) => (
                <TableRow key={usage.id}>
                  <TableCell className="text-sm">
                    {format(new Date(usage.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{(usage.referral_code as any)?.customer?.full_name}</p>
                      <code className="text-xs text-muted-foreground">{(usage.referral_code as any)?.code}</code>
                    </div>
                  </TableCell>
                  <TableCell>{(usage.referred_customer as any)?.full_name}</TableCell>
                  <TableCell className="text-right">
                    Rp {Number(usage.booking_amount).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    Rp {Number(usage.commission_amount).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>{getStatusBadge(usage.commission_status)}</TableCell>
                  <TableCell className="text-right">
                    {usage.commission_status !== 'paid' && (
                      <Select
                        value={usage.commission_status}
                        onValueChange={(value) => updateCommissionStatus.mutate({ id: usage.id, status: value })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Kode Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pilih Jamaah Alumni</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jamaah..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCustomers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate Komisi (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Persentase dari nilai booking yang akan diberikan sebagai komisi
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={() => createReferralMutation.mutate()}
              disabled={!selectedCustomer || createReferralMutation.isPending}
            >
              Buat Kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
