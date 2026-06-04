import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Palette, FileText, Settings2, Eye, AlignLeft, AlignCenter, AlignRight,
  LayoutTemplate, Loader2, Save, RotateCcw, Type, Ruler, Stamp, Image,
  FileCheck, Award, ShieldPlus, Mail, CreditCard, Ticket, Info, CheckCircle2,
  Upload, X, RefreshCw, Globe, ImagePlus, ArrowLeftRight, ClipboardList
} from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type FontFamily = "helvetica" | "times" | "courier";
type LogoPosition = "left" | "center" | "right";
type PageOrientation = "portrait" | "landscape";
type HeaderStyle = "colored" | "plain" | "minimal" | "bordered";

interface GlobalPDFSettings {
  // Font
  pdf_default_font: FontFamily;
  pdf_font_size_header: number;
  pdf_font_size_body: number;
  // Logo
  letterhead_show_logo: boolean;
  pdf_logo_position: LogoPosition;
  pdf_logo_size: "small" | "medium" | "large";
  // Dynamic logo: 'website' = pakai logo website (default), 'custom' = pakai logo khusus dokumen
  doc_logo_source: "website" | "custom";
  doc_custom_logo_url: string;
  // Colors
  pdf_global_accent_color: string;
  pdf_text_color: string;
  pdf_header_bg_color: string;
  pdf_header_text_color: string;
  // Header style
  pdf_header_style: HeaderStyle;
  // Margins (mm)
  pdf_margin_top: number;
  pdf_margin_bottom: number;
  pdf_margin_left: number;
  pdf_margin_right: number;
  // Footer
  document_footer_show_timestamp: boolean;
  document_footer_show_page_number: boolean;
  pdf_global_footer_text: string;
  // Kop Surat
  letterhead_show_website: boolean;
  letterhead_show_tagline: boolean;
  pdf_letterhead_tagline: string;
  // Company city & website
  company_city: string;
  company_website: string;
}

interface DocumentTypeSettings {
  // Colors override
  accent_color?: string;
  header_bg_color?: string;
  header_text_color?: string;
  border_color?: string;
  // Layout override
  page_orientation?: PageOrientation;
  show_logo?: boolean;
  show_header?: boolean;
  show_company_info?: boolean;
  show_bank_info?: boolean;
  show_signature?: boolean;
  show_stamp?: boolean;
  show_qr_code?: boolean;
  // Invoice specific
  number_prefix?: string;
  number_format?: string;
  watermark_paid?: boolean;
  show_package_info?: boolean;
  show_notes?: boolean;
  // Watermark
  watermark_text?: string;
  watermark_opacity?: number;
  // Footer
  footer_text?: string;
}

type DocType = "invoice" | "form" | "eticket" | "certificate" | "passport_letter" | "leave_letter" | "general_letter";

const DOC_TYPES: { key: DocType; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "invoice",        label: "Invoice",        icon: <CreditCard className="h-5 w-5" />,     description: "Faktur pembayaran jamaah" },
  { key: "form",           label: "Form Booking",   icon: <ClipboardList className="h-5 w-5" />,  description: "Form transaksi & booking" },
  { key: "eticket",        label: "E-Tiket",        icon: <Ticket className="h-5 w-5" />,         description: "Tiket elektronik keberangkatan" },
  { key: "certificate",    label: "Sertifikat",     icon: <Award className="h-5 w-5" />,          description: "Sertifikat perjalanan ibadah" },
  { key: "passport_letter",label: "Surat Paspor",   icon: <ShieldPlus className="h-5 w-5" />,     description: "Surat pengantar paspor" },
  { key: "leave_letter",   label: "Surat Cuti",     icon: <FileCheck className="h-5 w-5" />,      description: "Surat izin cuti umroh/haji" },
  { key: "general_letter", label: "Surat Umum",     icon: <Mail className="h-5 w-5" />,           description: "Surat resmi umum" },
];

