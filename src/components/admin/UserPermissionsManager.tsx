import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { 
  Loader2, Search, Shield, ShieldAlert, ShieldCheck, 
  Save, RefreshCcw, AlertCircle, Info, X, Check
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserPermissionsManagerProps {
  userId: string;
  userName: string;
}

export function UserPermissionsManager({
  userId,
  userName,
}: UserPermissionsManagerProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

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

  // 2. Ambil Izin Spesifik User (Override)
  const { data: userOverrides = [], isLoading: isUserLoading } = useQuery({
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
      const override = userOverrides.find((o: any) => o.permission_key === mp.key);
      const isEnabled = mp.key in pendingChanges 
        ? pendingChanges[mp.key] 
        : (override?.is_enabled ?? false);
      
      return { 
        ...mp, 
        isEnabled, 
        isOverridden: !!override,
        hasChanged: mp.key in pendingChanges 
      };
    });
  }, [masterPermissions, userOverrides, pendingChanges]);

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

  // 6. Mutasi Simpan
  const saveMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("user_permissions")
          .upsert({ 
            user_id: userId, 
            permission_key: update.key, 
            is_enabled: update.isEnabled,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,permission_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
      setPendingChanges({});
      toast.success(`Izin untuk ${userName} berhasil diperbarui!`);
    },
    onError: (err: any) => toast.error(`Gagal: ${err.message}`),
  });

  const handleToggle = (key: string, current: boolean) => {
    setPendingChanges(prev => {
      const next = { ...prev, [key]: !current };
      const override = userOverrides.find((o: any) => o.permission_key === key);
      const originalValue = override?.is_enabled ?? false;
      
      if (next[key] === originalValue) {
        const { [key]: _, ...rest } = next;
        return rest;
      }
      return next;
    });
  };

  const handleRemoveOverride = async (key: string) => {
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", userId)
      .eq("permission_key", key);
    
    if (error) {
      toast.error(`Gagal menghapus override: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
      toast.success(`Override untuk ${key} dihapus.`);
    }
  };

  const handleSave = () => {
    const updates = Object.entries(pendingChanges).map(([key, isEnabled]) => ({ key, isEnabled }));
    saveMutation.mutate(updates);
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (isMasterLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            disabled={!hasChanges || saveMutation.isPending}
            onClick={handleSave}
            className="gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Perubahan {hasChanges && `(${Object.keys(pendingChanges).length})`}
          </Button>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs">
          Izin yang diatur di sini akan <strong>mengabaikan (override)</strong> izin berbasis peran pengguna. 
          Gunakan ini untuk memberikan akses khusus atau mencabut akses tertentu untuk individu ini saja.
        </AlertDescription>
      </Alert>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([group, perms]) => (
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
                    p.isOverridden ? "border-l-blue-500 bg-blue-50/10" : "border-l-transparent"
                  )}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-1 flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium leading-none">{p.label}</span>
                          {p.isOverridden && !p.hasChanged && (
                            <Badge variant="outline" className="text-[10px] h-4 bg-blue-50 text-blue-700 border-blue-200">Override</Badge>
                          )}
                          {p.hasChanged && (
                            <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.isOverridden && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveOverride(p.key)}
                            title="Hapus Override"
                          >
                            <RefreshCcw className="h-3 w-3" />
                          </Button>
                        )}
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
