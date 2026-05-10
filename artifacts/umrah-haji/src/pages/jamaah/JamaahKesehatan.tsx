import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart, Phone, Share2, Printer, Save, CheckCircle,
  AlertTriangle, Pill, User, ChevronLeft, Syringe,
  ClipboardList, ShieldAlert
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const HEALTH_KEY = "jamaah-health-profile";

const KONDISI_LIST = [
  "Diabetes / Gula Darah Tinggi",
  "Hipertensi (Darah Tinggi)",
  "Jantung",
  "Asma / Gangguan Napas",
  "Ginjal",
  "Stroke / Riwayat Stroke",
  "Kolesterol Tinggi",
  "Epilepsi",
  "Gangguan Psikiatri",
  "Osteoporosis / Sendi",
];

const VAKSIN_LIST = [
  "Meningitis (Wajib untuk Haji/Umroh)",
  "Influenza",
  "Hepatitis A",
  "Hepatitis B",
  "Typhoid",
  "COVID-19",
  "Pneumonia",
];

interface HealthProfile {
  golDarah: string;
  rhesus: string;
  tinggiBadan: string;
  beratBadan: string;
  alergi: string;
  kondisi: string[];
  obatRutin: string;
  dokterNama: string;
  dokterTelp: string;
  kontakDaruratNama: string;
  kontakDaruratHubungan: string;
  kontakDaruratTelp: string;
  vaksin: string[];
  catatanLain: string;
}

const DEFAULT_PROFILE: HealthProfile = {
  golDarah: "",
  rhesus: "",
  tinggiBadan: "",
  beratBadan: "",
  alergi: "",
  kondisi: [],
  obatRutin: "",
  dokterNama: "",
  dokterTelp: "",
  kontakDaruratNama: "",
  kontakDaruratHubungan: "",
  kontakDaruratTelp: "",
  vaksin: [],
  catatanLain: "",
};

