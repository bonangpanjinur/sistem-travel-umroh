import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2, Users, Building2, Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const API_BASE = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).error || res.statusText);
  return body;
}

export default function DaftarSubAgen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const ref = searchParams.get("ref") ?? "";

  const [invitation, setInvitation] = useState<any>(null);
  const [tokenError, setTokenError] = useState("");
  const [tokenLoading, setTokenLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    ktpNumber: "",
  });
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      setTokenError("Link undangan tidak valid. Minta link baru dari agen yang mengundang Anda.");
      setTokenLoading(false);
      return;
    }
    apiFetch(`/agents/invitation/${token}`)
      .then((data) => {
        setInvitation(data.invitation);
        setTokenLoading(false);
      })
      .catch((err) => {
        setTokenError(err.message ?? "Link undangan tidak valid atau sudah kadaluarsa.");
        setTokenLoading(false);
      });
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Ukuran file KTP maksimal 4 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File KTP harus berupa gambar (JPG, PNG, dll).");
      return;
    }
    setKtpFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setKtpPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeKtp = () => {
    setKtpFile(null);
    setKtpPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadKtp = async (): Promise<string | null> => {
    if (!ktpFile) return null;
    const ext = ktpFile.name.split(".").pop() ?? "jpg";
    const path = `pending/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("agent-ktp")
      .upload(path, ktpFile, { upsert: false, contentType: ktpFile.type });
    if (error) {
      console.warn("KTP upload warning:", error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from("agent-ktp").getPublicUrl(path);
    return urlData?.publicUrl ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone) {
      toast.error("Nama, email, dan nomor HP wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Format email tidak valid.");
      return;
    }
    setSubmitting(true);
    try {
      let ktp_url: string | null = null;
      if (ktpFile) {
        ktp_url = await uploadKtp();
      }
      await apiFetch("/agents/invitation/register", {
        method: "POST",
        body: JSON.stringify({ token, ...form, ktp_url }),
      });
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mengirim pendaftaran.");
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Link Tidak Valid</h2>
            <p className="text-muted-foreground text-sm">{tokenError}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
            <h2 className="text-2xl font-bold text-emerald-700">Pendaftaran Berhasil!</h2>
            <p className="text-muted-foreground text-sm">
              Terima kasih telah mendaftar sebagai sub-agen Vinstour Travel.
              Tim kami akan meninjau pendaftaran Anda dan menghubungi Anda melalui WhatsApp.
            </p>
            <p className="text-xs text-muted-foreground">
              Biasanya proses review memakan waktu 1-2 hari kerja.
            </p>
            <Button onClick={() => navigate("/")} className="bg-emerald-600 hover:bg-emerald-700">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <div className="bg-emerald-700 text-white py-12 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Users className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold">Daftar Sub-Agen</h1>
        <p className="mt-2 text-emerald-100 text-sm">
          Bergabung dan mulai bisnis travel bersama Vinstour Travel
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Invitation info */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-800">Diundang oleh:</p>
                <p className="text-emerald-700">
                  {invitation?.company_name || invitation?.contact_name}
                  {invitation?.branch_name && <span className="text-muted-foreground"> · Cabang {invitation.branch_name}</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kode Agen: {invitation?.agent_code} ·{" "}
                  Link berlaku hingga {invitation?.expires_at
                    ? new Date(invitation.expires_at).toLocaleDateString("id-ID")
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Formulir Pendaftaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nama Lengkap *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Nama sesuai KTP"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Nomor HP / WhatsApp *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Nama Perusahaan / Agen (opsional)</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="PT / CV / Nama Agen"
                  value={form.companyName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ktpNumber">Nomor KTP / NIK (opsional)</Label>
                <Input
                  id="ktpNumber"
                  name="ktpNumber"
                  placeholder="16 digit NIK"
                  value={form.ktpNumber}
                  onChange={handleChange}
                  maxLength={16}
                />
              </div>

              {/* KTP File Upload */}
              <div className="space-y-1.5">
                <Label>Foto KTP (opsional)</Label>
                <p className="text-xs text-muted-foreground">
                  Upload foto KTP untuk mempercepat proses verifikasi. Maks. 4 MB.
                </p>
                {ktpPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50">
                    <img
                      src={ktpPreview}
                      alt="Preview KTP"
                      className="w-full object-contain max-h-44"
                    />
                    <button
                      type="button"
                      onClick={removeKtp}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="ktpFile"
                    className="flex flex-col items-center gap-2 border-2 border-dashed border-emerald-200 rounded-lg p-6 cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <ImageIcon className="h-8 w-8 text-emerald-400" />
                    <span className="text-sm text-muted-foreground">Klik untuk pilih foto KTP</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WEBP</span>
                  </label>
                )}
                <input
                  ref={fileRef}
                  id="ktpFile"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Daftar Sekarang</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Dengan mendaftar, Anda menyetujui syarat dan ketentuan menjadi sub-agen Vinstour Travel.
                Pendaftaran akan ditinjau oleh admin dalam 1-2 hari kerja.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
