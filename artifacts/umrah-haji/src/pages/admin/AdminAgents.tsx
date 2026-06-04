import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import {
  Search, Users, CheckCircle, Clock, XCircle,
  DollarSign, Eye, Check, X, Edit2, Percent,
  Plus, ChevronRight, UserPlus, Network
} from "lucide-react";
import AddAgentDialog from "@/components/admin/AddAgentDialog";

interface AgentProfile {
  full_name: string | null;
  phone: string | null;
}

interface Agent {
  id: string;
  user_id: string;
  agent_code: string;
  company_name: string | null;
  commission_rate: number | null;
  is_active: boolean | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  npwp: string | null;
  slug: string | null;
  created_at: string | null;
  branch_id: string | null;
  parent_agent_id: string | null;
  updated_at: string | null;
  profile?: AgentProfile;
  sub_agents?: Agent[];
}

interface CommissionAgent {
  agent_code: string;
  company_name: string | null;
  id: string;
}

interface CommissionBooking {
  booking_code: string;
  total_price: number;
  id: string;
}

interface Commission {
  id: string;
  agent_id: string;
  booking_id: string;
  commission_amount: number;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
  notes: string | null;
  agent?: CommissionAgent;
  booking?: CommissionBooking;
}

export default function AdminAgents() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("agents");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [agentToToggle, setAgentToToggle] = useState<Agent | null>(null);
  const [editingRate, setEditingRate] = useState<{ agentId: string; rate: string } | null>(null);
  const [editingSlug, setEditingSlug] = useState<{ agentId: string; slug: string } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSubAgentParent, setAddSubAgentParent] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  // Fetch agents
  const { data: allAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = (data || []).map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);

      return (data || []).map(agent => ({
        ...agent,
        profile: profiles?.find(p => p.user_id === agent.user_id),
      })) as Agent[];
    },
  });

  // Build hierarchy: top-level agents with nested sub_agents
  const agents = allAgents ? (() => {
    const topLevel = allAgents.filter(a => !a.parent_agent_id);
    return topLevel.map(agent => ({
      ...agent,
      sub_agents: allAgents.filter(sa => sa.parent_agent_id === agent.id),
    }));
  })() : undefined;

  const toggleExpand = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  // Fetch commissions
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['admin-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select(`
          id,
          agent_id,
          booking_id,
          commission_amount,
          status,
          created_at,
          paid_at,
          notes
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch agent and booking details
      const agentIds = [...new Set((data || []).map(c => c.agent_id))];
      const bookingIds = [...new Set((data || []).map(c => c.booking_id))];

      const [agentsRes, bookingsRes] = await Promise.all([
        supabase.from('agents').select('id, agent_code, company_name').in('id', agentIds),
        supabase.from('bookings').select('id, booking_code, total_price').in('id', bookingIds),
      ]);

      return (data || []).map(commission => ({
        ...commission,
        agent: agentsRes.data?.find(a => a.id === commission.agent_id),
        booking: bookingsRes.data?.find(b => b.id === commission.booking_id),
      })) as Commission[];
    },
  });

  // Toggle agent status
  const toggleAgentMutation = useMutation({
    mutationFn: async ({ agentId, isActive }: { agentId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: isActive })
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success(agentToToggle?.is_active ? "Agent dinonaktifkan" : "Agent diaktifkan");
      setAgentToToggle(null);
    },
    onError: (error) => {
      toast.error("Gagal mengubah status: " + error.message);
    },
  });

  // Update commission rate
  const updateRateMutation = useMutation({
    mutationFn: async ({ agentId, rate }: { agentId: string; rate: number }) => {
      const { error } = await supabase
        .from('agents')
        .update({ commission_rate: rate })
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Rate komisi berhasil diupdate");
      setEditingRate(null);
    },
    onError: (error) => {
      toast.error("Gagal update rate: " + error.message);
    },
  });

  // Update agent slug with uniqueness check
  const updateSlugMutation = useMutation({
    mutationFn: async ({ agentId, slug }: { agentId: string; slug: string }) => {
      const slugValue = slug.trim() || null;
      if (slugValue && !/^[a-z0-9-]+$/.test(slugValue)) {
        throw new Error("Slug hanya boleh huruf kecil, angka, dan strip (-)");
      }
      // Check uniqueness across both agents and branches
      if (slugValue) {
        const [{ data: existingAgent }, { data: existingBranch }] = await Promise.all([
          supabase.from('agents').select('id').eq('slug', slugValue).neq('id', agentId).maybeSingle(),
          supabase.from('branches').select('id').eq('slug', slugValue).maybeSingle(),
        ]);
        if (existingAgent || existingBranch) {
          throw new Error("Subdomain sudah digunakan, pilih yang lain");
        }
      }
      const { error } = await supabase
        .from('agents')
        .update({ slug: slugValue })
        .eq('id', agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success("Subdomain berhasil diupdate");
      setEditingSlug(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Approve commission (pending → approved)
  const approveCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const { error } = await supabase
        .from('agent_commissions')
        .update({ status: 'approved' })
        .eq('id', commissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
      toast.success("Komisi disetujui");
      setShowCommissionDialog(false);
      setSelectedCommission(null);
    },
    onError: (error) => {
      toast.error("Gagal menyetujui komisi: " + error.message);
    },
  });

  // Pay commission (approved → paid)
  const payCommissionMutation = useMutation({
    mutationFn: async (commissionId: string) => {
      const { error } = await supabase
        .from('agent_commissions')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', commissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commissions'] });
      toast.success("Komisi berhasil dibayar");
      setShowCommissionDialog(false);
      setSelectedCommission(null);
    },
    onError: (error) => {
      toast.error("Gagal membayar komisi: " + error.message);
    },
  });

  const filteredAgents = agents?.filter(agent => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const matchAgent = (a: Agent) =>
      a.agent_code?.toLowerCase().includes(search) ||
      a.company_name?.toLowerCase().includes(search) ||
      a.profile?.full_name?.toLowerCase().includes(search) ||
      a.profile?.phone?.includes(search);
    return matchAgent(agent) || agent.sub_agents?.some(matchAgent);
  });

  const filteredCommissions = commissions?.filter(commission => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      commission.agent?.agent_code?.toLowerCase().includes(search) ||
      commission.agent?.company_name?.toLowerCase().includes(search) ||
      commission.booking?.booking_code?.toLowerCase().includes(search)
    );
  });

  const stats = {
    totalAgents: allAgents?.length || 0,
    activeAgents: allAgents?.filter(a => a.is_active).length || 0,
    subAgentCount: allAgents?.filter(a => a.parent_agent_id).length || 0,
    pendingCommissions: commissions?.filter(c => c.status === 'pending').length || 0,
    totalPendingAmount: commissions?.filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Agent</h1>
          <p className="text-muted-foreground">Kelola agent, sub-agent, dan komisi</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari agent, kode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Agent
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Agent</p>
                <p className="text-2xl font-bold">{stats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agent Aktif</p>
                <p className="text-2xl font-bold">{stats.activeAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Komisi Pending</p>
                <p className="text-2xl font-bold">{stats.pendingCommissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalPendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents">Daftar Agent</TabsTrigger>
          <TabsTrigger value="commissions">Komisi</TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Agent</CardTitle>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !filteredAgents || filteredAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Tidak ada agent yang cocok.' : 'Belum ada data agent.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Perusahaan</TableHead>
                        <TableHead>Rate Komisi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bergabung</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => {
                        const hasSubAgents = agent.sub_agents && agent.sub_agents.length > 0;
                        const isExpanded = expandedAgents.has(agent.id);

                        const renderAgentRow = (a: Agent, isSub = false) => (
                          <TableRow key={a.id} className={isSub ? "bg-muted/30" : ""}>
                            <TableCell className="font-mono font-semibold">
                              <div className="flex items-center gap-2">
                                {!isSub && hasSubAgents && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpand(agent.id)}>
                                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  </Button>
                                )}
                                {isSub && <span className="ml-8 text-muted-foreground">└</span>}
                                {a.agent_code}
                                {isSub && <Badge variant="secondary" className="text-xs">Sub</Badge>}
                                {!isSub && hasSubAgents && (
                                  <Badge variant="outline" className="text-xs">
                                    <Network className="h-3 w-3 mr-1" />
                                    {agent.sub_agents!.length}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{a.profile?.full_name || '-'}</TableCell>
                            <TableCell>{a.company_name || '-'}</TableCell>
                            <TableCell>
                              {editingRate?.agentId === a.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editingRate.rate}
                                    onChange={(e) => setEditingRate({ ...editingRate, rate: e.target.value })}
                                    className="w-20 h-8"
                                    min="0"
                                    max="100"
                                  />
                                  <span>%</span>
                                  <Button size="sm" variant="ghost" onClick={() => updateRateMutation.mutate({ agentId: a.id, rate: parseFloat(editingRate.rate) || 0 })}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingRate(null)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    <Percent className="h-3 w-3 mr-1" />
                                    {a.commission_rate || 0}%
                                  </Badge>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingRate({ agentId: a.id, rate: String(a.commission_rate || 0) })}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.is_active ? "default" : "secondary"}>
                                {a.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(a.created_at!), 'd MMM yyyy', { locale: id })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isSub && (
                                  <Button variant="outline" size="sm" title="Tambah Sub-Agent" onClick={() => { setAddSubAgentParent(a.id); setShowAddDialog(true); }}>
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => { setSelectedAgent(a); setShowDetailDialog(true); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant={a.is_active ? "destructive" : "default"} size="sm" onClick={() => setAgentToToggle(a)}>
                                  {a.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );

                        return (
                          <React.Fragment key={agent.id}>
                            {renderAgentRow(agent)}
                            {isExpanded && agent.sub_agents?.map(sub => renderAgentRow(sub, true))}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Komisi</CardTitle>
            </CardHeader>
            <CardContent>
              {commissionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !filteredCommissions || filteredCommissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Tidak ada komisi yang cocok.' : 'Belum ada data komisi.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCommissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{commission.agent?.agent_code}</p>
                              <p className="text-sm text-muted-foreground">{commission.agent?.company_name || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-mono">{commission.booking?.booking_code}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(commission.booking?.total_price || 0)}
                            </p>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(commission.commission_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              commission.status === 'paid'
                                ? "bg-green-100 text-green-800"
                                : commission.status === 'approved'
                                  ? "bg-blue-100 text-blue-800"
                                  : commission.status === 'pending'
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-gray-100 text-gray-800"
                            }>
                              {commission.status === 'paid' ? 'Dibayar' : commission.status === 'approved' ? 'Disetujui' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(commission.created_at!), 'd MMM yyyy', { locale: id })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {commission.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCommission(commission);
                                    setShowCommissionDialog(true);
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Setujui
                                </Button>
                              )}
                              {commission.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => payCommissionMutation.mutate(commission.id)}
                                  disabled={payCommissionMutation.isPending}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Bayar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Agent</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kode Agent</p>
                  <p className="font-semibold">{selectedAgent.agent_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={selectedAgent.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {selectedAgent.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-semibold">{selectedAgent.profile?.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telepon</p>
                <p className="font-semibold">{selectedAgent.profile?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perusahaan</p>
                <p className="font-semibold">{selectedAgent.company_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NPWP</p>
                <p className="font-semibold">{selectedAgent.npwp || '-'}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Subdomain Website</p>
                {editingSlug?.agentId === selectedAgent.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingSlug.slug}
                        onChange={(e) => setEditingSlug({ ...editingSlug, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="nama-agen"
                        className="h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={() => updateSlugMutation.mutate({ agentId: selectedAgent.id, slug: editingSlug.slug })} disabled={updateSlugMutation.isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSlug(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {editingSlug.slug && (
                      <p className="text-xs text-muted-foreground">
                        URL: <span className="font-mono text-primary">{window.location.origin}/a/{editingSlug.slug}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{selectedAgent.slug || <span className="text-muted-foreground">Belum diatur</span>}</p>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSlug({ agentId: selectedAgent.id, slug: selectedAgent.slug || '' })}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {selectedAgent.slug && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-mono">{window.location.origin}/a/{selectedAgent.slug}</span>
                  </p>
                )}
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Info Rekening</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bank</p>
                    <p className="font-medium">{selectedAgent.bank_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">No. Rekening</p>
                    <p className="font-medium">{selectedAgent.bank_account_number || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Nama Rekening</p>
                    <p className="font-medium">{selectedAgent.bank_account_name || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Commission Dialog */}
      <AlertDialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Komisi?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menyetujui komisi sebesar{' '}
              <strong>{formatCurrency(selectedCommission?.commission_amount || 0)}</strong>{' '}
              untuk agent <strong>{selectedCommission?.agent?.agent_code}</strong>.
              Setelah disetujui, status berubah menjadi <em>Disetujui</em> dan dapat dibayarkan.
              {selectedCommission?.notes && (
                <span className="block mt-2 text-xs text-muted-foreground italic">{selectedCommission.notes}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCommission && approveCommissionMutation.mutate(selectedCommission.id)}
            >
              {approveCommissionMutation.isPending ? "Memproses..." : "Setujui Komisi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Agent Status Confirmation */}
      <AlertDialog open={!!agentToToggle} onOpenChange={() => setAgentToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {agentToToggle?.is_active ? 'Nonaktifkan Agent?' : 'Aktifkan Agent?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {agentToToggle?.is_active
                ? `Agent ${agentToToggle?.agent_code} tidak akan bisa mengakses fitur agent.`
                : `Agent ${agentToToggle?.agent_code} akan bisa mengakses fitur agent kembali.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => agentToToggle && toggleAgentMutation.mutate({
                agentId: agentToToggle.id,
                isActive: !agentToToggle.is_active
              })}
              className={agentToToggle?.is_active ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {toggleAgentMutation.isPending ? "Memproses..." : "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Agent Dialog */}
      <AddAgentDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setAddSubAgentParent(null);
        }}
        parentAgentId={addSubAgentParent}
      />
    </div>
  );
}
