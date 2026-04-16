import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Search, Shield, Save, RefreshCcw, AlertCircle, Info, X, Check,
  Plus, Trash2, RotateCcw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserRoleManagement, useUserPermissionControl } from '@/hooks/useUserRoleManagement';

interface UserPermissionsManagerEnhancedProps {
  userId: string;
  userName: string;
}

// Role configurations
const ROLE_CONFIGS: Record<string, { label: string; description: string; color: string }> = {
  super_admin: { label: 'Super Admin', description: 'Akses penuh ke semua fitur', color: 'bg-red-500' },
  owner: { label: 'Owner', description: 'Pemilik bisnis', color: 'bg-purple-500' },
  branch_manager: { label: 'Branch Manager', description: 'Manajer cabang', color: 'bg-blue-500' },
  finance: { label: 'Finance', description: 'Tim keuangan', color: 'bg-green-500' },
  sales: { label: 'Sales', description: 'Tim penjualan', color: 'bg-yellow-500' },
  marketing: { label: 'Marketing', description: 'Tim marketing', color: 'bg-pink-500' },
  operational: { label: 'Operational', description: 'Tim operasional', color: 'bg-indigo-500' },
  equipment: { label: 'Equipment', description: 'Manajemen perlengkapan', color: 'bg-cyan-500' },
  agent: { label: 'Agent', description: 'Agen penjualan', color: 'bg-orange-500' },
  customer: { label: 'Customer', description: 'Pelanggan', color: 'bg-gray-500' },
};

