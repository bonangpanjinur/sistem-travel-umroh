import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface AuditLogEntry {
  id: string;
  changed_by: string;
  changed_at: string;
  permission_key: string;
  old_value: boolean;
  new_value: boolean;
  user_id?: string;
  role?: string;
}

/**
 * Component to display audit log for permission changes
 * 
 * This component shows a history of all permission changes made by Super Admins,
 * including who made the change, what was changed, and when.
 */
export function PermissionAuditLog() {
  const [filterUser, setFilterUser] = useState('');
  const [filterPermission, setFilterPermission] = useState('');

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['permission-audit-logs', filterUser, filterPermission],
    queryFn: async () => {
      let query = supabase
        .from('user_permissions_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (filterUser) {
        query = query.eq('changed_by', filterUser);
      }

      if (filterPermission) {
        query = query.ilike('permission_key', `%${filterPermission}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const handleExport = () => {
    if (!auditLogs) return;

    const csv = [
      ['Diubah Oleh', 'Tanggal', 'Permission', 'Nilai Lama', 'Nilai Baru', 'User ID', 'Role'],
      ...auditLogs.map(log => [
        log.changed_by,
        format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: idLocale }),
        log.permission_key,
        log.old_value ? 'Aktif' : 'Nonaktif',
        log.new_value ? 'Aktif' : 'Nonaktif',
        log.user_id || '-',
        log.role || '-'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `permission-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Perubahan Permission</CardTitle>
        <CardDescription>
          Log lengkap dari semua perubahan permission yang dilakukan oleh Super Admin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Filter berdasarkan User</label>
            <Input
              placeholder="Cari user..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Filter berdasarkan Permission</label>
            <Input
              placeholder="Cari permission..."
              value={filterPermission}
              onChange={(e) => setFilterPermission(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!auditLogs || auditLogs.length === 0}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Diubah Oleh</th>
                    <th className="px-4 py-2 text-left font-medium">Tanggal</th>
                    <th className="px-4 py-2 text-left font-medium">Permission</th>
                    <th className="px-4 py-2 text-left font-medium">Perubahan</th>
                    <th className="px-4 py-2 text-left font-medium">User/Role</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2">{log.changed_by}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: idLocale })}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{log.permission_key}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.old_value ? 'default' : 'secondary'} className="text-xs">
                            {log.old_value ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant={log.new_value ? 'default' : 'secondary'} className="text-xs">
                            {log.new_value ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {log.user_id && <div>User: {log.user_id}</div>}
                        {log.role && <div>Role: {log.role}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Tidak ada riwayat perubahan permission
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
