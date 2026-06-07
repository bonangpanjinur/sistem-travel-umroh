import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId } from "@/hooks/useAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Users, Network, TrendingUp, DollarSign, UserCheck, UserX,
  Copy, ChevronRight, ChevronDown, TreePine, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentNode {
  id: string;
  agent_code: string;
  company_name: string | null;
  commission_rate: number | null;
  is_active: boolean | null;
  created_at: string | null;
  user_id: string | null;
  profile?: { full_name: string | null; phone: string | null };
  bookingCount: number;
  totalRevenue: number;
  totalCommission: number;
  children: AgentNode[];
  depth: number;
}

async function fetchAgentTree(rootAgentId: string): Promise<AgentNode[]> {
  const MAX_DEPTH = 4;

  async function loadLevel(parentId: string, depth: number): Promise<AgentNode[]> {
    if (depth > MAX_DEPTH) return [];

    const { data: agents, error } = await supabase
      .from("agents")
      .select("id, agent_code, company_name, commission_rate, is_active, created_at, user_id")
      .eq("parent_agent_id", parentId)
      .order("created_at", { ascending: false });

    if (error || !agents || agents.length === 0) return [];

    const userIds = agents.map((a: any) => a.user_id).filter(Boolean);
    const agentIds = agents.map((a: any) => a.id);

    const [{ data: profiles }, { data: bookings }, { data: commissions }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds),
      supabase.from("bookings").select("agent_id, total_price").in("agent_id", agentIds),
      supabase.from("agent_commissions").select("agent_id, commission_amount").in("agent_id", agentIds),
    ]);

    const nodes: AgentNode[] = await Promise.all(
      agents.map(async (agent: any) => {
        const agentBookings = (bookings || []).filter((b: any) => b.agent_id === agent.id);
        const agentComms = (commissions || []).filter((c: any) => c.agent_id === agent.id);
        const children = await loadLevel(agent.id, depth + 1);
        return {
          ...agent,
          profile: (profiles || []).find((p: any) => p.user_id === agent.user_id),
          bookingCount: agentBookings.length,
          totalRevenue: agentBookings.reduce((s: number, b: any) => s + Number(b.total_price), 0),
          totalCommission: agentComms.reduce((s: number, c: any) => s + Number(c.commission_amount), 0),
          children,
          depth,
        } as AgentNode;
      })
    );
    return nodes;
  }

  return loadLevel(rootAgentId, 1);
}

function flattenTree(nodes: AgentNode[]): AgentNode[] {
  const result: AgentNode[] = [];
  function walk(list: AgentNode[]) {
    list.forEach(n => { result.push(n); walk(n.children); });
  }
  walk(nodes);
  return result;
}

function aggregateStats(nodes: AgentNode[]) {
  const all = flattenTree(nodes);
  return {
    total: all.length,
    active: all.filter(a => a.is_active).length,
    totalBookings: all.reduce((s, a) => s + a.bookingCount, 0),
    totalRevenue: all.reduce((s, a) => s + a.totalRevenue, 0),
    totalCommission: all.reduce((s, a) => s + a.totalCommission, 0),
    directCount: nodes.length,
    level2Count: nodes.reduce((s, n) => s + n.children.length, 0),
    level3Count: nodes.reduce((s, n) => s + n.children.reduce((s2, c) => s2 + c.children.length, 0), 0),
  };
}

