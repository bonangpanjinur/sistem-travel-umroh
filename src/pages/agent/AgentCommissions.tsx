import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type AgentCommission = Database["public"]["Tables"]["agent_commissions"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface BookingWithCustomer extends Booking {
  customer: Pick<Customer, "full_name"> | null;
}

interface AgentCommissionWithBooking extends AgentCommission {
  booking: Pick<BookingWithCustomer, "booking_code" | "total_price" | "customer"> | null;
}
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AgentCommissions() {
  const { user } = useAuth();

      const { data: agentData } = useQuery<Pick<Database["public"]["Tables"]["agents"]["Row"], "id" | "commission_rate"> | null>({
    queryKey: ['agent-profile-comm', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, commission_rate')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

      const { data: commissions, isLoading } = useQuery<AgentCommissionWithBooking[] | null>({
    queryKey: ['agent-commissions', agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select(`
          id,
          commission_amount,
          status,
          created_at,
          paid_at,
          notes,
          booking:bookings(
            booking_code,
            total_price,
            customer:customers(full_name)
          )
        `)
        .eq('agent_id', agentData!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    pending: commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    paid: commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Dibayar</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Komisi Saya</h1>
        <p className="text-muted-foreground">Riwayat dan status komisi Anda</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Komisi</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pending)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paid)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission List */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Komisi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : commissions?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada riwayat komisi
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Jamaah</TableHead>
                  <TableHead>Nilai Booking</TableHead>
                  <TableHead>Komisi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions?.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.created_at), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="font-mono">
                      {commission.booking?.booking_code || '-'}
                    </TableCell>
                    <TableCell>
                      {commission.booking?.customer?.full_name || '-'}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(commission.booking?.total_price || 0)}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(commission.commission_amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(commission.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
