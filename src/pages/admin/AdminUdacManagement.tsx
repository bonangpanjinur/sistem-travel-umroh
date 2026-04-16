import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Shield, Save, Users, Search, Filter, Settings, 
  Activity, Lock, Unlock, ChevronRight, ChevronDown, 
  RefreshCcw, AlertCircle, CheckCircle2, Info,
  LayoutGrid, List, ShieldCheck, ShieldAlert, History,
  CheckSquare, Square
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

// Definisi Tipe
type AppRole = string;

interface Permission {
  key: string;
  label: string;
  group_name: string;
  description: string;
  type: string;
  resource_identifier: string;
  is_enabled: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500", description: "Akses penuh ke semua fitur sistem" },
  owner: { label: "Owner", color: "bg-purple-500", description: "Pemilik bisnis dengan kontrol penuh" },
  branch_manager: { label: "Branch Manager", color: "bg-blue-500", description: "Manajer operasional tingkat cabang" },
  finance: { label: "Finance", color: "bg-green-500", description: "Staf keuangan dan akuntansi" },
  operational: { label: "Operational", color: "bg-orange-500", description: "Staf operasional lapangan" },
  sales: { label: "Sales", color: "bg-cyan-500", description: "Staf penjualan dan booking" },
  marketing: { label: "Marketing", color: "bg-pink-500", description: "Staf pemasaran dan leads" },
  equipment: { label: "Equipment", color: "bg-yellow-500", description: "Staf logistik dan perlengkapan" },
  agent: { label: "Agent", color: "bg-indigo-500", description: "Mitra agen luar" },
};

