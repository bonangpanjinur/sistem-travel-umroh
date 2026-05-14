import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Send, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Employee {
  id: string; full_name: string; employee_code: string; position: string; department: string; is_active: boolean;
}

interface Props {
  employees: Employee[] | undefined;
  employeeLeaveForm: { employeeId: string; startDate: Date | undefined; endDate: Date | undefined; reason: string; destination: string; };
  setEmployeeLeaveForm: (v: any) => void;
  doGenerate: (handler: () => any, filename: string, action: 'download' | 'send') => void;
  handleGenerateEmployeeLeaveLetter: () => any;
}

export function EmployeeLeaveTab({ employees, employeeLeaveForm, setEmployeeLeaveForm, doGenerate, handleGenerateEmployeeLeaveLetter }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Surat Permohonan Cuti Karyawan</CardTitle>
        <CardDescription>Generate surat cuti untuk karyawan internal perusahaan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Karyawan</Label>
            <Select value={employeeLeaveForm.employeeId} onValueChange={(v) => setEmployeeLeaveForm({ ...employeeLeaveForm, employeeId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.full_name} - {emp.position}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alasan Cuti</Label>
            <Input value={employeeLeaveForm.reason} onChange={(e) => setEmployeeLeaveForm({ ...employeeLeaveForm, reason: e.target.value })} placeholder="Contoh: Keperluan keluarga" />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Mulai</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !employeeLeaveForm.startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {employeeLeaveForm.startDate ? format(employeeLeaveForm.startDate, "PPP", { locale: id }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={employeeLeaveForm.startDate} onSelect={(d) => setEmployeeLeaveForm({ ...employeeLeaveForm, startDate: d })} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Selesai</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !employeeLeaveForm.endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {employeeLeaveForm.endDate ? format(employeeLeaveForm.endDate, "PPP", { locale: id }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={employeeLeaveForm.endDate} onSelect={(d) => setEmployeeLeaveForm({ ...employeeLeaveForm, endDate: d })} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Alamat Selama Cuti (Opsional)</Label>
            <Input value={employeeLeaveForm.destination} onChange={(e) => setEmployeeLeaveForm({ ...employeeLeaveForm, destination: e.target.value })} placeholder="Alamat tujuan selama cuti" />
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button onClick={() => doGenerate(handleGenerateEmployeeLeaveLetter, `surat-cuti-karyawan-${employeeLeaveForm.employeeId}`, 'download')}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => doGenerate(handleGenerateEmployeeLeaveLetter, `surat-cuti-karyawan-${employeeLeaveForm.employeeId}`, 'send')}>
            <Send className="h-4 w-4 mr-2" />Kirim via Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
