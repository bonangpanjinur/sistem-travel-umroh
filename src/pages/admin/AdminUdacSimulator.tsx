import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminUdacSimulator() {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Ambil daftar users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["udac-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Ambil daftar permissions
  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["udac-permissions-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions_list")
        .select("*")
        .order("group_name");
      if (error) throw error;
      return data;
    },
  });

  // Simulasi akses
  const handleSimulate = async () => {
    if (!selectedUserId || !selectedPermission) {
      toast.error("Pilih user dan permission terlebih dahulu");
      return;
    }

    setIsSimulating(true);
    try {
      // Panggil RPC function check_permission_v3
      const { data, error } = await supabase.rpc("check_permission_v3", {
        _user_id: selectedUserId,
        _permission_key: selectedPermission,
        _resource_attrs: {}
      });

      if (error) throw error;

      // Ambil detail permission
      const permDetail = permissions.find(p => p.key === selectedPermission);
      const userDetail = users.find(u => u.id === selectedUserId);

      // Ambil user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", selectedUserId);

      // Ambil user permissions overrides
      const { data: userPerms } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", selectedUserId)
        .eq("permission_key", selectedPermission);

      // Ambil role permissions
      const { data: rolePerms } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("permission_key", selectedPermission);

      setSimulationResult({
        isGranted: data,
        user: userDetail,
        permission: permDetail,
        userRoles: userRoles || [],
        userOverrides: userPerms || [],
        rolePermissions: rolePerms || [],
      });

      toast.success("Simulasi akses berhasil!");
    } catch (err: any) {
      toast.error(`Gagal simulasi: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          UDAC Access Simulator
        </h1>
        <p className="text-muted-foreground mt-2">
          Simulasikan keputusan akses untuk user tertentu sebelum menerapkan perubahan izin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi Simulasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pilih User</label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              >
                <option value="">-- Pilih User --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Pilih Permission</label>
              <select 
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              >
                <option value="">-- Pilih Permission --</option>
                {permissions.map(perm => (
                  <option key={perm.key} value={perm.key}>
                    {perm.label} ({perm.key})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleSimulate} 
                disabled={isSimulating || !selectedUserId || !selectedPermission}
                className="w-full gap-2"
              >
                {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Simulasikan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {simulationResult && (
        <div className="space-y-4">
          {/* Hasil Utama */}
          <Card className={cn(
            "border-2",
            simulationResult.isGranted ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {simulationResult.isGranted ? (
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  ) : (
                    <XCircle className="h-12 w-12 text-red-600" />
                  )}
                  <div>
                    <h3 className="text-2xl font-bold">
                      {simulationResult.isGranted ? "AKSES DIBERIKAN" : "AKSES DITOLAK"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {simulationResult.user?.full_name} dapat {simulationResult.isGranted ? "" : "TIDAK dapat"} mengakses {simulationResult.permission?.label}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail Analisis */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="overrides">Overrides</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nama</p>
                      <p className="font-medium">{simulationResult.user?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-mono text-sm">{simulationResult.user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi Permission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Label</p>
                    <p className="font-medium">{simulationResult.permission?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kunci</p>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{simulationResult.permission?.key}</code>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                    <p className="text-sm">{simulationResult.permission?.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{simulationResult.permission?.type}</Badge>
                    <Badge variant="outline">{simulationResult.permission?.group_name}</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Roles & Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {simulationResult.userRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">User tidak memiliki role apapun.</p>
                  ) : (
                    <div className="space-y-2">
                      {simulationResult.userRoles.map((ur: any) => (
                        <div key={ur.role} className="p-3 border rounded-lg">
                          <p className="font-medium capitalize">{ur.role.replace(/_/g, " ")}</p>
                          <div className="mt-2 space-y-1">
                            {simulationResult.rolePermissions
                              .filter((rp: any) => rp.role === ur.role)
                              .map((rp: any) => (
                                <div key={rp.permission_key} className="flex items-center justify-between text-xs">
                                  <span>{rp.permission_key}</span>
                                  <Badge variant={rp.is_enabled ? "default" : "secondary"}>
                                    {rp.is_enabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overrides" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User-Level Overrides</CardTitle>
                </CardHeader>
                <CardContent>
                  {simulationResult.userOverrides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">User tidak memiliki override apapun untuk permission ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {simulationResult.userOverrides.map((uo: any) => (
                        <div key={uo.permission_key} className="p-3 border rounded-lg flex items-center justify-between">
                          <span className="font-mono text-sm">{uo.permission_key}</span>
                          <Badge variant={uo.is_enabled ? "default" : "destructive"}>
                            {uo.is_enabled ? "GRANTED" : "DENIED"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
