import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Save, Users, RotateCcw, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Permission {
  id: string;
  role: AppRole;
  permission_key: string;
  is_enabled: boolean;
}

interface PermissionGroup {
  label: string;
  description: string;
  permissions: {
    key: string;
    label: string;
    description: string;
    scope?: 'view_all' | 'view_branch' | 'view_own' | 'action';
  }[];
}

// Granular permissions grouped by module
const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  bookings: {
    label: "Booking & Jamaah",
    description: "Kontrol akses untuk manajemen booking dan jamaah",
    permissions: [
      { key: 'bookings.view_all', label: 'Lihat Semua Booking', description: 'Melihat semua booking dari semua cabang', scope: 'view_all' },
      { key: 'bookings.view_branch', label: 'Lihat Booking Cabang', description: 'Melihat booking cabang pengguna', scope: 'view_branch' },
      { key: 'bookings.view_own', label: 'Lihat Booking Sendiri', description: 'Melihat booking milik pengguna sendiri', scope: 'view_own' },
      { key: 'bookings.create', label: 'Buat Booking', description: 'Membuat booking baru', scope: 'action' },
      { key: 'bookings.edit', label: 'Edit Booking', description: 'Mengubah detail booking', scope: 'action' },
      { key: 'bookings.approve', label: 'Setujui Booking', description: 'Menyetujui booking', scope: 'action' },
      { key: 'bookings.delete', label: 'Hapus Booking', description: 'Menghapus booking', scope: 'action' },
    ]
  },
  payments: {
    label: "Keuangan & Pembayaran",
    description: "Kontrol akses untuk manajemen pembayaran dan keuangan",
    permissions: [
      { key: 'payments.view_all', label: 'Lihat Semua Pembayaran', description: 'Melihat semua riwayat pembayaran', scope: 'view_all' },
      { key: 'payments.view_branch', label: 'Lihat Pembayaran Cabang', description: 'Melihat pembayaran cabang pengguna', scope: 'view_branch' },
      { key: 'payments.view_own', label: 'Lihat Pembayaran Sendiri', description: 'Melihat pembayaran milik pengguna', scope: 'view_own' },
      { key: 'payments.create', label: 'Buat Pembayaran', description: 'Input bukti bayar baru', scope: 'action' },
      { key: 'payments.verify', label: 'Verifikasi Pembayaran', description: 'Validasi & konfirmasi pembayaran', scope: 'action' },
      { key: 'payments.refund', label: 'Proses Refund', description: 'Melakukan pengembalian dana', scope: 'action' },
      { key: 'finance.reports', label: 'Laporan Keuangan', description: 'Mengakses laporan laba rugi', scope: 'action' },
    ]
  },
  customers: {
    label: "Data Jamaah",
    description: "Kontrol akses untuk manajemen data jamaah",
    permissions: [
      { key: 'customers.view', label: 'Lihat Jamaah', description: 'Melihat profil jamaah', scope: 'action' },
      { key: 'customers.create', label: 'Buat Jamaah', description: 'Membuat data jamaah baru', scope: 'action' },
      { key: 'customers.edit', label: 'Edit Jamaah', description: 'Mengubah data jamaah', scope: 'action' },
      { key: 'customers.edit_sensitive', label: 'Edit Data Sensitif', description: 'Mengubah data paspor/NIK', scope: 'action' },
      { key: 'customers.delete', label: 'Hapus Jamaah', description: 'Menghapus data jamaah', scope: 'action' },
    ]
  },
  operational: {
    label: "Operasional",
    description: "Kontrol akses untuk manajemen operasional",
    permissions: [
      { key: 'operational.manifest', label: 'Kelola Manifest', description: 'Mengelola manifest keberangkatan', scope: 'action' },
      { key: 'operational.visa', label: 'Update Status Visa', description: 'Update status pengurusan visa', scope: 'action' },
      { key: 'operational.view', label: 'Lihat Operasional', description: 'Melihat data operasional', scope: 'action' },
      { key: 'operational.manage', label: 'Kelola Operasional', description: 'Mengelola data operasional', scope: 'action' },
    ]
  },
  equipment: {
    label: "Perlengkapan",
    description: "Kontrol akses untuk manajemen perlengkapan",
    permissions: [
      { key: 'equipment.inventory', label: 'Kelola Stok', description: 'Kelola stok perlengkapan', scope: 'action' },
      { key: 'equipment.distribute', label: 'Catat Serah Terima', description: 'Catat serah terima perlengkapan', scope: 'action' },
    ]
  },
  leads: {
    label: "Leads & Marketing",
    description: "Kontrol akses untuk manajemen leads",
    permissions: [
      { key: 'leads.view', label: 'Lihat Leads', description: 'Melihat daftar leads', scope: 'action' },
      { key: 'leads.create', label: 'Buat Leads', description: 'Membuat leads baru', scope: 'action' },
      { key: 'leads.edit', label: 'Edit Leads', description: 'Mengubah detail leads', scope: 'action' },
      { key: 'leads.delete', label: 'Hapus Leads', description: 'Menghapus leads', scope: 'action' },
    ]
  },
  packages: {
    label: "Paket & Keberangkatan",
    description: "Kontrol akses untuk manajemen paket dan keberangkatan",
    permissions: [
      { key: 'packages.view', label: 'Lihat Paket', description: 'Melihat daftar paket', scope: 'action' },
      { key: 'packages.create', label: 'Buat Paket', description: 'Membuat paket baru', scope: 'action' },
      { key: 'packages.edit', label: 'Edit Paket', description: 'Mengubah detail paket', scope: 'action' },
      { key: 'packages.delete', label: 'Hapus Paket', description: 'Menghapus paket', scope: 'action' },
      { key: 'departures.view', label: 'Lihat Keberangkatan', description: 'Melihat daftar keberangkatan', scope: 'action' },
      { key: 'departures.create', label: 'Buat Keberangkatan', description: 'Membuat keberangkatan baru', scope: 'action' },
      { key: 'departures.edit', label: 'Edit Keberangkatan', description: 'Mengubah detail keberangkatan', scope: 'action' },
      { key: 'departures.delete', label: 'Hapus Keberangkatan', description: 'Menghapus keberangkatan', scope: 'action' },
    ]
  },
  system: {
    label: "Sistem & Pengaturan",
    description: "Kontrol akses untuk manajemen sistem",
    permissions: [
      { key: 'users.view', label: 'Lihat Pengguna', description: 'Melihat daftar pengguna', scope: 'action' },
      { key: 'users.create', label: 'Buat Pengguna', description: 'Membuat pengguna baru', scope: 'action' },
      { key: 'users.edit', label: 'Edit Pengguna', description: 'Mengubah detail pengguna', scope: 'action' },
      { key: 'users.delete', label: 'Hapus Pengguna', description: 'Menghapus pengguna', scope: 'action' },
      { key: 'agents.view', label: 'Lihat Agen', description: 'Melihat daftar agen', scope: 'action' },
      { key: 'agents.create', label: 'Buat Agen', description: 'Membuat agen baru', scope: 'action' },
      { key: 'agents.edit', label: 'Edit Agen', description: 'Mengubah detail agen', scope: 'action' },
      { key: 'agents.delete', label: 'Hapus Agen', description: 'Menghapus agen', scope: 'action' },
      { key: 'master_data.view', label: 'Lihat Master Data', description: 'Melihat master data', scope: 'action' },
      { key: 'master_data.manage', label: 'Kelola Master Data', description: 'Mengelola master data', scope: 'action' },
      { key: 'settings.view', label: 'Lihat Pengaturan', description: 'Melihat pengaturan sistem', scope: 'action' },
      { key: 'settings.manage', label: 'Kelola Pengaturan', description: 'Mengelola pengaturan sistem', scope: 'action' },
      { key: 'dashboard.view', label: 'Lihat Dashboard', description: 'Akses dashboard utama', scope: 'action' },
      { key: 'analytics.view', label: 'Lihat Analytics', description: 'Melihat analitik', scope: 'action' },
      { key: 'reports.view', label: 'Lihat Laporan', description: 'Melihat laporan', scope: 'action' },
    ]
  },
};

