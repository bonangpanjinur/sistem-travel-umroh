import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Shield, Activity, AlertTriangle, Clock, User, 
  Search, Filter, Download, RefreshCw, Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  status: string;
  failure_reason: string | null;
  device_info: any;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface AuditLog {
  id: string;
  user_id: string;
  table_name: string;
  action: string;
  action_type: string;
  severity: string;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  is_successful: boolean;
  failure_reason: string | null;
  created_at: string;
}

export default function AdminSecurityAudit() {
  const [activeTab, setActiveTab] = useState("activity");
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);

  // Fetch activity logs
  const { data: activityLogs = [], isLoading: loadingActivity, refetch: refetchActivity } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(d => d.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data?.map(log => ({
        ...log,
        profiles: profileMap.get(log.user_id) || null
      })) as ActivityLog[];
    }
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: loadingAudit, refetch: refetchAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(d => d.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return data?.map(log => ({
        ...log,
        profiles: profileMap.get(log.user_id) || null
      })) as AuditLog[];
    }
  });

  // Fetch login attempts
  const { data: loginAttempts = [], isLoading: loadingLogin, refetch: refetchLogin } = useQuery({
    queryKey: ['login-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as LoginAttempt[];
    }
  });

  // Stats calculations
  const failedLogins = loginAttempts.filter(l => !l.is_successful).length;
  const criticalAudits = auditLogs.filter(a => a.severity === 'critical').length;
  const todayActivity = activityLogs.filter(a => 
    new Date(a.created_at).toDateString() === new Date().toDateString()
  ).length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'warning': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Warning</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' 
      ? <Badge className="bg-green-100 text-green-700">Success</Badge>
      : <Badge variant="destructive">Failed</Badge>;
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security & Audit
          </h1>
          <p className="text-muted-foreground">
            Monitor aktivitas sistem dan audit trail
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            refetchActivity();
            refetchAudit();
            refetchLogin();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktivitas Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{todayActivity}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Login Gagal (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{failedLogins}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audit Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{criticalAudits}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{auditLogs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="login">Login Attempts</TabsTrigger>
        </TabsList>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Riwayat aktivitas user (login, logout, perubahan password)</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : activityLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada aktivitas tercatat</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {log.profiles?.full_name || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.device_info?.browser || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>Perubahan data sensitif (create, update, delete)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari..." 
                      className="pl-9 w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[120px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredAuditLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada audit log</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Tabel</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                        </TableCell>
                        <TableCell>{log.profiles?.full_name || 'System'}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{log.table_name}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action_type || log.action}</Badge>
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity || 'info')}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedAudit(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login Attempts Tab */}
        <TabsContent value="login" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Login Attempts</CardTitle>
              <CardDescription>Monitoring percobaan login untuk deteksi brute force</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogin ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : loginAttempts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada login attempt tercatat</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Alasan Gagal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="text-sm">
                          {format(new Date(attempt.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                        </TableCell>
                        <TableCell>{attempt.email}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {attempt.ip_address || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          {attempt.is_successful 
                            ? <Badge className="bg-green-100 text-green-700">Success</Badge>
                            : <Badge variant="destructive">Failed</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {attempt.failure_reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu-access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Access Audit</CardTitle>
              <CardDescription>Pemantauan real-time izin akses menu dan fitur</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMenuAudit ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : menuAccessAudit.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Belum ada log akses menu</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Fitur / Permission</TableHead>
                      <TableHead>Akses</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuAccessAudit.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.accessed_at), "dd MMM yyyy HH:mm", { locale: id })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {log.profiles?.full_name || 'System/Guest'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.permission_key}
                          </code>
                        </TableCell>
                        <TableCell>
                          {log.access_granted 
                            ? <Badge className="bg-green-100 text-green-700">Granted</Badge>
                            : <Badge variant="destructive">Denied</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.ip_address || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Detail Dialog */}
      <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Audit Log</DialogTitle>
          </DialogHeader>
          {selectedAudit && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tabel</p>
                    <p className="font-medium">{selectedAudit.table_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aksi</p>
                    <p className="font-medium">{selectedAudit.action_type || selectedAudit.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedAudit.profiles?.full_name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Waktu</p>
                    <p className="font-medium">
                      {format(new Date(selectedAudit.created_at), "dd MMM yyyy HH:mm:ss", { locale: id })}
                    </p>
                  </div>
                </div>

                {selectedAudit.old_data && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Data Lama</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedAudit.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedAudit.new_data && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Data Baru</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedAudit.new_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedAudit.metadata && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Metadata</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedAudit.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
