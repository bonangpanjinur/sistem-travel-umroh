import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Wallet, CheckCircle2, XCircle, Clock, Search, Eye, Loader2, TrendingDown } from "lucide-react";

type WithdrawalStatus = 'pending' | 'approved' | 'processed' | 'rejected';

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Menunggu', variant: 'secondary' },
    approved: { label: 'Disetujui', variant: 'default' },
    processed: { label: 'Selesai', variant: 'outline' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
  };
  const c = cfg[status] || { label: status, variant: 'secondary' as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function AdminWithdrawalManagement() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<WithdrawalStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-withdrawal-requests', tab],
    queryFn: async () => {
      let query = (supabase as any)
        .from('withdrawal_requests')
        .select(`
          *,
          agents(
            id, full_name, email, bank_name, bank_account_number, bank_account_name,
            agent_wallets(balance)
          )
        `)
        .order('created_at', { ascending: false });
      if (tab !== 'all') query = query.eq('status', tab);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const req = requests.find((r: any) => r.id === requestId);
      if (!req) throw new Error('Request tidak ditemukan');
      const agentId = req.agent_id;
      const amount = Number(req.amount);

      const { data: wallet, error: walletErr } = await (supabase as any)
        .from('agent_wallets')
        .select('id, balance')
        .eq('agent_id', agentId)
        .single();
      if (walletErr) throw walletErr;
      if (Number(wallet.balance) < amount) throw new Error('Saldo agen tidak mencukupi');

      const { error: updateWalletErr } = await (supabase as any)
        .from('agent_wallets')
        .update({ balance: Number(wallet.balance) - amount, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);
      if (updateWalletErr) throw updateWalletErr;

      const { error: txnErr } = await (supabase as any)
        .from('agent_wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          transaction_type: 'DEBIT',
          description: `Withdrawal disetujui — ID ${requestId.slice(0, 8)}`,
          reference_id: requestId,
        });
      if (txnErr) throw txnErr;

      const { error: statusErr } = await (supabase as any)
        .from('withdrawal_requests')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (statusErr) throw statusErr;
    },
    onSuccess: () => {
      toast.success('Withdrawal disetujui & saldo agen dipotong otomatis');
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-requests'] });
      setIsDetailOpen(false);
    },
    onError: (e: any) => toast.error('Gagal: ' + e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await (supabase as any)
        .from('withdrawal_requests')
        .update({ status: 'rejected', rejection_reason: reason, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Withdrawal ditolak');
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-requests'] });
      setIsRejectDialogOpen(false);
      setIsDetailOpen(false);
      setRejectReason('');
    },
    onError: (e: any) => toast.error('Gagal: ' + e.message),
  });

  const filtered = requests.filter((r: any) => {
    const name = r.agents?.full_name?.toLowerCase() || '';
    const bank = r.agents?.bank_name?.toLowerCase() || '';
    const q = search.toLowerCase();
    return name.includes(q) || bank.includes(q);
  });

  const pending = requests.filter((r: any) => r.status === 'pending');
  const totalPending = pending.reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Withdrawal Agen</h1>
        <p className="text-muted-foreground">Setujui atau tolak permintaan penarikan saldo agen</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-500/10">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Menunggu Persetujuan</p>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-muted-foreground">{formatRp(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Selesai Diproses</p>
              <p className="text-2xl font-bold">
                {requests.filter((r: any) => r.status === 'processed').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ditolak</p>
              <p className="text-2xl font-bold">
                {requests.filter((r: any) => r.status === 'rejected').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Permintaan Withdrawal
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama agen..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="pending">
                Menunggu {pending.length > 0 && <Badge className="ml-2 h-5 px-1.5 text-xs">{pending.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="processed">Selesai</TabsTrigger>
              <TabsTrigger value="rejected">Ditolak</TabsTrigger>
              <TabsTrigger value="all">Semua</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Tidak ada permintaan withdrawal</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agen</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{req.agents?.full_name || '-'}</p>
                            <p className="text-xs text-muted-foreground">{req.agents?.email || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatRp(Number(req.amount))}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{req.agents?.bank_name || req.bank_details?.bank_name || '-'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {req.agents?.bank_account_number || req.bank_details?.account_number || '-'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedRequest(req); setIsDetailOpen(true); }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                            {req.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => approveMutation.mutate(req.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                  )}
                                  Setujui
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => { setSelectedRequest(req); setIsRejectDialogOpen(true); }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Tolak
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Withdrawal</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Nama Agen</Label>
                  <p className="font-medium">{selectedRequest.agents?.full_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Jumlah</Label>
                  <p className="font-semibold text-lg">{formatRp(Number(selectedRequest.amount))}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Bank</Label>
                  <p>{selectedRequest.agents?.bank_name || selectedRequest.bank_details?.bank_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">No. Rekening</Label>
                  <p className="font-mono">{selectedRequest.agents?.bank_account_number || selectedRequest.bank_details?.account_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Atas Nama</Label>
                  <p>{selectedRequest.agents?.bank_account_name || selectedRequest.bank_details?.account_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Saldo Wallet</Label>
                  <p>{formatRp(Number(selectedRequest.agents?.agent_wallets?.[0]?.balance ?? 0))}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedRequest.status} /></div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tanggal Permintaan</Label>
                  <p>{format(new Date(selectedRequest.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}</p>
                </div>
                {selectedRequest.rejection_reason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Alasan Penolakan</Label>
                    <p className="text-destructive">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Setujui & Proses Otomatis
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setIsRejectDialogOpen(true); }}
                >
                  Tolak
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anda akan menolak withdrawal sebesar{' '}
              <strong>{selectedRequest ? formatRp(Number(selectedRequest.amount)) : '-'}</strong>{' '}
              dari <strong>{selectedRequest?.agents?.full_name || '-'}</strong>.
            </p>
            <div>
              <Label>Alasan Penolakan</Label>
              <Textarea
                placeholder="Tulis alasan penolakan..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konfirmasi Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