export function UserPermissionsManagerEnhanced({
  userId,
  userName,
}: UserPermissionsManagerEnhancedProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('');

  // Hooks
  const { 
    userRoles, 
    isLoadingRoles, 
    assignRole, 
    removeRole, 
    resetPermissions,
    isAssigningRole,
    isRemovingRole,
    isResettingPermissions
  } = useUserRoleManagement(userId);

  const { grantPermission, revokePermission } = useUserPermissionControl(userId);

  // 1. Ambil Master Permissions
  const { data: masterPermissions = [], isLoading: isMasterLoading } = useQuery({
    queryKey: ["master-permissions-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions_list")
        .select("*")
        .order("group_name", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // 2. Ambil Izin Efektif User (dari user_permissions)
  const { data: userPermissions = [], isLoading: isUserLoading } = useQuery({
    queryKey: ["user-permissions-override", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  // 3. Gabungkan Data
  const permissionMatrix = useMemo(() => {
    return masterPermissions.map((mp: any) => {
      const userPerm = userPermissions.find((o: any) => o.permission_key === mp.key);
      const isEnabled = mp.key in pendingChanges 
        ? pendingChanges[mp.key] 
        : (userPerm?.is_enabled ?? false);
      
      return { 
        ...mp, 
        isEnabled, 
        hasUserPermission: !!userPerm,
        hasChanged: mp.key in pendingChanges 
      };
    });
  }, [masterPermissions, userPermissions, pendingChanges]);

  // 4. Filter
  const filteredPermissions = useMemo(() => {
    return permissionMatrix.filter((p: any) => {
      const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.key.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [permissionMatrix, searchQuery]);

  // 5. Grouping
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPermissions.forEach(p => {
      if (!groups[p.group_name]) groups[p.group_name] = [];
      groups[p.group_name].push(p);
    });
    return groups;
  }, [filteredPermissions]);

  const handleToggle = (key: string, current: boolean) => {
    setPendingChanges(prev => {
      const next = { ...prev, [key]: !current };
      const userPerm = userPermissions.find((o: any) => o.permission_key === key);
      const originalValue = userPerm?.is_enabled ?? false;
      
      if (next[key] === originalValue) {
        const { [key]: _, ...rest } = next;
        return rest;
      }
      return next;
    });
  };

  const handleSave = async () => {
    const updates = Object.entries(pendingChanges);
    if (updates.length === 0) {
      toast.info('Tidak ada perubahan');
      return;
    }

    try {
      for (const [key, isEnabled] of updates) {
        if (isEnabled) {
          await supabase
            .from("user_permissions")
            .upsert({ 
              user_id: userId, 
              permission_key: key, 
              is_enabled: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,permission_key' });
        } else {
          await supabase
            .from("user_permissions")
            .upsert({ 
              user_id: userId, 
              permission_key: key, 
              is_enabled: false,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,permission_key' });
        }
      }
      
      toast.success(`${updates.length} izin berhasil diperbarui!`);
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
    } catch (error: any) {
      toast.error(`Gagal: ${error.message}`);
    }
  };

  const handleAddRole = (roleName: string) => {
    if (!roleName) {
      toast.error('Pilih role terlebih dahulu');
      return;
    }
    assignRole(roleName);
    setSelectedRoleToAdd('');
  };

  const handleRemoveRole = (roleName: string) => {
    if (confirm(`Yakin ingin menghapus role "${ROLE_CONFIGS[roleName]?.label}"?`)) {
      removeRole(roleName);
    }
  };

  const handleResetPermissions = () => {
    if (confirm('Ini akan mereset semua izin ke default berdasarkan role yang dimiliki. Lanjutkan?')) {
      resetPermissions();
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;
  const isLoading = isMasterLoading || isUserLoading || isLoadingRoles;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Available roles (roles not yet assigned to user)
  const assignedRoles = userRoles.map(ur => ur.role);
  const availableRoles = Object.keys(ROLE_CONFIGS).filter(
    role => !assignedRoles.includes(role)
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="permissions">Izin Pengguna</TabsTrigger>
          <TabsTrigger value="roles">Peran Pengguna</TabsTrigger>
        </TabsList>

        {/* Tab: Permissions */}
        <TabsContent value="permissions" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Manajemen Izin Pengguna</h2>
            <p className="text-muted-foreground">
              Kelola izin efektif untuk {userName}. Izin ditampilkan dari tabel user_permissions.
            </p>
          </div>

          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs">
              Izin yang ditampilkan adalah izin <strong>efektif</strong> pengguna. Ubah status izin di sini untuk memberikan akses khusus atau mencabut akses tertentu.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari izin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={() => setPendingChanges({})}>
                  Batalkan
                </Button>
              )}
              <Button 
                size="sm" 
                disabled={!hasChanges}
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Simpan Perubahan {hasChanges && `(${Object.keys(pendingChanges).length})`}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedPermissions).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada izin yang sesuai</p>
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      {group}
                      <Badge variant="secondary" className="ml-auto text-[10px]">{perms.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((p) => (
                        <Card key={p.key} className={cn(
                          "transition-all duration-200 border-l-4",
                          p.hasChanged ? "border-l-amber-500 bg-amber-50/30" : 
                          p.hasUserPermission ? "border-l-blue-500 bg-blue-50/10" : "border-l-transparent"
                        )}>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="space-y-1 flex-1 mr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium leading-none">{p.label}</span>
                                {p.hasUserPermission && !p.hasChanged && (
                                  <Badge variant="outline" className="text-[10px] h-4 bg-blue-50 text-blue-700 border-blue-200">Aktif</Badge>
                                )}
                                {p.hasChanged && (
                                  <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">{p.key}</span>
                              <Checkbox 
                                checked={p.isEnabled}
                                onCheckedChange={() => handleToggle(p.key, p.isEnabled)}
                                className="h-5 w-5"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab: Roles */}
        <TabsContent value="roles" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Manajemen Peran Pengguna</h2>
            <p className="text-muted-foreground">
              Kelola peran yang dimiliki {userName}. Saat menambahkan peran, izin dari peran tersebut akan disalin ke user_permissions.
            </p>
          </div>

          <Alert className="bg-green-50 border-green-200 text-green-800">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs">
              Menambahkan peran akan secara otomatis menyalin izin dari peran tersebut ke izin pengguna.
            </AlertDescription>
          </Alert>

          {/* Assigned Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Peran yang Dimiliki</CardTitle>
              <CardDescription>Peran yang saat ini diterapkan ke pengguna</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pengguna belum memiliki peran apapun</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assignedRoles.map(role => {
                    const config = ROLE_CONFIGS[role];
                    return (
                      <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", config?.color || "bg-gray-500")} />
                          <div>
                            <p className="text-sm font-medium">{config?.label || role}</p>
                            <p className="text-xs text-muted-foreground">{config?.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveRole(role)}
                          disabled={isRemovingRole}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Role */}
          {availableRoles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tambah Peran</CardTitle>
                <CardDescription>Pilih peran untuk ditambahkan ke pengguna</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableRoles.map(role => {
                    const config = ROLE_CONFIGS[role];
                    return (
                      <Button
                        key={role}
                        variant="outline"
                        className="justify-start h-auto p-3"
                        onClick={() => setSelectedRoleToAdd(role)}
                      >
                        <div className={cn("w-3 h-3 rounded-full mr-3", config?.color || "bg-gray-500")} />
                        <div className="text-left">
                          <div className="font-medium text-sm">{config?.label || role}</div>
                          <div className="text-xs text-muted-foreground">{config?.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                {selectedRoleToAdd && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleAddRole(selectedRoleToAdd)}
                      disabled={isAssigningRole}
                      className="gap-2"
                    >
                      {isAssigningRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Tambah {ROLE_CONFIGS[selectedRoleToAdd]?.label}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedRoleToAdd('')}
                    >
                      Batal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reset Permissions */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-lg">Reset Izin ke Default</CardTitle>
              <CardDescription>Menghapus semua izin manual dan menyalin ulang dari peran yang dimiliki</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleResetPermissions}
                disabled={isResettingPermissions || assignedRoles.length === 0}
              >
                {isResettingPermissions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Reset Izin
              </Button>
              {assignedRoles.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Pengguna harus memiliki minimal satu peran untuk reset</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
