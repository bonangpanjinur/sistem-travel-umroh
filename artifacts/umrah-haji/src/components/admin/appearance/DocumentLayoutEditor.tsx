import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Eye, LayoutTemplate, Printer, CreditCard, ShieldPlus, Award, Mail, FileCheck, Settings2, AlertTriangle, Save } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { DocumentLayout } from "@/lib/document-generator";

type DocumentType = 'invoice' | 'passport_letter' | 'leave_letter' | 'certificate' | 'general_letter';

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

// GAP 3: Cancellation display settings
interface CancellationDisplaySettings {
  form_transaksi: boolean;
  invoice: boolean;
  proposal: boolean;
  kontrak: boolean;
  sertifikat: boolean;
}

const DEFAULT_CANCELLATION_SETTINGS: CancellationDisplaySettings = {
  form_transaksi: true,
  invoice: false,
  proposal: true,
  kontrak: true,
  sertifikat: false,
};

const CANCELLATION_DOC_LABELS: Record<keyof CancellationDisplaySettings, { label: string; description: string }> = {
  form_transaksi: { label: 'Form Transaksi / Booking', description: 'Dokumen utama saat konfirmasi pemesanan paket' },
  invoice:        { label: 'Invoice Pembayaran',         description: 'Faktur tagihan yang dikirim ke jamaah' },
  proposal:       { label: 'Proposal Penawaran',         description: 'Dokumen penawaran yang dikirim ke calon jamaah' },
  kontrak:        { label: 'Surat Perjanjian / Kontrak', description: 'Kontrak resmi antara agen dan jamaah' },
  sertifikat:     { label: 'Sertifikat Keberangkatan',   description: 'Sertifikat yang diberikan setelah perjalanan' },
};