function TreeNodeRow({ node, expanded, onToggle }: {
  node: AgentNode; expanded: Set<string>; onToggle: (id: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const indent = (node.depth - 1) * 20;

  return (
    <>
      <TableRow className={node.depth > 1 ? "bg-muted/30" : ""}>
        <TableCell>
          <div className="flex items-center gap-1" style={{ paddingLeft: indent }}>
            {hasChildren ? (
              <button onClick={() => onToggle(node.id)} className="p-0.5 hover:bg-muted rounded">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            ) : (
              <span className="w-5 inline-block" />
            )}
            {node.depth > 1 && <GitBranch className="h-3 w-3 text-muted-foreground/50 mr-0.5" />}
            <span className="font-mono font-semibold text-primary text-sm">{node.agent_code}</span>
            {hasChildren && (
              <Badge variant="outline" className="text-xs h-4 px-1 ml-1">{node.children.length}</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p className="text-sm font-medium">{node.profile?.full_name || "-"}</p>
            {node.company_name && <p className="text-xs text-muted-foreground">{node.company_name}</p>}
            {node.profile?.phone && <p className="text-xs text-muted-foreground">{node.profile.phone}</p>}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Lvl {node.depth}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          {node.is_active ? (
            <Badge className="bg-green-100 text-green-800 gap-1 text-xs">
              <UserCheck className="h-3 w-3" />Aktif
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-xs">
              <UserX className="h-3 w-3" />Non-aktif
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-center text-sm font-semibold">{node.commission_rate || 0}%</TableCell>
        <TableCell className="text-center text-sm font-semibold">{node.bookingCount}</TableCell>
        <TableCell className="text-right text-sm font-semibold">{formatCurrency(node.totalRevenue)}</TableCell>
        <TableCell className="text-right text-sm text-primary font-semibold">{formatCurrency(node.totalCommission)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {node.created_at ? format(new Date(node.created_at), "d MMM yy", { locale: localeId }) : "-"}
        </TableCell>
      </TableRow>
      {isOpen && node.children.map(child => (
        <TreeNodeRow key={child.id} node={child} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}

async function createInvitation(token: string): Promise<{ token: string; agent_code: string; expires_at: string }> {
  const res = await fetch("/api/agents/invitation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal membuat undangan");
  return data;
}

export default function AgentNetwork() {
  const { user } = useAuth();
  const { data: agentData, isLoading: loadingAgent } = useAgentByUserId(user?.id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("tree");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const { data: tree = [], isLoading: loadingTree } = useQuery({
    queryKey: ["agent-network-tree", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: () => fetchAgentTree(agentData!.id),
    staleTime: 60_000,
  });

  const { data: royaltyCommissions = [] } = useQuery({
    queryKey: ["agent-royalty-commissions", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commissions")
        .select("commission_amount, status, notes, created_at")
        .eq("agent_id", agentData!.id)
        .ilike("notes", "%Royalti Sub Agen%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingAgent || loadingTree;
  const stats = aggregateStats(tree);
  const flatList = flattenTree(tree);

  const pendingRoyalti = royaltyCommissions
    .filter((c: any) => c.status === "pending")
    .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
  const paidRoyalti = royaltyCommissions
    .filter((c: any) => c.status === "paid")
    .reduce((s: number, c: any) => s + Number(c.commission_amount), 0);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(flatList.map(n => n.id)));
  const collapseAll = () => setExpanded(new Set());

  const handleCopyReferral = () => {
    if (!agentData?.agent_code) return;
    const text = `Bergabunglah sebagai Sub Agen Vinstour Travel. Kode Agen Sponsor Anda: ${agentData.agent_code}. Hubungi kantor untuk mendaftar.`;
    navigator.clipboard.writeText(text).then(() => toast.success("Teks undangan disalin!"));
  };

  const handleGenerateInvite = async () => {
    const token = localStorage.getItem("sb-access-token") ||
      (() => { try { return JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").access_token; } catch { return null; } })();
    if (!token) { toast.error("Sesi tidak valid, silakan login ulang."); return; }
    setGeneratingInvite(true);
    try {
      const data = await createInvitation(token);
      const link = `${window.location.origin}/daftar-sub-agen?ref=${data.agent_code}&token=${data.token}`;
      setInviteLink(link);
      setInviteExpiry(data.expires_at);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal membuat link undangan");
    } finally {
      setGeneratingInvite(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Jaringan Sub Agen Multi-Level
          </h1>
          <p className="text-muted-foreground">Pantau seluruh jaringan dan performa semua level sub agen Anda</p>
        </div>
        {agentData && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm bg-muted px-3 py-1.5 rounded-lg font-mono">
              Kode Anda: <span className="font-bold text-primary">{agentData.agent_code}</span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyReferral}>
              <Copy className="h-3.5 w-3.5" />
              Salin Undangan
            </Button>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleGenerateInvite} disabled={generatingInvite}>
              <Users className="h-3.5 w-3.5" />
              {generatingInvite ? "Membuat…" : "Buat Link Undangan"}
            </Button>
          </div>
        )}
      </div>

      {/* Invite Link Card */}
      {inviteLink && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-800">🔗 Link Undangan Sub-Agen</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white rounded px-2 py-1.5 border truncate font-mono">
              {inviteLink}
            </code>
            <Button size="sm" variant="outline" onClick={() => {
              navigator.clipboard.writeText(inviteLink);
              toast.success("Link disalin!");
            }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {inviteExpiry && (
            <p className="text-xs text-muted-foreground">
              Link berlaku hingga: {new Date(inviteExpiry).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <p className="text-xs text-emerald-700">
            Bagikan link ini ke calon sub-agen. Setelah mendaftar, admin akan meninjau dan mengaktifkan akun mereka.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Jaringan</p>
                {isLoading ? <Skeleton className="h-7 w-12 mt-0.5" /> : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
                <div className="flex gap-1.5 mt-0.5">
                  {stats.directCount > 0 && <span className="text-xs text-blue-600">L1:{stats.directCount}</span>}
                  {stats.level2Count > 0 && <span className="text-xs text-indigo-600">L2:{stats.level2Count}</span>}
                  {stats.level3Count > 0 && <span className="text-xs text-purple-600">L3:{stats.level3Count}</span>}
                </div>
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
                <p className="text-xs text-muted-foreground">Total Booking (Semua Level)</p>
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
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingRoyalti)}</p>
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
                  <p className="text-xl font-bold text-green-600">{formatCurrency(paidRoyalti)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tree" className="gap-1.5">
            <TreePine className="h-3.5 w-3.5" />Pohon Jaringan
          </TabsTrigger>
          <TabsTrigger value="flat" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />Daftar Semua ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="royalty" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />Riwayat Royalti
          </TabsTrigger>
        </TabsList>

        {/* TREE VIEW */}
        <TabsContent value="tree">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Hierarki Jaringan Sub Agen</CardTitle>
              {tree.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={expandAll}>Buka Semua</Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll}>Tutup Semua</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : tree.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-muted-foreground">Belum ada sub agen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bagikan kode agen Anda kepada calon mitra untuk bergabung sebagai sub agen.
                  </p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={handleCopyReferral}>
                    <Copy className="h-4 w-4" />Salin Teks Undangan
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama / Perusahaan</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Rate</TableHead>
                        <TableHead className="text-center">Booking</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Komisi</TableHead>
                        <TableHead>Bergabung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tree.map(node => (
                        <TreeNodeRow key={node.id} node={node} expanded={expanded} onToggle={toggleExpand} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLAT LIST */}
        <TabsContent value="flat">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Semua Sub Agen ({flatList.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Rate</TableHead>
                        <TableHead className="text-center">Booking</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Komisi</TableHead>
                        <TableHead>Bergabung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flatList.map(agent => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-mono font-semibold text-primary text-sm">{agent.agent_code}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{agent.profile?.full_name || "-"}</p>
                              {agent.company_name && <p className="text-xs text-muted-foreground">{agent.company_name}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">Lvl {agent.depth}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {agent.is_active ? (
                              <Badge className="bg-green-100 text-green-800 text-xs"><UserCheck className="h-3 w-3 mr-1" />Aktif</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs"><UserX className="h-3 w-3 mr-1" />Non-aktif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold">{agent.commission_rate || 0}%</TableCell>
                          <TableCell className="text-center text-sm font-semibold">{agent.bookingCount}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatCurrency(agent.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-sm text-primary font-semibold">{formatCurrency(agent.totalCommission)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {agent.created_at ? format(new Date(agent.created_at), "d MMM yy", { locale: localeId }) : "-"}
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

        {/* ROYALTY HISTORY */}
        <TabsContent value="royalty">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Riwayat Royalti Sub Agen</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {royaltyCommissions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Belum ada riwayat royalti</p>
                </div>
              ) : (
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
                    {royaltyCommissions.map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.created_at ? format(new Date(c.created_at), "d MMM yyyy", { locale: localeId }) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">{c.notes || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(Number(c.commission_amount))}
                        </TableCell>
                        <TableCell>
                          {c.status === "paid" ? (
                            <Badge className="bg-green-100 text-green-800">Dibayar</Badge>
                          ) : c.status === "approved" ? (
                            <Badge className="bg-blue-100 text-blue-800">Disetujui</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
