import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Send, 
  Clock, CheckCircle2, XCircle, CreditCard
} from "lucide-react";

export default function AgentWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Get agent data
  const { data: agent } = useQuery({
    queryKey: ['agent-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get wallet data
  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['agent-wallet', agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_wallets')
        .select('*')
        .eq('agent_id', agent?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.id,
  });

  // Get wallet transactions
  const { data: transactions } = useQuery({
    queryKey: ['agent-wallet-transactions', wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  // Get withdrawal requests
  const { data: withdrawals } = useQuery({
    queryKey: ['agent-withdrawals', agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('agent_id', agent?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.id,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!agent) throw new Error('Agent not found');
      if (!wallet || wallet.balance < amount) throw new Error('Saldo tidak mencukupi');
      
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          agent_id: agent.id,
          amount,
          bank_details: {
            bank_name: agent.bank_name,
            account_number: agent.bank_account_number,
            account_name: agent.bank_account_name,
          },
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-withdrawals'] });
      toast.success('Permintaan penarikan berhasil diajukan');
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
    },
    onError: (error: any) => {
      toast.error('Gagal mengajukan penarikan: ' + error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      approved: { label: 'Disetujui', variant: 'default' },
      processed: { label: 'Selesai', variant: 'outline' },
      rejected: { label: 'Ditolak', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalIn = transactions?.filter(t => t.transaction_type === 'CREDIT')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalOut = transactions?.filter(t => t.transaction_type === 'DEBIT')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dompet Digital</h1>
        <p className="text-muted-foreground">Kelola saldo komisi dan penarikan dana</p>
      </div>

      {/* Wallet Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Saldo Tersedia</p>
                <p className="text-3xl font-bold mt-1">
                  {loadingWallet ? '...' : formatCurrency(wallet?.balance || 0)}
                </p>
                {pendingWithdrawals > 0 && (
                  <p className="text-sm opacity-75 mt-2">
                    Pending withdrawal: {formatCurrency(pendingWithdrawals)}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-full bg-white/20">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
            <Button 
              className="mt-4 bg-white text-primary hover:bg-white/90"
              onClick={() => setWithdrawDialogOpen(true)}
              disabled={!wallet || wallet.balance <= 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Tarik Dana
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <ArrowDownRight className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Masuk</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalIn)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10">
                <ArrowUpRight className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Keluar</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalOut)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Info */}
      {agent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Rekening Penarikan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Bank</p>
                <p className="font-medium">{agent.bank_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nomor Rekening</p>
                <p className="font-medium">{agent.bank_account_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atas Nama</p>
                <p className="font-medium">{agent.bank_account_name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Riwayat Transaksi</TabsTrigger>
          <TabsTrigger value="withdrawals">Permintaan Penarikan</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada transaksi
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.category || 'Lainnya'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tx.description || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                            {tx.status === 'completed' ? 'Selesai' : tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal Request</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Diproses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada permintaan penarikan
                      </TableCell>
                    </TableRow>
                  ) : (
                    withdrawals?.map((wd) => (
                      <TableRow key={wd.id}>
                        <TableCell className="text-sm">
                          {format(new Date(wd.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(Number(wd.amount))}</TableCell>
                        <TableCell className="text-sm">
                          {(wd.bank_details as any)?.bank_name} - {(wd.bank_details as any)?.account_number}
                        </TableCell>
                        <TableCell>{getStatusBadge(wd.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {wd.processed_at 
                            ? format(new Date(wd.processed_at), "dd MMM yyyy")
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarik Dana</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const amount = parseFloat(withdrawAmount);
            if (amount > 0) {
              withdrawMutation.mutate(amount);
            }
          }}>
            <div className="grid gap-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Saldo Tersedia</p>
                <p className="text-2xl font-bold">{formatCurrency(wallet?.balance || 0)}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Jumlah Penarikan *</Label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Masukkan jumlah"
                  min={10000}
                  max={wallet?.balance || 0}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum penarikan Rp 10.000</p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Dana akan ditransfer ke rekening: <br />
                  <strong>{agent?.bank_name} - {agent?.bank_account_number}</strong> <br />
                  a.n. {agent?.bank_account_name}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={withdrawMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
              >
                {withdrawMutation.isPending ? 'Memproses...' : 'Ajukan Penarikan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
