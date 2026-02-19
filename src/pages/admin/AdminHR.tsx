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
import { Users, Clock, MapPin, Calendar, Plus, Search, UserCheck, UserX, Camera, Settings, Building2, Briefcase, Trash2, Save } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  photo_url: string | null;
  is_active: boolean;
  hire_date: string | null;
  gender: string | null;
  salary: number | null;
  use_custom_deduction: boolean;
  custom_absent_deduction: number | null;
  custom_absent_deduction_type: string | null;
  custom_late_deduction: number | null;
  custom_late_deduction_type: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_in_location: { lat: number; lng: number; address?: string } | null;
  check_in_photo_url: string | null;
  check_out_time: string | null;
  check_out_location: { lat: number; lng: number; address?: string } | null;
  check_out_photo_url: string | null;
  status: string;
  verified_by: string | null;
  employee?: Employee;
}

interface Department {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Position {
  id: string;
  department_id: string | null;
  name: string;
  level: number;
  is_active: boolean;
}

interface HRSettings {
  id: string;
  absent_deduction_per_day: number;
  absent_deduction_type: string;
  absent_deduction_percentage: number;
  late_deduction_per_incident: number;
  late_deduction_type: string;
  late_deduction_percentage: number;
  overtime_rate_per_hour: number;
  holiday_overtime_multiplier: number;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
}

interface WorkSchedule {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

const dayLabels = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function AdminHR() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("employees");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
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
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-records", attendanceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, employee:employees(*)")
        .eq("attendance_date", attendanceDate)
        .order("check_in_time", { ascending: false });
      if (error) throw error;
      return data as unknown as AttendanceRecord[];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data as Department[];
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("positions").select("*").order("name");
      if (error) throw error;
      return data as Position[];
    },
  });

  const { data: hrSettings } = useQuery({
    queryKey: ["hr-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as HRSettings | null;
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
      return data as WorkSchedule[];
    },
  });

  // === MUTATIONS ===

  const saveEmployeeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const genderValue = formData.get("gender") as string;
      const salaryValue = formData.get("salary") as string;
      const useCustom = formData.get("use_custom_deduction") === "on";
      const employeeData: any = {
        full_name: formData.get("full_name") as string,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        position: (formData.get("position") as string) || null,
        department: (formData.get("department") as string) || null,
        gender: genderValue === "male" || genderValue === "female" ? genderValue as "male" | "female" : null,
        salary: salaryValue ? parseFloat(salaryValue) : null,
        hire_date: (formData.get("hire_date") as string) || null,
        is_active: true,
        use_custom_deduction: useCustom,
        custom_absent_deduction: useCustom ? (parseFloat(formData.get("custom_absent_deduction") as string) || null) : null,
        custom_absent_deduction_type: useCustom ? (formData.get("custom_absent_deduction_type") as string || null) : null,
        custom_late_deduction: useCustom ? (parseFloat(formData.get("custom_late_deduction") as string) || null) : null,
        custom_late_deduction_type: useCustom ? (formData.get("custom_late_deduction_type") as string || null) : null,
      };

      if (editingEmployee?.id) {
        const { error } = await supabase.from("employees").update(employeeData).eq("id", editingEmployee.id);
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
      const { error } = await supabase.from("departments").insert({ name: newDeptName, code: newDeptCode.toUpperCase() });
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
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Departemen dihapus");
    },
  });

  const addPositionMutation = useMutation({
    mutationFn: async () => {
      if (!newPosName || !newPosDeptId) throw new Error("Nama dan departemen wajib diisi");
      const { error } = await supabase.from("positions").insert({ name: newPosName, department_id: newPosDeptId });
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
      toast.success("Posisi dihapus");
    },
  });

  const saveHRSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<HRSettings>) => {
      if (hrSettings?.id) {
        const { error } = await supabase.from("hr_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", hrSettings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-settings"] });
      toast.success("Pengaturan HR disimpan");
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async ({ employeeId, day, startTime, endTime, isDayOff }: { employeeId: string; day: number; startTime: string; endTime: string; isDayOff: boolean }) => {
      const { error } = await supabase.from("work_schedules").upsert(
        { employee_id: employeeId, day_of_week: day, start_time: startTime, end_time: endTime, is_day_off: isDayOff },
        { onConflict: "employee_id,day_of_week" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      toast.success("Jadwal disimpan");
    },
  });

  // === FILTERS ===

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === "all" || emp.department === filterDept;
    return matchSearch && matchDept;
  });

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((e) => e.is_active).length,
    presentToday: attendanceRecords.filter((a) => a.status === "present").length,
    lateToday: attendanceRecords.filter((a) => a.status === "late").length,
  };

  const handleSubmitEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveEmployeeMutation.mutate(new FormData(e.currentTarget));
  };

  const getDeptName = (code: string | null) => departments.find(d => d.code === code)?.name || code || "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">HR & Absensi</h1>
          <p className="text-muted-foreground">Kelola karyawan, kehadiran, jadwal kerja & pengaturan HR</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                <p className="text-sm text-muted-foreground">Total Karyawan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                <p className="text-sm text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.presentToday}</p>
                <p className="text-sm text-muted-foreground">Hadir Hari Ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.lateToday}</p>
                <p className="text-sm text-muted-foreground">Terlambat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">Karyawan</TabsTrigger>
          <TabsTrigger value="attendance">Kehadiran</TabsTrigger>
          <TabsTrigger value="schedules">Jadwal Kerja</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan HR</TabsTrigger>
        </TabsList>

        {/* === EMPLOYEES TAB === */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari karyawan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen</SelectItem>
                  {departments.filter(d => d.is_active).map(d => (
                    <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsEmployeeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Karyawan
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={emp.photo_url || ""} />
                          <AvatarFallback>{emp.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{emp.full_name}</span>
                          {emp.hire_date && (
                            <p className="text-xs text-muted-foreground">Sejak {format(new Date(emp.hire_date), "MMM yyyy", { locale: idLocale })}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{emp.employee_code}</TableCell>
                    <TableCell>{emp.position || "-"}</TableCell>
                    <TableCell>{getDeptName(emp.department)}</TableCell>
                    <TableCell>{emp.salary ? formatCurrency(emp.salary) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={emp.is_active ? "default" : "secondary"}>
                        {emp.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingEmployee(emp); setIsEmployeeDialogOpen(true); }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Tidak ada data karyawan</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* === ATTENDANCE TAB === */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Tanggal:</Label>
            <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-auto" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rekap Kehadiran - {format(new Date(attendanceDate), "dd MMMM yyyy", { locale: idLocale })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Lokasi Masuk</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Foto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{(record.employee as any)?.full_name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <span>{(record.employee as any)?.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "-"}</TableCell>
                      <TableCell>
                        {record.check_in_location ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {record.check_in_location.address || `${record.check_in_location.lat}, ${record.check_in_location.lng}`}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === "present" ? "default" : record.status === "late" ? "secondary" : "destructive"}>
                          {record.status === "present" ? "Hadir" : record.status === "late" ? "Terlambat" : record.status === "absent" ? "Tidak Hadir" : record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.check_in_photo_url ? (
                          <Badge variant="outline"><Camera className="h-3 w-3 mr-1" /> Foto</Badge>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {attendanceRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada data kehadiran untuk tanggal ini</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === WORK SCHEDULES TAB === */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Jadwal Kerja Karyawan</CardTitle>
              <CardDescription>Pilih karyawan untuk melihat/mengatur jadwal kerja mingguan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={scheduleEmployeeId} onValueChange={setScheduleEmployeeId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Pilih karyawan..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.is_active).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {scheduleEmployeeId && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hari</TableHead>
                      <TableHead>Jam Masuk</TableHead>
                      <TableHead>Jam Pulang</TableHead>
                      <TableHead>Libur</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[0, 1, 2, 3, 4, 5, 6].map(day => {
                      const schedule = workSchedules.find(s => s.day_of_week === day);
                      const defaultStart = hrSettings?.work_start_time || "08:00";
                      const defaultEnd = hrSettings?.work_end_time || "17:00";
                      const isDayOff = schedule?.is_day_off ?? (day === 0 || day === 6);

                      return (
                        <TableRow key={day} className={isDayOff ? "bg-muted/50" : ""}>
                          <TableCell className="font-medium">{dayLabels[day]}</TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              defaultValue={schedule?.start_time?.slice(0, 5) || defaultStart}
                              disabled={isDayOff}
                              className="w-28"
                              id={`start-${day}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              defaultValue={schedule?.end_time?.slice(0, 5) || defaultEnd}
                              disabled={isDayOff}
                              className="w-28"
                              id={`end-${day}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              defaultChecked={isDayOff}
                              id={`off-${day}`}
                              onCheckedChange={(checked) => {
                                // Auto-save on toggle
                                const startEl = document.getElementById(`start-${day}`) as HTMLInputElement;
                                const endEl = document.getElementById(`end-${day}`) as HTMLInputElement;
                                saveScheduleMutation.mutate({
                                  employeeId: scheduleEmployeeId,
                                  day,
                                  startTime: startEl?.value || defaultStart,
                                  endTime: endEl?.value || defaultEnd,
                                  isDayOff: checked,
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const startEl = document.getElementById(`start-${day}`) as HTMLInputElement;
                                const endEl = document.getElementById(`end-${day}`) as HTMLInputElement;
                                const offEl = document.getElementById(`off-${day}`) as HTMLInputElement;
                                saveScheduleMutation.mutate({
                                  employeeId: scheduleEmployeeId,
                                  day,
                                  startTime: startEl?.value || defaultStart,
                                  endTime: endEl?.value || defaultEnd,
                                  isDayOff: offEl?.getAttribute("data-state") === "checked",
                                });
                              }}
                            >
                              <Save className="h-3 w-3 mr-1" /> Simpan
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SETTINGS TAB === */}
        <TabsContent value="settings" className="space-y-6">
          {/* Departments & Positions */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Departemen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Nama departemen" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                  <Input placeholder="Kode" value={newDeptCode} onChange={e => setNewDeptCode(e.target.value)} className="w-24" />
                  <Button size="sm" onClick={() => addDepartmentMutation.mutate()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {departments.map(dept => (
                    <div key={dept.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <span className="font-medium">{dept.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{dept.code}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteDepartmentMutation.mutate(dept.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Posisi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Nama posisi" value={newPosName} onChange={e => setNewPosName(e.target.value)} />
                  <Select value={newPosDeptId} onValueChange={setNewPosDeptId}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => addPositionMutation.mutate()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {departments.filter(d => d.is_active).map(dept => {
                    const deptPositions = positions.filter(p => p.department_id === dept.id);
                    if (deptPositions.length === 0) return null;
                    return (
                      <div key={dept.id}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{dept.name}</p>
                        {deptPositions.map(pos => (
                          <div key={pos.id} className="flex items-center justify-between p-2 rounded border ml-2 mb-1">
                            <span className="text-sm">{pos.name}</span>
                            <Button size="sm" variant="ghost" onClick={() => deletePositionMutation.mutate(pos.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HR Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Pengaturan Kehadiran & Gaji</CardTitle>
              <CardDescription>Atur parameter perhitungan gaji otomatis. Potongan bisa berupa nominal tetap atau persentase dari gaji pokok.</CardDescription>
            </CardHeader>
            <CardContent>
              {hrSettings && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const absentType = fd.get("absent_deduction_type") as string || "fixed";
                    const lateType = fd.get("late_deduction_type") as string || "fixed";
                    saveHRSettingsMutation.mutate({
                      work_start_time: fd.get("work_start_time") as string,
                      work_end_time: fd.get("work_end_time") as string,
                      late_threshold_minutes: parseInt(fd.get("late_threshold_minutes") as string) || 15,
                      absent_deduction_type: absentType,
                      absent_deduction_per_day: parseFloat(fd.get("absent_deduction_per_day") as string) || 0,
                      absent_deduction_percentage: parseFloat(fd.get("absent_deduction_percentage") as string) || 0,
                      late_deduction_type: lateType,
                      late_deduction_per_incident: parseFloat(fd.get("late_deduction_per_incident") as string) || 0,
                      late_deduction_percentage: parseFloat(fd.get("late_deduction_percentage") as string) || 0,
                      overtime_rate_per_hour: parseFloat(fd.get("overtime_rate_per_hour") as string) || 0,
                      holiday_overtime_multiplier: parseFloat(fd.get("holiday_overtime_multiplier") as string) || 2,
                    });
                  }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Jam Masuk Default</Label>
                      <Input type="time" name="work_start_time" defaultValue={hrSettings.work_start_time?.slice(0, 5)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Jam Pulang Default</Label>
                      <Input type="time" name="work_end_time" defaultValue={hrSettings.work_end_time?.slice(0, 5)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Toleransi Terlambat (menit)</Label>
                      <Input type="number" name="late_threshold_minutes" defaultValue={hrSettings.late_threshold_minutes} />
                    </div>
                  </div>

                  <Separator />

                  <h4 className="font-semibold text-sm">Potongan Tidak Hadir (Global Default)</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipe Potongan Absen</Label>
                      <Select name="absent_deduction_type" defaultValue={hrSettings.absent_deduction_type || "fixed"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                          <SelectItem value="percentage">Persentase Gaji (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nominal Tetap / Hari</Label>
                      <Input type="number" name="absent_deduction_per_day" defaultValue={hrSettings.absent_deduction_per_day} />
                    </div>
                    <div className="space-y-2">
                      <Label>Persentase Gaji / Hari (%)</Label>
                      <Input type="number" step="0.1" name="absent_deduction_percentage" defaultValue={hrSettings.absent_deduction_percentage || 0} />
                    </div>
                  </div>

                  <h4 className="font-semibold text-sm">Potongan Terlambat (Global Default)</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipe Potongan Terlambat</Label>
                      <Select name="late_deduction_type" defaultValue={hrSettings.late_deduction_type || "fixed"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                          <SelectItem value="percentage">Persentase Gaji (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nominal Tetap / Kejadian</Label>
                      <Input type="number" name="late_deduction_per_incident" defaultValue={hrSettings.late_deduction_per_incident} />
                    </div>
                    <div className="space-y-2">
                      <Label>Persentase Gaji / Kejadian (%)</Label>
                      <Input type="number" step="0.1" name="late_deduction_percentage" defaultValue={hrSettings.late_deduction_percentage || 0} />
                    </div>
                  </div>

                  <Separator />

                  <h4 className="font-semibold text-sm">Lembur</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rate Lembur / Jam</Label>
                      <Input type="number" name="overtime_rate_per_hour" defaultValue={hrSettings.overtime_rate_per_hour} />
                    </div>
                    <div className="space-y-2">
                      <Label>Multiplier Lembur Hari Libur</Label>
                      <Input type="number" step="0.1" name="holiday_overtime_multiplier" defaultValue={hrSettings.holiday_overtime_multiplier} />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">💡 Aturan ini berlaku global. Untuk override per karyawan, aktifkan "Aturan Potongan Khusus" di form edit karyawan.</p>

                  <Button type="submit" disabled={saveHRSettingsMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveHRSettingsMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={(open) => { setIsEmployeeDialogOpen(open); if (!open) setEditingEmployee(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Karyawan" : "Tambah Karyawan"}</DialogTitle>
            <DialogDescription>Isi data karyawan</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEmployee} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nama Lengkap *</Label>
              <Input id="full_name" name="full_name" defaultValue={editingEmployee?.full_name || ""} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departemen</Label>
                <Select name="department" defaultValue={editingEmployee?.department || ""}>
                  <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                  <SelectContent>
                    {departments.filter(d => d.is_active).map(d => (
                      <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Posisi</Label>
                <Select name="position" defaultValue={editingEmployee?.position || ""}>
                  <SelectTrigger><SelectValue placeholder="Pilih posisi" /></SelectTrigger>
                  <SelectContent>
                    {positions.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input name="phone" defaultValue={editingEmployee?.phone || ""} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editingEmployee?.email || ""} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select name="gender" defaultValue={editingEmployee?.gender || ""}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gaji Pokok</Label>
                <Input type="number" name="salary" defaultValue={editingEmployee?.salary || ""} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Masuk</Label>
                <Input type="date" name="hire_date" defaultValue={editingEmployee?.hire_date || ""} />
              </div>
            </div>

            <Separator />

            {/* Custom Deduction Override */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Aturan Potongan Khusus</Label>
                  <p className="text-xs text-muted-foreground">Override aturan potongan global untuk karyawan ini</p>
                </div>
                <Switch
                  name="use_custom_deduction"
                  defaultChecked={editingEmployee?.use_custom_deduction || false}
                  id="use_custom_deduction"
                />
              </div>

              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">Potongan Absen</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipe</Label>
                    <Select name="custom_absent_deduction_type" defaultValue={editingEmployee?.custom_absent_deduction_type || "fixed"}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                        <SelectItem value="percentage">% Gaji</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nilai</Label>
                    <Input type="number" step="0.1" name="custom_absent_deduction" className="h-8 text-xs" defaultValue={editingEmployee?.custom_absent_deduction || ""} placeholder="Kosongkan = ikut global" />
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground">Potongan Terlambat</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipe</Label>
                    <Select name="custom_late_deduction_type" defaultValue={editingEmployee?.custom_late_deduction_type || "fixed"}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                        <SelectItem value="percentage">% Gaji</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nilai</Label>
                    <Input type="number" step="0.1" name="custom_late_deduction" className="h-8 text-xs" defaultValue={editingEmployee?.custom_late_deduction || ""} placeholder="Kosongkan = ikut global" />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saveEmployeeMutation.isPending}>
                {saveEmployeeMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
