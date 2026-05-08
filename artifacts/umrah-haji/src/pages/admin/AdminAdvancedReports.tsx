import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, TrendingDown, DollarSign, Users, Package, Plane, FileText, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

// Type definitions for database views
interface FinancialSummaryRow {
  gross_revenue: number | null;
  collected_amount: number | null;
  outstanding_amount: number | null;
  total_vendor_costs: number | null;
  net_profit: number | null;
  total_pax: number | null;
  total_revenue: number | null;
  package_name: string | null;
  departure_date: string | null;
  return_date: string | null;
  departure_id: string | null;
  quota: number | null;
  booked_count: number | null;
}

interface OperationalSummaryRow {
  quota: number | null;
  booked: number | null;
  manifest_count: number | null;
  checked_in_count: number | null;
  departure_date: string | null;
  package_name: string | null;
}

interface AgentPerformanceData {
  agent_id: string;
  agent_name: string;
  bookings: number;
  revenue: number;
}

interface LeadFunnelData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function AdminAdvancedReports() {
  const [activeTab, setActiveTab] = useState("financial");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // Fetch financial summary
  const { data: financialData = [] } = useQuery<FinancialSummaryRow[]>({
    queryKey: ["financial-summary", dateRange],
    queryFn: async () => {
      // Use base view (mv_financial_summary not in generated types).
      const { data, error } = await (supabase as any)
        .from("v_financial_summary")
        .select("*")
        .gte("departure_date", dateRange.start)
        .lte("departure_date", dateRange.end)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FinancialSummaryRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch operational summary
  const { data: operationalData = [] } = useQuery<OperationalSummaryRow[]>({
    queryKey: ["operational-summary", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          quota,
          booked_count,
          departure_date,
          package:packages(name)
        `)
        .gte("departure_date", dateRange.start)
        .lte("departure_date", dateRange.end)
        .order("departure_date", { ascending: true });

      if (error) throw error;
      
      const mappedData = (data || []).map((d: any) => ({
        quota: d.quota,
        booked: d.booked_count,
        manifest_count: d.booked_count,
        checked_in_count: d.booked_count,
        departure_date: d.departure_date,
        package_name: d.package?.name || "N/A"
      }));

      return mappedData as OperationalSummaryRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch booking data for marketing reports
  const { data: bookingData = [] } = useQuery({
    queryKey: ["booking-report", dateRange],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
        .from("bookings")
        .select("*, customer:customers(*)")
        .gte("created_at", dateRange.start)
        .lte("created_at", dateRange.end + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(1000);
      
      if (error) throw error;

      // Fetch agents separately to avoid join issues
      const { data: agents } = await supabase
        .from("agents")
        .select("*");

      const data = rawData?.map(b => ({
        ...b,
        agent: agents?.find(a => a.id === b.agent_id) || null
      })) || [];
      
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch lead data
  const { data: leadData = [] } = useQuery({
    queryKey: ["lead-report", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .gte("created_at", dateRange.start)
        .lte("created_at", dateRange.end + "T23:59:59")
        .limit(2000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Calculate financial totals
  const financialTotals = financialData.reduce(
    (acc, item) => ({
      grossRevenue: acc.grossRevenue + (Number(item.gross_revenue) || 0),
      collectedAmount: acc.collectedAmount + (Number(item.collected_amount) || 0),
      outstandingAmount: acc.outstandingAmount + (Number(item.outstanding_amount) || 0),
      vendorCosts: acc.vendorCosts + (Number(item.total_vendor_costs) || 0),
      netProfit: acc.netProfit + (Number(item.net_profit) || 0),
      totalPax: acc.totalPax + (Number(item.total_pax) || 0),
    }),
    { grossRevenue: 0, collectedAmount: 0, outstandingAmount: 0, vendorCosts: 0, netProfit: 0, totalPax: 0 }
  );

  // Calculate operational stats
  const operationalTotals = operationalData.reduce(
    (acc, item) => ({
      totalQuota: acc.totalQuota + (Number(item.quota) || 0),
      totalBooked: acc.totalBooked + (Number(item.booked) || 0),
      totalManifests: acc.totalManifests + (Number(item.manifest_count) || 0),
      totalCheckedIn: acc.totalCheckedIn + (Number(item.checked_in_count) || 0),
    }),
    { totalQuota: 0, totalBooked: 0, totalManifests: 0, totalCheckedIn: 0 }
  );

  const occupancyRate = operationalTotals.totalQuota > 0 
    ? ((operationalTotals.totalBooked / operationalTotals.totalQuota) * 100).toFixed(1)
    : 0;

  // Lead funnel data
  const leadFunnel: LeadFunnelData[] = [
    { name: "Total Leads", value: leadData.length, color: "#8884d8" },
    { name: "Contacted", value: leadData.filter((l) => l.status !== "new").length, color: "#82ca9d" },
    { name: "Qualified", value: leadData.filter((l) => ["qualified", "proposal", "negotiation", "won"].includes(l.status as string)).length, color: "#ffc658" },
    { name: "Won", value: leadData.filter((l) => l.status === "won").length, color: "#00C49F" },
  ];

  // Agent performance
  const agentPerformance = bookingData.reduce((acc: AgentPerformanceData[], booking: any) => {
    if (!booking.agent) return acc;
    const existing = acc.find((a) => a.agent_id === booking.agent_id);
    const agentData = Array.isArray(booking.agent) ? booking.agent[0] : booking.agent;
    if (existing) {
      existing.bookings += 1;
      existing.revenue += booking.total_price || 0;
    } else {
      acc.push({
        agent_id: booking.agent_id,
        agent_name: agentData?.company_name || "Unknown",
        bookings: 1,
        revenue: booking.total_price || 0,
      });
    }
    return acc;
  }, []).sort((a, b) => b.revenue - a.revenue);

  const handleExportFinancial = () => {
    const columns = [
      { header: "Paket", accessor: "package_name" },
      { header: "Tanggal", accessor: "departure_date" },
      { header: "Pax", accessor: "total_pax" },
      { header: "Revenue", accessor: "gross_revenue" },
      { header: "Terkumpul", accessor: "collected_amount" },
      { header: "Net Profit", accessor: "net_profit" },
    ];
    exportToExcel(financialData as any[], columns, `Financial-Report-${dateRange.start}-${dateRange.end}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Reports</h1>
          <p className="text-muted-foreground">Laporan lengkap keuangan, operasional & marketing</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-auto"
          />
          <span>-</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-auto"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="financial">Keuangan</TabsTrigger>
          <TabsTrigger value="operational">Operasional</TabsTrigger>
          <TabsTrigger value="marketing">Marketing & Sales</TabsTrigger>
        </TabsList>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(financialTotals.grossRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Terkumpul</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(financialTotals.collectedAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(financialTotals.outstandingAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Biaya Vendor</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(financialTotals.vendorCosts)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(financialTotals.netProfit)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit per Keberangkatan</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="package_name" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="collected_amount" name="Terkumpul" fill="#0088FE" />
                    <Bar dataKey="net_profit" name="Net Profit" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Margin Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="departure_date" />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="net_profit" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detail per Keberangkatan</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportFinancial}>
                <Download className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Pax</TableHead>
                    <TableHead className="text-right">Gross Revenue</TableHead>
                    <TableHead className="text-right">Terkumpul</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialData.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.package_name}</TableCell>
                      <TableCell>{item.departure_date}</TableCell>
                      <TableCell className="text-right">{item.total_pax || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.gross_revenue || 0)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(item.collected_amount || 0)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(item.outstanding_amount || 0)}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">{formatCurrency(item.net_profit || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Kuota</p>
                <p className="text-2xl font-bold">{operationalTotals.totalQuota}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Booked</p>
                <p className="text-2xl font-bold text-blue-600">{operationalTotals.totalBooked}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold text-green-600">{occupancyRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Check-in Rate</p>
                <p className="text-2xl font-bold">
                  {operationalTotals.totalManifests > 0 
                    ? ((operationalTotals.totalCheckedIn / operationalTotals.totalManifests) * 100).toFixed(1) 
                    : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Occupancy per Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={operationalData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="package_name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quota" name="Kuota" fill="#E0E0E0" />
                  <Bar dataKey="booked" name="Booked" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lead Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leadFunnel.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${leadFunnel[0].value > 0 ? (item.value / leadFunnel[0].value) * 100 : 0}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Conversion Rate: <span className="font-bold text-green-600">
                      {leadData.length > 0 
                        ? ((leadData.filter((l) => l.status === "won").length / leadData.length) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Agent Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Top Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentPerformance.slice(0, 5).map((agent, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{agent.agent_name}</TableCell>
                        <TableCell className="text-right">{agent.bookings}</TableCell>
                        <TableCell className="text-right">{formatCurrency(agent.revenue)}</TableCell>
                      </TableRow>
                    ))}
                    {agentPerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Tidak ada data agent
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Booking Source */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={
                    Object.entries(
                      bookingData.reduce((acc: Record<string, number>, b) => {
                        const date = format(new Date(b.created_at!), "yyyy-MM-dd");
                        acc[date] = (acc[date] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([date, count]) => ({ date, count }))
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
