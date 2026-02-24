import { useState } from "react";
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
import { Users, Clock, MapPin, Calendar, Plus, Search, UserCheck, UserX, Camera, Settings, Building2, Briefcase, Trash2, Save, Link2, ExternalLink, Copy, Smartphone, ShieldCheck, ShieldX } from "lucide-react";
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

type Position = Database["public"]["Tables"]["positions"]["Row"];
type PositionInsert = Database["public"]["Tables"]["positions"]["Insert"];

type HRSettings = Database["public"]["Tables"]["hr_settings"]["Row"];
type HRSettingsUpdate = Database["public"]["Tables"]["hr_settings"]["Update"];

type EmployeeDevice = Database["public"]["Tables"]["employee_devices"]["Row"] & {
  employee?: Pick<Employee, 'full_name' | 'employee_code'>;
};

type WorkSchedule = Database["public"]["Tables"]["work_schedules"]["Row"];
type WorkScheduleInsert = Database["public"]["Tables"]["work_schedules"]["Insert"];
type WorkScheduleUpdate = Database["public"]["Tables"]["work_schedules"]["Update"];

const dayLabels = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function AdminHR() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("employees");
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
        const { data: codeData } = await supabase.rpc("generate_employee_code");
        const code = codeData || `EMP${format(new Date(), "yyMM")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const { error } = await supabase.from("employees").insert([{ ...employeeData, employee_code: code }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Karyawan berhasil disimpan");
      setIsEmployeeDialogOpen(false);
      setEditingEmployee(null);
    },
    onError: (error: Error) => toast.error("Gagal: " + error.message),
  });

  const addDepartmentMutation = useMutation({
    mutationFn: async () => {
      if (!newDeptName || !newDeptCode) throw new Error("Nama dan kode wajib diisi");
      const payload: DepartmentInsert = { name: newDeptName, code: newDeptCode.toUpperCase() };
      const { error } = await supabase.from("departments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departemen ditambahkan");
      setNewDeptName("");
      setNewDeptCode("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departemen berhasil dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPositionMutation = useMutation({
    mutationFn: async () => {
      if (!newPosName || !newPosDeptId) throw new Error("Nama posisi dan departemen wajib diisi");
      const payload: PositionInsert = { name: newPosName, department_id: newPosDeptId, level: 1 }; // Default level to 1
      const { error } = await supabase.from("positions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Posisi ditambahkan");
      setNewPosName("");
      setNewPosDeptId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("positions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Posisi berhasil dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveWorkScheduleMutation = useMutation({
    mutationFn: async (schedules: WorkScheduleInsert[]) => {
      // Delete existing schedules for the employee first
      await supabase.from("work_schedules").delete().eq("employee_id", scheduleEmployeeId);
      const { error } = await supabase.from("work_schedules").insert(schedules);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules", scheduleEmployeeId] });
      toast.success("Jadwal kerja berhasil disimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDeviceStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("employee_devices").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-devices"] });
      toast.success("Status perangkat berhasil diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-devices"] });
      toast.success("Perangkat berhasil dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === "" ||
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDept === "all" || employee.department === filterDept;
    return matchesSearch && matchesDepartment;
  });

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const handleEmployeeDialogClose = () => {
    setIsEmployeeDialogOpen(false);
    setEditingEmployee(null);
  };

  const getDepartmentName = (deptId: string | null) => {
    return departments.find(d => d.id === deptId)?.name || "N/A";
  };

  const getPositionName = (posId: string | null) => {
    return positions.find(p => p.id === posId)?.name || "N/A";
  };

  const getEmployeeName = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId)?.full_name || "N/A";
  };

  const getEmployeeCode = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId)?.employee_code || "N/A";
  };

  const handleSaveWorkSchedule = (schedules: WorkScheduleInsert[]) => {
    saveWorkScheduleMutation.mutate(schedules);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen HR & Karyawan</h1>
          <p className="text-muted-foreground">Kelola data karyawan, absensi, departemen, dan posisi</p>
        </div>
        <Button onClick={() => handleEditEmployee(null as any)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Karyawan</TabsTrigger>
          <TabsTrigger value="attendance">Absensi</TabsTrigger>
          <TabsTrigger value="departments">Departemen</TabsTrigger>
          <TabsTrigger value="positions">Posisi</TabsTrigger>
          <TabsTrigger value="schedules">Jadwal Kerja</TabsTrigger>
          <TabsTrigger value="devices">Perangkat</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan HR</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
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
                            <div className="font-medium">{employee.full_name}</div>
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
                              if (confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) {
                                // deleteEmployeeMutation.mutate(employee.id);
                                toast.info("Fitur hapus karyawan belum diimplementasikan.");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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
                              {record.check_in_location?.address && (
                                <span className="text-muted-foreground text-xs">({record.check_in_location.address})</span>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(`2000-01-01T${record.check_out_time}`), "HH:mm")}
                              {record.check_out_location?.address && (
                                <span className="text-muted-foreground text-xs">({record.check_out_location.address})</span>
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
                                deleteDepartmentMutation.mutate(dept.id);
                              }
                            }}
                            disabled={deleteDepartmentMutation.isPending}
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

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Posisi</CardTitle>
              <CardDescription>Kelola posisi atau jabatan karyawan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nama Posisi"
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newPosDeptId} onValueChange={setNewPosDeptId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Pilih Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => addPositionMutation.mutate()} disabled={addPositionMutation.isPending}>
                  {addPositionMutation.isPending ? "Menambahkan..." : "Tambah"}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Posisi</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Belum ada posisi.</TableCell>
                    </TableRow>
                  ) : (
                    positions.map(pos => (
                      <TableRow key={pos.id}>
                        <TableCell>{pos.name}</TableCell>
                        <TableCell>{getDepartmentName(pos.department_id)}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Hapus posisi ${pos.name}?`)) {
                                deletePositionMutation.mutate(pos.id);
                              }
                            }}
                            disabled={deletePositionMutation.isPending}
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

      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
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
          }} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap *</Label>
                <Input id="full_name" name="full_name" defaultValue={editingEmployee?.full_name || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" name="phone" defaultValue={editingEmployee?.phone || ""} />
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
                <Label htmlFor="hire_date">Tanggal Bergabung</Label>
                <Input id="hire_date" name="hire_date" type="date" defaultValue={editingEmployee?.hire_date || ""} />
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
                <Label htmlFor="salary">Gaji Pokok</Label>
                <Input id="salary" name="salary" type="number" step="0.01" defaultValue={editingEmployee?.salary || ""} />
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center space-x-2">
              <Switch
                id="use_custom_deduction"
                name="use_custom_deduction"
                defaultChecked={editingEmployee?.use_custom_deduction || false}
              />
              <Label htmlFor="use_custom_deduction">Gunakan potongan kustom</Label>
            </div>
            {/* Conditional custom deduction fields */}
            {editingEmployee?.use_custom_deduction && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_absent_deduction">Potongan Absen</Label>
                  <Input id="custom_absent_deduction" name="custom_absent_deduction" type="number" step="0.01" defaultValue={editingEmployee?.custom_absent_deduction || ""} />
                  <Select name="custom_absent_deduction_type" defaultValue={editingEmployee?.custom_absent_deduction_type || "fixed"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe Potongan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_late_deduction">Potongan Telat</Label>
                  <Input id="custom_late_deduction" name="custom_late_deduction" type="number" step="0.01" defaultValue={editingEmployee?.custom_late_deduction || ""} />
                  <Select name="custom_late_deduction_type" defaultValue={editingEmployee?.custom_late_deduction_type || "fixed"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe Potongan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleEmployeeDialogClose}>Batal</Button>
              <Button type="submit" disabled={saveEmployeeMutation.isPending}>
                {saveEmployeeMutation.isPending ? "Menyimpan..." : "Simpan Karyawan"}
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
  useState(() => {
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
