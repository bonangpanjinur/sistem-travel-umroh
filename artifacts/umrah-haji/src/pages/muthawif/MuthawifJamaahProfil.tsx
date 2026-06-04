import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, User, Phone, MapPin, BookOpen, BedDouble,
  ShieldCheck, CalendarDays, Heart, AlertCircle, CheckCircle2,
  XCircle, Clock, UserCheck, RefreshCcw, Fingerprint,
  Globe, Building2, Star, ChevronDown, ChevronRight
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_LABELS: Record<string, string> = {
  keberangkatan:   "Keberangkatan",
  sholat_berjamaah: "Sholat Berjamaah",
  ziarah:          "Ziarah",
  bus:             "Naik Bus",
  makan:           "Makan Bersama",
  lainnya:         "Lainnya",
};

type AttStatus = "hadir" | "absen" | "terlambat" | "izin";

const STATUS_CFG: Record<AttStatus, { label: string; cls: string; icon: any }> = {
  hadir:     { label: "Hadir",     cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  absen:     { label: "Absen",     cls: "bg-red-100 text-red-800 border-red-200",             icon: XCircle },
  terlambat: { label: "Terlambat", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: Clock },
  izin:      { label: "Izin",      cls: "bg-blue-100 text-blue-800 border-blue-200",          icon: AlertCircle },
};

const VISA_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  approved:  { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-800 border-amber-200" },
  submitted: { label: "Diajukan",  cls: "bg-blue-100 text-blue-800 border-blue-200" },
  rejected:  { label: "Ditolak",   cls: "bg-red-100 text-red-800 border-red-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono = false }: {
  icon: any; label: string; value?: string | null; mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium break-words ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader className="pb-0 pt-4 px-4">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setOpen(p => !p)}
        >
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {open
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </CardHeader>
      {open && <CardContent className="px-4 pt-1 pb-3">{children}</CardContent>}
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MuthawifJamaahProfil() {
  const { customerId } = useParams<{ customerId: string }>();

  // ── Customer profile ──────────────────────────────────────────────────────
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ["muthawif-jamaah-profil", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId!)
        .maybeSingle();
      return data;
    },
  });

  // ── Booking + departure ───────────────────────────────────────────────────
  const { data: booking } = useQuery({
    queryKey: ["muthawif-jamaah-booking", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, visa_status, created_at,
          departure:departures(
            id, departure_date, return_date,
            package:packages(name)
          )
        `)
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // ── Room assignment ───────────────────────────────────────────────────────
  const { data: roomOccupant } = useQuery({
    queryKey: ["muthawif-jamaah-room", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("room_occupants")
        .select(`
          bed_number, check_in_at,
          room:room_assignments(
            room_number, room_type, floor,
            hotel:hotels(name, city)
          )
        `)
        .eq("customer_id", customerId!)
        .maybeSingle();
      return data;
    },
  });

  // ── Visa application ──────────────────────────────────────────────────────
  const { data: visa } = useQuery({
    queryKey: ["muthawif-jamaah-visa", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("visa_applications")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // ── Attendance history (last 60 records) ──────────────────────────────────
  const { data: attendanceHistory = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["muthawif-jamaah-attendance", customerId, booking?.departure?.id],
    enabled: !!customerId && !!booking?.departure?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("customer_id", customerId!)
        .eq("departure_id", booking!.departure!.id)
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      return data || [];
    },
  });

  // ── Derived stats ─────────────────────────────────────────────────────────
  const attStats = {
    total:     (attendanceHistory as any[]).length,
    hadir:     (attendanceHistory as any[]).filter((r: any) => r.status === "hadir").length,
    absen:     (attendanceHistory as any[]).filter((r: any) => r.status === "absen").length,
    terlambat: (attendanceHistory as any[]).filter((r: any) => r.status === "terlambat").length,
    izin:      (attendanceHistory as any[]).filter((r: any) => r.status === "izin").length,
  };
  const hadirPct = attStats.total
    ? Math.round(((attStats.hadir + attStats.terlambat) / attStats.total) * 100)
    : 0;

  // Unique dates with records
  const uniqueDates = [...new Set((attendanceHistory as any[]).map((r: any) => r.attendance_date))]
    .sort((a, b) => b.localeCompare(a));

  // Passport expiry warning
  const passportDaysLeft = customer?.passport_expiry
    ? differenceInDays(new Date(customer.passport_expiry), new Date())
    : null;

  const room = (roomOccupant as any)?.room;
  const dep = (booking as any)?.departure;

  if (loadingCustomer) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-32 rounded-2xl" />
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium">Data jamaah tidak ditemukan</p>
        <Button variant="ghost" className="mt-4" asChild>
          <Link to="/muthawif/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Kembali</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link to="/muthawif/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate">Profil Jamaah</h1>
            <p className="text-xs text-muted-foreground truncate">{customer.full_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── Identity Card ───────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-4 pt-5 pb-14" />
          <CardContent className="-mt-10 pt-0 px-4 pb-4">
            <div className="flex items-end gap-4 mb-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                {customer.photo_url ? (
                  <img
                    src={customer.photo_url}
                    alt={customer.full_name}
                    className="h-20 w-20 rounded-2xl object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-white shadow-md flex items-center justify-center">
                    <User className="h-9 w-9 text-emerald-600" />
                  </div>
                )}
                {customer.is_tour_leader && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5">
                    <Star className="h-3 w-3 text-white fill-white" />
                  </div>
                )}
              </div>
              {/* Name + badges */}
              <div className="flex-1 min-w-0 pb-1">
                <h2 className="text-lg font-bold leading-tight truncate">{customer.full_name}</h2>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {customer.gender && (
                    <Badge variant="outline" className={`text-[10px] ${customer.gender === "male" || customer.gender === "laki-laki" ? "border-blue-300 text-blue-700" : "border-pink-300 text-pink-700"}`}>
                      {customer.gender === "male" || customer.gender === "laki-laki" ? "Laki-laki" : "Perempuan"}
                    </Badge>
                  )}
                  {customer.is_tour_leader && (
                    <Badge className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200">Tour Leader</Badge>
                  )}
                  {booking?.booking_status && (
                    <Badge variant="outline" className="text-[10px]">{booking.booking_status}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick contact row */}
            <div className="flex gap-2 flex-wrap">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs border rounded-lg py-2 hover:bg-muted/50 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-600" /> Telepon
                </a>
              )}
              {customer.phone && (
                <a
                  href={`https://wa.me/${customer.phone.replace(/\D/g,"").replace(/^0/,"62")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 text-xs border border-green-200 rounded-lg py-2 text-green-700 hover:bg-green-50 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Attendance Summary Hero ─────────────────────────────── */}
        {attStats.total > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Hadir",     value: attStats.hadir,     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
              { label: "Absen",     value: attStats.absen,     color: "text-red-700",     bg: "bg-red-50 border-red-200" },
              { label: "Terlambat", value: attStats.terlambat, color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
              { label: "Izin",      value: attStats.izin,      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
            ].map(s => (
              <Card key={s.label} className={`border ${s.bg}`}>
                <CardContent className="pt-3 pb-3 text-center px-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className={`text-[10px] ${s.color}`}>{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Departure / Package ─────────────────────────────────── */}
        {dep && (
          <Section title="Paket & Keberangkatan" icon={CalendarDays}>
            <div className="space-y-0 divide-y">
              <InfoRow icon={BookOpen}     label="Nama Paket"       value={(dep as any).package?.name} />
              <InfoRow icon={CalendarDays} label="Tanggal Berangkat" value={dep.departure_date ? format(parseISO(dep.departure_date), "d MMMM yyyy", { locale: idLocale }) : null} />
              <InfoRow icon={CalendarDays} label="Tanggal Kembali"   value={dep.return_date ? format(parseISO(dep.return_date), "d MMMM yyyy", { locale: idLocale }) : null} />
              <InfoRow icon={UserCheck}    label="Kode Booking"     value={booking?.booking_code} mono />
            </div>
          </Section>
        )}

        {/* ── Room Info ───────────────────────────────────────────── */}
        <Section title="Informasi Kamar" icon={BedDouble}>
          {room ? (
            <div className="space-y-0 divide-y">
              <InfoRow icon={Building2} label="Hotel"         value={(room as any).hotel?.name} />
              <InfoRow icon={MapPin}    label="Kota Hotel"    value={(room as any).hotel?.city} />
              <InfoRow icon={BedDouble} label="Nomor Kamar"   value={room.room_number} />
              <InfoRow icon={BedDouble} label="Tipe Kamar"    value={room.room_type} />
              {room.floor && <InfoRow icon={Building2} label="Lantai" value={`Lantai ${room.floor}`} />}
              {(roomOccupant as any)?.bed_number && (
                <InfoRow icon={BedDouble} label="Nomor Kasur" value={`Bed ${(roomOccupant as any).bed_number}`} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2 text-center">Belum ada penugasan kamar</p>
          )}
        </Section>

        {/* ── Passport & Visa ─────────────────────────────────────── */}
        <Section title="Paspor & Visa" icon={Globe}>
          <div className="space-y-0 divide-y">
            <InfoRow icon={Fingerprint} label="Nomor Paspor"   value={customer.passport_number} mono />
            {customer.passport_expiry && (
              <div className="flex items-start gap-3 py-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground">Masa Berlaku Paspor</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {format(parseISO(customer.passport_expiry), "d MMMM yyyy", { locale: idLocale })}
                    </p>
                    {passportDaysLeft !== null && passportDaysLeft < 180 && (
                      <Badge className={`text-[10px] border ${passportDaysLeft < 30 ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                        {passportDaysLeft < 0 ? "Kedaluwarsa" : `${passportDaysLeft}h lagi`}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Visa */}
            {visa ? (
              <>
                <div className="flex items-start gap-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground">Status Visa</p>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] border ${VISA_STATUS_CFG[visa.status]?.cls || "bg-muted text-muted-foreground border-border"}`}>
                        {VISA_STATUS_CFG[visa.status]?.label || visa.status}
                      </Badge>
                      {visa.visa_type && <span className="text-xs text-muted-foreground">{visa.visa_type}</span>}
                    </div>
                  </div>
                </div>
                <InfoRow icon={Globe}         label="Nomor Visa"        value={visa.visa_number} mono />
                <InfoRow icon={CalendarDays}  label="Berlaku s.d."      value={visa.visa_expiry ? format(parseISO(visa.visa_expiry), "d MMMM yyyy", { locale: idLocale }) : null} />
              </>
            ) : (
              <div className="py-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">Belum ada data visa</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── Personal Data ────────────────────────────────────────── */}
        <Section title="Data Pribadi" icon={User} defaultOpen={false}>
          <div className="space-y-0 divide-y">
            <InfoRow icon={Fingerprint} label="NIK"            value={customer.nik} mono />
            <InfoRow icon={CalendarDays} label="Tgl Lahir"     value={customer.birth_date ? format(parseISO(customer.birth_date), "d MMMM yyyy", { locale: idLocale }) : null} />
            <InfoRow icon={MapPin}       label="Tempat Lahir"  value={customer.birth_place} />
            <InfoRow icon={Heart}        label="Gol. Darah"    value={customer.blood_type} />
            <InfoRow icon={User}         label="Status Nikah"  value={customer.marital_status} />
            <InfoRow icon={User}         label="Nama Ayah"     value={customer.father_name} />
            <InfoRow icon={User}         label="Nama Ibu"      value={customer.mother_name} />
            {customer.mahram_name && (
              <>
                <InfoRow icon={Heart}    label="Nama Mahram"   value={customer.mahram_name} />
                <InfoRow icon={Heart}    label="Hub. Mahram"   value={customer.mahram_relation} />
              </>
            )}
            <InfoRow icon={MapPin}       label="Alamat"        value={[customer.address, customer.city, customer.province].filter(Boolean).join(", ")} />
          </div>
        </Section>

        {/* ── Emergency Contact ───────────────────────────────────── */}
        {customer.emergency_contact_name && (
          <Section title="Kontak Darurat" icon={AlertCircle}>
            <div className="space-y-0 divide-y">
              <InfoRow icon={User}  label="Nama"      value={customer.emergency_contact_name} />
              <InfoRow icon={Phone} label="No. HP"    value={customer.emergency_contact_phone} />
              <InfoRow icon={Heart} label="Hubungan"  value={customer.emergency_contact_relation} />
            </div>
            {customer.emergency_contact_phone && (
              <div className="flex gap-2 mt-3">
                <a
                  href={`tel:${customer.emergency_contact_phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs border rounded-lg py-2 hover:bg-muted/50"
                >
                  <Phone className="h-3.5 w-3.5" /> Telepon
                </a>
                <a
                  href={`https://wa.me/${customer.emergency_contact_phone.replace(/\D/g,"").replace(/^0/,"62")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-green-200 rounded-lg py-2 text-green-700 hover:bg-green-50"
                >
                  <Phone className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </div>
            )}
          </Section>
        )}

        {/* ── Attendance History ───────────────────────────────────── */}
        <Section title={`Riwayat Absensi (${attStats.total} catatan)`} icon={UserCheck} defaultOpen={false}>
          {loadingAtt ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : attendanceHistory.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">Belum ada riwayat absensi</p>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-2 mb-3 p-2 bg-muted/40 rounded-lg">
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${attStats.total ? (attStats.hadir / attStats.total) * 100 : 0}%` }} />
                  <div className="bg-amber-400 h-full" style={{ width: `${attStats.total ? (attStats.terlambat / attStats.total) * 100 : 0}%` }} />
                  <div className="bg-blue-400 h-full" style={{ width: `${attStats.total ? (attStats.izin / attStats.total) * 100 : 0}%` }} />
                  <div className="bg-red-400 h-full" style={{ width: `${attStats.total ? (attStats.absen / attStats.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-semibold text-emerald-700 shrink-0">{hadirPct}% hadir</span>
              </div>

              {/* Per-date list */}
              <div className="space-y-3">
                {uniqueDates.slice(0, 14).map(date => {
                  const dayRecs = (attendanceHistory as any[]).filter((r: any) => r.attendance_date === date);
                  return (
                    <div key={date}>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                        {format(parseISO(date + "T00:00:00"), "EEEE, d MMM yyyy", { locale: idLocale })}
                      </p>
                      <div className="space-y-1">
                        {dayRecs.map((rec: any) => {
                          const cfg = STATUS_CFG[rec.status as AttStatus];
                          const Icon = cfg?.icon || CheckCircle2;
                          return (
                            <div key={rec.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${cfg?.cls || "bg-muted text-muted-foreground border-border"}`}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-xs flex-1">
                                {SESSION_LABELS[rec.session_type] || rec.session_type}
                              </span>
                              <Badge className={`text-[10px] border ${cfg?.cls || ""}`}>
                                {cfg?.label || rec.status}
                              </Badge>
                              {rec.checked_at && (
                                <span className="text-[10px] text-current opacity-60">
                                  {format(new Date(rec.checked_at), "HH:mm")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {uniqueDates.length > 14 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    + {uniqueDates.length - 14} hari lainnya
                  </p>
                )}
              </div>
            </>
          )}
        </Section>

        <div className="pb-6" />
      </div>
    </div>
  );
}
