import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  Target, Trophy, DollarSign, Calendar, Activity, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { memo, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface DashboardChartsProps {
  stats: any;
  isLoading: boolean;
  recentAudits: any[];
}

// Memoized chart components to prevent unnecessary re-renders
const LeadConversionChart = memo(({ data, isLoading }: any) => (
  <Card className="lg:col-span-1">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        Konversi Leads ({data?.conversionRate?.toFixed(1) || 0}%)
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-[150px] sm:h-[180px] md:h-[200px] w-full" />
      ) : (
        <div className="h-[150px] sm:h-[180px] md:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.funnelData || []} layout="vertical" margin={{ left: -20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" hide />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20}>
                {(data?.funnelData || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {(data?.funnelData || []).slice(0, 4).map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground truncate">{entry.name}</span>
                <span className="font-medium ml-1">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
));
LeadConversionChart.displayName = "LeadConversionChart";

const AgentLeaderboard = memo(({ agents, isLoading }: any) => (
  <Card className="lg:col-span-1">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        Top 5 Agen
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-[150px] sm:h-[180px] md:h-[200px] w-full" />
      ) : (
        <div className="space-y-4">
          {(agents || []).length > 0 ? (
            (agents || []).map((agent: any, index: number) => (
              <div key={agent.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {index + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-none">{agent.name}</span>
                    <span className="text-xs text-muted-foreground">{agent.bookings} bookings</span>
                  </div>
                </div>
                <span className="text-sm font-bold">{formatCurrency(agent.revenue)}</span>
              </div>
            ))
          ) : (
            <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
              Belum ada data agen
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
));
AgentLeaderboard.displayName = "AgentLeaderboard";

const ReceivablesChart = memo(({ arData, totalRevenue, totalOutstanding, isLoading }: any) => (
  <Card className="lg:col-span-1">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-green-600" />
        Piutang Tertunggak
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-[150px] sm:h-[180px] md:h-[200px] w-full" />
      ) : (
        <div className="flex flex-col items-center">
          <div className="h-[120px] sm:h-[140px] md:h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={arData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  paddingAngle={5}
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--destructive))" />
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full mt-2 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" /> Terbayar
              </span>
              <span className="font-medium text-green-600">{formatCurrency(totalRevenue || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-destructive" /> Piutang
              </span>
              <span className="font-medium text-destructive">{formatCurrency(totalOutstanding || 0)}</span>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" asChild>
              <Link to="/admin/finance/ar">Detail Piutang <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
));
ReceivablesChart.displayName = "ReceivablesChart";

const RevenueAreaChart = memo(({ monthlyRevenue, isLoading }: any) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Tren Pendapatan
      </CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-[150px] sm:h-[180px] md:h-[200px] w-full" />
      ) : (
        <div className="h-[150px] sm:h-[180px] md:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyRevenue || []}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="month" className="text-[10px]" />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardContent>
  </Card>
));
RevenueAreaChart.displayName = "RevenueAreaChart";

const AuditActivityLog = memo(({ audits, isLoading }: any) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-500" />
        Aktivitas Keamanan Terbaru
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {audits && audits.length > 0 ? (
          audits.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/30 transition-colors rounded p-1">
              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                log.severity === 'critical' ? 'bg-red-500' : 
                log.severity === 'warning' ? 'bg-yellow-500' : 
                'bg-blue-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{log.actor_name || 'System'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {log.created_at ? new Date(log.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
            Belum ada aktivitas
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));
AuditActivityLog.displayName = "AuditActivityLog";

export const DashboardCharts = memo(function DashboardCharts({ stats, isLoading, recentAudits }: DashboardChartsProps) {
  // Memoize computed values to prevent recalculation on every render
  const chartData = useMemo(() => ({
    funnelData: stats?.funnelData,
    conversionRate: stats?.conversionRate,
    topAgents: stats?.topAgents,
    arData: stats?.arData,
    totalRevenue: stats?.totalRevenue,
    totalOutstanding: stats?.totalOutstanding,
    monthlyRevenue: stats?.monthlyRevenue,
  }), [stats]);

  return (
    <>
      {/* Phase 3: Analytics Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        <LeadConversionChart data={chartData} isLoading={isLoading} />
        <AgentLeaderboard agents={chartData.topAgents} isLoading={isLoading} />
        <ReceivablesChart 
          arData={chartData.arData} 
          totalRevenue={chartData.totalRevenue} 
          totalOutstanding={chartData.totalOutstanding} 
          isLoading={isLoading} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <RevenueAreaChart monthlyRevenue={chartData.monthlyRevenue} isLoading={isLoading} />
        <AuditActivityLog audits={recentAudits} isLoading={isLoading} />
      </div>
    </>
  );
});

DashboardCharts.displayName = "DashboardCharts";
