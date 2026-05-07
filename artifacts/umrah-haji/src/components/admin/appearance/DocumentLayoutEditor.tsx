import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Eye, LayoutTemplate, Printer, CreditCard, ShieldPlus, Award, Mail, FileCheck, Settings2 } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { DocumentSettingsForm } from "../DocumentSettingsForm";

type DocumentType = 'invoice' | 'passport_letter' | 'leave_letter' | 'certificate' | 'general_letter';

interface DocumentLayout {
  show_logo: boolean;
  show_header: boolean;
  show_company_info: boolean;
  show_date: boolean;
  show_signature: boolean;
  show_stamp: boolean;
  show_bank_info: boolean;
  footer_text: string;
  page_orientation: 'portrait' | 'landscape';
}

const defaultLayouts: Record<DocumentType, DocumentLayout> = {
  invoice: {
    show_logo: true,
    show_header: true,
    show_company_info: true,
    show_date: true,
    show_signature: true,
    show_stamp: true,
    show_bank_info: true,
    footer_text: '',
    page_orientation: 'portrait',
  },
  passport_letter: {
    show_logo: true,
    show_header: true,
    show_company_info: true,
    show_date: true,
    show_signature: true,
    show_stamp: true,
    show_bank_info: false,
    footer_text: '',
    page_orientation: 'portrait',
  },
  leave_letter: {
    show_logo: true,
    show_header: true,
    show_company_info: true,
    show_date: true,
    show_signature: true,
    show_stamp: true,
    show_bank_info: false,
    footer_text: '',
    page_orientation: 'portrait',
  },
  certificate: {
    show_logo: true,
    show_header: true,
    show_company_info: true,
    show_date: true,
    show_signature: true,
    show_stamp: true,
    show_bank_info: false,
    footer_text: '',
    page_orientation: 'landscape',
  },
  general_letter: {
    show_logo: true,
    show_header: true,
    show_company_info: true,
    show_date: true,
    show_signature: true,
    show_stamp: true,
    show_bank_info: false,
    footer_text: '',
    page_orientation: 'portrait',
  },
};

const documentTypeLabels: Record<DocumentType, string> = {
  invoice: 'Invoice',
  passport_letter: 'Surat Paspor',
  leave_letter: 'Surat Cuti',
  certificate: 'Sertifikat',
  general_letter: 'Surat Umum',
};

const documentTypeDescriptions: Record<DocumentType, string> = {
  invoice: 'Faktur pembayaran untuk pelanggan',
  passport_letter: 'Surat pengantar untuk pengurusan paspor',
  leave_letter: 'Surat cuti umroh/haji',
  certificate: 'Sertifikat penyelesaian program',
  general_letter: 'Surat resmi umum',
};

