import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Star, Gift, Users, TrendingUp, Plus, Edit, 
  Trophy, ArrowUpRight, ArrowDownRight, Search
} from "lucide-react";

const TIER_LEVELS = [
  { value: 'silver', label: 'Silver', minPoints: 0, color: 'bg-gray-400' },
  { value: 'gold', label: 'Gold', minPoints: 1000, color: 'bg-yellow-500' },
  { value: 'platinum', label: 'Platinum', minPoints: 5000, color: 'bg-purple-500' },
];

interface LoyaltyPoint {
  id: string;
  customer_id: string;
  current_points: number;
  total_earned: number;
  total_redeemed: number;
  tier_level: string;
  customer?: { full_name: string; phone: string | null };
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  stock_quantity: number;
  is_active: boolean;
  image_url: string | null;
}

export default function AdminLoyalty() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyPoint | null>(null);
  const [rewardFormData, setRewardFormData] = useState({
    name: "",
    description: "",
    points_required: "",
    stock_quantity: "",
  });
  const [pointFormData, setPointFormData] = useState({
    transaction_type: "EARN",
    points_amount: "",
    description: "",
  });

  const { data: loyaltyPoints, isLoading: loadingPoints } = useQuery({
    queryKey: ['admin-loyalty-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select(`
          *,
          customer:customers(full_name, phone)
        `)
        .order('current_points', { ascending: false });
      if (error) throw error;
      return data as LoyaltyPoint[];
    },
  });

  const { data: rewards, isLoading: loadingRewards } = useQuery({
    queryKey: ['admin-loyalty-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .order('points_required');
      if (error) throw error;
      return data as LoyaltyReward[];
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-loyalty-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select(`
          *,
          customer:customers(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const saveRewardMutation = useMutation({
    mutationFn: async (data: typeof rewardFormData & { id?: string }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        points_required: parseInt(data.points_required),
        stock_quantity: parseInt(data.stock_quantity) || 0,
      };
      
      if (data.id) {
        const { error } = await supabase
          .from('loyalty_rewards')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loyalty_rewards')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-rewards'] });
      toast.success('Reward berhasil disimpan');
      setRewardDialogOpen(false);
      setEditingReward(null);
    },
    onError: (error: any) => {
      toast.error('Gagal menyimpan reward: ' + error.message);
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: async ({ customerId, ...data }: typeof pointFormData & { customerId: string }) => {
      const points = parseInt(data.points_amount);
      const multiplier = data.transaction_type === 'EARN' ? 1 : -1;
      
      // Insert transaction
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          customer_id: customerId,
          transaction_type: data.transaction_type,
          points_amount: points,
          description: data.description,
        });
      if (txError) throw txError;

      // Update loyalty points
      const { data: currentPoints } = await supabase
        .from('loyalty_points')
        .select('current_points, total_earned, total_redeemed')
        .eq('customer_id', customerId)
        .single();
      
      const newCurrentPoints = (currentPoints?.current_points || 0) + (points * multiplier);
      const updates: any = { 
        current_points: Math.max(0, newCurrentPoints),
        updated_at: new Date().toISOString(),
      };
      
      if (data.transaction_type === 'EARN') {
        updates.total_earned = (currentPoints?.total_earned || 0) + points;
      } else if (data.transaction_type === 'REDEEM') {
        updates.total_redeemed = (currentPoints?.total_redeemed || 0) + points;
      }

      // Update tier level
      if (newCurrentPoints >= 5000) updates.tier_level = 'platinum';
      else if (newCurrentPoints >= 1000) updates.tier_level = 'gold';
      else updates.tier_level = 'silver';

      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update(updates)
        .eq('customer_id', customerId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['recent-loyalty-transactions'] });
      toast.success('Poin berhasil disesuaikan');
      setPointDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast.error('Gagal menyesuaikan poin: ' + error.message);
    },
  });

  const handleOpenRewardDialog = (reward?: LoyaltyReward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardFormData({
        name: reward.name,
        description: reward.description || "",
        points_required: reward.points_required.toString(),
        stock_quantity: reward.stock_quantity.toString(),
      });
    } else {
      setEditingReward(null);
      setRewardFormData({ name: "", description: "", points_required: "", stock_quantity: "" });
    }
    setRewardDialogOpen(true);
  };

  const handleOpenPointDialog = (lp: LoyaltyPoint) => {
    setSelectedCustomer(lp);
    setPointFormData({ transaction_type: "EARN", points_amount: "", description: "" });
    setPointDialogOpen(true);
  };

  const filteredPoints = loyaltyPoints?.filter(lp =>
    (lp.customer as any)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoints = loyaltyPoints?.reduce((sum, lp) => sum + lp.current_points, 0) || 0;
  const totalMembers = loyaltyPoints?.length || 0;
  const goldPlusMembers = loyaltyPoints?.filter(lp => lp.tier_level !== 'silver').length || 0;

  const getTierBadge = (tier: string) => {
    const t = TIER_LEVELS.find(tl => tl.value === tier);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs text-white ${t?.color || 'bg-gray-400'}`}>
        <Trophy className="h-3 w-3 mr-1" />
        {t?.label || tier}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loyalty Program</h1>
        <p className="text-muted-foreground">Kelola poin ibadah dan reward jamaah</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Poin Beredar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">Total Member</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{goldPlusMembers}</p>
                <p className="text-xs text-muted-foreground">Gold & Platinum</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Gift className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rewards?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Reward Tersedia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Member & Poin</TabsTrigger>
          <TabsTrigger value="rewards">Katalog Reward</TabsTrigger>
          <TabsTrigger value="transactions">Riwayat Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daftar Member</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari member..."
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
                    <TableHead>Member</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Poin Saat Ini</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="text-right">Total Redeemed</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPoints?.map((lp) => (
                    <TableRow key={lp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{(lp.customer as any)?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{(lp.customer as any)?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTierBadge(lp.tier_level)}</TableCell>
                      <TableCell className="text-right font-bold">{lp.current_points.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">+{lp.total_earned.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">-{lp.total_redeemed.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleOpenPointDialog(lp)}>
                          Adjust Poin
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Katalog Reward</CardTitle>
                <Button onClick={() => handleOpenRewardDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Reward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rewards?.map((reward) => (
                  <Card key={reward.id} className="overflow-hidden">
                    <div className="h-32 bg-muted flex items-center justify-center">
                      <Gift className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{reward.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{reward.description}</p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleOpenRewardDialog(reward)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />
                          {reward.points_required.toLocaleString()} poin
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Stok: {reward.stock_quantity}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Transaksi Poin</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Poin</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions?.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{tx.customer?.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={tx.transaction_type === 'EARN' ? 'default' : 'secondary'}>
                          {tx.transaction_type === 'EARN' ? 'Dapat' : tx.transaction_type === 'REDEEM' ? 'Tukar' : 'Hangus'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.transaction_type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'EARN' ? '+' : '-'}{tx.points_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reward Dialog */}
      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Edit Reward' : 'Tambah Reward Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            saveRewardMutation.mutate({
              ...rewardFormData,
              ...(editingReward && { id: editingReward.id }),
            });
          }}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama Reward *</Label>
                <Input
                  value={rewardFormData.name}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={rewardFormData.description}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Poin Dibutuhkan *</Label>
                  <Input
                    type="number"
                    value={rewardFormData.points_required}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, points_required: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stok</Label>
                  <Input
                    type="number"
                    value={rewardFormData.stock_quantity}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, stock_quantity: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRewardDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveRewardMutation.isPending}>
                {saveRewardMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Point Adjustment Dialog */}
      <Dialog open={pointDialogOpen} onOpenChange={setPointDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan Poin</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedCustomer) {
              adjustPointsMutation.mutate({
                customerId: selectedCustomer.customer_id,
                ...pointFormData,
              });
            }
          }}>
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{(selectedCustomer?.customer as any)?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Poin saat ini: <span className="font-bold">{selectedCustomer?.current_points.toLocaleString()}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tipe Transaksi *</Label>
                <Select 
                  value={pointFormData.transaction_type} 
                  onValueChange={(v) => setPointFormData({ ...pointFormData, transaction_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EARN">Tambah Poin (EARN)</SelectItem>
                    <SelectItem value="REDEEM">Kurangi Poin (REDEEM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jumlah Poin *</Label>
                <Input
                  type="number"
                  value={pointFormData.points_amount}
                  onChange={(e) => setPointFormData({ ...pointFormData, points_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Keterangan *</Label>
                <Input
                  value={pointFormData.description}
                  onChange={(e) => setPointFormData({ ...pointFormData, description: e.target.value })}
                  placeholder="Contoh: Bonus booking UMR-001"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPointDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={adjustPointsMutation.isPending}>
                {adjustPointsMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
