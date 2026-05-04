/**
 * MenuSyncManager Component
 * Fitur untuk sinkronisasi menu dari frontend registry ke database
 * Berguna ketika ada menu baru di aplikasi yang belum terdaftar di database
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { RECOMMENDED_MENUS } from '@/lib/admin-menu-registry';

interface SyncResult {
  synced_count: number;
  failed_count: number;
  total_count: number;
}

export function MenuSyncManager() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const isSuperAdmin = hasRole('super_admin');

  // Sync menus mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)('sync_menus_from_registry', {
        _menu_items: RECOMMENDED_MENUS,
      });
      if (error) throw error;
      return data?.[0] as SyncResult;
    },
    onSuccess: (result) => {
      setSyncResult(result);
      queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
      queryClient.invalidateQueries({ queryKey: ['role-menus'] });
      toast.success(
        `Sinkronisasi selesai: ${result.synced_count} berhasil, ${result.failed_count} gagal`
      );
    },
    onError: (e: any) => {
      toast.error('Gagal sinkronisasi: ' + (e?.message || ''));
    },
  });

  if (!isSuperAdmin) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Hanya Super Admin yang dapat mengakses fitur ini.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sinkronisasi Menu
        </CardTitle>
        <CardDescription>
          Sinkronkan menu dari frontend registry ke database. Berguna ketika ada menu baru di aplikasi.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Apa itu sinkronisasi menu?</strong> Proses ini membaca daftar menu dari kode aplikasi
            (RECOMMENDED_MENUS) dan memastikan semuanya terdaftar di database. Jika ada menu baru, akan ditambahkan
            secara otomatis.
          </AlertDescription>
        </Alert>

        {/* Menu stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Menu di Registry</p>
            <p className="text-2xl font-bold mt-1">{RECOMMENDED_MENUS.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Grup Menu</p>
            <p className="text-2xl font-bold mt-1">
              {new Set(RECOMMENDED_MENUS.map(m => m.group_name)).size}
            </p>
          </div>
        </div>

        {/* Sync result */}
        {syncResult && (
          <Alert className={syncResult.failed_count === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}>
            <CheckCircle2 className={syncResult.failed_count === 0 ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-amber-600'} />
            <AlertDescription className={syncResult.failed_count === 0 ? 'text-emerald-900' : 'text-amber-900'}>
              <strong>Hasil Sinkronisasi:</strong> {syncResult.synced_count} berhasil
              {syncResult.failed_count > 0 && `, ${syncResult.failed_count} gagal`}
            </AlertDescription>
          </Alert>
        )}

        {/* Sync button */}
        <Button
          onClick={() => {
            if (confirm('Sinkronkan semua menu dari registry ke database?')) {
              syncMutation.mutate();
            }
          }}
          disabled={syncMutation.isPending}
          className="w-full"
        >
          {syncMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {syncMutation.isPending ? 'Sedang Sinkronisasi...' : 'Sinkronisasi Menu'}
        </Button>

        {/* Menu list preview */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Daftar Menu yang akan Disinkronisasi</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {RECOMMENDED_MENUS.map((menu, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded border text-xs">
                <Badge variant="outline" className="shrink-0 mt-0.5">
                  {menu.group_name}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{menu.label}</p>
                  <p className="text-muted-foreground">{menu.path}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <Alert className="border-slate-200 bg-slate-50">
          <Info className="h-4 w-4 text-slate-600" />
          <AlertDescription className="text-slate-900 text-sm">
            <strong>Tips:</strong> Jalankan sinkronisasi ini setelah menambah menu baru di aplikasi atau setelah
            update versi yang membawa menu baru. Proses ini aman dan dapat dijalankan berkali-kali.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
