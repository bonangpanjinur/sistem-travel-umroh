import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Save, Users, Search, Filter, Settings, Activity, Lock, Unlock, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Definisi Tipe
type AppRole = any; // Diambil dari database enum

interface Permission {
  key: string;
  label: string;
  group_name: string;
  description: string;
  type: string;
  resource_identifier: string;
  is_enabled: boolean;
}

export default function AdminUdacManagement() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("branch_manager");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  // 1. Ambil Master Permissions
  const { data: masterPermissions = [], isLoading: isMasterLoading } = useQuery({
    queryKey: ["master-permissions-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions_list")
        .select("*")
        .order("group_name", { ascending: true });
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

  // 4. Filter & Search
  const filteredPermissions = useMemo(() => {
    return permissionMatrix.filter((p: any) => {
      const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [permissionMatrix, searchQuery, filterType]);

  // 5. Mutasi Simpan
  const saveMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .upsert({ 
            role: selectedRole, 
            permission_key: update.key, 
            is_enabled: update.isEnabled 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setPendingChanges({});
      toast.success("Izin berhasil diperbarui secara dinamis!");
    },
    onError: (err: any) => toast.error(`Gagal: ${err.message}`),
  });

  const handleToggle = (key: string, current: boolean) => {
    setPendingChanges(prev => ({ ...prev, [key]: !current }));
  };

  const handleSave = () => {
    const updates = Object.entries(pendingChanges).map(([key, isEnabled]) => ({ key, isEnabled }));
    saveMutation.mutate(updates);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Universal Dynamic Access Control (UDAC)
          </h1>
          <p className="text-muted-foreground mt-2">
            Manajemen izin akses total untuk setiap fitur, aksi, dan komponen sistem.
          </p>
        </div>
        <div className="flex gap-2">
          {Object.keys(pendingChanges).length > 0 && (
            <Button variant="outline" onClick={() => setPendingChanges({})}>Reset</Button>
          )}
          <Button 
            disabled={Object.keys(pendingChanges).length === 0 || saveMutation.isPending}
            onClick={handleSave}
            className="gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Perubahan ({Object.keys(pendingChanges).length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Role & Filter */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Pilih Peran</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {["branch_manager", "finance", "operational", "sales", "marketing", "agent"].map(role => (
                <button
                  key={role}
                  onClick={() => { setSelectedRole(role); setPendingChanges({}); }}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-md transition-all text-sm font-medium capitalize",
                    selectedRole === role ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                  )}
                >
                  {role.replace("_", " ")}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Filter Tipe</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {["all", "ACTION", "UI_COMPONENT", "API_ENDPOINT", "DATA_FIELD"].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-md text-xs font-medium",
                    filterType === type ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
                  )}
                >
                  {type}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Permission Matrix */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari izin berdasarkan nama atau kunci..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="h-10 px-4">{filteredPermissions.length} Izin Ditemukan</Badge>
          </div>

          {(isMasterLoading || isRoleLoading) ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPermissions.map((p: any) => (
                <Card key={p.key} className={cn("transition-all", p.hasChanged && "border-primary ring-1 ring-primary/20 bg-primary/5")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{p.label}</span>
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{p.key}</code>
                        <Badge variant="secondary" className="text-[9px] uppercase">{p.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                      <div className="flex gap-3 mt-2">
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Filter className="h-3 w-3" /> Group: {p.group_name}
                        </span>
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Settings className="h-3 w-3" /> Resource: {p.resource_identifier}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className={cn("text-[10px] font-bold mb-1", p.isEnabled ? "text-green-600" : "text-red-500")}>
                          {p.isEnabled ? "DIIZINKAN" : "DITOLAK"}
                        </span>
                        <Checkbox 
                          checked={p.isEnabled} 
                          onCheckedChange={() => handleToggle(p.key, p.isEnabled)}
                          className="h-6 w-6"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
