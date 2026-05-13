import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { Network, Users } from "lucide-react";

export default function AgentSubAgentJamaah() {
  const { user } = useAuth();

  const { data: agentData } = useQuery({
    queryKey: ["agent-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id").eq("user_id", user!.id).single();
      return data;
    },
  });

  const { data: subAgents = [] } = useQuery({
    queryKey: ["sub-agents-of", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, agent_code, company_name, user_id")
        .eq("parent_agent_id", agentData!.id);
      return data || [];
    },
  });

  const subAgentIds = subAgents.map((a: any) => a.id);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sub-agent-jamaah", subAgentIds.join(",")],
    enabled: subAgentIds.length > 0,
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          `id, booking_code, booking_status, total_price, paid_amount, payment_status, created_at, agent_id,
           customer:customers(full_name, phone, email),
           departure:departures(departure_date, package:packages(name))`
        )
        .in("agent_id", subAgentIds)
        .order("created_at", { ascending: false });
      return bookings || [];
    },
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="h-6 w-6" /> Jamaah Sub-Agen
        </h1>
        <p className="text-muted-foreground text-sm">
          Daftar jamaah yang didaftarkan oleh sub-agen jaringan Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Sub-Agen</p>
            <p className="text-2xl font-bold">{subAgents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Jamaah</p>
            <p className="text-2xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Omzet</p>
            <p className="text-2xl font-bold">
              {formatCurrency(rows.reduce((s: number, r: any) => s + Number(r.total_price || 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Daftar Jamaah Sub-Agen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Belum ada jamaah dari sub-agen.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Sub-Agen</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tgl Booking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => {
                    const sub = subAgents.find((s: any) => s.id === r.agent_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.booking_code}</TableCell>
                        <TableCell>{r.customer?.full_name || "-"}</TableCell>
                        <TableCell>
                          <div className="text-sm">{sub?.company_name || sub?.agent_code}</div>
                        </TableCell>
                        <TableCell>{r.departure?.package?.name || "-"}</TableCell>
                        <TableCell>{formatDate(r.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.booking_status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(r.total_price)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}