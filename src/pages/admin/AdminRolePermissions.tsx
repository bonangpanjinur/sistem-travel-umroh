import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Save, Users, RotateCcw, Check, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Permission {
  id: string;
  role: AppRole;
  permission_key: string;
  is_enabled: boolean;
}

interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  actions: {
    key: string;
    label: string;
    description: string;
  }[];
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: "bookings",
    label: "Booking & Jamaah",
    description: "Manajemen reservasi dan data jamaah",
    actions: [
      { key: "bookings.view_own", label: "Lihat", description: "Melihat data booking" },
      { key: "bookings.create", label: "Tambah", description: "Membuat booking baru" },
      { key: "bookings.edit", label: "Edit", description: "Mengubah data booking" },
      { key: "bookings.delete", label: "Hapus", description: "Menghapus data booking" },
      { key: "bookings.approve", label: "Approve", description: "Menyetujui booking" },
    ]
  },
  {
    id: "payments",
    label: "Keuangan & Pembayaran",
    description: "Manajemen transaksi dan laporan keuangan",
    actions: [
      { key: "payments.view_own", label: "Lihat", description: "Melihat riwayat pembayaran" },
      { key: "payments.create", label: "Tambah", description: "Input bukti bayar" },
      { key: "payments.verify", label: "Verifikasi", description: "Validasi pembayaran" },
      { key: "payments.refund", label: "Refund", description: "Proses pengembalian dana" },
      { key: "finance.reports", label: "Laporan", description: "Akses laporan keuangan" },
    ]
  },
  {
    id: "customers",
    label: "Data Pelanggan",
    description: "Manajemen profil dan dokumen jamaah",
    actions: [
      { key: "customers.view", label: "Lihat", description: "Melihat profil jamaah" },
      { key: "customers.create", label: "Tambah", description: "Input jamaah baru" },
      { key: "customers.edit", label: "Edit", description: "Update data jamaah" },
      { key: "customers.edit_sensitive", label: "Edit Sensitif", description: "Update Paspor/NIK" },
      { key: "customers.delete", label: "Hapus", description: "Hapus data jamaah" },
    ]
  },
  {
    id: "hr",
    label: "SDM (HR)",
    description: "Manajemen karyawan, absensi, dan payroll",
    actions: [
      { key: "hr.employees.view", label: "Lihat Karyawan", description: "Melihat data karyawan" },
      { key: "hr.employees.manage", label: "Kelola Karyawan", description: "Tambah/Edit/Hapus karyawan" },
      { key: "hr.attendance.view", label: "Lihat Absensi", description: "Melihat riwayat absensi" },
      { key: "hr.payroll.view", label: "Lihat Payroll", description: "Melihat data gaji" },
      { key: "hr.payroll.manage", label: "Kelola Payroll", description: "Proses gaji & slip" },
    ]
  },
  {
    id: "operational",
    label: "Operasional",
    description: "Manajemen keberangkatan dan logistik",
    actions: [
      { key: "operational.view", label: "Lihat", description: "Melihat data operasional" },
      { key: "operational.manifest", label: "Manifest", description: "Kelola manifest" },
      { key: "operational.visa", label: "Visa", description: "Update status visa" },
      { key: "equipment.inventory", label: "Stok", description: "Kelola stok perlengkapan" },
    ]
  },
  {
    id: "leads",
    label: "Sales & Marketing",
    description: "Manajemen prospek dan materi promosi",
    actions: [
      { key: "leads.view", label: "Lihat Leads", description: "Melihat daftar prospek" },
      { key: "leads.create", label: "Tambah Leads", description: "Input prospek baru" },
      { key: "marketing.view", label: "Kupon", description: "Kelola kupon & promo" },
      { key: "marketing_materials.view", label: "Materi", description: "Akses materi promosi" },
    ]
  },
  {
    id: "system",
    label: "Sistem & Master Data",
    description: "Pengaturan aplikasi dan data master",
    actions: [
      { key: "users.view", label: "Users", description: "Kelola pengguna sistem" },
      { key: "master_data.view", label: "Master Data", description: "Kelola data master" },
      { key: "settings.view", label: "Lihat Settings", description: "Melihat pengaturan cabang & agen" },
      { key: "settings.manage", label: "Kelola Settings", description: "Pengaturan sistem lengkap" },
    ]
  }
];