function loadProfile(): HealthProfile {
  try {
    const stored = localStorage.getItem(HEALTH_KEY);
    return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function JamaahKesehatan() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(loadProfile);
  const [saved, setSaved] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer-health", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("customers")
        .select("full_name, birth_date, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const update = (field: keyof HealthProfile, value: any) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const toggleKondisi = (k: string) => {
    setProfile((p) => ({
      ...p,
      kondisi: p.kondisi.includes(k) ? p.kondisi.filter((x) => x !== k) : [...p.kondisi, k],
    }));
    setSaved(false);
  };

  const toggleVaksin = (v: string) => {
    setProfile((p) => ({
      ...p,
      vaksin: p.vaksin.includes(v) ? p.vaksin.filter((x) => x !== v) : [...p.vaksin, v],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(profile));
    setSaved(true);
    toast.success("Data kesehatan tersimpan!");
  };

  const handleShare = () => {
    const lines = [
      `🏥 *KARTU KESEHATAN DARURAT*`,
      `👤 ${customer?.full_name || "Jamaah"}`,
      ``,
      `🩸 Gol. Darah: ${profile.golDarah}${profile.rhesus || ""}`,
      profile.kondisi.length ? `⚠️ Kondisi: ${profile.kondisi.join(", ")}` : "",
      profile.alergi ? `🚫 Alergi: ${profile.alergi}` : "",
      profile.obatRutin ? `💊 Obat Rutin: ${profile.obatRutin}` : "",
      ``,
      `📞 Kontak Darurat:`,
      `${profile.kontakDaruratNama} (${profile.kontakDaruratHubungan}) — ${profile.kontakDaruratTelp}`,
      profile.dokterNama ? `👨‍⚕️ Dokter: ${profile.dokterNama} — ${profile.dokterTelp}` : "",
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      navigator.share({ title: "Kartu Kesehatan Darurat", text: lines }).catch(() => {});
    } else {
      navigator.clipboard.writeText(lines);
      toast.success("Kartu kesehatan disalin ke clipboard");
    }
  };

  const isProfileComplete = profile.golDarah && profile.kontakDaruratNama && profile.kontakDaruratTelp;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah" className="p-1 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Heart className="h-5 w-5" /> Profil Kesehatan
            </h1>
            <p className="text-white/80 text-xs">Data tersimpan di perangkat Anda</p>
          </div>
          {isProfileComplete && (
            <Badge className="bg-white/20 text-white text-xs border-white/30">
              <CheckCircle className="h-3 w-3 mr-1" /> Lengkap
            </Badge>
          )}
        </div>
      </div>

      {/* Alert if incomplete */}
      {!isProfileComplete && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Lengkapi profil kesehatan Anda. Data ini sangat penting untuk tim medis saat darurat di Tanah Suci.
          </p>
        </div>
      )}

      <div className="p-4">
        <Tabs defaultValue="profil">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="profil" className="flex-1 gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Profil
            </TabsTrigger>
            <TabsTrigger value="kontak" className="flex-1 gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Kontak
            </TabsTrigger>
            <TabsTrigger value="vaksin" className="flex-1 gap-1.5">
              <Syringe className="h-3.5 w-3.5" /> Vaksin
            </TabsTrigger>
            <TabsTrigger value="kartu" className="flex-1 gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Kartu
            </TabsTrigger>
          </TabsList>

          {/* ── TAB PROFIL ── */}
          <TabsContent value="profil" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Data Dasar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Golongan Darah</Label>
                    <Select value={profile.golDarah} onValueChange={(v) => update("golDarah", v)}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["A", "B", "AB", "O"].map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Rhesus</Label>
                    <Select value={profile.rhesus} onValueChange={(v) => update("rhesus", v)}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">Positif (+)</SelectItem>
                        <SelectItem value="-">Negatif (−)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tinggi Badan (cm)</Label>
                    <Input
                      type="number"
                      placeholder="170"
                      value={profile.tinggiBadan}
                      onChange={(e) => update("tinggiBadan", e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Berat Badan (kg)</Label>
                    <Input
                      type="number"
                      placeholder="65"
                      value={profile.beratBadan}
                      onChange={(e) => update("beratBadan", e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Alergi</Label>
                  <Input
                    placeholder="Contoh: Penisilin, seafood, debu"
                    value={profile.alergi}
                    onChange={(e) => update("alergi", e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs">Obat Rutin</Label>
                  <Textarea
                    placeholder="Contoh: Metformin 500mg (2x sehari), Amlodipin 5mg (1x pagi)"
                    value={profile.obatRutin}
                    onChange={(e) => update("obatRutin", e.target.value)}
                    className="mt-1 text-sm"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Kondisi Kesehatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {KONDISI_LIST.map((k) => (
                    <label key={k} className="flex items-center gap-3 cursor-pointer py-1">
                      <Checkbox
                        checked={profile.kondisi.includes(k)}
                        onCheckedChange={() => toggleKondisi(k)}
                      />
                      <span className="text-sm">{k}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Catatan Kesehatan Lainnya</Label>
                  <Textarea
                    placeholder="Kondisi atau riwayat medis lain yang perlu diketahui"
                    value={profile.catatanLain}
                    onChange={(e) => update("catatanLain", e.target.value)}
                    className="mt-1 text-sm"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB KONTAK ── */}
          <TabsContent value="kontak" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" /> Kontak Darurat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Nama Kontak Darurat *</Label>
                  <Input
                    placeholder="Nama anggota keluarga / kerabat"
                    value={profile.kontakDaruratNama}
                    onChange={(e) => update("kontakDaruratNama", e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hubungan</Label>
                  <Select value={profile.kontakDaruratHubungan} onValueChange={(v) => update("kontakDaruratHubungan", v)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Pilih hubungan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["Suami", "Istri", "Anak", "Orangtua", "Saudara", "Kerabat", "Lainnya"].map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">No. Telepon / WhatsApp *</Label>
                  <Input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={profile.kontakDaruratTelp}
                    onChange={(e) => update("kontakDaruratTelp", e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dokter Keluarga / Puskesmas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Nama Dokter / Fasilitas</Label>
                  <Input
                    placeholder="dr. Ahmad / Puskesmas Kecamatan"
                    value={profile.dokterNama}
                    onChange={(e) => update("dokterNama", e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">No. Telepon</Label>
                  <Input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={profile.dokterTelp}
                    onChange={(e) => update("dokterTelp", e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Nomor darurat Saudi */}
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Nomor Darurat Arab Saudi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Ambulans (Saudi)", number: "997" },
                    { label: "Polisi (Saudi)", number: "999" },
                    { label: "Pemadam Kebakaran", number: "998" },
                    { label: "KBRI Riyadh", number: "+966-11-488-2800" },
                    { label: "KJRI Jeddah", number: "+966-12-671-1271" },
                    { label: "Hotline Haji Kemenag RI", number: "+966-12-531-2600" },
                  ].map(({ label, number }) => (
                    <div key={number} className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <a
                        href={`tel:${number}`}
                        className="font-mono font-semibold text-primary text-xs"
                      >
                        {number}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB VAKSIN ── */}
          <TabsContent value="vaksin" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Syringe className="h-4 w-4 text-blue-600" /> Status Vaksinasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Centang vaksin yang sudah Anda terima. Vaksin Meningitis adalah syarat wajib keberangkatan.
                </p>
                <div className="space-y-3">
                  {VAKSIN_LIST.map((v) => {
                    const isWajib = v.includes("Wajib");
                    return (
                      <label key={v} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={profile.vaksin.includes(v)}
                          onCheckedChange={() => toggleVaksin(v)}
                        />
                        <div className="flex-1">
                          <span className="text-sm">{v.replace(" (Wajib untuk Haji/Umroh)", "")}</span>
                          {isWajib && (
                            <Badge className="ml-2 text-[9px] bg-red-100 text-red-700 border-red-200">
                              Wajib
                            </Badge>
                          )}
                        </div>
                        {profile.vaksin.includes(v) && (
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex gap-2.5">
                  <Pill className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">Tips Kesehatan Ibadah</p>
                    <p>• Bawa cukup obat-obatan untuk durasi perjalanan + cadangan 3 hari</p>
                    <p>• Minum air minimal 200ml per jam saat di Makkah untuk cegah dehidrasi</p>
                    <p>• Gunakan payung dan masker di area padat untuk cegah heat stroke</p>
                    <p>• Bawa suplemen Vitamin C dan zinc untuk menjaga imunitas</p>
                    <p>• Istirahat cukup, jangan memaksakan ibadah jika tubuh lemah</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB KARTU DARURAT ── */}
          <TabsContent value="kartu" className="space-y-4">
            {!isProfileComplete ? (
              <div className="text-center py-10 space-y-3">
                <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
                <p className="font-semibold">Profil Belum Lengkap</p>
                <p className="text-sm text-muted-foreground">
                  Lengkapi golongan darah dan kontak darurat terlebih dahulu
                </p>
              </div>
            ) : (
              <>
                {/* Preview card */}
                <div className="border-2 border-red-400 rounded-2xl overflow-hidden">
                  <div className="bg-red-600 text-white p-3 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <p className="font-bold text-sm">KARTU KESEHATAN DARURAT</p>
                  </div>
                  <div className="bg-white p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nama Jamaah</p>
                      <p className="font-bold">{customer?.full_name || "—"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Golongan Darah</p>
                        <p className="font-bold text-red-600 text-xl">
                          {profile.golDarah}{profile.rhesus}
                        </p>
                      </div>
                      {(profile.tinggiBadan || profile.beratBadan) && (
                        <div>
                          <p className="text-xs text-muted-foreground">TB / BB</p>
                          <p className="font-semibold">
                            {profile.tinggiBadan || "—"} cm / {profile.beratBadan || "—"} kg
                          </p>
                        </div>
                      )}
                    </div>
                    {profile.alergi && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                        <p className="text-xs font-bold text-red-700">⚠️ ALERGI</p>
                        <p className="text-sm text-red-900">{profile.alergi}</p>
                      </div>
                    )}
                    {profile.kondisi.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Kondisi Kesehatan</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.kondisi.map((k) => (
                            <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.obatRutin && (
                      <div>
                        <p className="text-xs text-muted-foreground">Obat Rutin</p>
                        <p className="text-sm">{profile.obatRutin}</p>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground">Kontak Darurat</p>
                      <p className="font-semibold">{profile.kontakDaruratNama} ({profile.kontakDaruratHubungan})</p>
                      <a href={`tel:${profile.kontakDaruratTelp}`} className="text-primary font-mono text-sm">
                        {profile.kontakDaruratTelp}
                      </a>
                    </div>
                  </div>
                </div>

                <Button onClick={handleShare} className="w-full" variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Bagikan Kartu (WhatsApp / Kontak)
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6">
          <Button onClick={handleSave} className="w-full h-12" size="lg">
            {saved ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Tersimpan!
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Simpan Data Kesehatan
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Data hanya tersimpan di perangkat Anda
          </p>
        </div>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
