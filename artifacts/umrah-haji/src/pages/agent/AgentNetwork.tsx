import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId } from "@/hooks/useAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Users, Network, TrendingUp, DollarSign, UserCheck, UserX, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SubAgent {
  id: string;
  agent_code: string;
  company_name: string | null;
  commission_rate: number | null;
  is_active: boolean | null;
  created_at: string | null;
  slug: string | null;
  profile?: { full_name: string | null; phone: string | null };
  bookingCount?: number;
  totalRevenue?: number;
  totalCommission?: number;
}

export default function AgentNetwork() {
  const { user } = useAuth();
  const { data: agentData, isLoading: loadingAgent } = useAgentByUserId(user?.id);

  // Ambil daftar sub agen
  const { data: subAgents, isLoading: loadingSubAgents } = useQuery({
    queryKey: ['agent-sub-agents', agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, agent_code, company_name, commission_rate, is_active, created_at, slug, user_id')
        .eq('parent_agent_id', agentData!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Ambil profil
      const userIds = data.map(a => a.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      // Ambil statistik booking per sub agen
      const agentIds = data.map(a => a.id);
      const { data: bookings } = await supabase
        .from('bookings')
        .select('agent_id, total_price, booking_status')
        .in('agent_id', agentIds);

      const { data: commissions } = await supabase
        .from('agent_commissions')
        .select('agent_id, commission_amount, status')
        .in('agent_id', agentIds);

      return data.map(agent => {
        const agentBookings = bookings?.filter(b => b.agent_id === agent.id) || [];
        const agentCommissions = commissions?.filter(c => c.agent_id === agent.id) || [];
        return {
          ...agent,
          profile: profiles?.find(p => p.user_id === agent.user_id),
          bookingCount: agentBookings.length,
          totalRevenue: agentBookings.reduce((sum, b) => sum + Number(b.total_price), 0),
          totalCommission: agentCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0),
        } as SubAgent;
      });
    },
  });

  // Komisi royalti dari sub agen
  const { data: royaltyCommissions } = useQuery({
    queryKey: ['agent-royalty-commissions', agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select('commission_amount, status, notes, created_at')
        .eq('agent_id', agentData!.id)
        .ilike('notes', '%Royalti Sub Agen%')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingAgent || loadingSubAgents;

  const stats = {
    total: subAgents?.length || 0,
    active: subAgents?.filter(a => a.is_active).length || 0,
    totalBookings: subAgents?.reduce((sum, a) => sum + (a.bookingCount || 0), 0) || 0,
    totalRevenue: subAgents?.reduce((sum, a) => sum + (a.totalRevenue || 0), 0) || 0,
    totalRoyalti: royaltyCommissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    pendingRoyalti: royaltyCommissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    paidRoyalti: royaltyCommissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
  };

  const handleCopyReferral = () => {
    if (!agentData?.agent_code) return;
    const text = `Bergabunglah sebagai Sub Agen Vinstour Travel. Kode Agen Sponsor Anda: ${agentData.agent_code}. Hubungi kantor untuk mendaftar.`;
    navigator.clipboard.writeText(text).then(() => toast.success('Teks undangan disalin!'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Jaringan Sub Agen
          </h1>
          <p className="text-muted-foreground">Pantau performa sub agen di bawah Anda</p>
        </div>
        {agentData && (
          <div className="flex items-center gap-2">
            <div className="text-sm bg-muted px-3 py-1.5 rounded-lg font-mono">
              Kode Anda: <span className="font-bold text-primary">{agentData.agent_code}</span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyReferral}>
              <Copy className="h-3.5 w-3.5" />
              Salin Undangan
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sub Agen</p>
                {isLoading ? <Skeleton className="h-7 w-12 mt-0.5" /> : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
                <p className="text-xs text-green-600 font-medium">{stats.active} aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Booking Sub Agen</p>
                {isLoading ? <Skeleton className="h-7 w-12 mt-0.5" /> : (
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Royalti Pending</p>
                {isLoading ? <Skeleton className="h-7 w-20 mt-0.5" /> : (
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.pendingRoyalti)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Royalti Dibayar</p>
                {isLoading ? <Skeleton className="h-7 w-20 mt-0.5" /> : (
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.paidRoyalti)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub Agents Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Sub Agen Saya</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !subAgents || subAgents.length === 0 ? (
            <div className="text-center py-12">
              <Network className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-muted-foreground">Belum ada sub agen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bagikan kode agen Anda kepada calon mitra untuk bergabung sebagai sub agen.
              </p>
              <Button variant="outline" className="mt-4 gap-2" onClick={handleCopyReferral}>
                <Copy className="h-4 w-4" />
                Salin Teks Undangan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama / Perusahaan</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-center">Booking</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Komisinya</TableHead>
                    <TableHead>Bergabung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subAgents.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-mono font-semibold text-primary">
                        {agent.agent_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{agent.profile?.full_name || '-'}</p>
                          {agent.company_name && (
                            <p className="text-xs text-muted-foreground">{agent.company_name}</p>
                          )}
                          {agent.profile?.phone && (
                            <p className="text-xs text-muted-foreground">{agent.profile.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {agent.is_active ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <UserCheck className="h-3 w-3" />Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <UserX className="h-3 w-3" />Non-aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{agent.commission_rate || 0}%</span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {agent.bookingCount || 0}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(agent.totalRevenue || 0)}
                      </TableCell>
                      <TableCell className="text-right text-primary font-semibold">
                        {formatCurrency(agent.totalCommission || 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {agent.created_at ? format(new Date(agent.created_at), 'd MMM yyyy', { locale: localeId }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Royalty Commission History */}
      {royaltyCommissions && royaltyCommissions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Riwayat Royalti Sub Agen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {royaltyCommissions.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.created_at ? format(new Date(c.created_at), 'd MMM yyyy', { locale: localeId }) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{c.notes || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(Number(c.commission_amount))}
                    </TableCell>
                    <TableCell>
                      {c.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-800">Dibayar</Badge>
                      ) : c.status === 'approved' ? (
                        <Badge className="bg-blue-100 text-blue-800">Disetujui</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