const ROLE_LABELS: Record<AppRole, { label: string; color: string; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500", description: "Akses penuh ke semua fitur" },
  owner: { label: "Owner", color: "bg-purple-500", description: "Pemilik bisnis dengan akses penuh" },
  branch_manager: { label: "Branch Manager", color: "bg-blue-500", description: "Manajer cabang" },
  finance: { label: "Finance", color: "bg-green-500", description: "Staf keuangan" },
  operational: { label: "Operational", color: "bg-orange-500", description: "Staf operasional" },
  sales: { label: "Sales", color: "bg-cyan-500", description: "Staf penjualan" },
  marketing: { label: "Marketing", color: "bg-pink-500", description: "Staf pemasaran" },
  equipment: { label: "Equipment", color: "bg-yellow-500", description: "Staf perlengkapan" },
  agent: { label: "Agent", color: "bg-indigo-500", description: "Agen perjalanan" },
  customer: { label: "Customer", color: "bg-gray-500", description: "Portal jamaah" },
};

const CONFIGURABLE_ROLES: AppRole[] = [
  "branch_manager",
  "finance",
  "operational",
  "sales",
  "marketing",
  "equipment",
  "agent",
];

export default function AdminRolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AppRole>("branch_manager");
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    MODULE_DEFINITIONS.reduce((acc, mod) => ({ ...acc, [mod.id]: true }), {})
  );

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["role-permissions-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", selectedRole);

      if (error) throw error;
      return data as Permission[];
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (updates: Array<{ permission_key: string; is_enabled: boolean }>) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("role_permissions")
          .update({ is_enabled: update.is_enabled })
          .eq("role", selectedRole)
          .eq("permission_key", update.permission_key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions-matrix"] });
      setPendingChanges({});
      toast.success("Izin berhasil diperbarui");
    },
    onError: (error: any) => {
      toast.error(`Gagal memperbarui izin: ${error.message}`);
    },
  });

  const handlePermissionChange = (permissionKey: string, isEnabled: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [permissionKey]: isEnabled,
    }));
  };

  const handleSaveChanges = () => {
    const updates = Object.entries(pendingChanges).map(([key, value]) => ({
      permission_key: key,
      is_enabled: value,
    }));

    updatePermissionMutation.mutate(updates);
  };

  const handleResetChanges = () => {
    setPendingChanges({});
  };

  const getPermissionStatus = (permissionKey: string): boolean => {
    if (permissionKey in pendingChanges) {
      return pendingChanges[permissionKey];
    }
    const permission = permissions.find((p) => p.permission_key === permissionKey);
    return permission?.is_enabled ?? false;
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Manajemen Izin Akses
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola izin akses untuk setiap peran pengguna dalam sistem
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pilih Peran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CONFIGURABLE_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setPendingChanges({});
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                  selectedRole === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      ROLE_LABELS[role].color
                    )}
                  />
                  {ROLE_LABELS[role].label}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ROLE_LABELS[role].description}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <>
              {MODULE_DEFINITIONS.map((module) => (
                <Card key={module.id}>
                  <CardHeader className="pb-3">
                    <button
                      onClick={() =>
                        setExpandedModules((prev) => ({
                          ...prev,
                          [module.id]: !prev[module.id],
                        }))
                      }
                      className="w-full flex items-center justify-between hover:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-2">
                        {expandedModules[module.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <CardTitle className="text-base">{module.label}</CardTitle>
                          <CardDescription className="text-xs">
                            {module.description}
                          </CardDescription>
                        </div>
                      </div>
                    </button>
                  </CardHeader>

                  {expandedModules[module.id] && (
                    <>
                      <Separator />
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {module.actions.map((action) => (
                            <label
                              key={action.key}
                              className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={getPermissionStatus(action.key)}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(action.key, checked as boolean)
                                }
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{action.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {action.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </>
          )}

          {/* Action Buttons */}
          {!isLoading && (
            <div className="flex gap-2 justify-end sticky bottom-4">
              <Button
                variant="outline"
                onClick={handleResetChanges}
                disabled={!hasChanges || updatePermissionMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || updatePermissionMutation.isPending}
              >
                {updatePermissionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Change Summary */}
          {hasChanges && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-blue-900">
                      {Object.keys(pendingChanges).length} izin telah diubah
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Klik "Simpan Perubahan" untuk menerapkan perubahan ke database
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
