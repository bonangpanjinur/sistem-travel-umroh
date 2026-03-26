import { useState, useMemo } from "react";
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
      { key: "settings.manage", label: "Settings", description: "Pengaturan sistem" },
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
      queryClient.invalidateQueries({ queryKey: ["role-permissions-matrix"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyimpan perubahan");
    },
  });

  const currentRolePermissions = useMemo(() => {
    return permissions.filter(p => p.role === selectedRole);
  }, [permissions, selectedRole]);

  const handleToggle = (permissionId: string, currentValue: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [permissionId]: !currentValue,
    }));
  };

  const isEnabled = (permissionKey: string) => {
    const perm = currentRolePermissions.find(p => p.permission_key === permissionKey);
    if (!perm) return false;
    
    if (pendingChanges[perm.id] !== undefined) {
      return pendingChanges[perm.id];
    }
    return perm.is_enabled;
  };

  const getPermissionId = (permissionKey: string) => {
    return currentRolePermissions.find(p => p.permission_key === permissionKey)?.id;
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

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Hak Akses</h1>
          <p className="text-muted-foreground">
            Konfigurasi izin granular (Lihat, Tambah, Edit, Hapus) untuk setiap role pengguna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={Object.keys(pendingChanges).length === 0}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={Object.keys(pendingChanges).length === 0 || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pilih Role
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {CONFIGURABLE_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    if (Object.keys(pendingChanges).length > 0) {
                      if (confirm("Ada perubahan yang belum disimpan. Pindah role tetap?")) {
                        setPendingChanges({});
                        setSelectedRole(role);
                      }
                    } else {
                      setSelectedRole(role);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-4",
                    selectedRole === role 
                      ? "bg-muted border-primary" 
                      : "border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{ROLE_LABELS[role].label}</span>
                    <Badge variant="secondary" className={cn("text-[10px] h-4 px-1 text-white", ROLE_LABELS[role].color)}>
                      Active
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {ROLE_LABELS[role].description}
                  </span>
                </button>
              ))}
              <div className="p-4 bg-muted/30 mt-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 mt-0.5 text-primary" />
                  <span>
                    <strong>Super Admin</strong> & <strong>Owner</strong> memiliki akses penuh ke semua fitur dan tidak dapat dikonfigurasi.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Matriks Izin: {ROLE_LABELS[selectedRole].label}</CardTitle>
                  <CardDescription>Aktifkan atau nonaktifkan fitur spesifik untuk role ini.</CardDescription>
                </div>
                {Object.keys(pendingChanges).length > 0 && (
                  <Badge variant="warning" className="animate-pulse">Ada Perubahan</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
                {MODULE_DEFINITIONS.map((module) => (
                  <div key={module.id} className="border-b last:border-0">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedModules[module.id] ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <h3 className="font-semibold text-sm">{module.label}</h3>
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {/* Module Summary Badge */}
                         <Badge variant="outline" className="text-[10px]">
                           {module.actions.filter(a => isEnabled(a.key)).length} / {module.actions.length} Aktif
                         </Badge>
                      </div>
                    </button>
                    
                    {expandedModules[module.id] && (
                      <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {module.actions.map((action) => {
                          const permId = getPermissionId(action.key);
                          const active = isEnabled(action.key);
                          
                          return (
                            <div 
                              key={action.key} 
                              className={cn(
                                "flex items-center justify-between p-2 rounded-md transition-colors",
                                active ? "bg-primary/5" : "hover:bg-muted/50"
                              )}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{action.label}</span>
                                <span className="text-[10px] text-muted-foreground">{action.description}</span>
                              </div>
                              <Checkbox
                                checked={active}
                                disabled={!permId}
                                onCheckedChange={() => permId && handleToggle(permId, active)}
                                className="h-5 w-5"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">Informasi Penting</p>
              <p>
                Perubahan hak akses akan langsung berdampak pada menu navigasi dan akses halaman bagi pengguna dengan role tersebut setelah mereka melakukan refresh halaman.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
