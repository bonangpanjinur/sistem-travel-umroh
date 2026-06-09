import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Upload, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase: any = supabaseRaw;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCustomerId?: string;
  preselectedCustomerName?: string;
  onSuccess?: () => void;
}

export function AdminUploadForJamaah({ open, onOpenChange, preselectedCustomerId, preselectedCustomerName, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customerSearch, setCustomerSearch] = useState(preselectedCustomerName || "");
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string } | null>(
    preselectedCustomerId ? { id: preselectedCustomerId, name: preselectedCustomerName || "", phone: "" } : null
  );
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Search customers
  const { data: customerResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["customers-search", customerSearch],
    enabled: customerSearch.length >= 2 && !selectedCustomer,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone, email, nik")
        .or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%,nik.ilike.%${customerSearch}%`)
        .limit(8);
      return data || [];
    },
  });

  // Get document types
  const { data: docTypes = [] } = useQuery({
    queryKey: ["document-types-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_types")
        .select("id, name, code, description, is_required")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || !selectedDocTypeId || !selectedFile) {
        throw new Error("Lengkapi semua data yang diperlukan");
      }

      // 1. Upload file to storage
      const ext = selectedFile.name.split(".").pop();
      const fileName = `${selectedCustomer.id}/${Date.now()}_admin-upload.${ext}`;
      const { error: storageError } = await supabase.storage
        .from("customer-documents")
        .upload(fileName, selectedFile, { contentType: selectedFile.type, upsert: false });

      if (storageError) throw new Error(`Upload gagal: ${storageError.message}`);

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from("customer-documents").getPublicUrl(fileName);
      const fileUrl = urlData?.publicUrl || "";

      // 3. Insert into customer_documents
      const { error: insertError } = await supabase.from("customer_documents").insert({
        customer_id: selectedCustomer.id,
        document_type_id: selectedDocTypeId,
        file_name: selectedFile.name,
        file_url: fileUrl,
        status: "pending",
        notes: notes || "Di-upload oleh admin",
      });

      if (insertError) throw new Error(insertError.message);
    },
    onSuccess: () => {
      toast.success("Dokumen berhasil diupload atas nama jamaah");
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
      queryClient.invalidateQueries({ queryKey: ["customer-documents"] });
      handleReset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal upload dokumen");
    },
  });

  const handleReset = () => {
    setSelectedFile(null);
    setNotes("");
    setSelectedDocTypeId("");
    if (!preselectedCustomerId) {
      setSelectedCustomer(null);
      setCustomerSearch("");
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxMb}MB`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const isReady = selectedCustomer && selectedDocTypeId && selectedFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Dokumen Jamaah
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload dokumen fisik jamaah yang dibawa langsung ke kantor
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Customer selection */}
          <div className="space-y-2">
            <Label className="font-semibold">Jamaah / Pelanggan</Label>
            {selectedCustomer ? (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedCustomer.name}</p>
                  {selectedCustomer.phone && <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>}
                </div>
                {!preselectedCustomerId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Cari nama, NIK, atau nomor HP..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                {customerSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                    {searchLoading ? (
                      <div className="p-3"><Skeleton className="h-8 w-full" /></div>
                    ) : customerResults.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">Tidak ditemukan</div>
                    ) : (
                      customerResults.map((c: any) => (
                        <button
                          key={c.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                          onClick={() => { setSelectedCustomer({ id: c.id, name: c.full_name, phone: c.phone || "" }); setCustomerSearch(c.full_name); }}
                        >
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                            {c.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone || c.nik || c.email || "-"}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document type */}
          <div className="space-y-2">
            <Label className="font-semibold">Jenis Dokumen</Label>
            <Select value={selectedDocTypeId} onValueChange={setSelectedDocTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis dokumen..." />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((dt: any) => (
                  <SelectItem key={dt.id} value={dt.id}>
                    <div className="flex items-center gap-2">
                      {dt.name}
                      {dt.is_required && <Badge className="text-[9px] px-1 py-0 bg-red-100 text-red-700">Wajib</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label className="font-semibold">File Dokumen</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
                selectedFile && "border-green-400 bg-green-50"
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                onChange={e => handleFileChange(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-semibold text-green-700">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-2"
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">Klik atau drag & drop file</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · Maks. 10 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="font-semibold">Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Misal: Dokumen asli dibawa saat keberangkatan"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            ℹ️ Dokumen akan masuk dengan status <strong>Pending</strong> dan perlu diverifikasi oleh admin.
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false); }}>Batal</Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!isReady || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengupload...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Upload Dokumen</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
