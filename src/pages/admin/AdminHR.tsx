import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, Clock, MapPin, Calendar, Plus, Search, UserCheck, UserX, Camera, Settings, Building2, Briefcase, Trash2, Save, Link2, ExternalLink, Copy, Smartphone, ShieldCheck, ShieldX, Phone, Mail, Edit, UserPlus, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { HRSettingsForm } from "@/components/admin/HRSettingsForm";
import { Database } from "@/integrations/supabase/types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"];

type AttendanceRecord = Database["public"]["Tables"]["attendance_records"]["Row"] & {
  employee?: Pick<Employee, 'full_name' | 'employee_code'>;
};

type Department = Database["public"]["Tables"]["departments"]["Row"];
type DepartmentInsert = Database["public"]["Tables"]["departments"]["Insert"];

type Position = { id: string; name: string; code: string; department_id?: string; is_active?: boolean; created_at?: string };
type PositionInsert = { name: string; code: string; department_id?: string; is_active?: boolean };

type HRSettings = Database["public"]["Tables"]["hr_settings"]["Row"];
type HRSettingsUpdate = Database["public"]["Tables"]["hr_settings"]["Update"];

type EmployeeDevice = Database["public"]["Tables"]["employee_devices"]["Row"] & {
  employee?: Pick<Employee, 'full_name' | 'employee_code'>;
};

type WorkSchedule = Database["public"]["Tables"]["work_schedules"]["Row"];
type WorkScheduleInsert = Database["public"]["Tables"]["work_schedules"]["Insert"];
type WorkScheduleUpdate = Database["public"]["Tables"]["work_schedules"]["Update"];

type EmployeeSyncIssue = {
  issue_type: string;
  employee_id: string | null;
  user_id: string | null;
  full_name: string | null;
  employee_code: string | null;
  description: string | null;
};

const dayLabels = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Helper function to generate employee code
const generateEmployeeCode = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `EMP${year}${random}`;
};

