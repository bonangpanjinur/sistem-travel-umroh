import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { PenLine, CheckCircle2, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

const supabase: any = supabaseRaw;
const BASE = import.meta.env.VITE_API_URL || "";

export default function JamaahSignaturePage() {
  const { user, session } = useAuth() as any;
  const [showPad, setShowPad] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer-sig", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, full_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: sigData, isLoading, refetch } = useQuery({
    queryKey: ["customer-signature", customer?.id],
    enabled: !!customer?.id && !!session?.access_token,
    queryFn: async () => {
      const r = await fetch(`${BASE}/documents/signature/${customer!.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!r.ok) throw new Error("Gagal memuat tanda tangan");
      const j = await r.json();
      return j.signature;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (dataUrl: string) => {
      const r = await fetch(`${BASE}/documents/signature/${customer!.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ signature_base64: dataUrl }),
      });
      if (!r.ok) throw new Error("Gagal menyimpan tanda tangan");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Tanda tangan berhasil disimpan");
      setShowPad(false);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan"),
  });

  const hasSig = !!sigData?.signature_base64;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
          <PenLine className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">Tanda Tangan Digital</h1>
          <p className="text-xs text-gray-500">Tandatangani dokumen perjalanan Anda secara digital</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Status Tanda Tangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : hasSig ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <Badge className="bg-emerald-100 text-emerald-700 mb-1">Sudah Ditandatangani</Badge>
                  <p className="text-xs text-gray-500">
                    Ditandatangani pada:{" "}
                    {sigData?.signed_at
                      ? format(new Date(sigData.signed_at), "d MMMM yyyy, HH:mm", { locale: localeId })
                      : "-"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tanda tangan ini digunakan untuk dokumen perjalanan Anda
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <Badge className="bg-amber-100 text-amber-700 mb-1">Belum Ditandatangani</Badge>
                  <p className="text-xs text-gray-500">
                    Silakan buat tanda tangan digital Anda untuk digunakan pada dokumen resmi perjalanan
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing signature preview */}
        {hasSig && !showPad && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pratinjau Tanda Tangan</CardTitle>
              <CardDescription className="text-xs">Tanda tangan yang tersimpan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-slate-50 p-2 mb-3">
                <img
                  src={sigData.signature_base64}
                  alt="Tanda tangan"
                  className="max-h-32 w-full object-contain"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPad(true)}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Perbarui Tanda Tangan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Signature pad */}
        {(!hasSig || showPad) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                {hasSig ? "Buat Tanda Tangan Baru" : "Buat Tanda Tangan"}
              </CardTitle>
              <CardDescription className="text-xs">
                Gunakan jari atau mouse untuk menggambar tanda tangan Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad
                onSave={(dataUrl) => saveMutation.mutate(dataUrl)}
                disabled={saveMutation.isPending}
              />
              {showPad && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPad(false)}
                  className="mt-2 w-full text-gray-500"
                >
                  Batal
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-blue-700 font-medium mb-1">Tentang Tanda Tangan Digital</p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
              <li>Tanda tangan disimpan dengan aman dan terenkripsi</li>
              <li>Digunakan untuk kontrak, surat izin, dan dokumen resmi perjalanan</li>
              <li>Dapat diperbarui kapan saja sebelum dokumen diterbitkan</li>
              <li>Waktu dan IP address dicatat untuk keamanan</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
