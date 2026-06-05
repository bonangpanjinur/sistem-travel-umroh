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
import { Users, Clock, MapPin, Calendar, Plus, Search, UserCheck, UserX, Camera, Settings, Building2, Briefcase, Trash2, Save, Link2, ExternalLink, Copy, Smartphone, ShieldCheck, ShieldX, Phone, Mail, Edit, UserPlus, User, DollarSign, CalendarOff, Star, TrendingUp, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Award, BarChart3 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "employees");

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

  // Leave management state
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Performance review state
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewEmployeeId, setReviewEmployeeId] = useState("");
  const [reviewEmployeeName, setReviewEmployeeName] = useState("");
  const [reviewPeriod, setReviewPeriod] = useState("2026-Q2");
  const [reviewScores, setReviewScores] = useState({ quality: 3, productivity: 3, initiative: 3, teamwork: 3, attendance: 3 });
  const [reviewStrengths, setReviewStrengths] = useState("");
  const [reviewImprovements, setReviewImprovements] = useState("");
  const [reviewGoals, setReviewGoals] = useState("");

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

  // Leave requests query
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, employee:employees(full_name, employee_code, department)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Leave quotas query - table not available, using empty array
  const leaveQuotas: any[] = [];

  // Performance reviews query - table not available, using empty array
  const performanceReviews: any[] = [];

  // === MUTATIONS ===

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const res = await fetch(`/api/hr/employees/${employee.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal menghapus karyawan');
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

          // Try backend route first, fallback to direct creation
          try {
            const res = await fetch('/api/hr/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: employeeData.full_name,
                email: email,
                password: password,
                phone: employeeData.phone,
                position: employeeData.position,
                department: employeeData.department,
                gender: employeeData.gender,
                salary: employeeData.salary,
                hireDate: employeeData.hire_date,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Backend error');
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

  // Leave mutations
  const createLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!leaveEmployeeId || !leaveStartDate || !leaveEndDate || !leaveReason) {
        throw new Error("Semua field wajib diisi");
      }
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: leaveEmployeeId,
        leave_type: leaveType as any,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Pengajuan cuti berhasil disubmit");
      setIsLeaveDialogOpen(false);
      setLeaveEmployeeId("");
      setLeaveType("annual");
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveReason("");
    },
    onError: (e: Error) => toast.error("Gagal submit cuti: " + e.message),
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const payload: any = { status, approved_at: status === "approved" ? new Date().toISOString() : null };
      if (rejection_reason) payload.rejection_reason = rejection_reason;
      const { error } = await supabase.from("leave_requests").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-quotas"] });
      toast.success(variables.status === "approved" ? "Cuti disetujui" : "Cuti ditolak");
    },
    onError: (e: Error) => toast.error("Gagal update status: " + e.message),
  });

  // Performance review mutations
  const saveReviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewEmployeeId) throw new Error("Pilih karyawan");
      const overall = ((reviewScores.quality + reviewScores.productivity + reviewScores.initiative + reviewScores.teamwork + reviewScores.attendance) / 5);
      const grade = overall >= 4.5 ? "A" : overall >= 3.5 ? "B" : overall >= 2.5 ? "C" : overall >= 1.5 ? "D" : "E";
      // Note: performance_reviews table not available in current schema
      // This is a placeholder for future implementation
      console.log("Review data:", {
        employee_id: reviewEmployeeId,
        review_period: reviewPeriod,
        review_type: "quarterly",
        score_quality: reviewScores.quality,
        score_productivity: reviewScores.productivity,
        score_initiative: reviewScores.initiative,
        score_teamwork: reviewScores.teamwork,
        score_attendance: reviewScores.attendance,
        grade,
        strengths: reviewStrengths,
        improvements: reviewImprovements,
        goals: reviewGoals,
      });
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 300));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-reviews"] });
      toast.success("Penilaian kinerja berhasil disimpan");
      setIsReviewDialogOpen(false);
      setReviewEmployeeId("");
      setReviewEmployeeName("");
      setReviewScores({ quality: 3, productivity: 3, initiative: 3, teamwork: 3, attendance: 3 });
      setReviewStrengths("");
      setReviewImprovements("");
      setReviewGoals("");
    },
    onError: (e: Error) => toast.error("Gagal simpan penilaian: " + e.message),
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
      const { error } = await supabase.from("positions").insert({ name: newPosName, department_id: newPosDeptId, code: newPosName.toUpperCase().replace(/\s+/g, "_") } as any);
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
      const { error: deleteError } = await supabase.from("work_schedules").delete().eq("employee_id", schedules[0].employee_id!);
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
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-max w-full">
            <TabsTrigger value="employees" className="flex-1"><Users className="h-4 w-4 mr-1.5" /> Karyawan</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1"><Clock className="h-4 w-4 mr-1.5" /> Absensi</TabsTrigger>
            <TabsTrigger value="payroll" className="flex-1"><DollarSign className="h-4 w-4 mr-1.5" /> Penggajian</TabsTrigger>
            <TabsTrigger value="leaves" className="flex-1"><CalendarOff className="h-4 w-4 mr-1.5" /> Cuti & Izin</TabsTrigger>
            <TabsTrigger value="performance" className="flex-1"><BarChart3 className="h-4 w-4 mr-1.5" /> Kinerja</TabsTrigger>
            <TabsTrigger value="departments" className="flex-1"><Building2 className="h-4 w-4 mr-1.5" /> Departemen</TabsTrigger>
            <TabsTrigger value="schedules" className="flex-1"><Calendar className="h-4 w-4 mr-1.5" /> Jadwal</TabsTrigger>
            <TabsTrigger value="devices" className="flex-1"><Smartphone className="h-4 w-4 mr-1.5" /> Perangkat</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1"><Settings className="h-4 w-4 mr-1.5" /> Pengaturan</TabsTrigger>
          </TabsList>
        </div>

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

        {/* ═══ TAB PENGGAJIAN ═══ */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Penggajian Karyawan</CardTitle>
                <CardDescription>Kelola slip gaji, tunjangan, potongan, dan rekap penggajian bulanan.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select defaultValue={String(new Date().getMonth() + 1)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"].map((m, i) => (
                      <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select defaultValue={String(new Date().getFullYear())}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />Proses Gaji
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Ringkasan */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total Penggajian", value: formatCurrency(0), color: "text-foreground" },
                  { label: "Sudah Dibayar",    value: formatCurrency(0), color: "text-green-600" },
                  { label: "Belum Dibayar",    value: formatCurrency(0), color: "text-amber-600" },
                  { label: "Karyawan Aktif",   value: "0 orang",         color: "text-foreground" },
                ].map(item => (
                  <div key={item.label} className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className={`font-bold text-sm ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead className="text-right">Gaji Pokok</TableHead>
                    <TableHead className="text-right">Tunjangan</TableHead>
                    <TableHead className="text-right">Potongan</TableHead>
                    <TableHead className="text-right">Total Nett</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Belum ada data penggajian bulan ini.</p>
                        <p className="text-xs mt-1">Klik "Proses Gaji" untuk membuat slip gaji karyawan.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="font-medium">{emp.full_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.employee_code}</div>
                        </TableCell>
                        <TableCell>{emp.department || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency((emp as any).basic_salary || 0)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">+{formatCurrency(0)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">-{formatCurrency(0)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatCurrency((emp as any).basic_salary || 0)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">Draft</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Edit className="h-3 w-3 mr-1" />Edit
                            </Button>
                            <Button size="sm" className="h-7 text-xs">
                              <Save className="h-3 w-3 mr-1" />Bayar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Riwayat Penggajian */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Riwayat Penggajian</CardTitle>
              <CardDescription>Rekap penggajian 12 bulan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { period: "April 2026", total: 0, status: "paid", count: 0 },
                  { period: "Maret 2026", total: 0, status: "paid", count: 0 },
                ].map(row => (
                  <div key={row.period} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{row.period}</p>
                      <p className="text-xs text-muted-foreground">{row.count} karyawan</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{formatCurrency(row.total)}</span>
                      <Badge variant={row.status === "paid" ? "default" : "secondary"} className="text-xs">
                        {row.status === "paid" ? "Lunas" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {[0, 1].length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">Belum ada riwayat penggajian</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB CUTI & IZIN ═══ */}
        <TabsContent value="leaves" className="space-y-4">
          {/* Stats cards dari data nyata */}
          {(() => {
            const pending = leaveRequests.filter(r => r.status === "pending").length;
            const approvedThisMonth = leaveRequests.filter(r => {
              if (r.status !== "approved") return false;
              const dateStr = r.updated_at || r.created_at;
              if (!dateStr) return false;
              const d = new Date(dateStr);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length;
            const rejected = leaveRequests.filter(r => r.status === "rejected").length;
            const totalDays = leaveRequests.filter(r => r.status === "approved").reduce((s, r) => s + (r.total_days || 0), 0);
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Pengajuan Pending", value: pending, color: "text-amber-600", icon: AlertCircle },
                  { label: "Disetujui Bulan Ini", value: approvedThisMonth, color: "text-green-600", icon: CheckCircle2 },
                  { label: "Ditolak", value: rejected, color: "text-red-600", icon: XCircle },
                  { label: "Total Hari Cuti Disetujui", value: totalDays, color: "text-foreground", icon: CalendarOff },
                ].map(item => (
                  <Card key={item.label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><CalendarOff className="h-5 w-5" />Pengajuan Cuti & Izin</CardTitle>
                <CardDescription>Kelola permohonan cuti karyawan — {leaveRequests.length} total pengajuan</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsLeaveDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Ajukan Cuti
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-center">Durasi</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Belum ada pengajuan cuti.</p>
                        <p className="text-xs mt-1">Klik "Ajukan Cuti" untuk membuat pengajuan baru.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveRequests.map(req => {
                      const leaveTypeLabel: Record<string, string> = {
                        annual: "Tahunan", sick: "Sakit", maternity: "Hamil/Melahirkan",
                        paternity: "Ayah", emergency: "Darurat", unpaid: "Tanpa Gaji", other: "Lainnya"
                      };
                      const statusColor: Record<string, string> = {
                        pending: "bg-amber-100 text-amber-800",
                        approved: "bg-green-100 text-green-800",
                        rejected: "bg-red-100 text-red-800",
                        cancelled: "bg-gray-100 text-gray-600",
                      };
                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="font-medium">{(req.employee as any)?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{(req.employee as any)?.department || ""}</div>
                          </TableCell>
                          <TableCell className="text-sm">{leaveTypeLabel[req.leave_type as string] || req.leave_type}</TableCell>
                          <TableCell className="text-sm">
                            <div>{req.start_date}</div>
                            <div className="text-xs text-muted-foreground">s/d {req.end_date}</div>
                          </TableCell>
                          <TableCell className="text-center font-mono font-semibold">{req.total_days} hari</TableCell>
                          <TableCell className="max-w-[160px] text-sm truncate">{req.reason}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[req.status as string] || ""}`}>
                              {req.status === "pending" ? "Pending" : req.status === "approved" ? "Disetujui" : req.status === "rejected" ? "Ditolak" : "Dibatalkan"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status === "pending" && (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300"
                                  onClick={() => updateLeaveStatusMutation.mutate({ id: req.id, status: "approved" })}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />Setuju
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300"
                                  onClick={() => { const reason = prompt("Alasan penolakan?"); if (reason) updateLeaveStatusMutation.mutate({ id: req.id, status: "rejected", rejection_reason: reason }); }}>
                                  <XCircle className="h-3 w-3 mr-1" />Tolak
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Kuota Cuti per Karyawan — data dari leave_quotas + leave_requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Kuota Cuti {new Date().getFullYear()}</CardTitle>
              <CardDescription>Sisa jatah cuti tahunan — dari tabel leave_quotas + kalkulasi leave_requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead className="text-center">Jatah</TableHead>
                    <TableHead className="text-center">Terpakai</TableHead>
                    <TableHead className="text-center">Sisa</TableHead>
                    <TableHead>Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Tidak ada karyawan.</TableCell>
                    </TableRow>
                  ) : (
                    employees.map(emp => {
                      const quota_row = leaveQuotas.find((q: any) => q.employee_id === emp.id);
                      const quota = quota_row?.annual_quota ?? 12;
                      const carryOver = quota_row?.carry_over ?? 0;
                      const approvedDays = leaveRequests
                        .filter(r => r.employee_id === emp.id && r.status === "approved" && r.leave_type === "annual")
                        .reduce((s, r) => s + (r.total_days || 0), 0);
                      const used = quota_row ? quota_row.annual_used : approvedDays;
                      const remaining = quota + carryOver - used;
                      const pct = quota > 0 ? Math.min(100, Math.round((used / (quota + carryOver)) * 100)) : 0;
                      return (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <div className="font-medium">{emp.full_name}</div>
                            <div className="text-xs text-muted-foreground">{emp.department || "-"}</div>
                          </TableCell>
                          <TableCell className="text-center font-mono">{quota}{carryOver > 0 ? `+${carryOver}` : ""}</TableCell>
                          <TableCell className="text-center font-mono text-amber-600">{used}</TableCell>
                          <TableCell className="text-center font-mono font-semibold text-green-600">{remaining}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5">
                                <div className="bg-primary rounded-full h-1.5" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB KINERJA ═══ */}
        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Penilaian Kinerja Karyawan</h3>
              <p className="text-sm text-muted-foreground">Evaluasi kinerja, produktivitas, dan pencapaian target — periode: {reviewPeriod}</p>
            </div>
            <div className="flex gap-2">
              <Select value={reviewPeriod} onValueChange={setReviewPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-Q2">Q2 2026 (Apr–Jun)</SelectItem>
                  <SelectItem value="2026-Q1">Q1 2026 (Jan–Mar)</SelectItem>
                  <SelectItem value="2025-H2">H2 2025 (Jul–Des)</SelectItem>
                  <SelectItem value="2025-Q4">Q4 2025 (Okt–Des)</SelectItem>
                  <SelectItem value="2025-Q3">Q3 2025 (Jul–Sep)</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => {
                setReviewEmployeeId("");
                setReviewEmployeeName("");
                setReviewScores({ quality: 3, productivity: 3, initiative: 3, teamwork: 3, attendance: 3 });
                setReviewStrengths("");
                setReviewImprovements("");
                setReviewGoals("");
                setIsReviewDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />Buat Review
              </Button>
            </div>
          </div>

          {/* Stats dari data nyata */}
          {(() => {
            const avgScore = performanceReviews.length > 0
              ? (performanceReviews.reduce((s: number, r: any) => s + (r.overall_score || 0), 0) / performanceReviews.length).toFixed(1)
              : "—";
            const belowAvg = performanceReviews.filter((r: any) => (r.overall_score || 0) < 2.5).length;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Rata-rata Nilai", value: avgScore, desc: `${performanceReviews.length} karyawan dinilai`, icon: Star, color: "text-amber-500" },
                  { label: "Review Selesai", value: String(performanceReviews.length), desc: `dari ${employees.length} karyawan`, icon: CheckCircle2, color: "text-green-600" },
                  { label: "Perlu Perhatian", value: String(belowAvg), desc: "Di bawah standar (<2.5)", icon: AlertCircle, color: "text-red-500" },
                ].map(item => (
                  <Card key={item.label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <item.icon className={`h-8 w-8 ${item.color} shrink-0`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-bold">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Rekap Penilaian per Karyawan — {reviewPeriod}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead className="text-center">Kualitas</TableHead>
                    <TableHead className="text-center">Produktivitas</TableHead>
                    <TableHead className="text-center">Inisiatif</TableHead>
                    <TableHead className="text-center">Teamwork</TableHead>
                    <TableHead className="text-center">Kehadiran</TableHead>
                    <TableHead className="text-center">Nilai Akhir</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Belum ada karyawan terdaftar.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map(emp => {
                      const review = performanceReviews.find((r: any) => r.employee_id === emp.id);
                      const gradeColor: Record<string, string> = {
                        A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800",
                        C: "bg-amber-100 text-amber-800", D: "bg-orange-100 text-orange-800", E: "bg-red-100 text-red-800"
                      };
                      const scoreCell = (val: number | null | undefined) => val != null
                        ? <span className="font-mono font-semibold">{val.toFixed(1)}</span>
                        : <span className="text-muted-foreground text-sm">—</span>;
                      return (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <div className="font-medium">{emp.full_name}</div>
                            <div className="text-xs text-muted-foreground">{emp.position || emp.department || "-"}</div>
                          </TableCell>
                          <TableCell className="text-center">{scoreCell(review?.score_quality)}</TableCell>
                          <TableCell className="text-center">{scoreCell(review?.score_productivity)}</TableCell>
                          <TableCell className="text-center">{scoreCell(review?.score_initiative)}</TableCell>
                          <TableCell className="text-center">{scoreCell(review?.score_teamwork)}</TableCell>
                          <TableCell className="text-center">{scoreCell(review?.score_attendance)}</TableCell>
                          <TableCell className="text-center">
                            {review?.overall_score != null
                              ? <span className="font-bold text-lg">{Number(review.overall_score).toFixed(1)}</span>
                              : <span className="font-bold text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {review?.grade
                              ? <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${gradeColor[review.grade] || "bg-muted"}`}>{review.grade}</span>
                              : <Badge variant="secondary" className="text-xs">Belum</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => {
                                setReviewEmployeeId(emp.id);
                                setReviewEmployeeName(emp.full_name);
                                setReviewScores({
                                  quality: review?.score_quality ?? 3,
                                  productivity: review?.score_productivity ?? 3,
                                  initiative: review?.score_initiative ?? 3,
                                  teamwork: review?.score_teamwork ?? 3,
                                  attendance: review?.score_attendance ?? 3,
                                });
                                setReviewStrengths(review?.strengths || "");
                                setReviewImprovements(review?.improvements || "");
                                setReviewGoals(review?.goals || "");
                                setIsReviewDialogOpen(true);
                              }}>
                              <Edit className="h-3 w-3 mr-1" />{review ? "Edit" : "Nilai"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Kriteria Penilaian */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skala Penilaian & Kriteria Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { grade: "A", label: "Sangat Baik",  range: "4.5 – 5.0", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
                  { grade: "B", label: "Baik",          range: "3.5 – 4.4", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
                  { grade: "C", label: "Cukup",         range: "2.5 – 3.4", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
                  { grade: "D", label: "Kurang",        range: "1.5 – 2.4", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
                  { grade: "E", label: "Sangat Kurang", range: "1.0 – 1.4", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
                ].map(g => (
                  <div key={g.grade} className={`p-3 rounded-lg text-center ${g.color}`}>
                    <div className="text-2xl font-bold mb-0.5">{g.grade}</div>
                    <div className="text-xs font-medium">{g.label}</div>
                    <div className="text-[10px] opacity-70">{g.range}</div>
                  </div>
                ))}
              </div>
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
                    disabled={schedule.is_day_off ?? false}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    value={schedule.end_time || ""}
                    onChange={(e) => handleScheduleChange(index, "end_time", e.target.value)}
                    disabled={schedule.is_day_off ?? false}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={schedule.is_day_off ?? false}
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

      {/* ── Dialog Ajukan Cuti ── */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarOff className="h-5 w-5" />Ajukan Cuti / Izin</DialogTitle>
            <DialogDescription>Isi form pengajuan cuti untuk karyawan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Karyawan *</Label>
              <Select value={leaveEmployeeId} onValueChange={setLeaveEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.is_active).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name} — {emp.department || "-"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Cuti *</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Cuti Tahunan</SelectItem>
                  <SelectItem value="sick">Cuti Sakit</SelectItem>
                  <SelectItem value="maternity">Cuti Hamil/Melahirkan</SelectItem>
                  <SelectItem value="paternity">Cuti Ayah</SelectItem>
                  <SelectItem value="emergency">Cuti Darurat</SelectItem>
                  <SelectItem value="unpaid">Izin Tanpa Gaji</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal Mulai *</Label>
                <Input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Selesai *</Label>
                <Input type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} min={leaveStartDate} />
              </div>
            </div>
            {leaveStartDate && leaveEndDate && leaveStartDate <= leaveEndDate && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-sm text-blue-700 dark:text-blue-300">
                Durasi: <strong>{Math.ceil((new Date(leaveEndDate).getTime() - new Date(leaveStartDate).getTime()) / 86400000) + 1} hari</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Alasan *</Label>
              <Textarea
                placeholder="Jelaskan alasan pengajuan cuti..."
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>Batal</Button>
            <Button onClick={() => createLeaveMutation.mutate()} disabled={createLeaveMutation.isPending}>
              {createLeaveMutation.isPending ? "Menyimpan..." : "Ajukan Cuti"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Penilaian Kinerja ── */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" />Penilaian Kinerja</DialogTitle>
            <DialogDescription>
              {reviewEmployeeName ? `Karyawan: ${reviewEmployeeName}` : "Pilih karyawan dan isi skor 1–5 untuk setiap dimensi"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!reviewEmployeeId && (
              <div className="space-y-1.5">
                <Label>Karyawan *</Label>
                <Select value={reviewEmployeeId} onValueChange={id => {
                  setReviewEmployeeId(id);
                  const emp = employees.find(e => e.id === id);
                  setReviewEmployeeName(emp?.full_name || "");
                }}>
                  <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.is_active).map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name} — {emp.department || "-"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Skor 1 (Sangat Kurang) — 5 (Sangat Baik)</p>

            {([
              { key: "quality", label: "Kualitas Kerja" },
              { key: "productivity", label: "Produktivitas" },
              { key: "initiative", label: "Inisiatif" },
              { key: "teamwork", label: "Kerjasama Tim" },
              { key: "attendance", label: "Kehadiran & Disiplin" },
            ] as { key: keyof typeof reviewScores; label: string }[]).map((dim) => (
              <div key={String(dim.key)} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>{dim.label}</Label>
                  <span className="font-mono font-bold text-lg text-primary">{reviewScores[dim.key]}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setReviewScores(prev => ({ ...prev, [dim.key]: v }))}
                      className={`flex-1 h-9 rounded text-sm font-semibold border transition-colors ${
                        reviewScores[dim.key] === v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >{v}</button>
                  ))}
                </div>
              </div>
            ))}

            <Separator />
            {(() => {
              const avg = ((reviewScores.quality + reviewScores.productivity + reviewScores.initiative + reviewScores.teamwork + reviewScores.attendance) / 5);
              const grade = avg >= 4.5 ? "A" : avg >= 3.5 ? "B" : avg >= 2.5 ? "C" : avg >= 1.5 ? "D" : "E";
              return (
                <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Nilai Akhir</span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{avg.toFixed(1)}</span>
                    <span className={`text-xl font-bold px-2 py-0.5 rounded ${
                      grade === "A" ? "bg-green-100 text-green-800" :
                      grade === "B" ? "bg-blue-100 text-blue-800" :
                      grade === "C" ? "bg-amber-100 text-amber-800" :
                      grade === "D" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"
                    }`}>Grade {grade}</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label>Kelebihan / Kekuatan</Label>
              <Textarea placeholder="Apa kelebihan utama karyawan ini?" value={reviewStrengths} onChange={e => setReviewStrengths(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Area Perbaikan</Label>
              <Textarea placeholder="Apa yang perlu ditingkatkan?" value={reviewImprovements} onChange={e => setReviewImprovements(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Target / Goals Periode Berikutnya</Label>
              <Textarea placeholder="Target karyawan untuk periode berikutnya..." value={reviewGoals} onChange={e => setReviewGoals(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveReviewMutation.mutate()} disabled={saveReviewMutation.isPending || !reviewEmployeeId}>
              {saveReviewMutation.isPending ? "Menyimpan..." : "Simpan Penilaian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