export function DocumentLayoutEditor() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();
  const { company, documentSettings } = useCompanyInfo();
  const [layouts, setLayouts] = useState<Record<DocumentType, DocumentLayout>>(defaultLayouts);
  const [activeDocumentType, setActiveDocumentType] = useState<DocumentType>('invoice');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Load saved layouts from settings
      const savedLayouts = getSetting(`document_layout_${activeDocumentType}`);
      if (savedLayouts) {
        try {
          const parsed = JSON.parse(savedLayouts);
          setLayouts(prev => ({ ...prev, [activeDocumentType]: parsed }));
        } catch (e) {
          // Use default
        }
      }
    }
  }, [isLoading, activeDocumentType, getSetting]);

  const handleToggle = (key: keyof DocumentLayout) => {
    setLayouts(prev => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [key]: !prev[activeDocumentType][key],
      },
    }));
  };

  const handleInputChange = (key: keyof DocumentLayout, value: string) => {
    setLayouts(prev => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = [
        { key: `document_layout_${activeDocumentType}`, value: JSON.stringify(layouts[activeDocumentType]) },
      ];
      await updateMultipleSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat pengaturan layout...
      </div>
    );
  }

  const currentLayout = layouts[activeDocumentType];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Layout Dokumen
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Atur tampilan dan elemen yang muncul di setiap jenis dokumen
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isUpdating}>
          {isSaving || isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          Simpan Layout
        </Button>
      </div>

      {/* Document Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(documentTypeLabels) as DocumentType[]).map((type) => (
          <Card
            key={type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeDocumentType === type
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setActiveDocumentType(type)}
          >
            <CardContent className="p-4 text-center">
              <div className="mb-2">
                {type === 'invoice' && <CreditCard className="h-6 w-6 mx-auto text-primary" />}
                {type === 'passport_letter' && <ShieldPlus className="h-6 w-6 mx-auto text-primary" />}
                {type === 'leave_letter' && <FileCheck className="h-6 w-6 mx-auto text-primary" />}
                {type === 'certificate' && <Award className="h-6 w-6 mx-auto text-primary" />}
                {type === 'general_letter' && <Mail className="h-6 w-6 mx-auto text-primary" />}
              </div>
              <p className="font-medium text-sm">{documentTypeLabels[type]}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {currentLayout?.page_orientation === 'landscape' ? 'Landscape' : 'Portrait'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Layout Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pengaturan {documentTypeLabels[activeDocumentType]}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {documentTypeDescriptions[activeDocumentType]}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Orientation */}
              <div className="space-y-3">
                <Label>Orientasi Halaman</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('page_orientation', 'portrait')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      currentLayout?.page_orientation === 'portrait'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="w-8 h-12 mx-auto border-2 border-current rounded mb-2" />
                    <p className="text-sm font-medium">Portrait</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('page_orientation', 'landscape')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      currentLayout?.page_orientation === 'landscape'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="w-12 h-8 mx-auto border-2 border-current rounded mb-2" />
                    <p className="text-sm font-medium">Landscape</p>
                  </button>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Elemen Dokumen</Label>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <FormToggle
                    label="Tampilkan Logo"
                    description="Logo perusahaan di header dokumen"
                    checked={currentLayout?.show_logo ?? true}
                    onChange={() => handleToggle('show_logo')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Header"
                    description="Header dokumen dengan judul"
                    checked={currentLayout?.show_header ?? true}
                    onChange={() => handleToggle('show_header')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Info Perusahaan"
                    description="Nama, alamat, telepon perusahaan"
                    checked={currentLayout?.show_company_info ?? true}
                    onChange={() => handleToggle('show_company_info')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Tanggal"
                    description="Tanggal pembuatan dokumen"
                    checked={currentLayout?.show_date ?? true}
                    onChange={() => handleToggle('show_date')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Tanda Tangan"
                    description="Area tanda tangan penandatangan"
                    checked={currentLayout?.show_signature ?? true}
                    onChange={() => handleToggle('show_signature')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Cap/Stempel"
                    description="Area cap/stempel resmi"
                    checked={currentLayout?.show_stamp ?? true}
                    onChange={() => handleToggle('show_stamp')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Info Bank"
                    description="Rekening bank untuk pembayaran"
                    checked={currentLayout?.show_bank_info ?? false}
                    onChange={() => handleToggle('show_bank_info')}
                  />
                </div>
              </div>

              {/* Footer Text */}
              <div className="space-y-3 pt-4 border-t">
                <Label htmlFor="footer_text" className="text-base font-semibold">Teks Footer Kustom</Label>
                <Input
                  id="footer_text"
                  value={currentLayout?.footer_text || ''}
                  onChange={(e) => handleInputChange('footer_text', e.target.value)}
                  placeholder="Contoh: 'Terima kasih telah menggunakan jasa kami'"
                  className="max-w-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Teks ini akan muncul di bagian bawah setiap halaman. Kosongkan jika tidak diperlukan.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Document Settings Form (Integrated) */}
          <div className="pt-4">
            <DocumentSettingsForm />
          </div>
        </div>

        <div className="space-y-6">
          {/* Preview */}
          <Card className="bg-muted/30 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentPreview 
                type={activeDocumentType} 
                layout={currentLayout}
                company={company}
                documentSettings={documentSettings}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FormToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface DocumentPreviewProps {
  type: DocumentType;
  layout: DocumentLayout;
  company?: any;
  documentSettings?: any;
}

function DocumentPreview({ type, layout, company, documentSettings }: DocumentPreviewProps) {
  const isLandscape = layout?.page_orientation === 'landscape';
  const aspectRatio = isLandscape ? 'aspect-[1.4/1]' : 'aspect-[0.7/1]';
  
  // Get accent color from settings
  const accentColor = type === 'invoice' 
    ? (documentSettings?.invoice_accent_color || '#16a34a')
    : (documentSettings?.eticket_header_color || '#16a34a');
  
  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 'rgb(22, 163, 74)';
  };
  
  const accentRGB = hexToRgb(accentColor);
  
  return (
    <div className={`w-full border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden ${aspectRatio} bg-white relative shadow-sm flex flex-col`}>
      {/* Header Background with Logo and Company Info */}
      {layout?.show_header && (
        <div 
          className="px-3 py-2 text-white flex items-center gap-2"
          style={{ backgroundColor: accentRGB }}
        >
          {layout?.show_logo && company?.logo && (
            <img 
              src={company.logo} 
              alt="Logo" 
              className="h-6 w-6 object-contain rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {layout?.show_logo && !company?.logo && (
            <div className="h-6 w-6 bg-white/20 rounded flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{company?.name || 'Company Name'}</div>
            {layout?.show_company_info && (
              <div className="text-[10px] opacity-90 truncate">{company?.address || 'Address'}</div>
            )}
          </div>
        </div>
      )}

      {/* Title Bar for Invoice */}
      {type === 'invoice' && (
        <div 
          className="px-3 py-1.5 text-white text-xs font-bold"
          style={{ backgroundColor: accentRGB }}
        >
          INVOICE
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 p-3 space-y-2 overflow-hidden">
        <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: accentRGB, opacity: 0.2 }} />
        <div className="h-1 bg-muted-foreground/10 rounded w-full" />
        <div className="h-1 bg-muted-foreground/10 rounded w-5/6" />
        <div className="h-1 bg-muted-foreground/10 rounded w-4/6" />
        <div className="h-2 bg-muted-foreground/20 rounded w-1/3 mt-2" />
        <div className="h-1 bg-muted-foreground/10 rounded w-full mt-1" />
        <div className="h-1 bg-muted-foreground/10 rounded w-3/4" />
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-muted-foreground/20 flex items-end justify-between text-[8px] text-muted-foreground/60">
        <div className="max-w-[60%] truncate">
          {layout?.footer_text || 'Footer dokumen'}
        </div>
        <div className="flex items-center gap-2">
          {layout?.show_signature && (
            <div className="text-center">
              <div className="w-6 h-3 border-b border-muted-foreground/30" />
              <div className="text-[6px]">Ttd</div>
            </div>
          )}
          {layout?.show_stamp && (
            <div className="w-4 h-4 border border-dashed border-muted-foreground/30 rounded-full" />
          )}
        </div>
      </div>

      {/* Type Label */}
      <div className="absolute top-1 right-1">
        <Badge variant="outline" className="text-[10px]">
          {documentTypeLabels[type]}
        </Badge>
      </div>
    </div>
  );
}
