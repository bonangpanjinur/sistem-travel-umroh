import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  Target, Trophy, DollarSign, Calendar, Activity, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis
} from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface DashboardChartsProps {
  stats: any;
  isLoading: boolean;
  recentAudits: any[];
}

export function DashboardCharts({ stats, isLoading, recentAudits }: DashboardChartsProps) {
  return (
    <>
      {/* Phase 3: Analytics Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lead Conversion Funnel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Konversi Leads ({stats?.conversionRate?.toFixed(1) || 0}%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.funnelData || []} layout="vertical" margin={{ left: -20 }}>
                    <XAxis type="number" hide />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20}>
                      {(stats?.funnelData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {(stats?.funnelData || []).slice(0, 4).map((entry, index) => (
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

        {/* Agent Leaderboard */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top 5 Agen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                {(stats?.topAgents || []).length > 0 ? (
                  (stats?.topAgents || []).map((agent, index) => (
                    <div key={agent.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
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

        {/* AR Aging / Receivables */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Piutang Tertunggak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.arData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        dataKey="value"
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
                    <span className="font-medium text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-destructive" /> Piutang
                    </span>
                    <span className="font-medium text-destructive">{formatCurrency(stats?.totalOutstanding || 0)}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" asChild>
                    <Link to="/admin/finance/ar">Detail Piutang <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booking Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Status Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[160px] w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.statusData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        dataKey="value"
                      >
                        {(stats?.statusData || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
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
                <div className="flex-1 space-y-2">
                  {(stats?.statusData || []).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log Integration (Phase 4) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Aktivitas Keamanan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAudits && recentAudits.length > 0 ? (
                recentAudits.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      log.severity === 'critical' ? 'bg-red-500' : 
                      log.severity === 'warning' ? 'bg-yellow-500' : 
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.actor_name || 'System'}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : ''}
                      </p>
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
      </div>
    </>
  );
}
