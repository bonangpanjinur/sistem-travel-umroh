import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Save, Users, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Permission {
  id: string;
  role: AppRole;
  permission_key: string;
  is_enabled: boolean;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  dashboard: { label: "Dashboard", description: "Akses halaman dashboard utama" },
  analytics: { label: "Analytics", description: "Lihat analitik dan statistik" },
  packages: { label: "Paket", description: "Kelola paket umroh/haji" },
  departures: { label: "Keberangkatan", description: "Kelola jadwal keberangkatan" },
  bookings: { label: "Booking", description: "Kelola booking jamaah" },
  payments: { label: "Pembayaran", description: "Kelola verifikasi pembayaran" },
  customers: { label: "Jamaah", description: "Lihat data jamaah" },
  leads: { label: "Leads", description: "Kelola calon jamaah" },
  master_data: { label: "Master Data", description: "Kelola hotel, maskapai, dll" },
  users: { label: "Users", description: "Kelola pengguna & role" },
  agents: { label: "Agen", description: "Kelola agen & komisi" },
  reports: { label: "Laporan", description: "Akses laporan & export" },
  settings: { label: "Pengaturan", description: "Pengaturan sistem" },
  operational: { label: "Operasional", description: "Akses modul operasional" },
  marketing: { label: "Marketing", description: "Akses modul marketing" },
};

const ROLE_LABELS: Record<AppRole, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500" },
  owner: { label: "Owner", color: "bg-purple-500" },
  branch_manager: { label: "Branch Manager", color: "bg-blue-500" },
  finance: { label: "Finance", color: "bg-green-500" },
  operational: { label: "Operational", color: "bg-orange-500" },
  sales: { label: "Sales", color: "bg-cyan-500" },
  marketing: { label: "Marketing", color: "bg-pink-500" },
  equipment: { label: "Equipment", color: "bg-yellow-500" },
  agent: { label: "Agent", color: "bg-indigo-500" },
  customer: { label: "Customer", color: "bg-gray-500" },
};

const CONFIGURABLE_ROLES: AppRole[] = [
  "branch_manager",
  "finance", 
  "operational",
  "sales",
  "marketing",
  "equipment",
];

// Default permission matrix for new roles
const DEFAULT_PERMISSIONS: Record<AppRole, Record<string, boolean>> = {
  branch_manager: {
    dashboard: true,
    analytics: true,
    packages: true,
    departures: true,
    bookings: true,
    payments: true,
    customers: true,
    leads: true,
    master_data: true,
    users: false,
    agents: true,
    reports: true,
    settings: true,
    operational: true,
    marketing: true,
  },
  finance: {
    dashboard: true,
    analytics: true,
    packages: false,
    departures: false,
    bookings: false,
    payments: true,
    customers: false,
    leads: false,
    master_data: false,
    users: false,
    agents: false,
    reports: true,
    settings: false,
    operational: false,
    marketing: false,
  },
  operational: {
    dashboard: true,
    analytics: true,
    packages: true,
    departures: true,
    bookings: true,
    payments: false,
    customers: true,
    leads: false,
    master_data: true,
    users: false,
    agents: false,
    reports: true,
    settings: false,
    operational: true,
    marketing: false,
  },
  sales: {
    dashboard: true,
    analytics: true,
    packages: true,
    departures: false,
    bookings: true,
    payments: false,
    customers: true,
    leads: true,
    master_data: false,
    users: false,
    agents: false,
    reports: true,
    settings: false,
    operational: false,
    marketing: true,
  },
  marketing: {
    dashboard: true,
    analytics: true,
    packages: false,
    departures: false,
    bookings: false,
    payments: false,
    customers: false,
    leads: true,
    master_data: false,
    users: false,
    agents: false,
    reports: true,
    settings: false,
    operational: false,
    marketing: true,
  },
  equipment: {
    dashboard: true,
    analytics: false,
    packages: false,
    departures: false,
    bookings: false,
    payments: false,
    customers: false,
    leads: false,
    master_data: false,
    users: false,
    agents: false,
    reports: false,
    settings: false,
    operational: true,
    marketing: false,
  },
  super_admin: {
    dashboard: true,
    analytics: true,
    packages: true,
    departures: true,
    bookings: true,
    payments: true,
    customers: true,
    leads: true,
    master_data: true,
    users: true,
    agents: true,
    reports: true,
    settings: true,
    operational: true,
    marketing: true,
  },
  owner: {
    dashboard: true,
    analytics: true,
    packages: true,
    departures: true,
    bookings: true,
    payments: true,
    customers: true,
    leads: true,
    master_data: true,
    users: true,
    agents: true,
    reports: true,
    settings: true,
    operational: true,
    marketing: true,
  },
  agent: {
    dashboard: false,
    analytics: false,
    packages: false,
    departures: false,
    bookings: false,
    payments: false,
    customers: false,
    leads: false,
    master_data: false,
    users: false,
    agents: false,
    reports: false,
    settings: false,
    operational: false,
    marketing: false,
  },
  customer: {
    dashboard: false,
    analytics: false,
    packages: false,
    departures: false,
    bookings: false,
    payments: false,
    customers: false,
    leads: false,
    master_data: false,
    users: false,
    agents: false,
    reports: false,
    settings: false,
    operational: false,
    marketing: false,
  },
};

