import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  FunnelChart, Funnel, LabelList
} from "recharts";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Target, TrendingUp, TrendingDown, Users, CheckCircle,
  XCircle, Clock, ArrowRight, BarChart3, PieChartIcon, Activity
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Baru', color: 'hsl(217, 91%, 60%)' },
  contacted: { label: 'Dihubungi', color: 'hsl(271, 91%, 65%)' },
  follow_up: { label: 'Follow Up', color: 'hsl(45, 93%, 47%)' },
  negotiation: { label: 'Negosiasi', color: 'hsl(27, 96%, 61%)' },
  closing: { label: 'Closing', color: 'hsl(160, 84%, 39%)' },
  won: { label: 'Won', color: 'hsl(142, 76%, 36%)' },
  lost: { label: 'Lost', color: 'hsl(0, 84%, 60%)' },
};

const FUNNEL_STAGES: LeadStatus[] = ['new', 'contacted', 'follow_up', 'negotiation', 'closing', 'won'];

const chartConfig: ChartConfig = {
  leads: { label: "Leads", color: "hsl(var(--primary))" },
  won: { label: "Won", color: "hsl(142, 76%, 36%)" },
  lost: { label: "Lost", color: "hsl(0, 84%, 60%)" },
  conversion: { label: "Konversi", color: "hsl(var(--chart-1))" },
};

