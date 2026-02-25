import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId, useAgentStats, useAgentRecentBookings } from "@/hooks/useAgents";
import { Users, DollarSign, TrendingUp, Clock, Plus, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AgentDashboard() {
  const { user } = useAuth();
  const { data: agentData, isLoading: loadingAgent } = useAgentByUserId(user?.id);
  const { data: stats, isLoading: loadingStats } = useAgentStats(agentData?.id);
  const { data: recentBookings } = useAgentRecentBookings(agentData?.id);

  const isLoading = loadingAgent || loadingStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Agent</h1>
          <p className="text-muted-foreground">
            Selamat datang, {agentData?.company_name || 'Agent'}
          </p>
          {agentData && (
            <Badge variant="outline" className="mt-2">
              Kode Agent: {agentData.agent_code}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/agent/register">
              <Plus className="h-4 w-4 mr-2" />
              Daftarkan Jamaah
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/agent/register-group">
              <Users2 className="h-4 w-4 mr-2" />
              Daftarkan Rombongan
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jamaah</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.confirmedBookings || 0} confirmed
                    </p>
                  </>
                )}
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Komisi</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats?.totalCommission || 0)}
                  </p>
                )}
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
                <p className="text-sm text-muted-foreground">Komisi Pending</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.pendingCommission || 0)}
                  </p>
                )}
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
                <p className="text-sm text-muted-foreground">Komisi Dibayar</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.paidCommission || 0)}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Rate Info */}
      {agentData && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate Komisi Anda</p>
                <p className="text-3xl font-bold text-primary">{agentData.commission_rate}%</p>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Anda akan mendapatkan {agentData.commission_rate}% dari total booking yang Anda referensikan
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada booking
            </p>
          ) : (
            <div className="space-y-3">
              {recentBookings?.map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold">{booking.booking_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {(booking.customer as any)?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(booking.total_price)}</p>
                    <Badge variant={booking.booking_status === 'confirmed' ? 'default' : 'secondary'}>
                      {BOOKING_STATUS_LABELS[booking.booking_status || ''] || booking.booking_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
