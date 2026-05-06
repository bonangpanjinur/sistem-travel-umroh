import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Eye,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";

type DocumentStatus = "pending" | "verified" | "rejected";

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }
> = {
  verified: {
    label: "Terverifikasi",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-green-600",
  },
  pending: {
    label: "Menunggu Verifikasi",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
    color: "text-yellow-600",
  },
  rejected: {
    label: "Ditolak",
    variant: "destructive",
    icon: <AlertCircle className="h-3 w-3" />,
    color: "text-red-600",
  },
};

export default function JamaahDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: documentTypes } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const query = supabase.from("document_types").select("*");
      
      // Try to order by sort_order, fallback to name if it fails
      const { data, error } = await query
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("document_types")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });
          
        if (fallbackError) throw fallbackError;
        return fallbackData ?? [];
      }
      
      return data ?? [];
    },
  });

  const selectedType = useMemo(
    () => documentTypes?.find((t: any) => t.id === selectedTypeId),
    [documentTypes, selectedTypeId]
  );
  const maxFileSize = (selectedType?.max_file_size_mb ?? 5) * 1024 * 1024;
  const allowedExts: string[] = selectedType?.allowed_extensions ?? ["jpg", "jpeg", "png", "pdf"];
  const acceptAttr = allowedExts.map((e) => `.${e}`).join(",");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["jamaah-documents", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("customer_documents")
        .select("*, document_type:document_types(id, name, code, is_required)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  // Required document checklist progress
  const requiredProgress = useMemo(() => {
    if (!documentTypes || !documents) return { uploaded: 0, total: 0, verified: 0 };
    const required = documentTypes.filter((t: any) => t.is_required);
    const uploadedTypes = new Set(
      documents
        .filter((d: any) => d.status !== "rejected")
        .map((d: any) => d.document_type?.id)
    );
    const verifiedTypes = new Set(
      documents
        .filter((d: any) => d.status === "verified")
        .map((d: any) => d.document_type?.id)
    );
    return {
      total: required.length,
      uploaded: required.filter((t: any) => uploadedTypes.has(t.id)).length,
      verified: required.filter((t: any) => verifiedTypes.has(t.id)).length,
    };
  }, [documentTypes, documents]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !customer || !file || !selectedTypeId) {
        throw new Error("Lengkapi data terlebih dahulu");
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExts.includes(ext)) {
        throw new Error(`Format harus salah satu: ${allowedExts.join(", ")}`);
      }
      if (file.size > maxFileSize) {
        throw new Error(`Ukuran file maksimal ${selectedType?.max_file_size_mb ?? 5} MB`);
      }
      const path = `${user.id}/${customer.id}/${selectedTypeId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(path);

      const { error: insErr } = await supabase.from("customer_documents").insert({
        customer_id: customer.id,
        document_type_id: selectedTypeId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: "pending",
        notes: notes || null,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Dokumen berhasil diunggah. Menunggu verifikasi staff.");
      queryClient.invalidateQueries({ queryKey: ["jamaah-documents", customer?.id] });
      setUploadOpen(false);
      setFile(null);
      setSelectedTypeId("");
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengunggah dokumen");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }
    if (!selectedTypeId) {
      toast.error("Pilih jenis dokumen");
      return;
    }
    if (file.size > maxFileSize) {
      toast.error(`Ukuran file maksimal ${selectedType?.max_file_size_mb ?? 5} MB`);
      return;
    }
    setUploading(true);
    try {
      await uploadMutation.mutateAsync();
    } finally {
      setUploading(false);
    }
  };

  const progressPct = requiredProgress.total
    ? Math.round((requiredProgress.verified / requiredProgress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">Dokumen Saya</h1>
            <p className="text-xs opacity-80">Upload & pantau status verifikasi</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Progress Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Kelengkapan Dokumen
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {requiredProgress.verified} dari {requiredProgress.total} dokumen wajib terverifikasi
                </p>
              </div>
              <span className="text-2xl font-bold text-primary">{progressPct}%</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {requiredProgress.uploaded > requiredProgress.verified && (
              <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {requiredProgress.uploaded - requiredProgress.verified} dokumen menunggu verifikasi staff
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upload Button */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Unggah Dokumen Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Unggah Dokumen</DialogTitle>
              <DialogDescription>
                Upload paspor, KTP, atau dokumen pendukung lainnya. Staff akan memverifikasi dalam 1x24 jam.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="doc-type">Jenis Dokumen *</Label>
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger id="doc-type" className="mt-1">
                    <SelectValue placeholder="Pilih jenis dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_required && <span className="text-red-500">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="doc-file">File *</Label>
                <Input
                  id="doc-file"
                  type="file"
                  accept={acceptAttr || "image/*,application/pdf"}
                  className="mt-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > maxFileSize) {
                      toast.error(`Ukuran file maksimal ${selectedType?.max_file_size_mb ?? 5} MB`);
                      e.target.value = "";
                      return;
                    }
                    setFile(f ?? null);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: {allowedExts.map((e) => e.toUpperCase()).join(", ")} (maks {selectedType?.max_file_size_mb ?? 5} MB)
                </p>
              </div>

              <div>
                <Label htmlFor="doc-notes">Catatan (opsional)</Label>
                <Textarea
                  id="doc-notes"
                  className="mt-1"
                  rows={2}
                  placeholder="Misal: paspor terbit ulang"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadOpen(false)}
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={uploading || !file || !selectedTypeId}>
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Unggah
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Documents List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">
            Dokumen Terunggah
          </h2>
          {isLoading ? (
            <LoadingState />
          ) : !documents || documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Belum ada dokumen"
              description="Unggah dokumen Anda untuk diverifikasi oleh staff"
            />
          ) : (
            documents.map((doc: any) => {
              const status = statusConfig[(doc.status as DocumentStatus) || "pending"];
              return (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg bg-primary/10 shrink-0`}>
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {doc.document_type?.name || "Dokumen"}
                          </p>
                          {doc.file_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.file_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Diunggah:{" "}
                            {doc.created_at
                              ? format(new Date(doc.created_at), "d MMM yyyy, HH:mm", {
                                  locale: localeId,
                                })
                              : "-"}
                          </p>
                          {doc.status === "verified" && doc.verified_at && (
                            <p className="text-xs text-green-600 mt-0.5">
                              Diverifikasi:{" "}
                              {format(new Date(doc.verified_at), "d MMM yyyy", {
                                locale: localeId,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={status.variant} className="gap-1 shrink-0">
                        {status.icon}
                        <span className="text-xs">{status.label}</span>
                      </Badge>
                    </div>

                    {/* Notes from staff */}
                    {doc.notes && (
                      <div
                        className={`mt-3 p-2 rounded-md text-xs ${
                          doc.status === "rejected"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="font-medium mb-0.5">
                          {doc.status === "rejected" ? "Alasan penolakan:" : "Catatan:"}
                        </p>
                        {doc.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {doc.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Lihat
                          </a>
                        </Button>
                      )}
                      {doc.status === "rejected" && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedTypeId(doc.document_type?.id || "");
                            setUploadOpen(true);
                          }}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Unggah Ulang
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
