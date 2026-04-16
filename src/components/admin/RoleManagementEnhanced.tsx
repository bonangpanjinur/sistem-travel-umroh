'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  Loader2,
  Search,
  Shield,
  Save,
  RefreshCcw,
  AlertCircle,
  Info,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Permission {
  id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

interface PermissionGroup {
  name: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

interface RoleConfig {
  role: string;
  label: string;
  description: string;
  color: string;
}

// Role configurations
const ROLE_CONFIGS: Record<string, RoleConfig> = {
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin',
    description: 'Akses penuh ke semua fitur sistem',
    color: 'bg-red-500'
  },
  owner: {
    role: 'owner',
    label: 'Owner',
    description: 'Pemilik bisnis dengan akses penuh',
    color: 'bg-purple-500'
  },
  branch_manager: {
    role: 'branch_manager',
    label: 'Branch Manager',
    description: 'Manajer cabang dengan akses terbatas ke cabang mereka',
    color: 'bg-blue-500'
  },
  finance: {
    role: 'finance',
    label: 'Finance',
    description: 'Staf keuangan dengan fokus pada pembayaran dan laporan',
    color: 'bg-green-500'
  },
  operational: {
    role: 'operational',
    label: 'Operational',
    description: 'Staf operasional dengan fokus pada manajemen keberangkatan',
    color: 'bg-orange-500'
  },
  sales: {
    role: 'sales',
    label: 'Sales',
    description: 'Staf penjualan dengan fokus pada booking dan leads',
    color: 'bg-cyan-500'
  },
  marketing: {
    role: 'marketing',
    label: 'Marketing',
    description: 'Staf marketing dengan fokus pada leads dan promosi',
    color: 'bg-pink-500'
  },
  equipment: {
    role: 'equipment',
    label: 'Equipment',
    description: 'Staf perlengkapan dengan fokus pada inventory',
    color: 'bg-yellow-500'
  },
};

// Permission groups
const PERMISSION_GROUPS: PermissionGroup[] = [\n  {\n    name: 'Dashboard & Analytics',\n    permissions: [\n      { key: 'dashboard.view', label: 'Lihat Dashboard', description: 'Akses dashboard utama' },\n      { key: 'analytics.view', label: 'Lihat Analytics', description: 'Melihat analitik dan statistik' },\n      { key: 'reports.view', label: 'Lihat Laporan', description: 'Melihat laporan sistem' },\n    ]\n  },\n  {\n    name: 'Booking & Jamaah',\n    permissions: [\n      { key: 'bookings.view_own', label: 'Lihat Booking Sendiri', description: 'Melihat booking milik pengguna sendiri' },\n      { key: 'bookings.view_branch', label: 'Lihat Booking Cabang', description: 'Melihat booking cabang pengguna' },\n      { key: 'bookings.view_all', label: 'Lihat Semua Booking', description: 'Melihat semua booking dari semua cabang' },\n      { key: 'bookings.create', label: 'Buat Booking', description: 'Membuat booking baru' },\n      { key: 'bookings.edit', label: 'Edit Booking', description: 'Mengubah detail booking' },\n      { key: 'bookings.approve', label: 'Setujui Booking', description: 'Menyetujui booking' },\n      { key: 'bookings.delete', label: 'Hapus Booking', description: 'Menghapus booking' },\n      { key: 'customers.view', label: 'Lihat Jamaah', description: 'Melihat profil jamaah' },\n      { key: 'customers.create', label: 'Buat Jamaah', description: 'Membuat data jamaah baru' },\n      { key: 'customers.edit', label: 'Edit Jamaah', description: 'Mengubah data jamaah' },\n      { key: 'customers.delete', label: 'Hapus Jamaah', description: 'Menghapus data jamaah' },\n    ]\n  },\n  {\n    name: 'Keuangan & Pembayaran',\n    permissions: [\n      { key: 'payments.view_own', label: 'Lihat Pembayaran Sendiri', description: 'Melihat pembayaran milik pengguna' },\n      { key: 'payments.view_branch', label: 'Lihat Pembayaran Cabang', description: 'Melihat pembayaran cabang pengguna' },\n      { key: 'payments.view_all', label: 'Lihat Semua Pembayaran', description: 'Melihat semua riwayat pembayaran' },\n      { key: 'payments.create', label: 'Buat Pembayaran', description: 'Input bukti bayar baru' },\n      { key: 'payments.verify', label: 'Verifikasi Pembayaran', description: 'Validasi & konfirmasi pembayaran' },\n      { key: 'payments.refund', label: 'Proses Refund', description: 'Melakukan pengembalian dana' },\n      { key: 'finance.reports', label: 'Laporan Keuangan', description: 'Mengakses laporan laba rugi' },\n    ]\n  },\n  {\n    name: 'Paket & Keberangkatan',\n    permissions: [\n      { key: 'packages.view', label: 'Lihat Paket', description: 'Melihat daftar paket' },\n      { key: 'packages.create', label: 'Buat Paket', description: 'Membuat paket baru' },\n      { key: 'packages.edit', label: 'Edit Paket', description: 'Mengubah detail paket' },\n      { key: 'packages.delete', label: 'Hapus Paket', description: 'Menghapus paket' },\n      { key: 'departures.view', label: 'Lihat Keberangkatan', description: 'Melihat daftar keberangkatan' },\n      { key: 'departures.create', label: 'Buat Keberangkatan', description: 'Membuat keberangkatan baru' },\n      { key: 'departures.edit', label: 'Edit Keberangkatan', description: 'Mengubah detail keberangkatan' },\n      { key: 'departures.delete', label: 'Hapus Keberangkatan', description: 'Menghapus keberangkatan' },\n    ]\n  },\n  {\n    name: 'Operasional',\n    permissions: [\n      { key: 'operational.view', label: 'Lihat Operasional', description: 'Melihat data operasional' },\n      { key: 'operational.manage', label: 'Kelola Operasional', description: 'Mengelola data operasional' },\n      { key: 'operational.rooms.view', label: 'Lihat Kamar', description: 'Manajemen penempatan kamar' },\n      { key: 'itinerary.view', label: 'Lihat Itinerary', description: 'Melihat template itinerary' },\n      { key: 'operational.manasik.view', label: 'Lihat Manasik', description: 'Melihat jadwal manasik' },\n      { key: 'departures.visa.view', label: 'Lihat Visa', description: 'Melihat status pengurusan visa' },\n    ]\n  },\n  {\n    name: 'Leads & Marketing',\n    permissions: [\n      { key: 'leads.view', label: 'Lihat Leads', description: 'Melihat daftar leads' },\n      { key: 'leads.create', label: 'Buat Leads', description: 'Membuat leads baru' },\n      { key: 'leads.edit', label: 'Edit Leads', description: 'Mengubah detail leads' },\n      { key: 'leads.delete', label: 'Hapus Leads', description: 'Menghapus leads' },\n      { key: 'marketing.view', label: 'Lihat Marketing', description: 'Melihat data kupon, promosi, loyalty, dan referral' },\n    ]\n  },\n  {\n    name: 'Perlengkapan',\n    permissions: [\n      { key: 'equipment.view', label: 'Lihat Perlengkapan', description: 'Melihat data perlengkapan' },\n      { key: 'equipment.inventory', label: 'Kelola Stok', description: 'Kelola stok perlengkapan' },\n      { key: 'equipment.distribute', label: 'Catat Serah Terima', description: 'Catat serah terima perlengkapan' },\n    ]\n  },\n  {\n    name: 'SDM (HR)',\n    permissions: [\n      { key: 'hr.employees.view', label: 'Lihat Karyawan', description: 'Melihat data karyawan' },\n      { key: 'hr.attendance.view', label: 'Lihat Absensi', description: 'Melihat data absensi' },\n      { key: 'hr.payroll.view', label: 'Lihat Payroll', description: 'Melihat data penggajian dan slip gaji' },\n      { key: 'hr.departments.view', label: 'Lihat Departemen', description: 'Melihat data departemen' },\n      { key: 'hr.positions.view', label: 'Lihat Posisi', description: 'Melihat data posisi' },\n      { key: 'hr.schedules.view', label: 'Lihat Jadwal Kerja', description: 'Melihat jadwal kerja' },\n      { key: 'hr.devices.view', label: 'Lihat Perangkat', description: 'Melihat perangkat HR' },\n      { key: 'hr.settings.view', label: 'Lihat Pengaturan HR', description: 'Mengakses pengaturan HR' },\n    ]\n  },\n  {\n    name: 'Support & Komunikasi',\n    permissions: [\n      { key: 'support.tickets.view', label: 'Lihat Tiket Support', description: 'Melihat tiket bantuan pelanggan' },\n      { key: 'whatsapp.view', label: 'Lihat WhatsApp', description: 'Akses integrasi WhatsApp' },\n      { key: 'marketing_materials.view', label: 'Materi Promosi', description: 'Akses folder materi promosi' },\n    ]\n  },\n  {\n    name: 'Sistem & Pengaturan',\n    permissions: [\n      { key: 'users.view', label: 'Lihat Pengguna', description: 'Melihat daftar pengguna' },\n      { key: 'agents.view', label: 'Lihat Agen', description: 'Melihat daftar agen' },\n      { key: 'settings.view', label: 'Lihat Pengaturan', description: 'Melihat pengaturan sistem' },\n      { key: 'settings.manage', label: 'Kelola Pengaturan', description: 'Mengelola pengaturan sistem' },\n      { key: 'master_data.view', label: 'Lihat Master Data', description: 'Melihat master data' },\n      { key: 'documents.verification.view', label: 'Verifikasi Dokumen', description: 'Verifikasi dokumen jamaah' },\n      { key: 'documents.generator.view', label: 'Generate Surat', description: 'Membuat surat otomatis' },\n      { key: 'offline_content.view', label: 'Konten Offline', description: 'Akses konten offline' },\n    ]\n  },\n];\n\nexport function RoleManagementEnhanced() {\n  const queryClient = useQueryClient();\n  const [selectedRole, setSelectedRole] = useState<string>('sales');\n  const [searchQuery, setSearchQuery] = useState('');\n  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});\n  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(PERMISSION_GROUPS.map(g => g.name)));\n\n  // Fetch role permissions\n  const { data: permissions = [], isLoading } = useQuery({\n    queryKey: ['role-permissions-enhanced', selectedRole],\n    queryFn: async () => {\n      const { data, error } = await supabase\n        .from('role_permissions')\n        .select('*')\n        .eq('role', selectedRole);\n\n      if (error) throw error;\n      return data as Permission[];\n    },\n  });\n\n  // Save mutation\n  const saveMutation = useMutation({\n    mutationFn: async (changes: Record<string, boolean>) => {\n      const updates = Object.entries(changes).map(([permissionKey, isEnabled]) => ({\n        role: selectedRole,\n        permission_key: permissionKey,\n        is_enabled: isEnabled,\n      }));\n\n      for (const update of updates) {\n        const { error } = await supabase\n          .from('role_permissions')\n          .upsert(update, { onConflict: 'role,permission_key' });\n\n        if (error) throw error;\n      }\n    },\n    onSuccess: () => {\n      toast.success(`Hak akses untuk ${ROLE_CONFIGS[selectedRole]?.label} berhasil diperbarui!`);\n      setPendingChanges({});\n      queryClient.invalidateQueries({ queryKey: ['role-permissions-enhanced', selectedRole] });\n    },\n    onError: (error: any) => {\n      toast.error(`Gagal: ${error.message}`);\n    },\n  });\n\n  // Filter permissions based on search\n  const filteredGroups = useMemo(() => {\n    return PERMISSION_GROUPS.map(group => ({\n      ...group,\n      permissions: group.permissions.filter(\n        p => p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||\n             p.key.toLowerCase().includes(searchQuery.toLowerCase())\n      ),\n    })).filter(g => g.permissions.length > 0);\n  }, [searchQuery]);\n\n  const handleToggle = (permissionKey: string, currentValue: boolean) => {\n    setPendingChanges(prev => ({\n      ...prev,\n      [permissionKey]: !currentValue,\n    }));\n  };\n\n  const handleSave = () => {\n    if (Object.keys(pendingChanges).length === 0) {\n      toast.info('Tidak ada perubahan');\n      return;\n    }\n    saveMutation.mutate(pendingChanges);\n  };\n\n  const toggleGroup = (groupName: string) => {\n    const newExpanded = new Set(expandedGroups);\n    if (newExpanded.has(groupName)) {\n      newExpanded.delete(groupName);\n    } else {\n      newExpanded.add(groupName);\n    }\n    setExpandedGroups(newExpanded);\n  };\n\n  const hasChanges = Object.keys(pendingChanges).length > 0;\n  const roleConfig = ROLE_CONFIGS[selectedRole];\n\n  return (\n    <div className=\"space-y-6\">\n      {/* Header */}\n      <div>\n        <h1 className=\"text-3xl font-bold tracking-tight\">Manajemen Hak Akses Role</h1>\n        <p className=\"text-muted-foreground mt-2\">\n          Atur permission default untuk setiap role. Perubahan akan berlaku untuk semua pengguna dengan role tersebut.\n        </p>\n      </div>\n\n      <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-6\">\n        {/* Role Selector */}\n        <Card className=\"lg:col-span-1\">\n          <CardHeader>\n            <CardTitle className=\"text-lg\">Pilih Role</CardTitle>\n            <CardDescription>Kelola permission untuk role</CardDescription>\n          </CardHeader>\n          <CardContent className=\"space-y-2\">\n            {Object.values(ROLE_CONFIGS).map(config => (\n              <Button\n                key={config.role}\n                variant={selectedRole === config.role ? 'default' : 'outline'}\n                className=\"w-full justify-start\"\n                onClick={() => setSelectedRole(config.role)}\n              >\n                <div className={cn('w-2 h-2 rounded-full mr-2', config.color)} />\n                <div className=\"text-left\">\n                  <div className=\"font-medium text-sm\">{config.label}</div>\n                  <div className=\"text-xs text-muted-foreground\">{config.description}</div>\n                </div>\n              </Button>\n            ))}\n          </CardContent>\n        </Card>\n\n        {/* Permissions Manager */}\n        <div className=\"lg:col-span-3\">\n          {roleConfig && (\n            <Card>\n              <CardHeader>\n                <div className=\"flex items-center justify-between\">\n                  <div className=\"flex items-center gap-3\">\n                    <div className={cn('w-4 h-4 rounded', roleConfig.color)} />\n                    <div>\n                      <CardTitle>{roleConfig.label}</CardTitle>\n                      <CardDescription>{roleConfig.description}</CardDescription>\n                    </div>\n                  </div>\n                  <div className=\"flex items-center gap-2\">\n                    {hasChanges && (\n                      <Button variant=\"ghost\" size=\"sm\" onClick={() => setPendingChanges({})}>\n                        Batalkan\n                      </Button>\n                    )}\n                    <Button\n                      size=\"sm\"\n                      disabled={!hasChanges || saveMutation.isPending}\n                      onClick={handleSave}\n                      className=\"gap-2\"\n                    >\n                      {saveMutation.isPending ? (\n                        <Loader2 className=\"h-4 w-4 animate-spin\" />\n                      ) : (\n                        <Save className=\"h-4 w-4\" />\n                      )}\n                      Simpan {hasChanges && `(${Object.keys(pendingChanges).length})`}\n                    </Button>\n                  </div>\n                </div>\n              </CardHeader>\n\n              <CardContent className=\"space-y-4\">\n                {/* Search */}\n                <div className=\"relative\">\n                  <Search className=\"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground\" />\n                  <Input\n                    placeholder=\"Cari permission...\"\n                    value={searchQuery}\n                    onChange={(e) => setSearchQuery(e.target.value)}\n                    className=\"pl-9\"\n                  />\n                </div>\n\n                {/* Info Alert */}\n                <Alert className=\"bg-blue-50 border-blue-200 text-blue-800\">\n                  <Info className=\"h-4 w-4 text-blue-600\" />\n                  <AlertDescription className=\"text-xs\">\n                    Permission yang diaktifkan akan diberikan ke semua pengguna dengan role <strong>{roleConfig.label}</strong>.\n                  </AlertDescription>\n                </Alert>\n\n                {/* Permissions List */}\n                <ScrollArea className=\"h-[600px] pr-4\">\n                  <div className=\"space-y-4\">\n                    {isLoading ? (\n                      <div className=\"flex items-center justify-center py-12\">\n                        <Loader2 className=\"h-6 w-6 animate-spin text-primary\" />\n                      </div>\n                    ) : filteredGroups.length === 0 ? (\n                      <div className=\"text-center py-12 text-muted-foreground\">\n                        <AlertCircle className=\"h-8 w-8 mx-auto mb-2 opacity-50\" />\n                        <p>Tidak ada permission yang sesuai</p>\n                      </div>\n                    ) : (\n                      filteredGroups.map(group => {\n                        const isExpanded = expandedGroups.has(group.name);\n                        return (\n                          <div key={group.name} className=\"border rounded-lg\">\n                            <Button\n                              variant=\"ghost\"\n                              className=\"w-full justify-between px-4 py-3 h-auto\"\n                              onClick={() => toggleGroup(group.name)}\n                            >\n                              <div className=\"flex items-center gap-2\">\n                                <Shield className=\"h-4 w-4 text-muted-foreground\" />\n                                <span className=\"font-semibold text-sm\">{group.name}</span>\n                                <Badge variant=\"secondary\" className=\"text-xs\">\n                                  {group.permissions.length}\n                                </Badge>\n                              </div>\n                              {isExpanded ? (\n                                <ChevronUp className=\"h-4 w-4\" />\n                              ) : (\n                                <ChevronDown className=\"h-4 w-4\" />\n                              )}\n                            </Button>\n\n                            {isExpanded && (\n                              <>\n                                <Separator />\n                                <div className=\"p-4 space-y-3\">\n                                  {group.permissions.map(perm => {\n                                    const permission = permissions.find(\n                                      p => p.permission_key === perm.key\n                                    );\n                                    const isEnabled = perm.key in pendingChanges\n                                      ? pendingChanges[perm.key]\n                                      : (permission?.is_enabled ?? false);\n                                    const hasChanged = perm.key in pendingChanges;\n\n                                    return (\n                                      <div\n                                        key={perm.key}\n                                        className={cn(\n                                          'flex items-center justify-between p-3 rounded-lg border transition-all',\n                                          hasChanged ? 'border-amber-300 bg-amber-50' : 'border-border'\n                                        )}\n                                      >\n                                        <div className=\"flex-1 mr-4\">\n                                          <div className=\"flex items-center gap-2\">\n                                            <span className=\"font-medium text-sm\">{perm.label}</span>\n                                            {hasChanged && (\n                                              <Badge variant=\"outline\" className=\"text-xs h-5 bg-amber-50 text-amber-700 border-amber-200\">\n                                                Pending\n                                              </Badge>\n                                            )}\n                                          </div>\n                                          <p className=\"text-xs text-muted-foreground mt-1\">{perm.description}</p>\n                                        </div>\n                                        <div className=\"flex items-center gap-2\">\n                                          <span className=\"text-xs text-muted-foreground font-mono\">{perm.key}</span>\n                                          <Checkbox\n                                            checked={isEnabled}\n                                            onCheckedChange={() => handleToggle(perm.key, isEnabled)}\n                                            className=\"h-5 w-5\"\n                                          />\n                                        </div>\n                                      </div>\n                                    );\n                                  })}\n                                </div>\n                              </>\n                            )}\n                          </div>\n                        );\n                      })\n                    )}\n                  </div>\n                </ScrollArea>\n              </CardContent>\n            </Card>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}\n