export default function AdminRolePermissions() {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role")
        .order("permission_key");
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, boolean>) => {
      const updates = Object.entries(changes).map(([id, is_enabled]) => ({
        id,
        is_enabled,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .update({ is_enabled: update.is_enabled })
          .eq("id", update.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Hak akses berhasil disimpan");
      setPendingChanges({});
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyimpan perubahan");
    },
  });

  const handleToggle = (permissionId: string, currentValue: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [permissionId]: !currentValue,
    }));
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info("Tidak ada perubahan");
      return;
    }
    saveMutation.mutate(pendingChanges);
  };

  const handleReset = () => {
    setPendingChanges({});
    toast.info("Perubahan dibatalkan");
  };

  // Bulk actions for columns (roles)
  const handleSelectAllRole = (role: AppRole) => {
    const permissionKeys = Object.keys(PERMISSION_LABELS);
    const newChanges = { ...pendingChanges };
    
    permissionsByRole?.[role]?.forEach((perm) => {
      newChanges[perm.id] = true;
    });
    
    setPendingChanges(newChanges);
    toast.success(`Semua akses untuk ${ROLE_LABELS[role].label} diaktifkan`);
  };

  const handleDeselectAllRole = (role: AppRole) => {
    const newChanges = { ...pendingChanges };
    
    permissionsByRole?.[role]?.forEach((perm) => {
      newChanges[perm.id] = false;
    });
    
    setPendingChanges(newChanges);
    toast.success(`Semua akses untuk ${ROLE_LABELS[role].label} dinonaktifkan`);
  };

  // Bulk actions for rows (permissions)
  const handleSelectAllPermission = (permissionKey: string) => {
    const newChanges = { ...pendingChanges };
    
    CONFIGURABLE_ROLES.forEach((role) => {
      const perm = permissionsByRole?.[role]?.find(
        (p) => p.permission_key === permissionKey
      );
      if (perm) {
        newChanges[perm.id] = true;
      }
    });
    
    setPendingChanges(newChanges);
    toast.success(`Akses untuk ${PERMISSION_LABELS[permissionKey].label} diaktifkan untuk semua role`);
  };

  const handleDeselectAllPermission = (permissionKey: string) => {
    const newChanges = { ...pendingChanges };
    
    CONFIGURABLE_ROLES.forEach((role) => {
      const perm = permissionsByRole?.[role]?.find(
        (p) => p.permission_key === permissionKey
      );
      if (perm) {
        newChanges[perm.id] = false;
      }
    });
    
    setPendingChanges(newChanges);
    toast.success(`Akses untuk ${PERMISSION_LABELS[permissionKey].label} dinonaktifkan untuk semua role`);
  };

  // Group permissions by role
  const permissionsByRole = permissions?.reduce((acc, perm) => {
    if (!acc[perm.role]) acc[perm.role] = [];
    acc[perm.role].push(perm);
    return acc;
  }, {} as Record<AppRole, Permission[]>);

  const permissionKeys = Object.keys(PERMISSION_LABELS);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Pengaturan Hak Akses
          </h1>
          <p className="text-muted-foreground">
            Konfigurasi menu dan fitur yang dapat diakses setiap role
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleReset}
            disabled={Object.keys(pendingChanges).length === 0 || saveMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={Object.keys(pendingChanges).length === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan Perubahan
            {Object.keys(pendingChanges).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {Object.keys(pendingChanges).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Matrix Hak Akses
          </CardTitle>
          <CardDescription>
            Super Admin dan Owner memiliki akses penuh. Centang untuk mengaktifkan akses menu. Gunakan tombol di header/footer untuk bulk action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium sticky left-0 bg-background z-10">
                    Menu / Fitur
                  </th>
                  {CONFIGURABLE_ROLES.map((role) => (
                    <th key={role} className="text-center py-3 px-2 min-w-[120px]">
                      <div className="flex flex-col gap-2 items-center">
                        <Badge 
                          variant="outline" 
                          className={`${ROLE_LABELS[role].color} text-white border-0`}
                        >
                          {ROLE_LABELS[role].label}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleSelectAllRole(role)}
                            title="Aktifkan semua"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleDeselectAllRole(role)}
                            title="Nonaktifkan semua"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionKeys.map((key) => (
                  <tr key={key} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 sticky left-0 bg-background">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{PERMISSION_LABELS[key].label}</p>
                          <p className="text-xs text-muted-foreground">
                            {PERMISSION_LABELS[key].description}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleSelectAllPermission(key)}
                            title="Aktifkan untuk semua role"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => handleDeselectAllPermission(key)}
                            title="Nonaktifkan untuk semua role"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </td>
                    {CONFIGURABLE_ROLES.map((role) => {
                      const perm = permissionsByRole?.[role]?.find(
                        (p) => p.permission_key === key
                      );
                      if (!perm) return <td key={role} className="text-center py-3 px-2">-</td>;

                      const isChecked = perm.id in pendingChanges 
                        ? pendingChanges[perm.id] 
                        : perm.is_enabled;
                      const hasChange = perm.id in pendingChanges;

                      return (
                        <td key={role} className="text-center py-3 px-2">
                          <div className="flex justify-center">
                            <div className={`p-1 rounded-md transition-all ${hasChange ? 'bg-primary/10 ring-2 ring-primary ring-offset-2' : ''}`}>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggle(perm.id, isChecked)}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Keterangan Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_LABELS).map(([role, { label, color }]) => (
              <div key={role} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="font-medium">{label}</span>
                {(role === "super_admin" || role === "owner") && (
                  <Badge variant="outline" className="text-xs">Full Access</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-blue-900">💡 Tips Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>• Gunakan tombol <strong>✓</strong> dan <strong>✕</strong> di header kolom untuk mengaktifkan/menonaktifkan semua akses untuk satu role</p>
          <p>• Gunakan tombol <strong>✓</strong> dan <strong>✕</strong> di akhir baris untuk mengaktifkan/menonaktifkan satu fitur untuk semua role</p>
          <p>• Perubahan akan ditandai dengan highlight warna biru</p>
          <p>• Klik "Simpan Perubahan" untuk menyimpan semua perubahan ke database</p>
          <p>• Sidebar pengguna akan otomatis diperbarui sesuai permissions yang baru</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Import X icon
import { X } from "lucide-react";