export function DocumentLayoutEditor() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();
  const { company, documentSettings } = useCompanyInfo();
  const [layouts, setLayouts] = useState<Record<DocumentType, DocumentLayout>>({
    invoice: {},
    passport_letter: {},
    leave_letter: {},
    certificate: {},
    general_letter: {},
  });
  const [activeDocumentType, setActiveDocumentType] = useState<DocumentType>('invoice');
  const [isSaving, setIsSaving] = useState(false);

  // GAP 3: Cancellation display settings state
  const [cancellationSettings, setCancellationSettings] = useState<CancellationDisplaySettings>(DEFAULT_CANCELLATION_SETTINGS);
  const [isSavingCancellation, setIsSavingCancellation] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Load saved layouts from settings
      const types: DocumentType[] = ['invoice', 'passport_letter', 'leave_letter', 'certificate', 'general_letter'];
      const loadedLayouts: any = {};
      
      types.forEach(type => {
        const savedLayouts = getSetting(`document_layout_${type}`);
        if (savedLayouts) {
          try {
            loadedLayouts[type] = typeof savedLayouts === 'string' ? JSON.parse(savedLayouts) : savedLayouts;
          } catch (e) {
            loadedLayouts[type] = {};
          }
        } else {
          loadedLayouts[type] = {};
        }
      });
      
      setLayouts(loadedLayouts);

      // GAP 3: Load cancellation display settings
      const savedCancellation = getSetting('doc_cancellation_display_settings');
      if (savedCancellation) {
        try {
          const parsed = typeof savedCancellation === 'string' ? JSON.parse(savedCancellation) : savedCancellation;
          setCancellationSettings({ ...DEFAULT_CANCELLATION_SETTINGS, ...parsed });
        } catch {}
      }
    }
  }, [isLoading, getSetting]);

  // GAP 3: Save cancellation display settings
  const handleSaveCancellation = async () => {
    setIsSavingCancellation(true);
    try {
      await updateMultipleSettings([
        { key: 'doc_cancellation_display_settings', value: JSON.stringify(cancellationSettings) },
      ]);
    } finally {
      setIsSavingCancellation(false);
    }
  };

  const handleToggle = (key: keyof DocumentLayout) => {
    setLayouts(prev => {
      const currentVal = prev[activeDocumentType][key];
      // If currently undefined, toggle based on global default
      // If already overridden, toggle the override value
      
      if (currentVal === undefined) {
        // Not overridden yet, set override to opposite of global
        const resolvedVal = getResolvedValue(key);
        const newVal = !resolvedVal;
        return {
          ...prev,
          [activeDocumentType]: {
            ...prev[activeDocumentType],
            [key]: newVal,
          },
        };
      } else {
        // Already overridden, toggle the override value
        return {
          ...prev,
          [activeDocumentType]: {
            ...prev[activeDocumentType],
            [key]: !currentVal,
          },
        };
      }
    });
  };

  const handleInputChange = (key: keyof DocumentLayout, value: any) => {
    setLayouts(prev => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [key]: value === "" ? undefined : value,
      },
    }));
  };

  const handleResetOverride = (key: keyof DocumentLayout) => {
    setLayouts(prev => {
      const newLayout = { ...prev[activeDocumentType] };
      delete newLayout[key];
      return {
        ...prev,
        [activeDocumentType]: newLayout
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = [
        { key: `document_layout_${activeDocumentType}`, value: JSON.stringify(layouts[activeDocumentType]) },
      ];
      await updateMultipleSettings(settings);
      // Show success feedback
      console.log(`Layout untuk ${documentTypeLabels[activeDocumentType]} berhasil disimpan`);
    } finally {
      setIsSaving(false);
    }
  };

  // Logic to get resolved value (Specific > Global)
  const getResolvedValue = (key: keyof DocumentLayout): any => {
    const override = layouts[activeDocumentType][key];
    if (override !== undefined) return override;

    // Fallback to global settings from hook
    switch (key) {
      case 'show_logo': return documentSettings.letterhead_show_logo ?? true;
      case 'page_orientation': return 'portrait'; // Default to portrait
      case 'show_header': return true;
      case 'show_company_info': return true;
      case 'show_date': return true;
      case 'show_signature': return true;
      case 'show_stamp': return true;
      case 'show_bank_info': return activeDocumentType === 'invoice';
      case 'footer_text': return '';
      default: return undefined;
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
  const isOverridden = (key: keyof DocumentLayout) => currentLayout[key] !== undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Layout & Override Per Dokumen
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kustomisasi tampilan spesifik untuk setiap jenis dokumen. Pengaturan yang tidak diisi akan menggunakan pengaturan global.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isUpdating} className="gap-2">
          {isSaving || isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings2 className="h-4 w-4" />
          )}
          Simpan {documentTypeLabels[activeDocumentType]}
        </Button>
      </div>

      {/* Document Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(documentTypeLabels) as DocumentType[]).map((type) => {
          const overrideCount = Object.keys(layouts[type]).length;
          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeDocumentType === type
                  ? 'ring-2 ring-primary border-primary bg-primary/5'
                  : 'hover:border-primary/50 hover:shadow-sm'
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
                {overrideCount > 0 ? (
                  <Badge className="mt-1 text-[10px] font-semibold bg-primary/20 text-primary">
                    {overrideCount} Override
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mt-1 text-[10px] opacity-60">
                    Global
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* GAP 3: Cancellation display settings card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Aturan Pembatalan di Dokumen
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pilih dokumen mana saja yang akan menyertakan bagian aturan pembatalan secara otomatis.
              </p>
            </div>
            <Button onClick={handleSaveCancellation} disabled={isSavingCancellation || isUpdating} size="sm" className="gap-2 shrink-0">
              {isSavingCancellation || isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(CANCELLATION_DOC_LABELS) as (keyof CancellationDisplaySettings)[]).map((key) => {
              const { label, description } = CANCELLATION_DOC_LABELS[key];
              const isOn = cancellationSettings[key];
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${isOn ? 'bg-amber-50 border-amber-200' : 'bg-muted/30 border-muted'}`}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate">{label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(v) => setCancellationSettings(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Aturan yang ditampilkan diambil dari kebijakan paket atau aturan global yang aktif.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <Label>Orientasi Halaman</Label>
                  {isOverridden('page_orientation') && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive" onClick={() => handleResetOverride('page_orientation')}>
                      Reset ke Global
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('page_orientation', 'portrait')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      getResolvedValue('page_orientation') === 'portrait'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    } ${isOverridden('page_orientation') ? 'ring-1 ring-primary/30' : 'opacity-80'}`}
                  >
                    <div className="w-8 h-12 mx-auto border-2 border-current rounded mb-2" />
                    <p className="text-sm font-medium">Portrait</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('page_orientation', 'landscape')}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      getResolvedValue('page_orientation') === 'landscape'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    } ${isOverridden('page_orientation') ? 'ring-1 ring-primary/30' : 'opacity-80'}`}
                  >
                    <div className="w-12 h-8 mx-auto border-2 border-current rounded mb-2" />
                    <p className="text-sm font-medium">Landscape</p>
                  </button>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Elemen Dokumen (Override)</Label>
                
                <div className="grid md:grid-cols-1 gap-4">
                  <FormToggle
                    label="Tampilkan Logo"
                    description="Logo perusahaan di header dokumen"
                    checked={getResolvedValue('show_logo')}
                    isOverridden={isOverridden('show_logo')}
                    onChange={() => handleToggle('show_logo')}
                    onReset={() => handleResetOverride('show_logo')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Header"
                    description="Header dokumen dengan judul"
                    checked={getResolvedValue('show_header')}
                    isOverridden={isOverridden('show_header')}
                    onChange={() => handleToggle('show_header')}
                    onReset={() => handleResetOverride('show_header')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Info Perusahaan"
                    description="Nama, alamat, telepon perusahaan"
                    checked={getResolvedValue('show_company_info')}
                    isOverridden={isOverridden('show_company_info')}
                    onChange={() => handleToggle('show_company_info')}
                    onReset={() => handleResetOverride('show_company_info')}
                  />

                  <FormToggle
                    label="Tampilkan Info Bank"
                    description="Rekening bank untuk pembayaran"
                    checked={getResolvedValue('show_bank_info')}
                    isOverridden={isOverridden('show_bank_info')}
                    onChange={() => handleToggle('show_bank_info')}
                    onReset={() => handleResetOverride('show_bank_info')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Tanda Tangan"
                    description="Area tanda tangan penandatangan"
                    checked={getResolvedValue('show_signature')}
                    isOverridden={isOverridden('show_signature')}
                    onChange={() => handleToggle('show_signature')}
                    onReset={() => handleResetOverride('show_signature')}
                  />
                  
                  <FormToggle
                    label="Tampilkan Cap/Stempel"
                    description="Area cap/stempel resmi"
                    checked={getResolvedValue('show_stamp')}
                    isOverridden={isOverridden('show_stamp')}
                    onChange={() => handleToggle('show_stamp')}
                    onReset={() => handleResetOverride('show_stamp')}
                  />
                </div>
              </div>

              {/* Footer Text */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="footer_text" className="text-base font-semibold">Teks Footer Kustom</Label>
                  {isOverridden('footer_text') && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive" onClick={() => handleResetOverride('footer_text')}>
                      Reset ke Global
                    </Button>
                  )}
                </div>
                <Input
                  id="footer_text"
                  value={currentLayout?.footer_text ?? ""}
                  onChange={(e) => handleInputChange('footer_text', e.target.value)}
                  placeholder="Gunakan pengaturan global..."
                  className={`max-w-xl ${isOverridden('footer_text') ? 'border-primary ring-1 ring-primary/20' : 'opacity-70'}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Preview */}
          <Card className="bg-muted/30 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview {documentTypeLabels[activeDocumentType]}
              </CardTitle>
              <p className="text-xs text-muted-foreground">Preview ini menggunakan logika prioritas (Override {'>'} Global)</p>
            </CardHeader>
            <CardContent>
              <DocumentPreview 
                type={activeDocumentType} 
                layout={currentLayout}
                company={company}
                documentSettings={documentSettings}
                getResolvedValue={getResolvedValue}
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
  isOverridden,
  onChange,
  onReset,
}: {
  label: string;
  description: string;
  checked: boolean;
  isOverridden: boolean;
  onChange: () => void;
  onReset: () => void;
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
      isOverridden 
        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' 
        : 'border-muted hover:border-muted-foreground/30 opacity-75 hover:opacity-100'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{label}</p>
          {isOverridden && (
            <Badge className="h-4 px-1.5 text-[8px] uppercase font-semibold bg-primary/20 text-primary hover:bg-primary/30">
              Override
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {isOverridden && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={onReset}
            title="Reset ke pengaturan global"
          >
            ✕ Reset
          </Button>
        )}
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

interface DocumentPreviewProps {
  type: DocumentType;
  layout: DocumentLayout;
  company?: any;
  documentSettings?: any;
  getResolvedValue: (key: keyof DocumentLayout) => any;
}

function DocumentPreview({ type, layout, company, documentSettings, getResolvedValue }: DocumentPreviewProps) {
  const isLandscape = getResolvedValue('page_orientation') === 'landscape';
  const aspectRatio = isLandscape ? 'aspect-[1.4/1]' : 'aspect-[0.7/1]';
  
  // Get accent color from settings (Priority: Specific > Global)
  // Use pdf_global_accent_color if available, fallback to invoice_accent_color
  const accentColor = documentSettings.pdf_global_accent_color || documentSettings.invoice_accent_color || '#16a34a';
  
  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 'rgb(22, 163, 74)';
  };
  
  const accentRGB = hexToRgb(accentColor);
  
  return (
    <div className={`w-full border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden ${aspectRatio} bg-white relative shadow-sm flex flex-col`}>
      {/* Header Background with Logo and Company Info */}
      {getResolvedValue('show_header') && (
        <div 
          className="px-3 py-2 text-white flex items-center gap-2"
          style={{ backgroundColor: accentRGB }}
        >
          {getResolvedValue('show_logo') && company?.logo && (
            <img 
              src={company.logo} 
              alt="Logo" 
              className="h-6 w-6 object-contain rounded flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {getResolvedValue('show_logo') && !company?.logo && (
            <div className="h-6 w-6 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{company?.name || 'Nama Perusahaan'}</div>
            {getResolvedValue('show_company_info') && (
              <div className="text-[10px] opacity-90 truncate">{company?.address || 'Alamat Perusahaan'}</div>
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
          {getResolvedValue('footer_text') ? (
            <span className="font-medium">{getResolvedValue('footer_text')}</span>
          ) : (
            <span className="italic opacity-50">Footer dokumen</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getResolvedValue('show_signature') && (
            <div className="text-center">
              <div className="w-6 h-3 border-b border-muted-foreground/30" />
              <div className="text-[6px] font-medium">Ttd</div>
            </div>
          )}
          {getResolvedValue('show_stamp') && (
            <div className="w-4 h-4 border border-dashed border-muted-foreground/30 rounded-full flex items-center justify-center text-[6px]">✓</div>
          )}
        </div>
      </div>

      {/* Type Label */}
      <div className="absolute top-1 right-1">
        <Badge variant="outline" className="text-[10px] font-semibold">
          {documentTypeLabels[type]}
        </Badge>
      </div>
    </div>
  );
}
