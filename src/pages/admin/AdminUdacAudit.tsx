import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Activity, Clock, User, Shield, Search, 
  Download, Filter, Calendar as CalendarIcon, 
  ArrowLeft, FileText, CheckCircle2, XCircle, 
  AlertTriangle, RefreshCw, ChevronRight, Info,
  List
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminUdacAudit() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Ambil Audit Logs
  const { data: auditLogs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["udac-audit-logs", searchQuery, filterAction, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(500);

      if (filterAction !== "all") {
        query = query.eq("action_type", filterAction);
      }

      if (searchQuery) {
        query = query.or(`user_id.ilike.%${searchQuery}%,permission_key.ilike.%${searchQuery}%`);
      }

      if (dateRange.start) {
        query = query.gte("timestamp", dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte("timestamp", dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const total = auditLogs.length;
    const granted = auditLogs.filter(l => l.is_granted).length;
    const denied = total - granted;
    const changes = auditLogs.filter(l => l.action_type === "PERMISSION_CHANGE").length;
    const attempts = auditLogs.filter(l => l.action_type === "ACCESS_ATTEMPT").length;
    
    return { total, granted, denied, changes, attempts };
  }, [auditLogs]);

  const handleDownloadCSV = () => {
    if (auditLogs.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const csv = [
      ["Timestamp", "User ID", "Action", "Permission", "Resource", "Status", "Context"].join(","),
      ...auditLogs.map(log => [
        log.timestamp,
        log.user_id,
        log.action_type,
        log.permission_key,
        log.resource_id,
        log.is_granted ? "GRANTED" : "DENIED",
        JSON.stringify(log.context || {})
      ].map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `udac-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Audit log berhasil diunduh!", {
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="md:hidden">
                <Link to="/admin/udac"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                UDAC Audit & Monitoring
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Pantau aktivitas akses real-time dan riwayat perubahan konfigurasi keamanan sistem.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={handleDownloadCSV} className="gap-2 shadow-md">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Aktivitas</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Akses Diberikan</p>
                <h3 className="text-2xl font-bold">{stats.granted}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-red-500/5 to-transparent">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Akses Ditolak</p>
                <h3 className="text-2xl font-bold">{stats.denied}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perubahan Izin</p>
                <h3 className="text-2xl font-bold">{stats.changes}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="logs" className="w-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="logs" className="gap-2">
                <List className="h-4 w-4" /> Audit Logs
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Activity className="h-4 w-4" /> Insights
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari user atau izin..." 
                  className="pl-10 h-9 bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={filterAction} 
                onChange={(e) => setFilterAction(e.target.value)}
                className="h-9 px-3 rounded-md border bg-card text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Semua Aksi</option>
                <option value="PERMISSION_CHANGE">Perubahan Izin</option>
                <option value="ACCESS_ATTEMPT">Percobaan Akses</option>
              </select>
              <div className="flex items-center gap-2 bg-card border rounded-md px-2 h-9">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <input 
                  type="date" 
                  className="bg-transparent text-xs outline-none"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-muted-foreground">-</span>
                <input 
                  type="date" 
                  className="bg-transparent text-xs outline-none"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <TabsContent value="logs" className="mt-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="text-sm text-muted-foreground animate-pulse">Memuat data audit...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-xl border border-dashed">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg">Tidak ada log ditemukan</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Coba sesuaikan filter atau rentang tanggal untuk melihat data lainnya.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-bottom">
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Waktu</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pengguna</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Aksi</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Izin / Fitur</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{new Date(log.timestamp).toLocaleDateString('id-ID')}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {log.user_id?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-mono text-muted-foreground">{log.user_id?.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant={log.action_type === "PERMISSION_CHANGE" ? "secondary" : "outline"} className="text-[10px] font-medium">
                              {log.action_type === "PERMISSION_CHANGE" ? "PERUBAHAN" : "AKSES"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <code className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded w-fit">
                                {log.permission_key}
                              </code>
                              {log.resource_id && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3" /> ID: {log.resource_id}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {log.is_granted ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> GRANTED
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">
                                  <XCircle className="h-3 w-3 mr-1" /> DENIED
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs font-mono">{JSON.stringify(log.context || {}, null, 2)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribusi Akses</CardTitle>
                  <CardDescription>Perbandingan antara akses yang diberikan dan ditolak.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                    <div className="flex justify-between w-full text-sm font-medium">
                      <span>Granted</span>
                      <span>{Math.round((stats.granted / stats.total) * 100) || 0}%</span>
                    </div>
                    <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: `${(stats.granted / stats.total) * 100}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${(stats.denied / stats.total) * 100}%` }} />
                    </div>
                    <div className="flex justify-between w-full text-sm font-medium">
                      <span>Denied</span>
                      <span>{Math.round((stats.denied / stats.total) * 100) || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Peringatan Keamanan</CardTitle>
                  <CardDescription>Deteksi otomatis aktivitas mencurigakan.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.denied > 10 ? (
                      <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-600">Tingkat Penolakan Tinggi</p>
                          <p className="text-xs text-muted-foreground">Terdeteksi {stats.denied} penolakan akses. Mohon periksa apakah ada percobaan akses ilegal.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-green-600">Sistem Aman</p>
                          <p className="text-xs text-muted-foreground">Tidak ada anomali akses yang signifikan terdeteksi dalam periode ini.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
