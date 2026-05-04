import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { 
  Star, Gift, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight,
  ShoppingBag, Clock, CheckCircle, AlertCircle
} from 'lucide-react';

const TIER_CONFIG = {
  silver: { label: 'Silver', color: 'bg-gray-400', nextTier: 'Gold', pointsNeeded: 1000, icon: '🥈' },
  gold: { label: 'Gold', color: 'bg-yellow-500', nextTier: 'Platinum', pointsNeeded: 5000, icon: '🥇' },
  platinum: { label: 'Platinum', color: 'bg-purple-500', nextTier: null, pointsNeeded: null, icon: '👑' },
};

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  stock_quantity: number | null;
  is_active: boolean;
  image_url: string | null;
}

export default function MyLoyalty() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);

  // Fetch customer's loyalty points
  const { data: loyaltyData, isLoading: loadingPoints } = useQuery({
    queryKey: ['my-loyalty-points', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) return null;

      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('customer_id', customer.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return { 
        points: data, 
        customerId: customer.id 
      };
    },
    enabled: !!user,
  });

  // Fetch available rewards
  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['available-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('points_required');

      if (error) throw error;
      return data as LoyaltyReward[];
    },
  });

  // Fetch transaction history
  const { data: transactions = [] } = useQuery({
    queryKey: ['my-loyalty-transactions', loyaltyData?.customerId],
    queryFn: async () => {
      if (!loyaltyData?.customerId) return [];

      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('customer_id', loyaltyData.customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!loyaltyData?.customerId,
  });

  // Redeem mutation
  const redeemMutation = useMutation({
    mutationFn: async (reward: LoyaltyReward) => {
      if (!loyaltyData?.customerId) throw new Error('Customer not found');
      if (!loyaltyData.points) throw new Error('Loyalty data not found');
      
      if (loyaltyData.points.current_points < reward.points_required) {
        throw new Error('Poin tidak mencukupi');
      }

      // Insert redemption transaction
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          customer_id: loyaltyData.customerId,
          transaction_type: 'REDEEM',
          points_amount: reward.points_required,
          description: `Tukar reward: ${reward.name}`,
          reference_id: reward.id,
        });

      if (txError) throw txError;

      // Update loyalty points
      const newPoints = loyaltyData.points.current_points - reward.points_required;
      const newRedeemed = (loyaltyData.points.total_redeemed || 0) + reward.points_required;
      
      let newTier = loyaltyData.points.tier_level;
      if (newPoints >= 5000) newTier = 'platinum';
      else if (newPoints >= 1000) newTier = 'gold';
      else newTier = 'silver';

      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({
          current_points: newPoints,
          total_redeemed: newRedeemed,
          tier_level: newTier,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', loyaltyData.customerId);

      if (updateError) throw updateError;

      // Decrement stock
      const { error: stockError } = await supabase
        .from('loyalty_rewards')
        .update({ 
          stock_quantity: (reward.stock_quantity || 1) - 1 
        })
        .eq('id', reward.id);

      if (stockError) throw stockError;
    },
    onSuccess: () => {
      toast.success('Reward berhasil ditukar! Tim kami akan menghubungi Anda.');
      queryClient.invalidateQueries({ queryKey: ['my-loyalty-points'] });
      queryClient.invalidateQueries({ queryKey: ['my-loyalty-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['available-rewards'] });
      setRedeemDialogOpen(false);
      setSelectedReward(null);
    },
    onError: (error: Error) => {
      toast.error('Gagal menukar reward: ' + error.message);
    },
  });

  const handleRedeem = (reward: LoyaltyReward) => {
    setSelectedReward(reward);
    setRedeemDialogOpen(true);
  };

  const confirmRedeem = () => {
    if (selectedReward) {
      redeemMutation.mutate(selectedReward);
    }
  };

  if (!user) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Silakan Login</h1>
          <p className="text-muted-foreground mb-6">
            Login untuk melihat poin loyalitas Anda
          </p>
          <Button asChild>
            <Link to="/auth/login?redirect=/customer/my-loyalty">Login</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  const points = loyaltyData?.points;
  const currentTier = points?.tier_level || 'silver';
  const tierConfig = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG];
  const currentPoints = points?.current_points || 0;
  
  // Progress to next tier
  let tierProgress = 0;
  let pointsToNextTier = 0;
  if (currentTier === 'silver') {
    tierProgress = (currentPoints / 1000) * 100;
    pointsToNextTier = Math.max(0, 1000 - currentPoints);
  } else if (currentTier === 'gold') {
    tierProgress = ((currentPoints - 1000) / 4000) * 100;
    pointsToNextTier = Math.max(0, 5000 - currentPoints);
  } else {
    tierProgress = 100;
  }

  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Star className="h-8 w-8 text-primary" />
            Poin Loyalitas Saya
          </h1>
          <p className="text-muted-foreground">
            Kumpulkan poin dari setiap transaksi dan tukar dengan reward menarik
          </p>
        </div>

        {loadingPoints ? (
          <Skeleton className="h-48 mb-6" />
        ) : !points ? (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Poin</h3>
              <p className="text-muted-foreground mb-4">
                Mulai kumpulkan poin dengan melakukan booking umroh pertama Anda!
              </p>
              <p className="text-sm text-muted-foreground">
                Setiap Rp 100.000 pembayaran = 1 poin
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Points Overview Card */}
            <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Current Points */}
                  <div className="text-center md:text-left">
                    <p className="text-sm text-muted-foreground mb-1">Poin Anda</p>
                    <div className="flex items-baseline gap-2 justify-center md:justify-start">
                      <span className="text-4xl font-bold text-primary">
                        {currentPoints.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">poin</span>
                    </div>
                  </div>

                  {/* Tier Status */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Level Anda</p>
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-2xl">{tierConfig.icon}</span>
                      <Badge className={`${tierConfig.color} text-white text-lg px-3 py-1`}>
                        {tierConfig.label}
                      </Badge>
                    </div>
                    {tierConfig.nextTier && (
                      <div className="mt-3">
                        <Progress value={Math.min(100, tierProgress)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {pointsToNextTier} poin lagi ke {tierConfig.nextTier}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Dapat</p>
                      <p className="text-lg font-semibold text-green-600">
                        +{(points.total_earned || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Tukar</p>
                      <p className="text-lg font-semibold text-red-600">
                        -{(points.total_redeemed || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Tabs defaultValue="rewards" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rewards" className="gap-2">
              <Gift className="h-4 w-4" />
              Katalog Reward
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              Riwayat Poin
            </TabsTrigger>
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            {loadingRewards ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
              </div>
            ) : rewards.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada reward tersedia</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rewards.map(reward => {
                  const canRedeem = currentPoints >= reward.points_required;
                  
                  return (
                    <Card key={reward.id} className="overflow-hidden">
                      <div className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Gift className="h-16 w-16 text-primary/40" />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{reward.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {reward.description || 'Reward menarik untuk jamaah setia'}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" />
                            {reward.points_required.toLocaleString()} poin
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Stok: {reward.stock_quantity}
                          </span>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => handleRedeem(reward)}
                          disabled={!canRedeem}
                        >
                          {canRedeem ? (
                            <>
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Tukar Reward
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Poin Kurang ({(reward.points_required - currentPoints).toLocaleString()})
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Transaksi Poin</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada transaksi poin
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.transaction_type === 'EARN' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {tx.transaction_type === 'EARN' 
                              ? <ArrowUpRight className="h-5 w-5" />
                              : <ArrowDownRight className="h-5 w-5" />
                            }
                          </div>
                          <div>
                            <p className="font-medium">
                              {tx.transaction_type === 'EARN' ? 'Dapat Poin' : 
                               tx.transaction_type === 'REDEEM' ? 'Tukar Reward' : 'Hangus'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.description || '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-lg font-semibold ${
                          tx.transaction_type === 'EARN' ? 'text-primary' : 'text-destructive'
                        }`}>
                          {tx.transaction_type === 'EARN' ? '+' : '-'}{tx.points_amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Redeem Confirmation Dialog */}
        <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Tukar Reward</DialogTitle>
              <DialogDescription>
                Anda akan menukar poin dengan reward berikut
              </DialogDescription>
            </DialogHeader>
            
            {selectedReward && (
              <div className="py-4">
                <div className="p-4 bg-muted rounded-lg mb-4">
                  <h4 className="font-semibold text-lg">{selectedReward.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedReward.description}</p>
                </div>
                
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Poin yang dibutuhkan</p>
                    <p className="text-xl font-bold text-primary">
                      {selectedReward.points_required.toLocaleString()} poin
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Sisa poin setelah tukar</p>
                    <p className="text-xl font-bold">
                      {(currentPoints - selectedReward.points_required).toLocaleString()} poin
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={confirmRedeem} disabled={redeemMutation.isPending}>
                {redeemMutation.isPending ? 'Memproses...' : 'Konfirmasi Tukar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DynamicPublicLayout>
  );
}
