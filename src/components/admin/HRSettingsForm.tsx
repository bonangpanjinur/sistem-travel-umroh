import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

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
  require_device_registration: boolean;
}

interface Props {
  hrSettings: HRSettings;
  onSave: (settings: Partial<HRSettings>) => void;
  isPending: boolean;
}

export function HRSettingsForm({ hrSettings, onSave, isPending }: Props) {
  const [workStartTime, setWorkStartTime] = useState(hrSettings.work_start_time?.slice(0, 5) || "08:00");
  const [workEndTime, setWorkEndTime] = useState(hrSettings.work_end_time?.slice(0, 5) || "17:00");
  const [lateThreshold, setLateThreshold] = useState(String(hrSettings.late_threshold_minutes || 15));
  const [absentType, setAbsentType] = useState(hrSettings.absent_deduction_type || "fixed");
  const [absentPerDay, setAbsentPerDay] = useState(String(hrSettings.absent_deduction_per_day || 0));
  const [absentPercentage, setAbsentPercentage] = useState(String(hrSettings.absent_deduction_percentage || 0));
  const [lateType, setLateType] = useState(hrSettings.late_deduction_type || "fixed");
  const [latePerIncident, setLatePerIncident] = useState(String(hrSettings.late_deduction_per_incident || 0));
  const [latePercentage, setLatePercentage] = useState(String(hrSettings.late_deduction_percentage || 0));
  const [overtimeRate, setOvertimeRate] = useState(String(hrSettings.overtime_rate_per_hour || 0));
  const [holidayMultiplier, setHolidayMultiplier] = useState(String(hrSettings.holiday_overtime_multiplier || 2));

  // Sync when hrSettings changes (e.g. after refetch)
  useEffect(() => {
    setWorkStartTime(hrSettings.work_start_time?.slice(0, 5) || "08:00");
    setWorkEndTime(hrSettings.work_end_time?.slice(0, 5) || "17:00");
    setLateThreshold(String(hrSettings.late_threshold_minutes || 15));
    setAbsentType(hrSettings.absent_deduction_type || "fixed");
    setAbsentPerDay(String(hrSettings.absent_deduction_per_day || 0));
    setAbsentPercentage(String(hrSettings.absent_deduction_percentage || 0));
    setLateType(hrSettings.late_deduction_type || "fixed");
    setLatePerIncident(String(hrSettings.late_deduction_per_incident || 0));
    setLatePercentage(String(hrSettings.late_deduction_percentage || 0));
    setOvertimeRate(String(hrSettings.overtime_rate_per_hour || 0));
    setHolidayMultiplier(String(hrSettings.holiday_overtime_multiplier || 2));
  }, [hrSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      late_threshold_minutes: parseInt(lateThreshold) || 15,
      absent_deduction_type: absentType,
      absent_deduction_per_day: parseFloat(absentPerDay) || 0,
      absent_deduction_percentage: parseFloat(absentPercentage) || 0,
      late_deduction_type: lateType,
      late_deduction_per_incident: parseFloat(latePerIncident) || 0,
      late_deduction_percentage: parseFloat(latePercentage) || 0,
      overtime_rate_per_hour: parseFloat(overtimeRate) || 0,
      holiday_overtime_multiplier: parseFloat(holidayMultiplier) || 2,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Jam Masuk Default</Label>
          <Input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Jam Pulang Default</Label>
          <Input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Toleransi Terlambat (menit)</Label>
          <Input type="number" value={lateThreshold} onChange={e => setLateThreshold(e.target.value)} />
        </div>
      </div>

      <Separator />

      <h4 className="font-semibold text-sm">Potongan Tidak Hadir (Global Default)</h4>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipe Potongan Absen</Label>
          <Select value={absentType} onValueChange={setAbsentType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
              <SelectItem value="percentage">Persentase Gaji (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nominal Tetap / Hari</Label>
          <Input type="number" value={absentPerDay} onChange={e => setAbsentPerDay(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Persentase Gaji / Hari (%)</Label>
          <Input type="number" step="0.1" value={absentPercentage} onChange={e => setAbsentPercentage(e.target.value)} />
        </div>
      </div>

      <h4 className="font-semibold text-sm">Potongan Terlambat (Global Default)</h4>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipe Potongan Terlambat</Label>
          <Select value={lateType} onValueChange={setLateType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
              <SelectItem value="percentage">Persentase Gaji (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nominal Tetap / Kejadian</Label>
          <Input type="number" value={latePerIncident} onChange={e => setLatePerIncident(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Persentase Gaji / Kejadian (%)</Label>
          <Input type="number" step="0.1" value={latePercentage} onChange={e => setLatePercentage(e.target.value)} />
        </div>
      </div>

      <Separator />

      <h4 className="font-semibold text-sm">Lembur</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rate Lembur / Jam</Label>
          <Input type="number" value={overtimeRate} onChange={e => setOvertimeRate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Multiplier Lembur Hari Libur</Label>
          <Input type="number" step="0.1" value={holidayMultiplier} onChange={e => setHolidayMultiplier(e.target.value)} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">💡 Aturan ini berlaku global. Untuk override per karyawan, aktifkan "Aturan Potongan Khusus" di form edit karyawan.</p>

      <Button type="submit" disabled={isPending}>
        <Save className="h-4 w-4 mr-2" />
        {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}