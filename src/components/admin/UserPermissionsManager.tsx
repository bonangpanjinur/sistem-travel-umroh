import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, RotateCcw, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserPermissionsManagerProps {
  userId: string;
  userName: string;
}

interface PermissionItem {
  permission_key: string;
  label: string;
  group_name: string;
  description: string | null;
  is_enabled: boolean;
  source: 'role' | 'override' | 'default';
}

const GROUP_ICONS: Record<string, string> = {
  "Overview": "📊",
  "Produk & Operasional": "📦",
  "Jamaah & Agent": "👥",
  "Keuangan & Akuntansi": "💰",
  "Sales & CRM": "📈",
  "SDM (HR)": "🧑‍💼",
  "Dokumen & Surat": "📄",
  "Master Data": "🗄️",
  "Pengaturan": "⚙️",
  "Laporan": "📋",
  "Support & Komunikasi": "💬",
};

export function UserPermissionsManager({ userId, userName }: UserPermissionsManagerProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-permissions-detailed", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_all_effective_permissions', {
        p_user_id: userId
      });
      
      if (error) throw error;

      // Fetch labels and groups from permissions_list
      const { data: listData, error: listError } = await supabase
        .from('permissions_list')
        .select('*');
      
      if (listError) throw listError;

      return (data as any[]).map(item => {
        const detail = listData?.find(d => d.key === item.permission_key);
        return {
          ...item,
          label: detail?.label || item.permission_key,
          group_name: detail?.group_name || 'General',
          description: detail?.description
        };
      }) as PermissionItem[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ permissionKey, newValue }: { permissionKey: string; newValue: boolean }) => {
      // Logic: 
      // 1. Get current role-based permission
      // 2. If newValue matches role-based, remove override
      // 3. If newValue differs from role-based, upsert override
      
      const { data: rolePerms } = await supabase
        .from('user_roles')
        .select('role, role_permissions(permission_key, is_enabled)')
        .eq('user_id', userId);
      
      const roleHasIt = rolePerms?.some(rp => 
        (rp.role_permissions as any)?.some((p: any) => p.permission_key === permissionKey && p.is_enabled)
      );

      if (roleHasIt === newValue) {
        // Remove override if it matches role default
        await supabase
          .from('user_permissions_overrides')
          .delete()
          .eq('user_id', userId)
          .eq('permission_key', permissionKey);
      } else {
        // Upsert override
        const { error } = await supabase
          .from('user_permissions_overrides')
          .upsert({ 
            user_id: userId, 
            permission_key: permissionKey, 
            is_enabled: newValue,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, permission_key' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-detailed", userId] });
      toast.success("Izin berhasil diperbarui");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Gagal memperbarui izin");
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_permissions_overrides')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-detailed", userId] });
      toast.success("Semua izin telah dikembalikan ke pengaturan peran (default)");
    },
    onError: () => {
      toast.error("Gagal mereset izin");
    }
  });

  const grouped = useMemo(() => {
    const filtered = searchQuery
      ? permissions.filter(
          (p) =>
            p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      : permissions;

    return filtered.reduce<Record<string, PermissionItem[]>>((acc, p) => {
      if (!acc[p.group_name]) acc[p.group_name] = [];
      acc[p.group_name].push(p);
      return acc;
    }, {});
  }, [permissions, searchQuery]);

  const overrideCount = permissions.filter(p => p.source === 'override').length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5">
              {permissions.filter(p => p.is_enabled).length} Aktif
            </Badge>
            {overrideCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                {overrideCount} Manual Override
              </Badge>
            )}
          </div>
          
          {overrideCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => resetMutation.mutate()}
              className="text-xs h-8 text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset ke Default
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari izin akses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <ScrollArea className="h-[50vh] pr-2">
          <div className="space-y-3">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="rounded-lg border bg-card overflow-hidden">
                <div 
                  className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    const next = new Set(collapsedGroups);
                    if (next.has(group)) next.delete(group);
                    else next.add(group);
                    setCollapsedGroups(next);
                  }}
                >
                  {collapsedGroups.has(group) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="text-sm font-semibold">{GROUP_ICONS[group] || "📁"} {group}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{items.length} izin</span>
                </div>

                {!collapsedGroups.has(group) && (
                  <div className="divide-y divide-border">
                    {items.map((perm) => (
                      <div key={perm.permission_key} className="flex items-center justify-between p-3 hover:bg-accent/5 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium leading-none cursor-pointer" htmlFor={perm.permission_key}>
                              {perm.label}
                            </Label>
                            {perm.source === 'override' && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-200 bg-amber-50 text-amber-700">
                                    Override
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Izin ini telah diubah secara manual dari pengaturan peran.</TooltipContent>
                              </Tooltip>
                            )}
                            {perm.source === 'role' && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
                                Role-based
                              </Badge>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{perm.description}</p>
                          )}
                        </div>
                        <Switch
                          id={perm.permission_key}
                          checked={perm.is_enabled}
                          onCheckedChange={(val) => toggleMutation.mutate({ permissionKey: perm.permission_key, newValue: val })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