const DEFAULTS: GlobalPDFSettings = {
  pdf_default_font: "helvetica",
  pdf_font_size_header: 14,
  pdf_font_size_body: 10,
  letterhead_show_logo: true,
  pdf_logo_position: "left",
  pdf_logo_size: "medium",
  doc_logo_source: "website",
  doc_custom_logo_url: "",
  pdf_global_accent_color: "#16a34a",
  pdf_text_color: "#111827",
  pdf_header_bg_color: "#16a34a",
  pdf_header_text_color: "#ffffff",
  pdf_header_style: "colored",
  pdf_margin_top: 15,
  pdf_margin_bottom: 15,
  pdf_margin_left: 15,
  pdf_margin_right: 15,
  document_footer_show_timestamp: true,
  document_footer_show_page_number: true,
  pdf_global_footer_text: "",
  letterhead_show_website: true,
  letterhead_show_tagline: false,
  pdf_letterhead_tagline: "",
  company_city: "",
  company_website: "",
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminPDFLayout() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();
  const { company, documentSettings } = useCompanyInfo();

  const [global, setGlobal] = useState<GlobalPDFSettings>(DEFAULTS);
  const [docSettings, setDocSettings] = useState<Record<DocType, DocumentTypeSettings>>({
    invoice: {}, form: {}, eticket: {}, certificate: {}, passport_letter: {}, leave_letter: {}, general_letter: {}
  });
  const [activeDoc, setActiveDoc] = useState<DocType>("invoice");
  const [isSaving, setIsSaving] = useState(false);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load from settings
  useEffect(() => {
    if (isLoading) return;
    const g: Partial<GlobalPDFSettings> = {};
    (Object.keys(DEFAULTS) as (keyof GlobalPDFSettings)[]).forEach((k) => {
      const raw = getSetting(k);
      if (raw !== undefined && raw !== null && raw !== "") {
        if (typeof DEFAULTS[k] === "boolean") {
          (g as any)[k] = String(raw) !== "false";
        } else if (typeof DEFAULTS[k] === "number") {
          (g as any)[k] = Number(raw) || DEFAULTS[k];
        } else {
          (g as any)[k] = raw;
        }
      }
    });
    setGlobal({ ...DEFAULTS, ...g });

    // Load per-doc settings
    const loaded: Record<DocType, DocumentTypeSettings> = {
      invoice: {}, form: {}, eticket: {}, certificate: {}, passport_letter: {}, leave_letter: {}, general_letter: {}
    };
    DOC_TYPES.forEach(({ key }) => {
      const raw = getSetting(`pdf_doc_settings_${key}`);
      if (raw) {
        try { loaded[key] = typeof raw === "string" ? JSON.parse(raw) : raw; } catch {}
      }
    });

    // Migrate legacy keys
    const legacyInvoice: DocumentTypeSettings = { ...loaded.invoice };
    const invoiceAccent = getSetting("invoice_accent_color");
    if (invoiceAccent && !legacyInvoice.accent_color) legacyInvoice.accent_color = invoiceAccent;
    const invoiceWatermark = getSetting("invoice_watermark_paid");
    if (invoiceWatermark !== undefined && legacyInvoice.watermark_paid === undefined) {
      legacyInvoice.watermark_paid = String(invoiceWatermark) !== "false";
    }
    loaded.invoice = legacyInvoice;

    const legacyCert: DocumentTypeSettings = { ...loaded.certificate };
    const certBorder = getSetting("certificate_border_color");
    if (certBorder && !legacyCert.border_color) legacyCert.border_color = certBorder;
    loaded.certificate = legacyCert;

    const legacyEticket: DocumentTypeSettings = { ...loaded.eticket };
    const eticketColor = getSetting("eticket_header_color");
    if (eticketColor && !legacyEticket.header_bg_color) legacyEticket.header_bg_color = eticketColor;
    loaded.eticket = legacyEticket;

    setDocSettings(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── Save global ──
  const handleSaveGlobal = async () => {
    setIsSaving(true);
    try {
      const pairs = (Object.keys(global) as (keyof GlobalPDFSettings)[]).map((k) => ({
        key: k,
        value: global[k],
      }));
      // Also keep legacy keys in sync for backward compatibility
      pairs.push({ key: "invoice_accent_color", value: global.pdf_global_accent_color } as any);
      pairs.push({ key: "eticket_header_color", value: global.pdf_global_accent_color } as any);
      pairs.push({ key: "pdf_default_font", value: global.pdf_default_font } as any);
      // Save dynamic logo settings
      pairs.push({ key: "doc_logo_source", value: global.doc_logo_source } as any);
      pairs.push({ key: "doc_custom_logo_url", value: global.doc_custom_logo_url } as any);
      await updateMultipleSettings(pairs);
      setSavedKeys((p) => [...new Set([...p, "global"])]);
      toast.success("Pengaturan global PDF berhasil disimpan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Upload custom document logo ──
  const handleUploadDocumentLogo = async (file: File) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `doc-logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("website-assets")
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("website-assets").getPublicUrl(fileName);
      setGlobal((p) => ({ ...p, doc_custom_logo_url: publicUrl, doc_logo_source: "custom" }));
      // Immediately persist the logo URL
      await updateMultipleSettings([
        { key: "doc_custom_logo_url", value: publicUrl },
        { key: "doc_logo_source", value: "custom" },
      ]);
      toast.success("Logo dokumen berhasil diupload dan diaktifkan");
    } catch (err: any) {
      toast.error(`Gagal upload logo: ${err.message}`);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // ── Save per-doc ──
  const handleSaveDoc = async (docKey: DocType) => {
    setIsSaving(true);
    try {
      const pairs: { key: string; value: any }[] = [
        { key: `pdf_doc_settings_${docKey}`, value: JSON.stringify(docSettings[docKey]) },
      ];
      // Sync legacy keys
      if (docKey === "invoice") {
        if (docSettings.invoice.accent_color) pairs.push({ key: "invoice_accent_color", value: docSettings.invoice.accent_color });
        if (docSettings.invoice.watermark_paid !== undefined) pairs.push({ key: "invoice_watermark_paid", value: docSettings.invoice.watermark_paid });
        if (docSettings.invoice.number_prefix) pairs.push({ key: "invoice_number_prefix", value: docSettings.invoice.number_prefix });
        if (docSettings.invoice.show_bank_info !== undefined) pairs.push({ key: "invoice_show_bank_info", value: docSettings.invoice.show_bank_info });
      }
      if (docKey === "eticket" && docSettings.eticket.header_bg_color) {
        pairs.push({ key: "eticket_header_color", value: docSettings.eticket.header_bg_color });
      }
      if (docKey === "certificate" && docSettings.certificate.border_color) {
        pairs.push({ key: "certificate_border_color", value: docSettings.certificate.border_color });
      }
      await updateMultipleSettings(pairs);
      setSavedKeys((p) => [...new Set([...p, docKey])]);
      toast.success(`Layout ${DOC_TYPES.find((d) => d.key === docKey)?.label} berhasil disimpan`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Helpers ──
  const setG = <K extends keyof GlobalPDFSettings>(k: K, v: GlobalPDFSettings[K]) =>
    setGlobal((p) => ({ ...p, [k]: v }));

  const setD = <K extends keyof DocumentTypeSettings>(docKey: DocType, k: K, v: DocumentTypeSettings[K] | undefined) =>
    setDocSettings((p) => {
      if (v === undefined) {
        const copy = { ...p[docKey] };
        delete copy[k];
        return { ...p, [docKey]: copy };
      }
      return { ...p, [docKey]: { ...p[docKey], [k]: v } };
    });

  const resolveD = <K extends keyof DocumentTypeSettings>(docKey: DocType, k: K): DocumentTypeSettings[K] | undefined =>
    docSettings[docKey][k];

  const isOverridden = (docKey: DocType, k: keyof DocumentTypeSettings) =>
    docSettings[docKey][k] !== undefined;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memuat pengaturan layout PDF...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Layout & Desain Dokumen PDF
        </h1>
        <p className="text-muted-foreground mt-1">
          Atur logo, warna, font, margin, dan tampilan untuk semua dokumen PDF yang digenerate sistem.
        </p>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="h-auto flex flex-wrap gap-1 p-1">
          <TabsTrigger value="global" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="per-dokumen" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Per Dokumen
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1 — GLOBAL
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="global" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Logo & Kop Surat */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="h-4 w-4" /> Logo & Kop Surat
                  </CardTitle>
                  <CardDescription>Pengaturan tampilan logo perusahaan di semua dokumen PDF</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ToggleRow
                    label="Tampilkan Logo"
                    description="Logo perusahaan di header dokumen"
                    checked={global.letterhead_show_logo}
                    onChange={(v) => setG("letterhead_show_logo", v)}
                  />

                  {global.letterhead_show_logo && (
                    <>
                      <div className="space-y-2">
                        <Label>Posisi Logo</Label>
                        <div className="flex gap-3">
                          {([
                            { val: "left",   icon: <AlignLeft className="h-4 w-4" />,   label: "Kiri" },
                            { val: "center", icon: <AlignCenter className="h-4 w-4" />, label: "Tengah" },
                            { val: "right",  icon: <AlignRight className="h-4 w-4" />,  label: "Kanan" },
                          ] as const).map(({ val, icon, label }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setG("pdf_logo_position", val)}
                              className={`flex-1 flex flex-col items-center gap-1 p-3 border-2 rounded-lg transition-all text-sm font-medium ${
                                global.pdf_logo_position === val
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-muted hover:border-primary/40"
                              }`}
                            >
                              {icon}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Ukuran Logo</Label>
                        <div className="flex gap-3">
                          {(["small", "medium", "large"] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setG("pdf_logo_size", sz)}
                              className={`flex-1 py-2 border-2 rounded-lg text-sm font-medium transition-all capitalize ${
                                global.pdf_logo_size === sz
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-muted hover:border-primary/40"
                              }`}
                            >
                              {sz === "small" ? "Kecil" : sz === "medium" ? "Sedang" : "Besar"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  <ToggleRow
                    label="Tampilkan Website di Kop Surat"
                    description="URL website perusahaan di bawah nama"
                    checked={global.letterhead_show_website}
                    onChange={(v) => setG("letterhead_show_website", v)}
                  />

                  <ToggleRow
                    label="Tampilkan Tagline"
                    description="Slogan perusahaan di kop surat"
                    checked={global.letterhead_show_tagline}
                    onChange={(v) => setG("letterhead_show_tagline", v)}
                  />

                  {global.letterhead_show_tagline && (
                    <div className="space-y-2">
                      <Label>Teks Tagline</Label>
                      <Input
                        value={global.pdf_letterhead_tagline}
                        onChange={(e) => setG("pdf_letterhead_tagline", e.target.value)}
                        placeholder="Contoh: Melayani Ibadah dengan Amanah"
                        maxLength={80}
                      />
                    </div>
                  )}

                  <Separator />

                  {/* ── Dynamic Logo Source ── */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <ImagePlus className="h-4 w-4" />
                        Sumber Logo Dokumen
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Pilih logo yang dipakai untuk semua dokumen PDF. Default: logo dari website.
                    </p>

                    {/* Source selector */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGlobal((p) => ({ ...p, doc_logo_source: "website" }))}
                        className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${
                          global.doc_logo_source === "website"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-muted hover:border-primary/40"
                        }`}
                      >
                        <Globe className={`h-6 w-6 ${global.doc_logo_source === "website" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-center">
                          <p className="text-sm font-semibold">Logo Website</p>
                          <p className="text-xs text-muted-foreground">Default, dari halaman publik</p>
                        </div>
                        {global.doc_logo_source === "website" && (
                          <Badge className="text-[9px] bg-primary/20 text-primary border-0">Aktif</Badge>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (global.doc_custom_logo_url) {
                            setGlobal((p) => ({ ...p, doc_logo_source: "custom" }));
                          } else {
                            logoInputRef.current?.click();
                          }
                        }}
                        className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${
                          global.doc_logo_source === "custom"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-muted hover:border-primary/40"
                        }`}
                      >
                        <ImagePlus className={`h-6 w-6 ${global.doc_logo_source === "custom" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-center">
                          <p className="text-sm font-semibold">Logo Kustom</p>
                          <p className="text-xs text-muted-foreground">Upload logo khusus dokumen</p>
                        </div>
                        {global.doc_logo_source === "custom" && (
                          <Badge className="text-[9px] bg-primary/20 text-primary border-0">Aktif</Badge>
                        )}
                      </button>
                    </div>

                    {/* Current logo source display */}
                    <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ArrowLeftRight className="h-4 w-4" />
                        Komparasi Logo
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Website logo */}
                        <div className={`rounded-lg border-2 p-3 text-center space-y-2 transition-all ${
                          global.doc_logo_source === "website" ? "border-primary bg-white" : "border-muted bg-white/60 opacity-70"
                        }`}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                            <Globe className="h-3 w-3" /> Logo Website
                            {global.doc_logo_source === "website" && <Badge className="ml-1 text-[8px] bg-green-100 text-green-700 border-0">Dipakai</Badge>}
                          </p>
                          <div className="h-16 flex items-center justify-center bg-muted/30 rounded">
                            {company?.logo ? (
                              <img src={company.logo} alt="Website logo" className="h-12 max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="text-xs text-muted-foreground text-center">
                                <FileText className="h-6 w-6 mx-auto mb-1 opacity-30" />
                                Belum ada logo website
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Custom logo */}
                        <div className={`rounded-lg border-2 p-3 text-center space-y-2 transition-all ${
                          global.doc_logo_source === "custom" ? "border-primary bg-white" : "border-muted bg-white/60 opacity-70"
                        }`}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                            <ImagePlus className="h-3 w-3" /> Logo Kustom
                            {global.doc_logo_source === "custom" && <Badge className="ml-1 text-[8px] bg-green-100 text-green-700 border-0">Dipakai</Badge>}
                          </p>
                          <div className="h-16 flex items-center justify-center bg-muted/30 rounded">
                            {global.doc_custom_logo_url ? (
                              <img src={global.doc_custom_logo_url} alt="Custom doc logo" className="h-12 max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="text-xs text-muted-foreground text-center">
                                <ImagePlus className="h-6 w-6 mx-auto mb-1 opacity-30" />
                                Belum diupload
                              </div>
                            )}
                          </div>
                          {global.doc_custom_logo_url && (
                            <button
                              type="button"
                              onClick={() => setGlobal((p) => ({ ...p, doc_custom_logo_url: "", doc_logo_source: "website" }))}
                              className="text-[10px] text-destructive hover:underline flex items-center gap-1 mx-auto"
                            >
                              <X className="h-3 w-3" /> Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upload button */}
                    <div className="flex gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocumentLogo(file);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="gap-2 flex-1"
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {global.doc_custom_logo_url ? "Ganti Logo Kustom" : "Upload Logo Kustom"}
                      </Button>
                      {global.doc_logo_source === "custom" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setGlobal((p) => ({ ...p, doc_logo_source: "website" }))}
                          className="gap-2 text-muted-foreground"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Pakai Website
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG/JPG. Logo yang diupload hanya dipakai di dokumen PDF, tidak mengubah logo website.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Header Style & Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Warna & Gaya Header
                  </CardTitle>
                  <CardDescription>Warna aksen dan gaya header yang berlaku untuk semua dokumen (bisa di-override per dokumen)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Header Style */}
                  <div className="space-y-2">
                    <Label>Gaya Header Dokumen</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {([
                        { val: "colored",  label: "Berwarna",  desc: "Header dengan warna penuh" },
                        { val: "plain",    label: "Polos",     desc: "Tanpa latar belakang" },
                        { val: "minimal",  label: "Minimal",   desc: "Garis bawah tipis" },
                        { val: "bordered", label: "Berbingkai",desc: "Dengan border kiri tebal" },
                      ] as const).map(({ val, label, desc }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setG("pdf_header_style", val)}
                          className={`p-3 border-2 rounded-lg text-left transition-all ${
                            global.pdf_header_style === val
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/40"
                          }`}
                        >
                          <HeaderStyleIcon style={val} color={global.pdf_global_accent_color} />
                          <p className="font-medium text-sm mt-2">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Colors grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ColorField
                      label="Warna Aksen Global"
                      description="Digunakan di header, garis, dan elemen kunci"
                      value={global.pdf_global_accent_color}
                      onChange={(v) => setG("pdf_global_accent_color", v)}
                    />
                    <ColorField
                      label="Warna Teks Utama"
                      description="Warna teks isi dokumen"
                      value={global.pdf_text_color}
                      onChange={(v) => setG("pdf_text_color", v)}
                    />
                    {global.pdf_header_style === "colored" && (
                      <>
                        <ColorField
                          label="Warna Latar Header"
                          description="Background header dokumen"
                          value={global.pdf_header_bg_color}
                          onChange={(v) => setG("pdf_header_bg_color", v)}
                        />
                        <ColorField
                          label="Warna Teks Header"
                          description="Teks di atas background header"
                          value={global.pdf_header_text_color}
                          onChange={(v) => setG("pdf_header_text_color", v)}
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Font & Ukuran */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Type className="h-4 w-4" /> Font & Ukuran Teks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Font Default PDF</Label>
                    <Select value={global.pdf_default_font} onValueChange={(v) => setG("pdf_default_font", v as FontFamily)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">
                          <span className="font-sans">Helvetica — Modern & Bersih</span>
                        </SelectItem>
                        <SelectItem value="times">
                          <span className="font-serif">Times New Roman — Formal & Elegan</span>
                        </SelectItem>
                        <SelectItem value="courier">
                          <span className="font-mono">Courier — Monospace (Teknis)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Berlaku untuk semua dokumen. Bisa di-override per jenis dokumen.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ukuran Teks Judul (pt)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min={10}
                          max={24}
                          value={global.pdf_font_size_header}
                          onChange={(e) => setG("pdf_font_size_header", Number(e.target.value))}
                          className="w-20"
                        />
                        <div className="text-sm text-muted-foreground">
                          Default: 14pt
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ukuran Teks Isi (pt)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min={7}
                          max={14}
                          value={global.pdf_font_size_body}
                          onChange={(e) => setG("pdf_font_size_body", Number(e.target.value))}
                          className="w-20"
                        />
                        <div className="text-sm text-muted-foreground">
                          Default: 10pt
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Margin */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ruler className="h-4 w-4" /> Margin Halaman (mm)
                  </CardTitle>
                  <CardDescription>Jarak konten dari tepi kertas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {([
                      { key: "pdf_margin_top",    label: "Atas" },
                      { key: "pdf_margin_bottom", label: "Bawah" },
                      { key: "pdf_margin_left",   label: "Kiri" },
                      { key: "pdf_margin_right",  label: "Kanan" },
                    ] as const).map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min={5}
                          max={40}
                          value={global[key]}
                          onChange={(e) => setG(key, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Footer */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlignLeft className="h-4 w-4" /> Footer Dokumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <ToggleRow
                      label="Tampilkan Nomor Halaman"
                      description="Mis: Halaman 1 dari 2"
                      checked={global.document_footer_show_page_number}
                      onChange={(v) => setG("document_footer_show_page_number", v)}
                    />
                    <ToggleRow
                      label="Tampilkan Waktu Cetak"
                      description="Tanggal & jam dokumen dibuat"
                      checked={global.document_footer_show_timestamp}
                      onChange={(v) => setG("document_footer_show_timestamp", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teks Footer Global</Label>
                    <Input
                      value={global.pdf_global_footer_text}
                      onChange={(e) => setG("pdf_global_footer_text", e.target.value)}
                      placeholder="Contoh: Dokumen ini sah tanpa tanda tangan basah"
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">Muncul di bagian bawah semua dokumen. Kosongkan jika tidak perlu.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column — Live preview global */}
            <div className="space-y-4">
              <div className="sticky top-6 space-y-4">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Preview Global
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GlobalPreview settings={global} company={company} />
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSaveGlobal}
                  disabled={isSaving || isUpdating}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSaving || isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedKeys.includes("global") ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Pengaturan Global
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  Perubahan global berlaku ke semua dokumen PDF yang belum di-override
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 2 — PER DOKUMEN
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="per-dokumen" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {DOC_TYPES.map(({ key, label, icon }) => {
              const overrideCount = Object.keys(docSettings[key]).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDoc(key)}
                  className={`p-4 border-2 rounded-xl text-center transition-all hover:shadow-md ${
                    activeDoc === key
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-muted hover:border-primary/40"
                  }`}
                >
                  <div className={`flex justify-center mb-2 ${activeDoc === key ? "text-primary" : "text-muted-foreground"}`}>
                    {icon}
                  </div>
                  <p className="text-xs font-semibold">{label}</p>
                  {overrideCount > 0 ? (
                    <Badge className="mt-1 text-[9px] bg-primary/20 text-primary border-0">
                      {overrideCount} override
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1 text-[9px] opacity-50">Global</Badge>
                  )}
                  {savedKeys.includes(key) && (
                    <CheckCircle2 className="h-3 w-3 mx-auto mt-1 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Override Per Dokumen:</strong> Pengaturan di sini menggantikan global hanya untuk dokumen{" "}
                  <strong>{DOC_TYPES.find((d) => d.key === activeDoc)?.label}</strong>.
                  Klik "Reset ke Global" untuk kembali menggunakan nilai default.
                </div>
              </div>

              {/* Orientation */}
              <DocCard title="Orientasi Halaman">
                <OverrideHeader
                  label="Orientasi"
                  isOverridden={isOverridden(activeDoc, "page_orientation")}
                  onReset={() => setD(activeDoc, "page_orientation", undefined)}
                />
                <div className="flex gap-3 mt-2">
                  {([
                    { val: "portrait",  w: "w-8 h-12", label: "Portrait" },
                    { val: "landscape", w: "w-12 h-8", label: "Landscape" },
                  ] as const).map(({ val, w, label }) => {
                    const current = resolveD(activeDoc, "page_orientation") ?? "portrait";
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setD(activeDoc, "page_orientation", val)}
                        className={`flex-1 p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                          current === val ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"
                        }`}
                      >
                        <div className={`${w} border-2 border-current rounded`} />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </DocCard>

              {/* Elemen tampilan */}
              <DocCard title="Elemen Tampilan">
                <div className="space-y-3">
                  {([
                    { k: "show_logo",         label: "Tampilkan Logo",             desc: "Logo perusahaan di header" },
                    { k: "show_header",       label: "Tampilkan Header",           desc: "Bagian header dokumen" },
                    { k: "show_company_info", label: "Tampilkan Info Perusahaan",  desc: "Nama, alamat, telepon" },
                    { k: "show_bank_info",    label: "Tampilkan Info Rekening",    desc: "Rekening bank pembayaran" },
                    { k: "show_signature",    label: "Tampilkan Tanda Tangan",     desc: "Area tanda tangan" },
                    { k: "show_stamp",        label: "Tampilkan Cap/Stempel",      desc: "Area cap resmi perusahaan" },
                    { k: "show_qr_code",      label: "Tampilkan QR Code",          desc: "QR verifikasi dokumen" },
                  ] as { k: keyof DocumentTypeSettings; label: string; desc: string }[]).map(({ k, label, desc }) => {
                    const override = resolveD(activeDoc, k) as boolean | undefined;
                    const hasOverride = isOverridden(activeDoc, k);
                    return (
                      <div
                        key={k}
                        className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                          hasOverride
                            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{label}</p>
                            {hasOverride && (
                              <Badge className="h-4 px-1.5 text-[9px] bg-primary/20 text-primary border-0">
                                Override
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                              onClick={() => setD(activeDoc, k, undefined)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reset
                            </Button>
                          )}
                          <Switch
                            checked={override ?? true}
                            onCheckedChange={(v) => setD(activeDoc, k, v)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DocCard>

              {/* Warna Dokumen */}
              <DocCard title="Warna (Override)">
                <div className="grid sm:grid-cols-2 gap-4">
                  <OverridableColor
                    label="Warna Aksen"
                    description="Warna utama elemen dokumen ini"
                    value={resolveD(activeDoc, "accent_color") as string}
                    globalValue={global.pdf_global_accent_color}
                    isOverridden={isOverridden(activeDoc, "accent_color")}
                    onChange={(v) => setD(activeDoc, "accent_color", v)}
                    onReset={() => setD(activeDoc, "accent_color", undefined)}
                  />
                  <OverridableColor
                    label="Warna Latar Header"
                    description="Background header dokumen"
                    value={resolveD(activeDoc, "header_bg_color") as string}
                    globalValue={global.pdf_header_bg_color}
                    isOverridden={isOverridden(activeDoc, "header_bg_color")}
                    onChange={(v) => setD(activeDoc, "header_bg_color", v)}
                    onReset={() => setD(activeDoc, "header_bg_color", undefined)}
                  />
                  <OverridableColor
                    label="Warna Teks Header"
                    description="Warna teks di area header"
                    value={resolveD(activeDoc, "header_text_color") as string}
                    globalValue={global.pdf_header_text_color}
                    isOverridden={isOverridden(activeDoc, "header_text_color")}
                    onChange={(v) => setD(activeDoc, "header_text_color", v)}
                    onReset={() => setD(activeDoc, "header_text_color", undefined)}
                  />
                  {(activeDoc === "certificate") && (
                    <OverridableColor
                      label="Warna Border/Bingkai"
                      description="Border dekoratif sertifikat"
                      value={resolveD(activeDoc, "border_color") as string}
                      globalValue={global.pdf_global_accent_color}
                      isOverridden={isOverridden(activeDoc, "border_color")}
                      onChange={(v) => setD(activeDoc, "border_color", v)}
                      onReset={() => setD(activeDoc, "border_color", undefined)}
                    />
                  )}
                </div>
              </DocCard>

              {/* Invoice specific */}
              {activeDoc === "invoice" && (
                <DocCard title="Pengaturan Khusus Invoice">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prefix Nomor Invoice</Label>
                        <Input
                          value={(resolveD("invoice", "number_prefix") as string) ?? "INV"}
                          onChange={(e) => setD("invoice", "number_prefix", e.target.value)}
                          placeholder="INV"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Format Nomor</Label>
                        <Input
                          value={(resolveD("invoice", "number_format") as string) ?? "YYYY-MM-{SEQ}"}
                          onChange={(e) => setD("invoice", "number_format", e.target.value)}
                          placeholder="YYYY-MM-{SEQ}"
                        />
                        <p className="text-xs text-muted-foreground">YYYY=tahun, MM=bulan, {"{SEQ}"}=urut</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <ToggleRow
                        label="Watermark LUNAS"
                        description='Stempel "LUNAS" diagonal pada invoice yang sudah dibayar penuh'
                        checked={(resolveD("invoice", "watermark_paid") as boolean) ?? true}
                        onChange={(v) => setD("invoice", "watermark_paid", v)}
                      />
                      <ToggleRow
                        label="Tampilkan Info Paket"
                        description="Detail paket & tanggal keberangkatan"
                        checked={(resolveD("invoice", "show_package_info") as boolean) ?? true}
                        onChange={(v) => setD("invoice", "show_package_info", v)}
                      />
                      <ToggleRow
                        label="Tampilkan Kolom Catatan"
                        description="Area catatan untuk keterangan tambahan"
                        checked={(resolveD("invoice", "show_notes") as boolean) ?? true}
                        onChange={(v) => setD("invoice", "show_notes", v)}
                      />
                    </div>
                  </div>
                </DocCard>
              )}

              {/* Watermark custom */}
              <DocCard title="Watermark Kustom">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Teks Watermark</Label>
                    <Input
                      value={(resolveD(activeDoc, "watermark_text") as string) ?? ""}
                      onChange={(e) => setD(activeDoc, "watermark_text", e.target.value || undefined)}
                      placeholder="Mis: DRAFT, RAHASIA, SAMPLE..."
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground">Teks diagonal di tengah halaman. Kosongkan = tidak ada watermark.</p>
                  </div>
                  {resolveD(activeDoc, "watermark_text") && (
                    <div className="space-y-2">
                      <Label>Opacity Watermark: {(resolveD(activeDoc, "watermark_opacity") as number) ?? 15}%</Label>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        value={(resolveD(activeDoc, "watermark_opacity") as number) ?? 15}
                        onChange={(e) => setD(activeDoc, "watermark_opacity", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </DocCard>

              {/* Footer kustom */}
              <DocCard title="Footer Kustom">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Teks Footer</Label>
                    {isOverridden(activeDoc, "footer_text") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-destructive"
                        onClick={() => setD(activeDoc, "footer_text", undefined)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset ke Global
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={(resolveD(activeDoc, "footer_text") as string) ?? ""}
                    onChange={(e) => setD(activeDoc, "footer_text", e.target.value || undefined)}
                    placeholder={global.pdf_global_footer_text || "Gunakan footer global..."}
                    rows={2}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">Jika diisi, menggantikan teks footer global hanya untuk dokumen ini.</p>
                </div>
              </DocCard>
            </div>

            {/* Right — preview per-doc */}
            <div className="space-y-4">
              <div className="sticky top-6 space-y-4">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview {DOC_TYPES.find((d) => d.key === activeDoc)?.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocPreview
                      docType={activeDoc}
                      docSettings={docSettings[activeDoc]}
                      globalSettings={global}
                      company={company}
                    />
                  </CardContent>
                </Card>
                <Button
                  onClick={() => handleSaveDoc(activeDoc)}
                  disabled={isSaving || isUpdating}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSaving || isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan {DOC_TYPES.find((d) => d.key === activeDoc)?.label}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════
            TAB 3 — PREVIEW
        ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="preview">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview visual seluruh dokumen berdasarkan pengaturan yang tersimpan. Ini hanya representasi visual, bukan PDF aktual.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {DOC_TYPES.map(({ key, label, icon }) => (
                <div key={key} className="space-y-2">
                  <DocPreview
                    docType={key}
                    docSettings={docSettings[key]}
                    globalSettings={global}
                    company={company}
                  />
                  <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground">
                    {icon}
                    {label}
                  </div>
                  {Object.keys(docSettings[key]).length > 0 && (
                    <div className="text-center">
                      <Badge className="text-[9px] bg-primary/20 text-primary border-0">
                        {Object.keys(docSettings[key]).length} override
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Ringkasan Pengaturan Aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <SettingSummaryRow label="Font" value={global.pdf_default_font === "helvetica" ? "Helvetica" : global.pdf_default_font === "times" ? "Times New Roman" : "Courier"} />
                  <SettingSummaryRow label="Warna Aksen" value={
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-full border" style={{ backgroundColor: global.pdf_global_accent_color }} />
                      {global.pdf_global_accent_color}
                    </span>
                  } />
                  <SettingSummaryRow label="Logo" value={global.letterhead_show_logo ? `Tampil (${global.pdf_logo_position})` : "Tersembunyi"} />
                  <SettingSummaryRow label="Gaya Header" value={global.pdf_header_style} />
                  <SettingSummaryRow label="Margin" value={`${global.pdf_margin_top}mm / ${global.pdf_margin_bottom}mm / ${global.pdf_margin_left}mm / ${global.pdf_margin_right}mm`} />
                  <SettingSummaryRow label="Footer Timestamp" value={global.document_footer_show_timestamp ? "Aktif" : "Nonaktif"} />
                  <SettingSummaryRow label="Nomor Halaman" value={global.document_footer_show_page_number ? "Aktif" : "Nonaktif"} />
                  <SettingSummaryRow label="Ukuran Teks Judul" value={`${global.pdf_font_size_header}pt`} />
                  <SettingSummaryRow label="Ukuran Teks Isi" value={`${global.pdf_font_size_body}pt`} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DocCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorField({ label, description, value, onChange }: {
  label: string; description?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <input
          type="color"
          value={value || "#16a34a"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border cursor-pointer p-0.5"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function OverrideHeader({ label, isOverridden, onReset }: {
  label: string; isOverridden: boolean; onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {isOverridden && (
          <Badge className="h-4 px-1.5 text-[9px] bg-primary/20 text-primary border-0">Override</Badge>
        )}
      </div>
      {isOverridden && (
        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive" onClick={onReset}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset ke Global
        </Button>
      )}
    </div>
  );
}

function OverridableColor({ label, description, value, globalValue, isOverridden, onChange, onReset }: {
  label: string; description?: string; value?: string; globalValue: string;
  isOverridden: boolean; onChange: (v: string) => void; onReset: () => void;
}) {
  const display = value ?? globalValue;
  return (
    <div className={`space-y-2 p-3 rounded-lg border transition-all ${isOverridden ? "border-primary/40 bg-primary/5" : "border-muted"}`}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">{label}</Label>
          {isOverridden && <Badge className="ml-2 h-4 px-1.5 text-[9px] bg-primary/20 text-primary border-0">Override</Badge>}
        </div>
        {isOverridden && (
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-destructive" onClick={onReset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <input
          type="color"
          value={display || "#16a34a"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          type="text"
          value={display}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs"
          maxLength={7}
        />
      </div>
      {!isOverridden && (
        <p className="text-[10px] text-muted-foreground">Menggunakan nilai global: {globalValue}</p>
      )}
    </div>
  );
}

function SettingSummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs w-36 shrink-0">{label}</span>
      <span className="font-medium text-xs">{value}</span>
    </div>
  );
}

// ─── Header Style Icon Preview ─────────────────────────────────────────────────
function HeaderStyleIcon({ style, color }: { style: string; color: string }) {
  const c = color || "#16a34a";
  if (style === "colored") {
    return (
      <div className="w-full h-6 rounded" style={{ backgroundColor: c }} />
    );
  }
  if (style === "plain") {
    return (
      <div className="w-full h-6 rounded border-2 border-gray-200 flex items-center px-1">
        <div className="h-2 w-2/3 bg-gray-300 rounded" />
      </div>
    );
  }
  if (style === "minimal") {
    return (
      <div className="w-full h-6 rounded border-b-2 flex items-center px-1" style={{ borderColor: c }}>
        <div className="h-2 w-2/3 bg-gray-300 rounded" />
      </div>
    );
  }
  // bordered
  return (
    <div className="w-full h-6 rounded border-l-4 border border-gray-200 flex items-center px-2" style={{ borderLeftColor: c }}>
      <div className="h-2 w-2/3 bg-gray-300 rounded" />
    </div>
  );
}

// ─── Global Preview ────────────────────────────────────────────────────────────
function GlobalPreview({ settings, company }: { settings: GlobalPDFSettings; company?: any }) {
  const accent = settings.pdf_global_accent_color || "#16a34a";
  const headerBg = settings.pdf_header_bg_color || accent;
  const headerText = settings.pdf_header_text_color || "#ffffff";

  return (
    <div className="w-full aspect-[0.7/1] border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
      {/* Header */}
      {settings.pdf_header_style === "colored" && (
        <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: headerBg }}>
          {settings.letterhead_show_logo && (
            <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center flex-shrink-0">
              {company?.logo
                ? <img src={company.logo} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <FileText className="h-3 w-3 text-white/80" />
              }
            </div>
          )}
          <div style={{ color: headerText }}>
            <div className="text-[10px] font-bold truncate">{company?.name || "Nama Perusahaan"}</div>
            <div className="text-[8px] opacity-80 truncate">{company?.address || "Alamat Perusahaan"}</div>
            {settings.letterhead_show_tagline && settings.pdf_letterhead_tagline && (
              <div className="text-[7px] opacity-70 italic">{settings.pdf_letterhead_tagline}</div>
            )}
          </div>
        </div>
      )}
      {settings.pdf_header_style === "plain" && (
        <div className="px-3 py-2 flex items-center gap-2 border-b">
          {settings.letterhead_show_logo && (
            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
              {company?.logo
                ? <img src={company.logo} alt="" className="w-5 h-5 object-contain" />
                : <FileText className="h-3 w-3 text-muted-foreground" />
              }
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold">{company?.name || "Nama Perusahaan"}</div>
            <div className="text-[8px] text-muted-foreground">{company?.address || "Alamat Perusahaan"}</div>
          </div>
        </div>
      )}
      {settings.pdf_header_style === "minimal" && (
        <div className="px-3 py-2 flex items-center gap-2 border-b-2" style={{ borderColor: accent }}>
          <div>
            <div className="text-[10px] font-bold" style={{ color: accent }}>{company?.name || "Nama Perusahaan"}</div>
            <div className="text-[8px] text-muted-foreground">{company?.address || "Alamat"}</div>
          </div>
        </div>
      )}
      {settings.pdf_header_style === "bordered" && (
        <div className="px-3 py-2 flex items-center gap-2 border-l-4" style={{ borderColor: accent }}>
          <div>
            <div className="text-[10px] font-bold">{company?.name || "Nama Perusahaan"}</div>
            <div className="text-[8px] text-muted-foreground">{company?.address || "Alamat"}</div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3 space-y-1.5">
        <div className="h-2 rounded" style={{ backgroundColor: accent, opacity: 0.15, width: "60%" }} />
        <div className="h-1.5 bg-muted-foreground/10 rounded w-full" />
        <div className="h-1.5 bg-muted-foreground/10 rounded w-5/6" />
        <div className="h-1.5 bg-muted-foreground/10 rounded w-4/6" />
        <div className="mt-2 grid grid-cols-2 gap-1">
          <div className="h-6 bg-muted-foreground/5 rounded border" />
          <div className="h-6 bg-muted-foreground/5 rounded border" />
        </div>
        <div className="h-1.5 bg-muted-foreground/10 rounded w-full mt-2" />
        <div className="h-1.5 bg-muted-foreground/10 rounded w-3/4" />
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t flex items-center justify-between text-[7px] text-muted-foreground/50">
        <span className="truncate max-w-[60%]">{settings.pdf_global_footer_text || "Footer dokumen"}</span>
        <div className="flex gap-2">
          {settings.document_footer_show_timestamp && <span>Tgl.</span>}
          {settings.document_footer_show_page_number && <span>Hal. 1/1</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Per-Doc Preview ───────────────────────────────────────────────────────────
function DocPreview({ docType, docSettings, globalSettings, company }: {
  docType: DocType;
  docSettings: DocumentTypeSettings;
  globalSettings: GlobalPDFSettings;
  company?: any;
}) {
  const accentColor = docSettings.accent_color ?? globalSettings.pdf_global_accent_color ?? "#16a34a";
  const headerBg = docSettings.header_bg_color ?? globalSettings.pdf_header_bg_color ?? accentColor;
  const headerText = docSettings.header_text_color ?? globalSettings.pdf_header_text_color ?? "#ffffff";
  const isLandscape = (docSettings.page_orientation ?? "portrait") === "landscape";
  const showLogo = docSettings.show_logo ?? globalSettings.letterhead_show_logo ?? true;
  const showHeader = docSettings.show_header ?? true;
  const showSignature = docSettings.show_signature ?? true;
  const showStamp = docSettings.show_stamp ?? true;
  const watermarkText = docSettings.watermark_text;

  const docLabel: Record<DocType, string> = {
    invoice: "INVOICE", form: "FORM", eticket: "E-TIKET", certificate: "SERTIFIKAT",
    passport_letter: "SURAT PASPOR", leave_letter: "SURAT CUTI", general_letter: "SURAT UMUM",
  };

  return (
    <div className={`w-full ${isLandscape ? "aspect-[1.4/1]" : "aspect-[0.7/1]"} border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col relative`}>
      {/* Watermark */}
      {watermarkText && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            opacity: (docSettings.watermark_opacity ?? 15) / 100,
            transform: "rotate(-35deg)",
            fontSize: "clamp(14px, 5vw, 28px)",
            fontWeight: "bold",
            color: accentColor,
            letterSpacing: "0.2em",
          }}
        >
          {watermarkText.toUpperCase()}
        </div>
      )}

      {/* Watermark LUNAS for Invoice */}
      {docType === "invoice" && docSettings.watermark_paid && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{ opacity: 0.12, transform: "rotate(-35deg)" }}
        >
          <span className="text-2xl font-black text-green-600 tracking-widest">LUNAS</span>
        </div>
      )}

      {/* Header */}
      {showHeader && (
        <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: headerBg }}>
          {showLogo && (
            <div className="w-5 h-5 rounded bg-white/20 flex-shrink-0 flex items-center justify-center">
              {company?.logo
                ? <img src={company.logo} alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <FileText className="h-3 w-3" style={{ color: headerText, opacity: 0.7 }} />
              }
            </div>
          )}
          <div className="flex-1 min-w-0" style={{ color: headerText }}>
            <div className="text-[8px] font-bold truncate">{company?.name || "Perusahaan"}</div>
          </div>
          <div className="text-[7px] font-bold" style={{ color: headerText, opacity: 0.9 }}>
            {docLabel[docType]}
          </div>
        </div>
      )}

      {/* Certificate border */}
      {docType === "certificate" && docSettings.border_color && (
        <div className="absolute inset-1 border-2 pointer-events-none rounded" style={{ borderColor: docSettings.border_color }} />
      )}

      {/* Content */}
      <div className="flex-1 p-2 space-y-1 overflow-hidden">
        <div className="h-1.5 rounded" style={{ backgroundColor: accentColor, opacity: 0.2, width: "55%" }} />
        <div className="h-1 bg-muted-foreground/10 rounded w-full" />
        <div className="h-1 bg-muted-foreground/10 rounded w-4/5" />
        <div className="h-1 bg-muted-foreground/10 rounded w-3/5" />
        {docType === "eticket" && (
          <div className="mt-1 flex gap-1">
            <div className="h-5 w-5 bg-muted-foreground/10 rounded border flex items-center justify-center">
              <div className="h-3 w-3 bg-muted-foreground/20 rounded-sm" />
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="h-1 bg-muted-foreground/10 rounded" />
              <div className="h-1 bg-muted-foreground/10 rounded w-3/4" />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t flex items-end justify-between text-[6px] text-muted-foreground/50">
        <span>{globalSettings.pdf_global_footer_text ? globalSettings.pdf_global_footer_text.slice(0, 20) : ""}</span>
        <div className="flex items-center gap-1">
          {showSignature && <div className="text-center"><div className="w-5 h-2 border-b border-muted-foreground/30" /><div className="text-[5px]">Ttd</div></div>}
          {showStamp && <div className="w-4 h-4 border border-dashed border-muted-foreground/30 rounded-full" />}
        </div>
      </div>
    </div>
  );
}
