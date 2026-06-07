import { useEffect, useState } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User, Phone, Mail, MapPin, Calendar, Briefcase, Building2, CreditCard, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ESSProfile() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => { setEmployee(data); setLoading(false); });
  }, [user]);

  const initials = employee?.full_name
    ? employee.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "K";

  if (loading) return (
    <ESSLayout title="Profil Saya">
      <div className="text-center py-16 text-slate-400">Memuat profil...</div>
    </ESSLayout>
  );

  if (!employee) return (
    <ESSLayout title="Profil Saya">
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-300" />
          <p className="text-slate-500">Data karyawan tidak ditemukan</p>
        </CardContent>
      </Card>
    </ESSLayout>
  );

  const age = employee.birth_date
    ? Math.floor((Date.now() - new Date(employee.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const STATUS_BADGE = employee.is_active
    ? <Badge className="bg-green-100 text-green-800 text-xs">Aktif</Badge>
    : <Badge className="bg-red-100 text-red-800 text-xs">Nonaktif</Badge>;

  return (
    <ESSLayout title="Profil Saya">
      <div className="max-w-2xl space-y-5">
        {/* Header card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={employee.photo_url ?? ""} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-800">{employee.full_name}</h2>
                  {STATUS_BADGE}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{employee.position || "-"} · {employee.department || "-"}</p>
                {employee.employee_code && (
                  <p className="text-xs font-mono text-slate-400 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">{employee.employee_code}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Diri */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" /> Data Diri
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={Mail} label="Email" value={employee.email || user?.email} />
            <InfoRow icon={Phone} label="No. Telepon" value={employee.phone} />
            <InfoRow icon={Calendar} label="Tanggal Lahir" value={employee.birth_date ? `${format(new Date(employee.birth_date), "dd MMMM yyyy", { locale: idLocale })}${age ? ` (${age} tahun)` : ""}` : null} />
            <InfoRow icon={User} label="Jenis Kelamin" value={employee.gender === "male" ? "Laki-laki" : employee.gender === "female" ? "Perempuan" : employee.gender} />
            <InfoRow icon={MapPin} label="Alamat" value={[employee.address, employee.city, employee.province].filter(Boolean).join(", ")} />
          </CardContent>
        </Card>

        {/* Informasi Kerja */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" /> Informasi Pekerjaan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={Briefcase} label="Jabatan" value={employee.position} />
            <InfoRow icon={Building2} label="Departemen" value={employee.department} />
            <InfoRow icon={Calendar} label="Tanggal Bergabung" value={employee.hire_date ? format(new Date(employee.hire_date), "dd MMMM yyyy", { locale: idLocale }) : null} />
          </CardContent>
        </Card>

        {/* Info Bank (disembunyikan sebagian) */}
        {(employee.bank_name || employee.bank_account_number) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" /> Rekening Bank
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow icon={Building2} label="Nama Bank" value={employee.bank_name} />
              <InfoRow icon={CreditCard} label="No. Rekening"
                value={employee.bank_account_number
                  ? "****" + employee.bank_account_number.slice(-4)
                  : null}
              />
              <InfoRow icon={User} label="Nama Pemilik Rekening" value={employee.bank_account_name} />
            </CardContent>
          </Card>
        )}

        {/* Kontak Darurat */}
        {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" /> Kontak Darurat
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow icon={User} label="Nama" value={employee.emergency_contact_name} />
              <InfoRow icon={Phone} label="Telepon" value={employee.emergency_contact_phone} />
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-slate-400">
          Untuk memperbarui data, hubungi bagian HR. Data ini bersifat rahasia.
        </p>
      </div>
    </ESSLayout>
  );
}