export default function AdminUdacManagement() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("branch_manager");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeGroup, setActiveGroup] = useState<string>("all");

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

  // 2. Ambil Izin untuk Role Terpilih
  const { data: rolePermissions = [], isLoading: isRoleLoading } = useQuery({
    queryKey: ["role-permissions", selectedRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", selectedRole);
      if (error) throw error;
      return data;
    },
  });

  // 3. Gabungkan Data untuk Matriks
  const permissionMatrix = useMemo(() => {
    return masterPermissions.map((mp: any) => {
      const rp = rolePermissions.find((p: any) => p.permission_key === mp.key);
      const isEnabled = mp.key in pendingChanges 
        ? pendingChanges[mp.key] 
        : (rp?.is_enabled ?? false);
      
      return { ...mp, isEnabled, hasChanged: mp.key in pendingChanges };
    });
  }, [masterPermissions, rolePermissions, pendingChanges]);

  // 4. Extract Groups
  const groups = useMemo(() => {
    const uniqueGroups = Array.from(new Set(masterPermissions.map((p: any) => p.group_name)));
    return ["all", ...uniqueGroups.sort()];
  }, [masterPermissions]);

  // 5. Filter & Search
  const filteredPermissions = useMemo(() => {
    return permissionMatrix.filter((p: any) => {
      const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || p.type === filterType;
      const matchesGroup = activeGroup === "all" || p.group_name === activeGroup;
      return matchesSearch && matchesType && matchesGroup;
    });
  }, [permissionMatrix, searchQuery, filterType, activeGroup]);

  // 6. Mutasi Simpan
  const saveMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .upsert({ 
            role: selectedRole, 
            permission_key: update.key, 
            is_enabled: update.isEnabled,
            updated_at: new Date().toISOString()
          }, { onConflict: 'role,permission_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // 1. Invalidate cache internal management
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      
      // 2. PENTING: Invalidate cache yang digunakan oleh Sidebar/Layout
      queryClient.invalidateQueries({ queryKey: ["udac-permissions"] });
      
      // 3. PENTING: Invalidate legacy permission cache untuk ProtectedRoute
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      
      setPendingChanges({});
      toast.success("Izin berhasil diperbarui secara dinamis! Sidebar dan halaman akan refresh otomatis.", {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    },
    onError: (err: any) => toast.error(`Gagal: ${err.message}`),
  });

  const handleToggle = (key: string, current: boolean) => {
    setPendingChanges(prev => {
      const next = { ...prev, [key]: !current };
      // Jika nilai kembali ke awal, hapus dari pending
      const rp = rolePermissions.find((p: any) => p.permission_key === key);
      const originalValue = rp?.is_enabled ?? false;
      if (next[key] === originalValue) {
        const { [key]: _, ...rest } = next;
        return rest;
      }
      return next;
    });
  };

  const handleSelectAllInGroup = (group: string, select: boolean) => {
    const groupPerms = permissionMatrix.filter(p => group === "all" || p.group_name === group);
    const newPending = { ...pendingChanges };
    
    groupPerms.forEach(p => {
      const rp = rolePermissions.find((rp: any) => rp.permission_key === p.key);
      const originalValue = rp?.is_enabled ?? false;
      
      if (select !== originalValue) {
        newPending[p.key] = select;
      } else {
        delete newPending[p.key];
      }
    });
    
    setPendingChanges(newPending);
  };

  const handleSave = () => {
    const updates = Object.entries(pendingChanges).map(([key, isEnabled]) => ({ key, isEnabled }));
    saveMutation.mutate(updates);
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number; enabled: number }> = {};
    groups.forEach(g => {
      const perms = permissionMatrix.filter(p => g === "all" || p.group_name === g);
      stats[g] = {
        total: perms.length,
        enabled: perms.filter(p => p.isEnabled).length
      };
    });
    return stats;
  }, [groups, permissionMatrix]);

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Universal Dynamic Access Control
              </h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">v2.1 Granular</Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Konfigurasi hak akses granular untuk setiap peran. Perubahan akan langsung berdampak pada UI dan API secara real-time.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" asChild className="gap-2">
              <Link to="/admin/udac/audit">
                <History className="h-4 w-4" />
                Audit Log
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-8 hidden md:block" />
            {hasChanges && (
              <Button 
                variant="ghost" 
                onClick={() => setPendingChanges({})}
                className="text-muted-foreground hover:text-destructive"
              >
                Batalkan
              </Button>
            )}
            <Button 
              disabled={!hasChanges || saveMutation.isPending}
              onClick={handleSave}
              className={cn(
                "gap-2 shadow-lg transition-all duration-300",
                hasChanges ? "bg-primary hover:bg-primary/90 scale-105" : ""
              )}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan {hasChanges && `(${Object.keys(pendingChanges).length})`}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Roles & Stats */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Peran Sistem
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-1 p-1">
                    {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                      <button
                        key={role}
                        onClick={() => { setSelectedRole(role); setPendingChanges({}); }}
                        className={cn(
                          "w-full group flex flex-col items-start gap-1 px-4 py-3 rounded-lg transition-all text-left",
                          selectedRole === role 
                            ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20" 
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm">{config.label}</span>
                          {selectedRole === role && <ChevronRight className="h-4 w-4 opacity-50" />}
                        </div>
                        <span className={cn(
                          "text-[10px] line-clamp-1",
                          selectedRole === role ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {config.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Ringkasan Akses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/50 p-3 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {permissionMatrix.filter(p => p.isEnabled).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Aktif</div>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {permissionMatrix.filter(p => !p.isEnabled).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Dibatasi</div>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-start gap-2 bg-background/50 p-3 rounded-lg border italic">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  <span>Super Admin memiliki bypass otomatis di level sistem untuk semua izin.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content: Permission Matrix */}
          <div className="lg:col-span-9 space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari izin (e.g. 'booking', 'edit')..." 
                  className="pl-10 bg-muted/30 border-none focus-visible:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex bg-muted p-1 rounded-lg shrink-0">
                  <Button 
                    variant={viewMode === "list" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4 mr-2" /> List
                  </Button>
                  <Button 
                    variant={viewMode === "grid" ? "secondary" : "ghost"} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" /> Grid
                  </Button>
                </div>
                <Separator orientation="vertical" className="h-6 mx-1 hidden md:block" />
                <select 
                  className="h-8 rounded-lg border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Semua Tipe</option>
                  <option value="ACTION">Action</option>
                  <option value="UI_COMPONENT">UI Component</option>
                  <option value="API_ENDPOINT">API Endpoint</option>
                  <option value="DATA_FIELD">Data Field</option>
                </select>
              </div>
            </div>

            {/* Group Tabs */}
            <Tabs value={activeGroup} onValueChange={setActiveGroup} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-card p-1">
                <TabsList className="bg-transparent h-9">
                  {groups.map(group => (
                    <TabsTrigger 
                      key={group} 
                      value={group}
                      className="text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {group === "all" ? "Semua Grup" : group}
                      <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                        {groupStats[group]?.total || 0}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              <TabsContent value={activeGroup} className="mt-6 space-y-4">
                {/* Bulk Actions for Group */}
                <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-dashed">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Mengelola {filteredPermissions.length} izin dalam grup ini
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1.5"
                      onClick={() => handleSelectAllInGroup(activeGroup, true)}
                    >
                      <CheckSquare className="h-3 w-3" /> Pilih Semua
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1.5"
                      onClick={() => handleSelectAllInGroup(activeGroup, false)}
                    >
                      <Square className="h-3 w-3" /> Hapus Semua
                    </Button>
                  </div>
                </div>

                {(isMasterLoading || isRoleLoading) ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                    <p className="text-sm text-muted-foreground animate-pulse">Menyinkronkan matriks izin...</p>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-xl border border-dashed">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-bold text-lg">Tidak ada izin ditemukan</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Coba ubah kata kunci pencarian atau filter tipe untuk menemukan apa yang Anda cari.
                    </p>
                    <Button variant="link" onClick={() => { setSearchQuery(""); setFilterType("all"); setActiveGroup("all"); }}>
                      Reset Semua Filter
                    </Button>
                  </div>
                ) : (
                  <div className={cn(
                    "grid gap-4",
                    viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                  )}>
                    {filteredPermissions.map((p: any) => (
                      <Card 
                        key={p.key} 
                        className={cn(
                          "group transition-all duration-300 hover:shadow-md border-l-4",
                          p.isEnabled ? "border-l-green-500" : "border-l-destructive/30",
                          p.hasChanged && "ring-2 ring-primary/30 bg-primary/5 border-l-primary"
                        )}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">
                                  {p.label}
                                </span>
                                <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 bg-muted/50">
                                  {p.key}
                                </Badge>
                                {p.hasChanged && (
                                  <Badge className="text-[9px] bg-primary animate-pulse">Pending</Badge>
                                )}
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {p.description || "Tidak ada deskripsi tersedia untuk izin ini."}
                              </p>
                              
                              <div className="flex flex-wrap gap-3 pt-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                                  <div className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    p.type === 'ACTION' ? "bg-blue-500" : 
                                    p.type === 'UI_COMPONENT' ? "bg-purple-500" : "bg-orange-500"
                                  )} />
                                  {p.type}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                                  <LayoutGrid className="h-3 w-3" /> {p.group_name}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-center gap-3 bg-muted/30 p-3 rounded-xl min-w-[80px]">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    {p.isEnabled ? (
                                      <Unlock className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Lock className="h-4 w-4 text-destructive" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {p.isEnabled ? "Akses Diizinkan" : "Akses Dibatasi"}
                                </TooltipContent>
                              </Tooltip>
                              
                              <Checkbox 
                                checked={p.isEnabled} 
                                onCheckedChange={() => handleToggle(p.key, p.isEnabled)}
                                className="h-5 w-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