export default function AdminHR() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "employees");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newPosName, setNewPosName] = useState("");
  const [newPosDeptId, setNewPosDeptId] = useState("");
  const [scheduleEmployeeId, setScheduleEmployeeId] = useState("");
  
  // Device registration state
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [selectedEmployeeForDevice, setSelectedEmployeeForDevice] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceFingerprint, setNewDeviceFingerprint] = useState("");

  // New state for linking existing user
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // === DATA QUERIES ===

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees", filterBranch],
    queryFn: async () => {
      let query = supabase.from("employees").select("*");
      if (filterBranch) {
        query = query.eq("branch_id", filterBranch);
      }
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Query for profiles that are not yet linked to any employee
  const { data: availableProfiles = [] } = useQuery({
    queryKey: ["available-profiles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone");
      
      if (profilesError) throw profilesError;

      // Get all user_ids already in employees
      const { data: existingEmployeeUserIds, error: employeesError } = await supabase
        .from("employees")
        .select("user_id");
      
      if (employeesError) throw employeesError;

      const linkedUserIds = new Set(existingEmployeeUserIds?.map(e => e.user_id).filter(Boolean));
      
      // Return profiles that are not linked
      return profiles?.filter(p => !linkedUserIds.has(p.user_id)) || [];
    },
    enabled: isEmployeeDialogOpen && isExistingUser,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-records", attendanceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, employee:employees(full_name, employee_code)")
        .eq("attendance_date", attendanceDate)
        .order("check_in_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("positions").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: hrSettings } = useQuery({
    queryKey: ["hr-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: syncIssues = [], refetch: refetchSyncIssues, error: syncError } = useQuery<EmployeeSyncIssue[]>({
    queryKey: ["employee-sync-issues"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validate_employee_user_sync");
      if (error) throw error;
      return (data || []) as EmployeeSyncIssue[];
    },
    retry: 1,
  });

  const { data: workSchedules = [] } = useQuery({
    queryKey: ["work-schedules", scheduleEmployeeId],
    enabled: !!scheduleEmployeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", scheduleEmployeeId)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
  });

  // Devices query
  const { data: employeeDevices = [] } = useQuery({
    queryKey: ["employee-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_devices")
        .select("*, employee:employees(full_name, employee_code)")
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // === MUTATIONS ===

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const { data, error } = await supabase.functions.invoke("delete-employee", {
        body: {
          employeeId: employee.id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-sync-issues"] });
      toast.success("Karyawan berhasil dihapus");
    },
    onError: (error: Error) => toast.error("Gagal menghapus: " + error.message),
  });

  const saveEmployeeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const genderValue = formData.get("gender") as Database["public"]["Enums"]["gender_type"];
      const salaryValue = formData.get("salary") as string;
      const useCustom = formData.get("use_custom_deduction") === "on";
      const employeeData: EmployeeInsert = {
        full_name: formData.get("full_name") as string,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        position: (formData.get("position") as string) || null,
        department: (formData.get("department") as string) || null,
        gender: genderValue || null,
        salary: salaryValue ? parseFloat(salaryValue) : null,
        hire_date: (formData.get("hire_date") as string) || null,
        is_active: true,
        use_custom_deduction: useCustom,
        custom_absent_deduction: useCustom ? (parseFloat(formData.get("custom_absent_deduction") as string) || null) : null,
        custom_absent_deduction_type: useCustom ? (formData.get("custom_absent_deduction_type") as string || null) : null,
        custom_late_deduction: useCustom ? (parseFloat(formData.get("custom_late_deduction") as string) || null) : null,
        custom_late_deduction_type: useCustom ? (formData.get("custom_late_deduction_type") as string || null) : null,
        employee_code: "", // Will be generated if new
      };

      if (editingEmployee?.id) {
        const updatePayload: EmployeeUpdate = employeeData;
        const { error } = await supabase.from("employees").update(updatePayload).eq("id", editingEmployee.id);
        if (error) throw error;
      } else {
        if (isExistingUser) {
          // Link existing user to employee
          if (!selectedUserId) throw new Error("Pilih user yang akan dikaitkan");
          
          // Check if user already has an employee record
          const { data: existingEmployee } = await supabase
            .from("employees")
            .select("id")
            .eq("user_id", selectedUserId)
            .maybeSingle();
          
          if (existingEmployee) {
            throw new Error("User ini sudah terdaftar sebagai karyawan");
          }

          // Generate employee code
          const employeeCode = generateEmployeeCode();

          // Create employee record with existing user
          const { error: employeeError } = await supabase.from("employees").insert({
            user_id: selectedUserId,
            full_name: employeeData.full_name,
            email: employeeData.email,
            phone: employeeData.phone,
            position: employeeData.position,
            department: employeeData.department,
            gender: employeeData.gender,
            salary: employeeData.salary,
            hire_date: employeeData.hire_date,
            employee_code: employeeCode,
            is_active: true,
          });

          if (employeeError) throw new Error("Gagal membuat data karyawan: " + employeeError.message);
        } else {
          // Create new user and employee
          const password = formData.get("password") as string;
          const email = employeeData.email as string;

          if (!password) throw new Error("Password wajib diisi untuk karyawan baru");
          if (!email) throw new Error("Email wajib diisi untuk karyawan baru");

          // Try to use Edge Function first, fallback to direct creation
          try {
            const { data, error } = await supabase.functions.invoke("create-employee", {
              body: {
                fullName: employeeData.full_name,
                email: email,
                password: password,
                phone: employeeData.phone,
                position: employeeData.position,
                department: employeeData.department,
                gender: employeeData.gender,
                salary: employeeData.salary,
                hireDate: employeeData.hire_date,
                existingUserId: null,
              },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);
          } catch (edgeFunctionError) {
            // Fallback: Create user directly via Supabase Auth
            console.warn("Edge Function failed, using fallback method:", edgeFunctionError);
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: email,
              password: password,
              options: {
                data: {
                  full_name: employeeData.full_name,
                }
              }
            });

            if (authError) throw new Error("Gagal membuat akun: " + authError.message);
            if (!authData.user) throw new Error("Gagal membuat akun pengguna");

            const newUserId = authData.user.id;

            // Generate employee code
            const employeeCode = generateEmployeeCode();

            // Create employee record
            const { error: employeeError } = await supabase.from("employees").insert({
              user_id: newUserId,
              full_name: employeeData.full_name,
              email: email,
              phone: employeeData.phone,
              position: employeeData.position,
              department: employeeData.department,
              gender: employeeData.gender,
              salary: employeeData.salary,
              hire_date: employeeData.hire_date,
              employee_code: employeeCode,
              is_active: true,
            });

            if (employeeError) throw new Error("Gagal membuat data karyawan: " + employeeError.message);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["available-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["employee-sync-issues"] });
      toast.success(editingEmployee ? "Karyawan berhasil diperbarui" : "Karyawan berhasil ditambahkan");
      handleEmployeeDialogClose();
    },
    onError: (error: Error) => toast.error("Gagal menyimpan: " + error.message),
  });

  const addDepartmentMutation = useMutation({
    mutationFn: async () => {
      if (!newDeptName || !newDeptCode) throw new Error("Nama dan kode wajib diisi");
      const { error } = await supabase.from("departments").insert({ name: newDeptName, code: newDeptCode });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departemen berhasil ditambahkan");
      setNewDeptName("");
      setNewDeptCode("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addPositionMutation = useMutation({
    mutationFn: async () => {
      if (!newPosName || !newPosDeptId) throw new Error("Nama dan departemen wajib diisi");
      const { error } = await supabase.from("positions").insert({ name: newPosName, department_id: newPosDeptId, code: newPosName.toUpperCase().replace(/\s+/g, "_") });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Posisi berhasil ditambahkan");
      setNewPosName("");
      setNewPosDeptId("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const registerDeviceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeForDevice || !newDeviceName || !newDeviceFingerprint) {
        throw new Error("Semua field wajib diisi");
      }
      
      const { error } = await supabase.from("employee_devices").insert({
        employee_id: selectedEmployeeForDevice,
        device_name: newDeviceName,
        device_fingerprint: newDeviceFingerprint,
        is_active: true,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-devices"] });
      toast.success("Perangkat berhasil didaftarkan");
      setIsDeviceDialogOpen(false);
      setSelectedEmployeeForDevice("");
      setNewDeviceName("");
      setNewDeviceFingerprint("");
    },
    onError: (error: Error) => toast.error("Gagal mendaftarkan perangkat: " + error.message),
  });

  const saveWorkScheduleMutation = useMutation({
    mutationFn: async (schedules: WorkScheduleInsert[]) => {
      // Delete existing schedules first
      const { error: deleteError } = await supabase.from("work_schedules").delete().eq("employee_id", schedules[0].employee_id);
      if (deleteError) throw deleteError;

      // Insert new schedules
      const { error: insertError } = await supabase.from("work_schedules").insert(schedules);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("Jadwal kerja berhasil disimpan");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleDeviceStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("employee_devices").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-devices"] });
      toast.success("Status perangkat diperbarui");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-devices"] });
      toast.success("Perangkat dihapus");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // === HANDLERS ===

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEmployeeDialogOpen(true);
    setIsExistingUser(false);
  };

  const handleEmployeeDialogClose = () => {
    setIsEmployeeDialogOpen(false);
    setEditingEmployee(null);
    setIsExistingUser(false);
    setSelectedUserId("");
  };

  const handleSaveWorkSchedule = (schedules: WorkScheduleInsert[]) => {
    saveWorkScheduleMutation.mutate(schedules);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === "all" || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen HR</h1>
          <p className="text-muted-foreground">Kelola data karyawan, absensi, dan jadwal kerja.</p>
        </div>
        <Button onClick={() => setIsEmployeeDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full">
          <TabsTrigger value="employees"><Users className="h-4 w-4 mr-2" /> Karyawan</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="h-4 w-4 mr-2" /> Absensi</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="h-4 w-4 mr-2" /> Departemen</TabsTrigger>
          <TabsTrigger value="schedules"><Calendar className="h-4 w-4 mr-2" /> Jadwal</TabsTrigger>
          <TabsTrigger value="devices"><Smartphone className="h-4 w-4 mr-2" /> Perangkat</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" /> Pengaturan</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daftar Karyawan</CardTitle>
                <CardDescription>Total {filteredEmployees.length} karyawan aktif.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari karyawan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-[250px]"
                  />
                </div>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Departemen</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="text-center py-8">Memuat data karyawan...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Tidak ada karyawan ditemukan.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Posisi</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map(employee => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={employee.photo_url || undefined} />
                              <AvatarFallback>{employee.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {employee.full_name}
                                {!employee.user_id && (
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1">No User</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{employee.employee_code}</TableCell>
                        <TableCell>{employee.department || "N/A"}</TableCell>
                        <TableCell>{employee.position || "N/A"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {employee.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {employee.phone}</div>}
                            {employee.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {employee.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.is_active ? "default" : "secondary"}>
                            {employee.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus karyawan ${employee.full_name}? Tindakan ini juga akan menghapus data terkait.`)) {
                                deleteEmployeeMutation.mutate(employee);
                              }
                            }}
                            disabled={deleteEmployeeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <ManualAttendanceSection 
            employees={employees} 
            queryClient={queryClient}
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catatan Absensi</CardTitle>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-fit"
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada catatan absensi untuk tanggal ini.</TableCell>
                    </TableRow>
                  ) : (
                    attendanceRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="font-medium">{record.employee?.full_name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{record.employee?.employee_code || "N/A"}</div>
                        </TableCell>
                        <TableCell>{format(new Date(record.attendance_date), "dd MMMM yyyy", { locale: idLocale })}</TableCell>
                        <TableCell>
                          {record.check_in_time ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(`2000-01-01T${record.check_in_time}`), "HH:mm")}
                              {(record.check_in_location as any)?.address && (
                                <span className="text-muted-foreground text-xs">({(record.check_in_location as any).address})</span>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(`2000-01-01T${record.check_out_time}`), "HH:mm")}
                              {(record.check_out_location as any)?.address && (
                                <span className="text-muted-foreground text-xs">({(record.check_out_location as any).address})</span>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.status === "Hadir" ? "default" : "secondary"}>{record.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Departemen</CardTitle>
              <CardDescription>Kelola departemen yang ada di perusahaan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nama Departemen"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Kode Departemen (ex: HRD)"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  className="w-[150px]"
                />
                <Button onClick={() => addDepartmentMutation.mutate()} disabled={addDepartmentMutation.isPending}>
                  {addDepartmentMutation.isPending ? "Menambahkan..." : "Tambah"}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Belum ada departemen.</TableCell>
                    </TableRow>
                  ) : (
                    departments.map(dept => (
                      <TableRow key={dept.id}>
                        <TableCell>{dept.name}</TableCell>
                        <TableCell className="font-mono">{dept.code}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Hapus departemen ${dept.name}?`)) {
                                // Add delete department logic if needed
                              }
                            }}
                          >
                            Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jadwal Kerja Karyawan</CardTitle>
              <CardDescription>Atur jadwal kerja mingguan untuk setiap karyawan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={scheduleEmployeeId} onValueChange={setScheduleEmployeeId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Pilih Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {scheduleEmployeeId && (
                <WorkScheduleEditor
                  employeeId={scheduleEmployeeId}
                  initialSchedules={workSchedules}
                  onSave={handleSaveWorkSchedule}
                  isSaving={saveWorkScheduleMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsDeviceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Daftarkan Perangkat
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Perangkat Karyawan</CardTitle>
              <CardDescription>Kelola perangkat yang terdaftar untuk absensi karyawan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Nama Perangkat</TableHead>
                    <TableHead>Fingerprint</TableHead>
                    <TableHead>Terdaftar Pada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada perangkat terdaftar.</TableCell>
                    </TableRow>
                  ) : (
                    employeeDevices.map(device => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="font-medium">{device.employee?.full_name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">{device.employee?.employee_code || "N/A"}</div>
                        </TableCell>
                        <TableCell>{device.device_name}</TableCell>
                        <TableCell className="font-mono text-xs">{device.device_fingerprint.substring(0, 10)}...</TableCell>
                        <TableCell>{format(new Date(device.registered_at), "dd MMM yyyy HH:mm", { locale: idLocale })}</TableCell>
                        <TableCell>
                          <Badge variant={device.is_active ? "default" : "secondary"}>
                            {device.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleDeviceStatusMutation.mutate({ id: device.id, is_active: !device.is_active })}
                            disabled={toggleDeviceStatusMutation.isPending}
                          >
                            {device.is_active ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Hapus perangkat ini?")) {
                                deleteDeviceMutation.mutate(device.id);
                              }
                            }}
                            disabled={deleteDeviceMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan HR</CardTitle>
              <CardDescription>Konfigurasi aturan absensi, potongan, dan lembur.</CardDescription>
            </CardHeader>
            <CardContent>
              {hrSettings ? (
                <HRSettingsForm initialData={hrSettings} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">Memuat pengaturan HR...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daftarkan Perangkat Baru</DialogTitle>
            <DialogDescription>
              Daftarkan perangkat secara manual untuk karyawan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device_employee">Karyawan *</Label>
              <Select value={selectedEmployeeForDevice} onValueChange={setSelectedEmployeeForDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_name">Nama Perangkat *</Label>
              <Input 
                id="device_name" 
                placeholder="Contoh: iPhone 13 Pro, Samsung S21" 
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_fingerprint">Fingerprint Perangkat *</Label>
              <div className="flex gap-2">
                <Input 
                  id="device_fingerprint" 
                  placeholder="Masukkan fingerprint unik perangkat" 
                  value={newDeviceFingerprint}
                  onChange={(e) => setNewDeviceFingerprint(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setNewDeviceFingerprint(crypto.randomUUID())}
                  type="button"
                >
                  Generate
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Fingerprint biasanya didapat dari aplikasi mobile atau browser saat pertama kali login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>Batal</Button>
            <Button 
              onClick={() => registerDeviceMutation.mutate()} 
              disabled={registerDeviceMutation.isPending}
            >
              {registerDeviceMutation.isPending ? "Mendaftarkan..." : "Daftarkan Perangkat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Karyawan" : "Tambah Karyawan Baru"}</DialogTitle>
            <DialogDescription>
              Lengkapi detail karyawan untuk manajemen HR.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            saveEmployeeMutation.mutate(formData);
          }} className="space-y-6 py-4">
            
            {!editingEmployee && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-dashed border-primary/50">
                  <div className="space-y-0.5">
                    <Label className="text-base">Gunakan User Terdaftar?</Label>
                    <p className="text-sm text-muted-foreground">
                      Kaitkan karyawan dengan akun user yang sudah ada.
                    </p>
                  </div>
                  <Switch
                    checked={isExistingUser}
                    onCheckedChange={setIsExistingUser}
                  />
                </div>

                {isExistingUser ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="existing_user_id">Pilih User *</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun user yang sudah ada" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfiles.length === 0 ? (
                          <div className="p-2 text-sm text-center text-muted-foreground">Tidak ada user yang tersedia</div>
                        ) : (
                          availableProfiles.map(profile => (
                            <SelectItem key={profile.user_id} value={profile.user_id}>
                              {profile.full_name || "No Name"} ({profile.phone || "No Phone"})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" placeholder="email@contoh.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password Login *</Label>
                      <Input id="password" name="password" type="password" placeholder="Minimal 6 karakter" required />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input 
                  id="full_name" 
                  name="full_name" 
                  defaultValue={
                    editingEmployee?.full_name || 
                    (isExistingUser ? availableProfiles.find(p => p.user_id === selectedUserId)?.full_name : "") || 
                    ""
                  } 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={
                    editingEmployee?.phone || 
                    (isExistingUser ? availableProfiles.find(p => p.user_id === selectedUserId)?.phone : "") || 
                    ""
                  } 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departemen</Label>
                <Select name="department" defaultValue={editingEmployee?.department || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Posisi</Label>
                <Select name="position" defaultValue={editingEmployee?.position || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Posisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(pos => (
                      <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <Select name="gender" defaultValue={editingEmployee?.gender || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Tanggal Bergabung</Label>
                <Input id="hire_date" name="hire_date" type="date" defaultValue={editingEmployee?.hire_date || ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Gaji Pokok</Label>
              <Input id="salary" name="salary" type="number" step="0.01" defaultValue={editingEmployee?.salary || ""} placeholder="Rp 0" />
            </div>

            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="use_custom_deduction"
                  name="use_custom_deduction"
                  defaultChecked={editingEmployee?.use_custom_deduction || false}
                />
                <Label htmlFor="use_custom_deduction" className="font-medium">Gunakan potongan kustom</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 p-3 border rounded-md bg-muted/20">
                  <Label className="text-sm font-semibold">Potongan Absen</Label>
                  <Input id="custom_absent_deduction" name="custom_absent_deduction" type="number" step="0.01" defaultValue={editingEmployee?.custom_absent_deduction || ""} placeholder="Nilai" />
                  <Select name="custom_absent_deduction_type" defaultValue={editingEmployee?.custom_absent_deduction_type || "fixed"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 p-3 border rounded-md bg-muted/20">
                  <Label className="text-sm font-semibold">Potongan Telat</Label>
                  <Input id="custom_late_deduction" name="custom_late_deduction" type="number" step="0.01" defaultValue={editingEmployee?.custom_late_deduction || ""} placeholder="Nilai" />
                  <Select name="custom_late_deduction_type" defaultValue={editingEmployee?.custom_late_deduction_type || "fixed"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleEmployeeDialogClose}>Batal</Button>
              <Button type="submit" disabled={saveEmployeeMutation.isPending}>
                {saveEmployeeMutation.isPending ? "Menyimpan..." : (editingEmployee ? "Perbarui Karyawan" : "Simpan Karyawan")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


interface WorkScheduleEditorProps {
  employeeId: string;
  initialSchedules: WorkSchedule[];
  onSave: (schedules: WorkScheduleInsert[]) => void;
  isSaving: boolean;
}

function WorkScheduleEditor({ employeeId, initialSchedules, onSave, isSaving }: WorkScheduleEditorProps) {
  const [schedules, setSchedules] = useState<WorkScheduleInsert[]>(() => {
    const defaultSchedules: WorkScheduleInsert[] = dayLabels.map((_, index) => ({
      employee_id: employeeId,
      day_of_week: index,
      start_time: "09:00:00",
      end_time: "17:00:00",
      is_day_off: false,
    }));
    return initialSchedules.length > 0 ? initialSchedules.map(s => ({...s})) : defaultSchedules;
  });

  // Update schedules when initialSchedules or employeeId changes
  useEffect(() => {
    const defaultSchedules: WorkScheduleInsert[] = dayLabels.map((_, index) => ({
      employee_id: employeeId,
      day_of_week: index,
      start_time: "09:00:00",
      end_time: "17:00:00",
      is_day_off: false,
    }));
    setSchedules(initialSchedules.length > 0 ? initialSchedules.map(s => ({...s})) : defaultSchedules);
  }, [initialSchedules, employeeId]);

  const handleScheduleChange = (index: number, field: keyof WorkScheduleInsert, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSave = () => {
    onSave(schedules);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hari</TableHead>
              <TableHead>Jam Mulai</TableHead>
              <TableHead>Jam Selesai</TableHead>
              <TableHead>Libur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule, index) => (
              <TableRow key={index}>
                <TableCell>{dayLabels[schedule.day_of_week]}</TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={schedule.start_time || ""}
                    onChange={(e) => handleScheduleChange(index, "start_time", e.target.value)}
                    disabled={schedule.is_day_off}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={schedule.end_time || ""}
                    onChange={(e) => handleScheduleChange(index, "end_time", e.target.value)}
                    disabled={schedule.is_day_off}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={schedule.is_day_off}
                    onCheckedChange={(checked) => handleScheduleChange(index, "is_day_off", checked)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Manual Attendance Section Component
function ManualAttendanceSection({ employees, queryClient }: { employees: Employee[]; queryClient: any }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualData, setManualData] = useState({
    employee_id: '',
    attendance_date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '08:00',
    check_out_time: '17:00',
    status: 'Hadir',
    manual_reason: '',
  });

  const { hasRole } = useAuth();
  const canManualAttendance = hasRole('super_admin') || hasRole('owner');

  const submitManualMutation = useMutation({
    mutationFn: async () => {
      if (!manualData.employee_id) throw new Error('Pilih karyawan');
      if (!manualData.manual_reason.trim()) throw new Error('Alasan wajib diisi');
      
      const { error } = await supabase.from('attendance_records').insert({
        employee_id: manualData.employee_id,
        attendance_date: manualData.attendance_date,
        check_in_time: manualData.check_in_time || null,
        check_out_time: manualData.check_out_time || null,
        status: manualData.status,
        is_manual: true,
        manual_reason: manualData.manual_reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Absensi manual berhasil dicatat');
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      setDialogOpen(false);
      setManualData(prev => ({ ...prev, employee_id: '', manual_reason: '' }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManualAttendance) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Absen Manual
        </Button>
        <span className="text-xs text-muted-foreground">Khusus Owner/Super Admin</span>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Absensi Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Karyawan</Label>
              <Select value={manualData.employee_id} onValueChange={v => setManualData(prev => ({ ...prev, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.is_active).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={manualData.attendance_date} onChange={e => setManualData(prev => ({ ...prev, attendance_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jam Masuk</Label>
                <Input type="time" value={manualData.check_in_time} onChange={e => setManualData(prev => ({ ...prev, check_in_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Jam Keluar</Label>
                <Input type="time" value={manualData.check_out_time} onChange={e => setManualData(prev => ({ ...prev, check_out_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={manualData.status} onValueChange={v => setManualData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hadir">Hadir</SelectItem>
                  <SelectItem value="Izin">Izin</SelectItem>
                  <SelectItem value="Sakit">Sakit</SelectItem>
                  <SelectItem value="Cuti">Cuti</SelectItem>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alasan Absen Manual *</Label>
              <Textarea 
                placeholder="Jelaskan alasan input manual..."
                value={manualData.manual_reason} 
                onChange={e => setManualData(prev => ({ ...prev, manual_reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => submitManualMutation.mutate()} disabled={submitManualMutation.isPending}>
              {submitManualMutation.isPending ? 'Menyimpan...' : 'Simpan Absensi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
