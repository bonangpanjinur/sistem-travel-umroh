/**
 * DashboardAccessManagerPanel.tsx
 * 
 * Reusable component untuk mengelola akses dashboard per peran.
 * Dapat digunakan sebagai standalone page atau embedded dalam dialog/tab.
 * 
 * Fitur:
 * - Lihat daftar peran dan modul dashboard yang tersedia
 * - Enable/disable modul untuk setiap peran
 * - Set default dashboard untuk setiap peran
 * - Audit trail untuk perubahan konfigurasi
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fromExtra, type DashboardAccessConfigRow, type DashboardAccessAuditLogRow } from '@/integrations/supabase/extra-tables';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Settings, Shield, History } from 'lucide-react';
import { DASHBOARD_MODULES, ROLE_DASHBOARD_CONFIG } from '@/lib/dashboard-config';
import { AppRole } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { logAuditEvent } from '@/lib/audit-logger';
import { toast } from 'sonner';

const ROLES: AppRole[] = [
  'super_admin', 'owner', 'branch_manager', 'finance', 'sales',
  'marketing', 'operational', 'equipment', 'agent', 'customer'
];

interface DashboardAccessManagerPanelProps {
  mode?: 'standalone' | 'embedded'; // standalone = full page, embedded = in dialog/tab
  onClose?: () => void;
}

export default function DashboardAccessManagerPanel({ 
  mode = 'standalone',
  onClose 
}: DashboardAccessManagerPanelProps) {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AppRole>('branch_manager');
  const [saving, setSaving] = useState(false);

  // Check if user is super admin only
  const isSuperAdmin = hasRole('super_admin');
  const isOwner = hasRole('owner');
  const isAdmin = isSuperAdmin || isOwner;

  if (!isSuperAdmin) {
    return (
      <div className={mode === 'embedded' ? '' : 'flex items-center justify-center min-h-screen'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <p className="font-bold">Akses Ditolak</p>
            </div>
            <p className="text-muted-foreground">Hanya super admin yang dapat mengakses fitur ini.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch dashboard access config
  const { data: accessConfig, isLoading: configLoading, error: configError } = useQuery<
    DashboardAccessConfigRow | null,
    Error
  >({
    queryKey: ['dashboard-access-config', selectedRole],
    queryFn: async () => {
      const { data, error } = await fromExtra('dashboard_access_config')
        .select('*')
        .eq('role', selectedRole)
        .maybeSingle();

      if (error) {
        // PGRST116 = no rows returned, which is OK
        if (error.code === 'PGRST116') {
          return null;
        }
        
        // 42P01 = table does not exist (PostgreSQL error code)
        // 404 = table not found (Supabase REST error)
        if (error.code === '42P01' || (error as any).status === 404) {
          throw new Error('TABLE_NOT_FOUND');
        }
        
        console.error('Error fetching config:', error);
        throw error;
      }

      return (data as DashboardAccessConfigRow | null) ?? null;
    },
    retry: false,
  });

  const isTableMissing = configError?.message === 'TABLE_NOT_FOUND';

  // Fetch audit log
  const { data: auditLog = [] } = useQuery<DashboardAccessAuditLogRow[]>({
    queryKey: ['dashboard-access-audit-log', selectedRole],
    queryFn: async () => {
      const { data, error } = await fromExtra('dashboard_access_audit_log')
        .select('*')
        .eq('role', selectedRole)
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) {
        // 42P01 = table does not exist
        // 404 = table not found
        if (error.code === '42P01' || (error as any).status === 404) {
          return [];
        }
        console.error('Error fetching audit log:', error);
        return [];
      }

      return (data as DashboardAccessAuditLogRow[] | null) ?? [];
    },
  });

  // Mutation untuk update config (upsert)
  const updateConfigMutation = useMutation({
    mutationFn: async ({
      enabledModules,
      disabledModules,
      defaultDashboard,
    }: {
      enabledModules: string[];
      disabledModules: string[];
      defaultDashboard: string;
    }) => {
      let result;
      
      if (accessConfig) {
        // Update existing
        const { data, error } = await fromExtra('dashboard_access_config')
          .update({
            enabled_modules: enabledModules,
            disabled_modules: disabledModules,
            default_dashboard: defaultDashboard,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('role', selectedRole)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await fromExtra('dashboard_access_config')
          .insert({
            role: selectedRole,
            enabled_modules: enabledModules,
            disabled_modules: disabledModules,
            default_dashboard: defaultDashboard,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }

      // Log to audit trail
      await logAuditEvent({
        table_name: 'dashboard_access_config',
        record_id: result.id,
        action: accessConfig ? 'update' : 'create',
        action_type: accessConfig ? 'UPDATE' : 'CREATE',
        old_data: accessConfig,
        new_data: result,
        severity: 'warning',
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-access-config'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-access-audit-log'] });
      setSaving(false);
      toast.success('Konfigurasi dashboard berhasil diperbarui');
    },
    onError: (error) => {
      console.error('Error updating config:', error);
      setSaving(false);
      toast.error('Gagal memperbarui konfigurasi dashboard');
    },
  });

  const handleToggleModule = useCallback(
    (moduleKey: string, enabled: boolean) => {
      const cfg = accessConfig;
      const currentEnabled = cfg?.enabled_modules ?? ROLE_DASHBOARD_CONFIG[selectedRole]?.availableModules ?? [];
      const currentDisabled = cfg?.disabled_modules ?? [];
      
      const enabledModules = enabled
        ? [...currentEnabled, moduleKey]
        : currentEnabled.filter((m: string) => m !== moduleKey);

      const disabledModules = !enabled
        ? [...currentDisabled, moduleKey]
        : currentDisabled.filter((m: string) => m !== moduleKey);

      setSaving(true);
      updateConfigMutation.mutate({
        enabledModules,
        disabledModules,
        defaultDashboard: cfg?.default_dashboard ?? ROLE_DASHBOARD_CONFIG[selectedRole]?.defaultDashboard,
      });
    },
    [accessConfig, selectedRole, updateConfigMutation]
  );

  const handleSetDefaultDashboard = useCallback(
    (moduleKey: string) => {
      const cfg = accessConfig;
      const currentEnabled = cfg?.enabled_modules ?? ROLE_DASHBOARD_CONFIG[selectedRole]?.availableModules ?? [];
      const currentDisabled = cfg?.disabled_modules ?? [];

      setSaving(true);
      updateConfigMutation.mutate({
        enabledModules: currentEnabled,
        disabledModules: currentDisabled,
        defaultDashboard: moduleKey,
      });
    },
    [accessConfig, selectedRole, updateConfigMutation]
  );

  const roleConfig = ROLE_DASHBOARD_CONFIG[selectedRole];
  const enabledModules = accessConfig?.enabled_modules ?? [];
  const disabledModules = accessConfig?.disabled_modules ?? [];
  const defaultDashboard = accessConfig?.default_dashboard;

  const containerClass = mode === 'embedded' ? 'space-y-4 w-full' : 'space-y-8 pb-10';
  const headerClass = mode === 'embedded' ? 'space-y-1' : 'space-y-2';

  return (
    <div className={`${containerClass} ${mode === 'embedded' ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : ''}`}>
      {/* Header - Only show in standalone mode */}
      {mode === 'standalone' && (
        <div className={headerClass}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Manajemen Akses Dashboard</h1>
              <p className="text-muted-foreground">Kelola modul dashboard yang dapat diakses oleh setiap peran</p>
            </div>
          </div>
        </div>
      )}

      {/* Role Selection */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Pilih Peran</CardTitle>
          <CardDescription>Pilih peran untuk mengatur akses dashboardnya</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_DASHBOARD_CONFIG[role]?.label || role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table Missing Warning */}
      {isTableMissing && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-amber-800">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Tabel Database Belum Dibuat</p>
                <p className="text-sm">
                  Fitur ini memerlukan tabel <code>dashboard_access_config</code> dan <code>dashboard_access_audit_log</code> di Supabase.
                  Silakan jalankan file migrasi SQL yang tersedia di <code>src/lib/migrations/dashboard-access-config.sql</code> di SQL Editor Supabase Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="modules" className="w-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 bg-background">
          <TabsTrigger value="modules">Modul Dashboard</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4 w-full max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
          {/* Role Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{roleConfig?.label}</CardTitle>
              <CardDescription>{roleConfig?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-muted-foreground mb-2">Modul yang Diaktifkan</p>
                  <div className="flex flex-wrap gap-2">
                    {enabledModules.map((moduleKey: string) => {
                      const module = DASHBOARD_MODULES[moduleKey];
                      return (
                        <Badge key={moduleKey} variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          {module?.label || moduleKey}
                        </Badge>
                      );
                    })}
                    {enabledModules.length === 0 && (
                      <span className="text-sm text-muted-foreground italic">Tidak ada modul yang diaktifkan</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-muted-foreground mb-2">Default Dashboard</p>
                  {defaultDashboard ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {DASHBOARD_MODULES[defaultDashboard]?.label || defaultDashboard}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Belum diatur</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konfigurasi Modul</CardTitle>
              <CardDescription>Aktifkan atau nonaktifkan modul untuk peran ini</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {configLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(DASHBOARD_MODULES).map(([moduleKey, module]) => (
                    <div key={moduleKey} className="flex flex-col gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm line-clamp-2">{module.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{module.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Checkbox
                            checked={enabledModules.includes(moduleKey)}
                            onCheckedChange={(checked) => handleToggleModule(moduleKey, checked as boolean)}
                            disabled={saving}
                          />
                        </div>
                      </div>
                      {enabledModules.includes(moduleKey) && (
                        <div className="flex justify-end">
                          <Button
                            variant={defaultDashboard === moduleKey ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSetDefaultDashboard(moduleKey)}
                            disabled={saving}
                            className="text-xs whitespace-nowrap"
                          >
                            {defaultDashboard === moduleKey ? '✓ Default' : 'Set Default'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4 w-full max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Riwayat Perubahan</CardTitle>
              <CardDescription>Audit trail untuk perubahan konfigurasi akses dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditLog.length > 0 ? (
                <div className="space-y-3">
                  {auditLog.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
                        <History className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm line-clamp-1">{log.action}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {log.module_key && `Modul: ${log.module_key}`}
                          {log.old_value && ` (dari: ${log.old_value})`}
                          {log.new_value && ` (ke: ${log.new_value})`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.changed_at), { locale: idLocale, addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Tidak ada riwayat perubahan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
