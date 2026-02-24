import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type HRSettings = Database["public"]["Tables"]["hr_settings"]["Row"];
type HRSettingsUpdate = Database["public"]["Tables"]["hr_settings"]["Update"];

interface Props {
  initialData: HRSettings;
  onSuccess?: () => void;
}

export function HRSettingsForm({ initialData, onSuccess }: Props) {
  const [settings, setSettings] = useState<HRSettingsUpdate>(initialData);

  useEffect(() => {
    setSettings(initialData);
  }, [initialData]);

  const handleChange = (field: keyof HRSettingsUpdate, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically call a mutation to save the settings
    console.log("Saving HR Settings:", settings);
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Jam Masuk Default</Label>
          <Input type="time" value={settings.work_start_time?.slice(0, 5) || "08:00"} onChange={e => handleChange("work_start_time", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Jam Pulang Default</Label>
          <Input type="time" value={settings.work_end_time?.slice(0, 5) || "17:00"} onChange={e => handleChange("work_end_time", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Toleransi Terlambat (menit)</Label>
          <Input type="number" value={settings.late_threshold_minutes || 15} onChange={e => handleChange("late_threshold_minutes", parseInt(e.target.value))} />
        </div>
      </div>

      <Separator />

      <h4 className="font-semibold text-sm">Potongan Tidak Hadir (Global Default)</h4>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipe Potongan Absen</Label>
          <Select value={settings.absent_deduction_type || "fixed"} onValueChange={value => handleChange("absent_deduction_type", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
              <SelectItem value="percentage">Persentase Gaji (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nominal Tetap / Hari</Label>
          <Input type="number" value={settings.absent_deduction_per_day || 0} onChange={e => handleChange("absent_deduction_per_day", parseFloat(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Persentase Gaji / Hari (%)</Label>
          <Input type="number" step="0.1" value={settings.absent_deduction_percentage || 0} onChange={e => handleChange("absent_deduction_percentage", parseFloat(e.target.value))} />
        </div>
      </div>

      <h4 className="font-semibold text-sm">Potongan Terlambat (Global Default)</h4>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipe Potongan Terlambat</Label>
          <Select value={settings.late_deduction_type || "fixed"} onValueChange={value => handleChange("late_deduction_type", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
              <SelectItem value="percentage">Persentase Gaji (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nominal Tetap / Kejadian</Label>
          <Input type="number" value={settings.late_deduction_per_incident || 0} onChange={e => handleChange("late_deduction_per_incident", parseFloat(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Persentase Gaji / Kejadian (%)</Label>
          <Input type="number" step="0.1" value={settings.late_deduction_percentage || 0} onChange={e => handleChange("late_deduction_percentage", parseFloat(e.target.value))} />
        </div>
      </div>

      <Separator />

      <h4 className="font-semibold text-sm">Lembur</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rate Lembur / Jam</Label>
          <Input type="number" value={settings.overtime_rate_per_hour || 0} onChange={e => handleChange("overtime_rate_per_hour", parseFloat(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Multiplier Lembur Hari Libur</Label>
          <Input type="number" step="0.1" value={settings.holiday_overtime_multiplier || 2} onChange={e => handleChange("holiday_overtime_multiplier", parseFloat(e.target.value))} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">💡 Aturan ini berlaku global. Untuk override per karyawan, aktifkan "Aturan Potongan Khusus" di form edit karyawan.</p>

      <Button type="submit" /* disabled={isPending} */>
        <Save className="h-4 w-4 mr-2" />
        {/* {isPending ? "Menyimpan..." : "Simpan Pengaturan"} */}
        Simpan Pengaturan
      </Button>
    </form>
  );
}