export default function AdminLeadAnalytics() {
  const [period, setPeriod] = useState("6months");

  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-leads-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "1month": return { start: subMonths(now, 1), end: now };
      case "3months": return { start: subMonths(now, 3), end: now };
      case "6months": return { start: subMonths(now, 6), end: now };
      case "12months": return { start: subMonths(now, 12), end: now };
      default: return { start: subMonths(now, 6), end: now };
    }
  };

  const dateRange = getDateRange();

  // Filter leads by period
  const filteredLeads = leads?.filter(lead => {
    const createdAt = parseISO(lead.created_at!);
    return isWithinInterval(createdAt, { start: dateRange.start, end: dateRange.end });
  });

  // Calculate stats
  const stats = {
    total: filteredLeads?.length || 0,
    new: filteredLeads?.filter(l => l.status === 'new').length || 0,
    inProgress: filteredLeads?.filter(l => ['contacted', 'follow_up', 'negotiation', 'closing'].includes(l.status || '')).length || 0,
    won: filteredLeads?.filter(l => l.status === 'won').length || 0,
    lost: filteredLeads?.filter(l => l.status === 'lost').length || 0,
  };

  const conversionRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0';
  const lossRate = stats.total > 0 ? ((stats.lost / stats.total) * 100).toFixed(1) : '0';

  // Monthly trend data
  const monthlyData = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end }).map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthLeads = leads?.filter(lead => {
      const createdAt = parseISO(lead.created_at!);
      return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
    }) || [];

    const wonCount = monthLeads.filter(l => l.status === 'won').length;
    const lostCount = monthLeads.filter(l => l.status === 'lost').length;
    const totalCount = monthLeads.length;

    return {
      month: format(month, 'MMM yy', { locale: idLocale }),
      fullMonth: format(month, 'MMMM yyyy', { locale: idLocale }),
      leads: totalCount,
      won: wonCount,
      lost: lostCount,
      conversion: totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0,
    };
  });

  // Funnel data
  const funnelData = FUNNEL_STAGES.map((status, index) => {
    const count = filteredLeads?.filter(l => {
      const statusIndex = FUNNEL_STAGES.indexOf(l.status as LeadStatus);
      return statusIndex >= index;
    }).length || 0;

    return {
      name: STATUS_CONFIG[status].label,
      value: count,
      fill: STATUS_CONFIG[status].color,
    };
  });

  // Status distribution
  const statusDistribution = Object.entries(STATUS_CONFIG).map(([status, config]) => ({
    name: config.label,
    value: filteredLeads?.filter(l => l.status === status).length || 0,
    fill: config.color,
  })).filter(item => item.value > 0);

  // Source distribution
  const sourceData = (() => {
    const sources: Record<string, number> = {};
    filteredLeads?.forEach(lead => {
      const source = lead.source || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
      'hsl(217, 91%, 60%)',
      'hsl(271, 91%, 65%)',
    ];

    return Object.entries(sources)
      .map(([name, value], index) => ({
        name: name === 'unknown' ? 'Tidak Diketahui' : name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  })();

  // Source conversion data
  const sourceConversionData = (() => {
    const sources: Record<string, { total: number; won: number }> = {};
    filteredLeads?.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!sources[source]) sources[source] = { total: 0, won: 0 };
      sources[source].total++;
      if (lead.status === 'won') sources[source].won++;
    });
    
    return Object.entries(sources)
      .map(([name, data]) => ({
        name: name === 'unknown' ? 'Tidak Diketahui' : name.charAt(0).toUpperCase() + name.slice(1),
        total: data.total,
        won: data.won,
        conversion: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.conversion - a.conversion);
  })();

  // Compare with previous period
  const getPreviousPeriodStats = () => {
    const monthsToSubtract = parseInt(period.replace('months', '').replace('month', '')) || 6;
    const prevStart = subMonths(dateRange.start, monthsToSubtract);
    const prevEnd = subMonths(dateRange.end, monthsToSubtract);

    const prevLeads = leads?.filter(lead => {
      const createdAt = parseISO(lead.created_at!);
      return isWithinInterval(createdAt, { start: prevStart, end: prevEnd });
    }) || [];

    const prevWon = prevLeads.filter(l => l.status === 'won').length;
    const prevTotal = prevLeads.length;
    const prevConversion = prevTotal > 0 ? (prevWon / prevTotal) * 100 : 0;

    const currentConversion = parseFloat(conversionRate);
    const conversionChange = prevConversion > 0 ? ((currentConversion - prevConversion) / prevConversion * 100).toFixed(1) : 0;
    const leadsChange = prevTotal > 0 ? (((stats.total - prevTotal) / prevTotal) * 100).toFixed(1) : 0;

    return { conversionChange, leadsChange, prevTotal, prevConversion: prevConversion.toFixed(1) };
  };

  const comparison = getPreviousPeriodStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/leads">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Analytics Leads</h1>
            <p className="text-muted-foreground">Statistik konversi dan performa lead</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">1 Bulan</SelectItem>
            <SelectItem value="3months">3 Bulan</SelectItem>
            <SelectItem value="6months">6 Bulan</SelectItem>
            <SelectItem value="12months">12 Bulan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.total}
          subtitle={`vs periode sebelumnya`}
          change={parseFloat(comparison.leadsChange as string)}
          icon={Users}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle={`Periode sebelumnya: ${comparison.prevConversion}%`}
          change={parseFloat(comparison.conversionChange as string)}
          icon={Target}
          highlight
        />
        <StatCard
          title="Won"
          value={stats.won}
          subtitle={`dari ${stats.total} leads`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Lost"
          value={stats.lost}
          subtitle={`${lossRate}% loss rate`}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends" className="gap-2">
            <Activity className="h-4 w-4" />
            Tren
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Funnel
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            Sumber
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {/* Lead Trends */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tren Lead Masuk</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="hsl(var(--primary))"
                      fill="url(#fillLeads)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversion Rate per Bulan</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" unit="%" />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0 && payload[0] && payload[0].payload) {
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{payload[0].payload.fullMonth}</p>
                              <p className="text-sm text-muted-foreground">
                                Conversion: <span className="font-medium text-foreground">{payload[0].value}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversion"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Won vs Lost */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Won vs Lost per Bulan</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="won" name="Won" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lost" name="Lost" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Funnel Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {funnelData.map((stage, index) => {
                    const maxValue = funnelData[0]?.value || 1;
                    const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={stage.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{stage.name}</span>
                          <span className="text-muted-foreground">{stage.value} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: stage.fill,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribusi Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{payload[0].name}</p>
                              <p className="text-sm">{payload[0].value} leads</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Stages Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drop-off Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Stage</th>
                      <th className="text-right py-3 px-4 font-medium">Count</th>
                      <th className="text-right py-3 px-4 font-medium">% dari Total</th>
                      <th className="text-right py-3 px-4 font-medium">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelData.map((stage, index) => {
                      const prevValue = index > 0 ? funnelData[index - 1].value : stage.value;
                      const dropOff = prevValue > 0 ? ((prevValue - stage.value) / prevValue * 100).toFixed(1) : '0';
                      const totalPercent = (funnelData[0]?.value || 1) > 0 
                        ? ((stage.value / funnelData[0].value) * 100).toFixed(1) 
                        : '0';

                      return (
                        <tr key={stage.name} className="border-b last:border-0">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: stage.fill }}
                              />
                              <span className="font-medium">{stage.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">{stage.value}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">{totalPercent}%</td>
                          <td className="py-3 px-4 text-right">
                            {index > 0 && parseFloat(dropOff) > 0 ? (
                              <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30">
                                -{dropOff}%
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Source Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead per Sumber</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{payload[0].name}</p>
                              <p className="text-sm">{payload[0].value} leads</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Source Conversion */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversion Rate per Sumber</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={sourceConversionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" unit="%" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0 && payload[0] && payload[0].payload) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">Total: {data.total} leads</p>
                              <p className="text-sm">Won: {data.won} leads</p>
                              <p className="text-sm font-medium text-green-600">Conversion: {data.conversion}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="conversion" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Source Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performa per Sumber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Sumber</th>
                      <th className="text-right py-3 px-4 font-medium">Total Leads</th>
                      <th className="text-right py-3 px-4 font-medium">Won</th>
                      <th className="text-right py-3 px-4 font-medium">Conversion Rate</th>
                      <th className="text-right py-3 px-4 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceConversionData.map((source) => {
                      const rating = source.conversion >= 30 ? 'Excellent' 
                        : source.conversion >= 20 ? 'Good' 
                        : source.conversion >= 10 ? 'Average' 
                        : 'Poor';
                      const ratingColor = source.conversion >= 30 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                        : source.conversion >= 20 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' 
                        : source.conversion >= 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30';

                      return (
                        <tr key={source.name} className="border-b last:border-0">
                          <td className="py-3 px-4 font-medium">{source.name}</td>
                          <td className="py-3 px-4 text-right">{source.total}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">{source.won}</td>
                          <td className="py-3 px-4 text-right font-medium">{source.conversion}%</td>
                          <td className="py-3 px-4 text-right">
                            <Badge className={cn("font-normal", ratingColor)}>
                              {rating}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'green' | 'red';
  highlight?: boolean;
}

function StatCard({ title, value, subtitle, change, icon: Icon, color, highlight }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn(highlight && "ring-2 ring-primary/20 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn(
              "text-2xl font-bold",
              color === 'green' && "text-green-600",
              color === 'red' && "text-red-600"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? '+' : ''}{change}%
              </div>
            )}
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            color === 'green' ? "bg-green-100 dark:bg-green-900/30" :
            color === 'red' ? "bg-red-100 dark:bg-red-900/30" :
            highlight ? "bg-primary/20" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              color === 'green' ? "text-green-600" :
              color === 'red' ? "text-red-600" :
              "text-primary"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
