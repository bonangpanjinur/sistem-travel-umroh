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
  List, Eye, Terminal
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminUdacAudit() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Ambil Audit Logs
  const { data: auditLogs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["udac-audit-logs", searchQuery, filterAction, dateRange],
    queryFn: async () => {
      // First try to query from the view which is more robust
      let { data, error } = await supabase
        .from("audit_logs_with_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      // If view fails (maybe not created yet), fallback to direct table query
      if (error) {
        console.warn("View query failed, falling back to direct table query:", error);
        let fallbackQuery = supabase
          .from("audit_logs")
          .select(`
            *,
            user_profile:user_id (
              full_name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(1000);

        const result = await fallbackQuery;
        if (result.error) throw result.error;
        data = result.data;
      }

      // Filter logic for the fetched data
      if (data) {
        let filtered = [...data];
        
        if (filterAction !== "all") {
          filtered = filtered.filter(l => l.action_type === filterAction);
        }
        
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          filtered = filtered.filter(l => 
            (l.user_id && l.user_id.toLowerCase().includes(lowerQuery)) ||
            (l.table_name && l.table_name.toLowerCase().includes(lowerQuery)) ||
            (l.action && l.action.toLowerCase().includes(lowerQuery)) ||
            (l.user_full_name && l.user_full_name.toLowerCase().includes(lowerQuery)) ||
            (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(lowerQuery))
          );
        }
        
        if (dateRange.start) {
          filtered = filtered.filter(l => l.created_at >= dateRange.start);
        }
        
        if (dateRange.end) {
          // Set to end of day
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(l => l.created_at <= endDate.toISOString());
        }
        
        return filtered;
      }

      return [];
    },
  });

  const stats = useMemo(() => {
    const total = auditLogs.length;
    
    // Calculate Permission Changes
    const changes = auditLogs.filter(l => 
      l.action_type === "PERMISSION_CHANGE" || 
      l.table_name === "role_permissions" || 
      l.table_name === "user_permissions"
    ).length;
    
    // Calculate Granted/Denied from ACCESS_ATTEMPT logs
    const granted = auditLogs.filter(l => 
      l.action_type === "ACCESS_ATTEMPT" && 
      (l.new_data?.is_granted === true || l.action?.toLowerCase().includes("granted"))
    ).length;
    
    const denied = auditLogs.filter(l => 
      l.action_type === "ACCESS_ATTEMPT" && 
      (l.new_data?.is_granted === false || l.action?.toLowerCase().includes("denied"))
    ).length;
    
    return { total, changes, granted, denied };
  }, [auditLogs]);

  const handleDownloadCSV = () => {
    if (auditLogs.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const csv = [
      ["Timestamp", "User ID", "User Name", "Table", "Action", "Action Type", "Severity", "Metadata"].join(","),
      ...auditLogs.map(log => [
        log.created_at,
        log.user_id,
        log.user_full_name || (log.user_profile as any)?.full_name || (log.profiles as any)?.full_name || "Unknown",
        log.table_name,
        log.action,
        log.action_type,
        log.severity,
        JSON.stringify(log.metadata || {}).replace(/"/g, '""')
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

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">CRITICAL</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">WARNING</Badge>;
      default:
        return <Badge variant="secondary">INFO</Badge>;
    }
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
              Pantau aktivitas akses real-time dan riwayat perubahan konfigurasi keamanan sistem secara akurat.
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
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="logs" className="gap-2">
                <List className="h-4 w-4" /> Audit Logs
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Activity className="h-4 w-4" /> Insights
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari user, tabel, atau metadata..." 
                  className="pl-10 h-9 w-full bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={filterAction} 
                onChange={(e) => setFilterAction(e.target.value)}
                className="h-9 px-3 rounded-md border bg-card text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              >
                <option value="all">Semua Tipe</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
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
                      <tr className="bg-muted/50 border-b">
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Waktu</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pengguna</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tabel / Entitas</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Aksi</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipe</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setSelectedLog(log)}>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {log.created_at ? new Date(log.created_at).toLocaleDateString('id-ID') : '-'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID') : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {(log.user_full_name || (log.user_profile as any)?.full_name || (log.profiles as any)?.full_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{log.user_full_name || (log.user_profile as any)?.full_name || (log.profiles as any)?.full_name || 'Unknown'}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{log.user_id?.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <code className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded w-fit">
                                {log.table_name || log.entity_name || '-'}
                              </code>
                              {log.record_id && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3" /> ID: {log.record_id.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium line-clamp-1">{log.action}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant={
                              log.action_type === "DELETE" ? "destructive" : 
                              log.action_type === "CREATE" ? "default" : 
                              log.action_type === "ACCESS_ATTEMPT" ? "outline" : "secondary"
                            } className="text-[10px] font-medium">
                              {log.action_type || 'INFO'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {getSeverityBadge(log.severity)}
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
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
                  <CardTitle className="text-base">Distribusi Aktivitas</CardTitle>
                  <CardDescription>Perbandingan antara berbagai tipe aksi yang tercatat dalam log.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                    <div className="space-y-3 w-full">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Akses Diberikan</span>
                          <span>{stats.granted}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${(stats.granted / (stats.granted + stats.denied || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Akses Ditolak</span>
                          <span>{stats.denied}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: `${(stats.denied / (stats.granted + stats.denied || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Perubahan Izin</span>
                          <span>{stats.changes}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${(stats.changes / stats.total) * 100 || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Keamanan & Monitoring</CardTitle>
                  <CardDescription>Ringkasan kondisi keamanan berdasarkan pola log terbaru.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.denied > 10 ? (
                      <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-600">Peringatan Akses Ditolak</p>
                          <p className="text-xs text-muted-foreground">Terdeteksi {stats.denied} percobaan akses yang ditolak. Ini mungkin menandakan upaya akses tidak sah atau konfigurasi izin yang terlalu ketat.</p>
                        </div>
                      </div>
                    ) : stats.changes > 10 ? (
                      <div className="flex items-start gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-orange-600">Aktivitas Perubahan Tinggi</p>
                          <p className="text-xs text-muted-foreground">Terdeteksi {stats.changes} perubahan izin. Pastikan semua perubahan ini telah melalui proses verifikasi yang benar.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-green-600">Sistem Berjalan Normal</p>
                          <p className="text-xs text-muted-foreground">Pola aktivitas akses dan perubahan konfigurasi berada dalam batas wajar.</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 space-y-2">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Rekomendasi Tindakan</p>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                        <li>Lakukan audit berkala setiap 7 hari terhadap log 'CRITICAL'.</li>
                        <li>Verifikasi ulang alasan (reason) pada setiap perubahan izin.</li>
                        <li>Pantau lonjakan 'ACCESS_ATTEMPT' pada jam tidak sibuk.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Detail Log Audit
              </DialogTitle>
              <DialogDescription>
                Informasi lengkap mengenai aktivitas yang tercatat pada sistem.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Waktu Kejadian</p>
                    <p className="text-sm font-medium">{selectedLog?.created_at ? new Date(selectedLog.created_at).toLocaleString('id-ID') : '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Tipe Aksi</p>
                    <div>{getSeverityBadge(selectedLog?.severity)}</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Pengguna</p>
                    <p className="text-sm font-medium">{selectedLog?.user_full_name || 'Unknown User'}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{selectedLog?.user_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Tabel / Entitas</p>
                    <code className="text-xs font-mono bg-muted px-1 rounded">{selectedLog?.table_name || selectedLog?.entity_name || '-'}</code>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Deskripsi Aksi</p>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg border">{selectedLog?.action}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <Activity className="h-3 w-3" /> Metadata & Konteks
                    </p>
                    <pre className="text-xs font-mono bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto border shadow-inner">
                      {JSON.stringify(selectedLog?.metadata || {}, null, 2)}
                    </pre>
                  </div>

                  {(selectedLog?.old_data || selectedLog?.new_data) && (
                    <div className="grid grid-cols-1 gap-4">
                      {selectedLog?.old_data && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Data Lama (Old)</p>
                          <pre className="text-[10px] font-mono bg-muted p-3 rounded-lg overflow-auto border">
                            {JSON.stringify(selectedLog.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog?.new_data && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Data Baru (New)</p>
                          <pre className="text-[10px] font-mono bg-muted p-3 rounded-lg overflow-auto border">
                            {JSON.stringify(selectedLog.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button onClick={() => setSelectedLog(null)}>Tutup Detail</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
