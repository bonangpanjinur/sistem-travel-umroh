import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity, Clock, User, Shield, Search, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminUdacAudit() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Ambil Audit Logs
  const { data: auditLogs = [], isLoading } = useQuery({
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

  const handleDownloadCSV = () => {
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
    toast.success("Audit log berhasil diunduh!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            UDAC Audit & Monitoring
          </h1>
          <p className="text-muted-foreground mt-2">
            Pantau semua aktivitas akses dan perubahan izin dalam sistem.
          </p>
        </div>
        <Button onClick={handleDownloadCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter & Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari user atau permission..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  value={filterAction} 
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="all">Semua Aksi</option>
                  <option value="PERMISSION_CHANGE">Perubahan Izin</option>
                  <option value="ACCESS_ATTEMPT">Percobaan Akses</option>
                </select>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    placeholder="Dari tanggal"
                  />
                  <Input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    placeholder="Sampai tanggal"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <Card>
                  <CardContent className="py-20 text-center text-muted-foreground">
                    Tidak ada audit log ditemukan.
                  </CardContent>
                </Card>
              ) : (
                auditLogs.map((log) => (
                  <Card key={log.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">User</p>
                            <code className="text-xs font-mono">{log.user_id?.slice(0, 8)}...</code>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Aksi</p>
                          <Badge variant={log.action_type === "PERMISSION_CHANGE" ? "secondary" : "outline"}>
                            {log.action_type}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Izin</p>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {log.permission_key}
                          </code>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <Badge variant={log.is_granted ? "default" : "destructive"}>
                            {log.is_granted ? "GRANTED" : "DENIED"}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Resource</p>
                          <code className="text-xs font-mono">{log.resource_id || "-"}</code>
                        </div>

                        <div className="flex items-end">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Waktu</p>
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(log.timestamp).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{auditLogs.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Akses Diberikan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {auditLogs.filter(l => l.is_granted).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Akses Ditolak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {auditLogs.filter(l => !l.is_granted).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Perubahan Izin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {auditLogs.filter(l => l.action_type === "PERMISSION_CHANGE").length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