const ROLE_LABELS: Record<AppRole, { label: string; color: string; description: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500", description: "Akses penuh ke semua fitur" },
  owner: { label: "Owner", color: "bg-purple-500", description: "Pemilik bisnis dengan akses penuh" },
  branch_manager: { label: "Branch Manager", color: "bg-blue-500", description: "Manajer cabang dengan akses terbatas" },
  finance: { label: "Finance", color: "bg-green-500", description: "Staf keuangan dengan fokus pembayaran" },
  operational: { label: "Operational", color: "bg-orange-500", description: "Staf operasional" },
  sales: { label: "Sales", color: "bg-cyan-500", description: "Staf penjualan dengan fokus booking" },
  marketing: { label: "Marketing", color: "bg-pink-500", description: "Staf marketing dengan fokus leads" },
  equipment: { label: "Equipment", color: "bg-yellow-500", description: "Staf perlengkapan" },
  agent: { label: "Agent", color: "bg-indigo-500", description: "Agen dengan akses terbatas" },
  customer: { label: "Customer", color: "bg-gray-500", description: "Pelanggan dengan akses minimal" },
};

const CONFIGURABLE_ROLES: AppRole[] = [
  "branch_manager",
  "finance",
  "operational",
  "sales",
  "marketing",
  "equipment",
];

