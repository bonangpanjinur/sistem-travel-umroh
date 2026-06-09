import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Pen, Stamp, Image, Building2, Loader2, Upload, CheckCircle2, X, Eye,
} from "lucide-react";

interface BranchBrandingTabProps {
  branch: Record<string, any>;
}

interface LetterheadData {
  address_detail?: string;
  phone_alt?: string;
  email_alt?: string;
  website?: string;
  npwp?: string;
  pimpinan_name?: string;
  pimpinan_position?: string;
}

export function BranchBrandingTab({ branch }: BranchBrandingTabProps) {
  const qc = useQueryClient();
  const branchId = branch.id;

  const letterhead: LetterheadData = branch.letterhead_data ?? {};

  const [lhData, setLhData] = useState<LetterheadData>({
    address_detail: letterhead.address_detail ?? branch.address ?? "",
    phone_alt: letterhead.phone_alt ?? branch.phone ?? "",
    email_alt: letterhead.email_alt ?? branch.email ?? "",
    website: letterhead.website ?? "",
    npwp: letterhead.npwp ?? "",
    pimpinan_name: letterhead.pimpinan_name ?? "",
    pimpinan_position: letterhead.pimpinan_position ?? "Kepala Cabang",
  });

  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase.from("branches").update(payload as any).eq("id", branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-detail", branchId] });
      toast.success("Branding cabang berhasil disimpan");
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan"),
  });

  const handleSaveLetterhead = () => {
    updateMutation.mutate({ letterhead_data: lhData });
  };

  const uploadFile = async (
    file: File,
    field: "signature_url" | "stamp_url" | "logo_url",
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `branch-assets/${branchId}/${field}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(path);

      await updateMutation.mutateAsync({ [field]: urlData.publicUrl });
      toast.success("File berhasil diupload");
    } catch (err: any) {
      toast.error(err.message || "Gagal upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (field: "signature_url" | "stamp_url" | "logo_url") => {
    updateMutation.mutate({ [field]: null });
  };

  const ImageUploadSection = ({
    label,
    description,
    icon: Icon,
    field,
    currentUrl,
    isLoading,
    setLoading,
  }: {
    label: string;
    description: string;
    icon: any;
    field: "signature_url" | "stamp_url" | "logo_url";
    currentUrl?: string;
    isLoading: boolean;
    setLoading: (v: boolean) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{label}</span>
        {currentUrl && <Badge variant="secondary" className="text-xs">Sudah diupload</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>

      {currentUrl && (
        <div className="relative w-40 border rounded-lg overflow-hidden bg-white p-2">
          <img
            src={currentUrl}
            alt={label}
            className="w-full object-contain max-h-24"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="flex gap-1 mt-2">
            <Button
              size="sm" variant="outline" className="h-6 text-xs flex-1"
              onClick={() => window.open(currentUrl, "_blank")}
            >
              <Eye className="h-3 w-3 mr-1" />Lihat
            </Button>
            <Button
              size="sm" variant="outline" className="h-6 text-xs border-red-200 text-red-600 hover:bg-red-50 flex-1"
              onClick={() => handleRemove(field)}
              disabled={updateMutation.isPending}
            >
              <X className="h-3 w-3 mr-1" />Hapus
            </Button>
          </div>
        </div>
      )}

      <div>
        <label className="cursor-pointer">
          <Button
            size="sm" variant="outline" className="gap-2" asChild
            disabled={isLoading}
          >
            <span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {currentUrl ? "Ganti" : "Upload"} {label}
            </span>
          </Button>
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, field, setLoading);
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground mt-1">Format: PNG, JPG, max 2MB. Latar putih/transparan.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mt-4">
      {/* ── Tanda Tangan & Stempel ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pen className="h-4 w-4" />Tanda Tangan & Stempel (F-03)
          </CardTitle>
          <CardDescription>
            Upload gambar TTD pimpinan dan stempel resmi cabang. Akan otomatis tertanam di setiap dokumen PDF dari cabang ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <ImageUploadSection
            label="Tanda Tangan"
            description="Tanda tangan pimpinan cabang (PNG transparan dianjurkan)"
            icon={Pen}
            field="signature_url"
            currentUrl={branch.signature_url}
            isLoading={uploadingSignature}
            setLoading={setUploadingSignature}
          />
          <ImageUploadSection
            label="Stempel"
            description="Stempel/cap resmi cabang (PNG transparan dianjurkan)"
            icon={Stamp}
            field="stamp_url"
            currentUrl={branch.stamp_url}
            isLoading={uploadingStamp}
            setLoading={setUploadingStamp}
          />
          <ImageUploadSection
            label="Logo Cabang"
            description="Logo khusus cabang (opsional, jika berbeda dari pusat)"
            icon={Image}
            field="logo_url"
            currentUrl={branch.logo_url}
            isLoading={uploadingLogo}
            setLoading={setUploadingLogo}
          />
        </CardContent>
      </Card>

      {/* ── Kop Surat / Letterhead ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />Data Kop Surat Cabang (F-02)
          </CardTitle>
          <CardDescription>
            Data ini akan menggantikan kop surat pusat di semua dokumen yang digenerate untuk cabang ini.
            Kosongkan jika ingin menggunakan data cabang dari profil utama.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="address_detail">Alamat Lengkap (untuk kop surat)</Label>
              <Input
                id="address_detail"
                value={lhData.address_detail}
                onChange={(e) => setLhData({ ...lhData, address_detail: e.target.value })}
                placeholder="Jl. Contoh No. 1, Kota, Provinsi 12345"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_alt">Nomor Telepon</Label>
              <Input
                id="phone_alt"
                value={lhData.phone_alt}
                onChange={(e) => setLhData({ ...lhData, phone_alt: e.target.value })}
                placeholder="021-1234567 / 0812-3456-7890"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email_alt">Email Cabang</Label>
              <Input
                id="email_alt" type="email"
                value={lhData.email_alt}
                onChange={(e) => setLhData({ ...lhData, email_alt: e.target.value })}
                placeholder="cabang@vinstour.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website (opsional)</Label>
              <Input
                id="website"
                value={lhData.website}
                onChange={(e) => setLhData({ ...lhData, website: e.target.value })}
                placeholder="www.vinstour.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="npwp">NPWP Cabang (opsional)</Label>
              <Input
                id="npwp"
                value={lhData.npwp}
                onChange={(e) => setLhData({ ...lhData, npwp: e.target.value })}
                placeholder="00.000.000.0-000.000"
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pimpinan_name">Nama Pimpinan (untuk tanda tangan surat)</Label>
              <Input
                id="pimpinan_name"
                value={lhData.pimpinan_name}
                onChange={(e) => setLhData({ ...lhData, pimpinan_name: e.target.value })}
                placeholder="Nama Lengkap Pimpinan Cabang"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pimpinan_position">Jabatan Pimpinan</Label>
              <Input
                id="pimpinan_position"
                value={lhData.pimpinan_position}
                onChange={(e) => setLhData({ ...lhData, pimpinan_position: e.target.value })}
                placeholder="Kepala Cabang"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveLetterhead}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Simpan Data Kop Surat
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Cara kerja branding per cabang:</strong> Saat admin memilih cabang saat generate dokumen,
        data kop surat, logo, TTD, dan stempel dari cabang tersebut akan otomatis digunakan menggantikan
        data pusat. Jika data cabang kosong, fallback ke data pusat.
      </div>
    </div>
  );
}
