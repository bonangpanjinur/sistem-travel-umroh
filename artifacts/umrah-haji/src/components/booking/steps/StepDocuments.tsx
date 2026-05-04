import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PassengerData } from "@/hooks/useBookingWizard";
import { toast } from "sonner";
import { FileText, Upload, Check, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDocumentsProps {
  passengers: PassengerData[];
  onUpdate: (passengers: PassengerData[]) => void;
}

export function StepDocuments({ passengers, onUpdate }: StepDocumentsProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const handleFileUpload = async (
    passengerId: string,
    docType: 'ktp' | 'passport',
    file: File
  ) => {
    if (!user) return;

    const uploadKey = `${passengerId}-${docType}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${passengerId}/${docType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(fileName);

      // Update passenger with document URL
      const fieldKey = docType === 'ktp' ? 'ktpUrl' : 'passportUrl';
      onUpdate(
        passengers.map(p =>
          p.id === passengerId ? { ...p, [fieldKey]: publicUrl } : p
        )
      );

      toast.success(`${docType.toUpperCase()} berhasil diupload`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Gagal upload ${docType.toUpperCase()}`);
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Upload Dokumen</h3>
        <p className="text-sm text-muted-foreground">
          Upload scan/foto KTP dan halaman depan Paspor untuk setiap jamaah
        </p>
      </div>

      <div className="space-y-4">
        {passengers.map((passenger, index) => (
          <Card key={passenger.id}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                {passenger.fullName || `Jamaah ${index + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* KTP Upload */}
              <DocumentUploader
                label="KTP"
                passengerId={passenger.id}
                docType="ktp"
                currentUrl={passenger.ktpUrl}
                isUploading={uploading[`${passenger.id}-ktp`]}
                onUpload={(file) => handleFileUpload(passenger.id, 'ktp', file)}
              />

              {/* Passport Upload */}
              <DocumentUploader
                label="Paspor"
                passengerId={passenger.id}
                docType="passport"
                currentUrl={passenger.passportUrl}
                isUploading={uploading[`${passenger.id}-passport`]}
                onUpload={(file) => handleFileUpload(passenger.id, 'passport', file)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface DocumentUploaderProps {
  label: string;
  passengerId: string;
  docType: 'ktp' | 'passport';
  currentUrl?: string;
  isUploading?: boolean;
  onUpload: (file: File) => void;
}

function DocumentUploader({ 
  label, 
  passengerId, 
  docType, 
  currentUrl, 
  isUploading, 
  onUpload 
}: DocumentUploaderProps) {
  const inputId = `${passengerId}-${docType}`;
  const hasFile = !!currentUrl;

  return (
    <div>
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </Label>
      <div className="mt-2">
        <label
          htmlFor={inputId}
          className={cn(
            "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            hasFile 
              ? "border-green-500 bg-green-50" 
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="mt-2 text-sm text-muted-foreground">Mengupload...</span>
            </div>
          ) : hasFile ? (
            <div className="flex flex-col items-center text-green-600">
              <Check className="h-8 w-8" />
              <span className="mt-2 text-sm font-medium">Terupload</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <Upload className="h-8 w-8" />
              <span className="mt-2 text-sm">Upload {label}</span>
              <span className="text-xs">JPG, PNG, PDF (maks 5MB)</span>
            </div>
          )}
          <Input
            id={inputId}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Ukuran file maksimal 5MB');
                  return;
                }
                onUpload(file);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