export default function AdminRolePermissionsEnhanced() {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["role-permissions-enhanced"],
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
      queryClient.invalidateQueries({ queryKey: ["role-permissions-enhanced"] });
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

  // Group permissions by role
  const permissionsByRole = useMemo(() => {
    const grouped: Record<AppRole, Permission[]> = {} as Record<AppRole, Permission[]>;

    permissions?.forEach((perm) => {
      if (!grouped[perm.role]) {
        grouped[perm.role] = [];
      }
      grouped[perm.role].push(perm);
    });

    return grouped;
  }, [permissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Manajemen Hak Akses Granular
        </h1>
        <p className="text-muted-foreground">
          Kelola izin akses untuk setiap role dengan kontrol granular per modul dan tindakan
        </p>
      </div>

      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Role</CardTitle>
          <CardDescription>Pilih role untuk mengelola izin akses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(ROLE_LABELS).map(([role, { label, color, description }]) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role as AppRole)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedRole === role
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary"
                }`}
                title={description}
              >
                <Badge className={`${color} mb-2 w-full justify-center`}>{label}</Badge>
                <p className="text-xs text-muted-foreground text-center">{description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Grid */}
      {selectedRole && (
        <div className="space-y-6">
          {/* Role Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {ROLE_LABELS[selectedRole].label}
                  </h3>
                  <p className="text-sm text-blue-800 mt-1">
                    {ROLE_LABELS[selectedRole].description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission Groups */}
          {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
            const rolePerms = permissionsByRole[selectedRole] || [];
            const groupPerms = group.permissions.filter(p =>
              rolePerms.some(rp => rp.permission_key === p.key)
            );

            if (groupPerms.length === 0) return null;

            return (
              <Card key={groupKey}>
                <CardHeader>
                  <CardTitle className="text-lg">{group.label}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupPerms.map((perm) => {
                      const rolePermission = rolePerms.find(
                        (rp) => rp.permission_key === perm.key
                      );

                      if (!rolePermission) return null;

                      const isChanged = pendingChanges[rolePermission.id] !== undefined;
                      const currentValue = isChanged
                        ? pendingChanges[rolePermission.id]
                        : rolePermission.is_enabled;

                      return (
                        <div
                          key={rolePermission.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                            isChanged ? "bg-yellow-50 border-yellow-200" : "border-border"
                          }`}
                        >
                          <Checkbox
                            id={rolePermission.id}
                            checked={currentValue}
                            onCheckedChange={() =>
                              handleToggle(rolePermission.id, rolePermission.is_enabled)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={rolePermission.id}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {perm.label}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {perm.description}
                            </p>
                            {perm.scope && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {perm.scope === 'view_all' && 'Lihat Semua'}
                                  {perm.scope === 'view_branch' && 'Lihat Cabang'}
                                  {perm.scope === 'view_own' && 'Lihat Sendiri'}
                                  {perm.scope === 'action' && 'Tindakan'}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {isChanged && <Check className="h-5 w-5 text-yellow-600 mt-1" />}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Action Buttons */}
          <div className="flex gap-2 sticky bottom-0 bg-white p-4 border-t rounded-lg">
            <Button
              onClick={handleSave}
              disabled={Object.keys(pendingChanges).length === 0 || saveMutation.isPending}
              className="flex-1"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Perubahan ({Object.keys(pendingChanges).length})
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={Object.keys(pendingChanges).length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Batalkan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
