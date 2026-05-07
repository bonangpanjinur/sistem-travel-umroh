import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Palette, AlignLeft, Settings2, File, BookText, Plane, Briefcase, Award, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCompanySettings } from "@/hooks/useCompanySettings";

// --- Zod Schema for Document Settings ---
const documentSettingsSchema = z.object({
  // Existing general company settings
  company_city: z.string().min(2, "Kota minimal 2 karakter"),
  company_website: z.string().url("Format URL tidak valid").or(z.literal("")),
  letterhead_show_logo: z.boolean(),
  letterhead_show_website: z.boolean(),
  document_footer_show_timestamp: z.boolean(),
  document_footer_show_page_number: z.boolean(),

  // Global PDF Design Settings (Prefix: pdf_global_)
  pdf_global_font_family: z.enum(["helvetica", "times", "courier"]),
  pdf_global_font_size_header: z.coerce.number().min(8).max(24),
  pdf_global_font_size_body: z.coerce.number().min(6).max(16),
  pdf_global_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  pdf_global_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  pdf_global_margin_top: z.coerce.number().min(5).max(30),
  pdf_global_margin_bottom: z.coerce.number().min(5).max(30),
  pdf_global_margin_left: z.coerce.number().min(5).max(30),
  pdf_global_margin_right: z.coerce.number().min(5).max(30),
  pdf_global_show_logo: z.boolean(),
  pdf_global_logo_position: z.enum(["left", "center", "right"]),
  pdf_global_page_orientation: z.enum(["portrait", "landscape"]),

  // Invoice-specific Settings (Prefix: invoice_)
  invoice_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  invoice_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  invoice_header_bg_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  invoice_table_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  invoice_watermark_text: z.string().optional(),
  invoice_watermark_opacity: z.coerce.number().min(0).max(1).optional(),
  invoice_show_bank_info: z.boolean(),
  invoice_show_notes_section: z.boolean(),
  invoice_show_package_info: z.boolean(),
  invoice_watermark_paid: z.boolean(),
  invoice_number_prefix: z.string().min(1, "Prefix tidak boleh kosong"),
  invoice_number_format: z.string().min(1, "Format tidak boleh kosong"),

  // Passport Letter-specific Settings (Prefix: passport_letter_)
  passport_letter_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  passport_letter_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  passport_letter_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  passport_letter_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  passport_letter_show_photo: z.boolean(),
  passport_letter_show_qr_code: z.boolean(),

  // Leave Permit-specific Settings (Prefix: leave_permit_)
  leave_permit_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  leave_permit_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  leave_permit_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  leave_permit_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  leave_permit_include_company_logo: z.boolean(),

  // Certificate-specific Settings (Prefix: certificate_)
  certificate_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  certificate_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  certificate_border_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  certificate_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  certificate_background_image_url: z.string().url("Format URL tidak valid").or(z.literal("")).optional(),

  // General Letter-specific Settings (Prefix: general_letter_)
  general_letter_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  general_letter_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  general_letter_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  general_letter_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  general_letter_show_letterhead: z.boolean(),
});

type DocumentSettingsFormData = z.infer<typeof documentSettingsSchema>;

// --- Document Type Definition ---
type DocumentType = "invoice" | "passport_letter" | "leave_permit" | "certificate" | "general_letter" | "global";

export function DocumentSettingsFormExtended() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>("invoice");

  const form = useForm<DocumentSettingsFormData>({
    resolver: zodResolver(documentSettingsSchema),
    defaultValues: {
      // Existing general company settings
      company_city: "",
      company_website: "",
      letterhead_show_logo: true,
      letterhead_show_website: true,
      document_footer_show_timestamp: true,
      document_footer_show_page_number: true,

      // Global PDF Design Settings defaults
      pdf_global_font_family: "helvetica" as const,
      pdf_global_font_size_header: 12,
      pdf_global_font_size_body: 10,
      pdf_global_text_color: "#333333",
      pdf_global_accent_color: "#16a34a",
      pdf_global_margin_top: 15,
      pdf_global_margin_bottom: 15,
      pdf_global_margin_left: 15,
      pdf_global_margin_right: 15,
      pdf_global_show_logo: true,
      pdf_global_logo_position: "left" as const,
      pdf_global_page_orientation: "portrait" as const,

      // Invoice-specific defaults
      invoice_show_bank_info: true,
      invoice_show_notes_section: true,
      invoice_show_package_info: true,
      invoice_watermark_paid: true,
      invoice_number_prefix: "INV",
      invoice_number_format: "YYYY-MM-{SEQ}",

      // Passport Letter-specific defaults
      passport_letter_show_photo: true,
      passport_letter_show_qr_code: true,

      // Leave Permit-specific defaults
      leave_permit_include_company_logo: true,

      // Certificate-specific defaults
      // certificate_background_image_url: "", // Optional, no default

      // General Letter-specific defaults
      general_letter_show_letterhead: true,
    },
  });

  // Initialize form when settings load
  useEffect(() => {
    if (!isLoading) {
      form.reset({
        company_city: getSetting("company_city") || "Jakarta",
        company_website: getSetting("company_website") || "",
        letterhead_show_logo: getSetting("letterhead_show_logo") !== "false",
        letterhead_show_website: getSetting("letterhead_show_website") !== "false",
        document_footer_show_timestamp: getSetting("document_footer_show_timestamp") !== "false",
        document_footer_show_page_number: getSetting("document_footer_show_page_number") !== "false",

        // Global PDF Design Settings
        pdf_global_font_family: (getSetting("pdf_global_font_family") as any) || "helvetica",
        pdf_global_font_size_header: parseInt(getSetting("pdf_global_font_size_header") as any) || 12,
        pdf_global_font_size_body: parseInt(getSetting("pdf_global_font_size_body") as any) || 10,
        pdf_global_text_color: getSetting("pdf_global_text_color") || "#333333",
        pdf_global_accent_color: getSetting("pdf_global_accent_color") || "#16a34a",
        pdf_global_margin_top: parseInt(getSetting("pdf_global_margin_top") as any) || 15,
        pdf_global_margin_bottom: parseInt(getSetting("pdf_global_margin_bottom") as any) || 15,
        pdf_global_margin_left: parseInt(getSetting("pdf_global_margin_left") as any) || 15,
        pdf_global_margin_right: parseInt(getSetting("pdf_global_margin_right") as any) || 15,
        pdf_global_show_logo: getSetting("pdf_global_show_logo") !== "false",
        pdf_global_logo_position: (getSetting("pdf_global_logo_position") as any) || "left",
        pdf_global_page_orientation: (getSetting("pdf_global_page_orientation") as any) || "portrait",

        // Invoice-specific settings
        invoice_page_orientation: (getSetting("invoice_page_orientation") as any) || undefined,
        invoice_font_family: (getSetting("invoice_font_family") as any) || undefined,
        invoice_header_bg_color: getSetting("invoice_header_bg_color") || undefined,
        invoice_table_header_text_color: getSetting("invoice_table_header_text_color") || undefined,
        invoice_watermark_text: getSetting("invoice_watermark_text") || undefined,
        invoice_watermark_opacity: parseFloat(getSetting("invoice_watermark_opacity") as any) || undefined,
        invoice_show_bank_info: getSetting("invoice_show_bank_info") !== "false",
        invoice_show_notes_section: getSetting("invoice_show_notes_section") !== "false",
        invoice_show_package_info: getSetting("invoice_show_package_info") !== "false",
        invoice_watermark_paid: getSetting("invoice_watermark_paid") !== "false",
        invoice_number_prefix: getSetting("invoice_number_prefix") || "INV",
        invoice_number_format: getSetting("invoice_number_format") || "YYYY-MM-{SEQ}",

        // Passport Letter-specific settings
        passport_letter_page_orientation: (getSetting("passport_letter_page_orientation") as any) || undefined,
        passport_letter_font_family: (getSetting("passport_letter_font_family") as any) || undefined,
        passport_letter_header_text_color: getSetting("passport_letter_header_text_color") || undefined,
        passport_letter_accent_color: getSetting("passport_letter_accent_color") || undefined,
        passport_letter_show_photo: getSetting("passport_letter_show_photo") !== "false",
        passport_letter_show_qr_code: getSetting("passport_letter_show_qr_code") !== "false",

        // Leave Permit-specific settings
        leave_permit_page_orientation: (getSetting("leave_permit_page_orientation") as any) || undefined,
        leave_permit_font_family: (getSetting("leave_permit_font_family") as any) || undefined,
        leave_permit_header_text_color: getSetting("leave_permit_header_text_color") || undefined,
        leave_permit_accent_color: getSetting("leave_permit_accent_color") || undefined,
        leave_permit_include_company_logo: getSetting("leave_permit_include_company_logo") !== "false",

        // Certificate-specific settings
        certificate_page_orientation: (getSetting("certificate_page_orientation") as any) || undefined,
        certificate_font_family: (getSetting("certificate_font_family") as any) || undefined,
        certificate_border_color: getSetting("certificate_border_color") || undefined,
        certificate_text_color: getSetting("certificate_text_color") || undefined,
        certificate_background_image_url: getSetting("certificate_background_image_url") || undefined,

        // General Letter-specific settings
        general_letter_page_orientation: (getSetting("general_letter_page_orientation") as any) || undefined,
        general_letter_font_family: (getSetting("general_letter_font_family") as any) || undefined,
        general_letter_header_text_color: getSetting("general_letter_header_text_color") || undefined,
        general_letter_accent_color: getSetting("general_letter_accent_color") || undefined,
        general_letter_show_letterhead: getSetting("general_letter_show_letterhead") !== "false",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const onSave = (data: DocumentSettingsFormData) => {
    const settingsToUpdate = [
      { key: "company_city", value: data.company_city },
      { key: "company_website", value: data.company_website },
      { key: "letterhead_show_logo", value: data.letterhead_show_logo },
      { key: "letterhead_show_website", value: data.letterhead_show_website },
      { key: "document_footer_show_timestamp", value: data.document_footer_show_timestamp },
      { key: "document_footer_show_page_number", value: data.document_footer_show_page_number },

      // Global PDF Design Settings
      { key: "pdf_global_font_family", value: data.pdf_global_font_family },
      { key: "pdf_global_font_size_header", value: data.pdf_global_font_size_header },
      { key: "pdf_global_font_size_body", value: data.pdf_global_font_size_body },
      { key: "pdf_global_text_color", value: data.pdf_global_text_color },
      { key: "pdf_global_accent_color", value: data.pdf_global_accent_color },
      { key: "pdf_global_margin_top", value: data.pdf_global_margin_top },
      { key: "pdf_global_margin_bottom", value: data.pdf_global_margin_bottom },
      { key: "pdf_global_margin_left", value: data.pdf_global_margin_left },
      { key: "pdf_global_margin_right", value: data.pdf_global_margin_right },
      { key: "pdf_global_show_logo", value: data.pdf_global_show_logo },
      { key: "pdf_global_logo_position", value: data.pdf_global_logo_position },
      { key: "pdf_global_page_orientation", value: data.pdf_global_page_orientation },
    ];

    // Invoice-specific settings
    settingsToUpdate.push({ key: "invoice_page_orientation", value: data.invoice_page_orientation || null });
    settingsToUpdate.push({ key: "invoice_font_family", value: data.invoice_font_family || null });
    settingsToUpdate.push({ key: "invoice_header_bg_color", value: data.invoice_header_bg_color || null });
    settingsToUpdate.push({ key: "invoice_table_header_text_color", value: data.invoice_table_header_text_color || null });
    settingsToUpdate.push({ key: "invoice_watermark_text", value: data.invoice_watermark_text || null });
    settingsToUpdate.push({ key: "invoice_watermark_opacity", value: data.invoice_watermark_opacity !== undefined ? data.invoice_watermark_opacity : null });
    settingsToUpdate.push({ key: "invoice_show_bank_info", value: data.invoice_show_bank_info });
    settingsToUpdate.push({ key: "invoice_show_notes_section", value: data.invoice_show_notes_section });
    settingsToUpdate.push({ key: "invoice_show_package_info", value: data.invoice_show_package_info });
    settingsToUpdate.push({ key: "invoice_watermark_paid", value: data.invoice_watermark_paid });
    settingsToUpdate.push({ key: "invoice_number_prefix", value: data.invoice_number_prefix });
    settingsToUpdate.push({ key: "invoice_number_format", value: data.invoice_number_format });

    // Passport Letter-specific settings
    settingsToUpdate.push({ key: "passport_letter_page_orientation", value: data.passport_letter_page_orientation || null });
    settingsToUpdate.push({ key: "passport_letter_font_family", value: data.passport_letter_font_family || null });
    settingsToUpdate.push({ key: "passport_letter_header_text_color", value: data.passport_letter_header_text_color || null });
    settingsToUpdate.push({ key: "passport_letter_accent_color", value: data.passport_letter_accent_color || null });
    settingsToUpdate.push({ key: "passport_letter_show_photo", value: data.passport_letter_show_photo });
    settingsToUpdate.push({ key: "passport_letter_show_qr_code", value: data.passport_letter_show_qr_code });

    // Leave Permit-specific settings
    settingsToUpdate.push({ key: "leave_permit_page_orientation", value: data.leave_permit_page_orientation || null });
    settingsToUpdate.push({ key: "leave_permit_font_family", value: data.leave_permit_font_family || null });
    settingsToUpdate.push({ key: "leave_permit_header_text_color", value: data.leave_permit_header_text_color || null });
    settingsToUpdate.push({ key: "leave_permit_accent_color", value: data.leave_permit_accent_color || null });
    settingsToUpdate.push({ key: "leave_permit_include_company_logo", value: data.leave_permit_include_company_logo });

    // Certificate-specific settings
    settingsToUpdate.push({ key: "certificate_page_orientation", value: data.certificate_page_orientation || null });
    settingsToUpdate.push({ key: "certificate_font_family", value: data.certificate_font_family || null });
    settingsToUpdate.push({ key: "certificate_border_color", value: data.certificate_border_color || null });
    settingsToUpdate.push({ key: "certificate_text_color", value: data.certificate_text_color || null });
    settingsToUpdate.push({ key: "certificate_background_image_url", value: data.certificate_background_image_url || null });

    // General Letter-specific settings
    settingsToUpdate.push({ key: "general_letter_page_orientation", value: data.general_letter_page_orientation || null });
    settingsToUpdate.push({ key: "general_letter_font_family", value: data.general_letter_font_family || null });
    settingsToUpdate.push({ key: "general_letter_header_text_color", value: data.general_letter_header_text_color || null });
    settingsToUpdate.push({ key: "general_letter_accent_color", value: data.general_letter_accent_color || null });
    settingsToUpdate.push({ key: "general_letter_show_letterhead", value: data.general_letter_show_letterhead });

    updateMultipleSettings(settingsToUpdate);
  };

  const renderDocumentSettings = (docType: DocumentType) => {
    switch (docType) {
      case "global":
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <strong>Pengaturan Global</strong> berlaku untuk semua dokumen PDF kecuali ada pengaturan spesifik yang menimpa.
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" />Font & Ukuran</h3>

              <FormField
                control={form.control}
                name="pdf_global_font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Font</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">Helvetica (Modern)</SelectItem>
                        <SelectItem value="times">Times New Roman (Formal)</SelectItem>
                        <SelectItem value="courier">Courier (Monospace)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf_global_font_size_header"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ukuran Font Header (pt)</FormLabel>
                    <FormControl>
                      <Input type="number" min="8" max="24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf_global_font_size_body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ukuran Font Isi (pt)</FormLabel>
                    <FormControl>
                      <Input type="number" min="6" max="16" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Warna</h3>

              <FormField
                control={form.control}
                name="pdf_global_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Teks Utama</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value} onChange={field.onChange} className="flex-1" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf_global_accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Aksen</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value} onChange={field.onChange} className="flex-1" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm">Margin Halaman (mm)</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pdf_global_margin_top"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atas</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" max="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pdf_global_margin_bottom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bawah</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" max="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pdf_global_margin_left"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kiri</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" max="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pdf_global_margin_right"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kanan</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" max="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Layout Dasar</h3>

              <FormField
                control={form.control}
                name="pdf_global_page_orientation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientasi Halaman</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf_global_show_logo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Tampilkan Logo Perusahaan</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf_global_logo_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posisi Logo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Kiri</SelectItem>
                        <SelectItem value="center">Tengah</SelectItem>
                        <SelectItem value="right">Kanan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "invoice":
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
              <strong>Pengaturan Invoice</strong> akan menimpa pengaturan global jika diisi.
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm">Nomor Invoice</h3>

              <FormField
                control={form.control}
                name="invoice_number_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefix Nomor Invoice</FormLabel>
                    <FormControl>
                      <Input placeholder="INV" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Contoh: INV-2024-001</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_number_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format Nomor Invoice</FormLabel>
                    <FormControl>
                      <Input placeholder="YYYY-MM-{SEQ}" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gunakan: YYYY=tahun, MM=bulan, {"{SEQ}"}=nomor urut
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm">Konten Invoice</h3>

              <FormField
                control={form.control}
                name="invoice_show_bank_info"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Tampilkan Info Bank</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_show_notes_section"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Tampilkan Bagian Catatan</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_show_package_info"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Tampilkan Info Paket & Keberangkatan</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_watermark_paid"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Watermark "LUNAS" pada Invoice Lunas</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Desain Invoice</h3>

              <FormField
                control={form.control}
                name="invoice_page_orientation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientasi Halaman (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Font (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_header_bg_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Latar Header (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#ffffff" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_table_header_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Teks Header Tabel (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#ffffff" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_watermark_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teks Watermark Kustom (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: DRAFT" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_watermark_opacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opasitas Watermark (0-1)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="1" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "passport_letter":
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-700">
              <strong>Pengaturan Surat Rekomendasi Paspor</strong> akan menimpa pengaturan global jika diisi.
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Desain Surat Paspor</h3>

              <FormField
                control={form.control}
                name="passport_letter_page_orientation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientasi Halaman (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport_letter_font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Font (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport_letter_header_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Teks Header (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#333333" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport_letter_accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Aksen (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#16a34a" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Konten Surat Paspor</h3>

              <FormField
                control={form.control}
                name="passport_letter_show_photo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Tampilkan Foto</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passport_letter_show_qr_code"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Tampilkan QR Code</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "leave_permit":
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700">
              <strong>Pengaturan Surat Izin Cuti</strong> akan menimpa pengaturan global jika diisi.
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Desain Surat Izin Cuti</h3>

              <FormField
                control={form.control}
                name="leave_permit_page_orientation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientasi Halaman (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leave_permit_font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Font (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leave_permit_header_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Teks Header (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#333333" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leave_permit_accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Aksen (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#16a34a" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Konten Surat Izin Cuti</h3>

              <FormField
                control={form.control}
                name="leave_permit_include_company_logo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Sertakan Logo Perusahaan</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "certificate":
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
              <strong>Pengaturan Sertifikat</strong> akan menimpa pengaturan global jika diisi.
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Desain Sertifikat</h3>

              <FormField
                control={form.control}
                name="certificate_page_orientation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientasi Halaman (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificate_font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Font (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificate_border_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Border (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#daa520" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificate_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Teks (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#165634" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificate_background_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Gambar Latar Belakang (Opsional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/bg.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "general_letter":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
              <strong>Pengaturan Surat Umum</strong> akan menimpa pengaturan global jika diisi.
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Desain Surat Umum</h3>

              <FormField
                control={form.control}
                name="general_letter_page_orientation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orientasi Halaman (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="general_letter_font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Font (Opsional)</FormLabel>
                    <Select value={field.value || ""} onValueChange={(val) => field.onChange(val || undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gunakan pengaturan global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Gunakan pengaturan global</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="general_letter_header_text_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Teks Header (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#333333" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="general_letter_accent_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warna Aksen (Opsional)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="color" {...field} className="h-10 w-20" />
                      </FormControl>
                      <Input type="text" value={field.value || ""} onChange={field.onChange} className="flex-1" placeholder="#16a34a" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Konten Surat Umum</h3>

              <FormField
                control={form.control}
                name="general_letter_show_letterhead"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="mb-0">Sertakan Kop Surat</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Pengaturan Dokumen & Template Surat
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat pengaturan...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
              {/* Document Type Selection */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm">Pilih Tipe Dokumen untuk Diatur</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card
                    className={`cursor-pointer ${selectedDocument === "invoice" ? "border-primary ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDocument("invoice")}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <File className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">Invoice</span>
                      <span className="text-xs text-muted-foreground">Portrait</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer ${selectedDocument === "passport_letter" ? "border-primary ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDocument("passport_letter")}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <BookText className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">Surat Paspor</span>
                      <span className="text-xs text-muted-foreground">Portrait</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer ${selectedDocument === "leave_permit" ? "border-primary ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDocument("leave_permit")}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <Briefcase className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">Surat Cuti</span>
                      <span className="text-xs text-muted-foreground">Portrait</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer ${selectedDocument === "certificate" ? "border-primary ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDocument("certificate")}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <Award className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">Sertifikat</span>
                      <span className="text-xs text-muted-foreground">Portrait</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer ${selectedDocument === "general_letter" ? "border-primary ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDocument("general_letter")}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <Mail className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">Surat Umum</span>
                      <span className="text-xs text-muted-foreground">Portrait</span>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer ${selectedDocument === "global" ? "border-primary ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedDocument("global")}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <Settings2 className="h-8 w-8 text-primary mb-2" />
                      <span className="text-sm font-medium">Global PDF</span>
                      <span className="text-xs text-muted-foreground">Default</span>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Dynamic Settings Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* General Company Settings (always visible) */}
                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Informasi Dasar Perusahaan</h3>
                    
                    <FormField
                      control={form.control}
                      name="company_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kota Perusahaan</FormLabel>
                          <FormControl>
                            <Input placeholder="Jakarta" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      <strong>Catatan:</strong> Nama, Alamat, Telepon, dan Email perusahaan diambil dari <strong>Master Data Informasi Perusahaan</strong>.
                    </div>

                    <FormField
                      control={form.control}
                      name="company_website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website Perusahaan</FormLabel>
                          <FormControl>
                            <Input type="url" placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Pengaturan Kop Surat</h3>

                    <FormField
                      control={form.control}
                      name="letterhead_show_logo"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Logo di Kop Surat</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="letterhead_show_website"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Website di Kop Surat</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Pengaturan Footer Dokumen</h3>

                    <FormField
                      control={form.control}
                      name="document_footer_show_timestamp"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Waktu Cetak</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="document_footer_show_page_number"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Nomor Halaman</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {renderDocumentSettings(selectedDocument)}
                </div>

                {/* Preview Area */}
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-md flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Preview Dokumen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] bg-gray-100 flex items-center justify-center text-muted-foreground">
                      {/* Placeholder for PDF preview */}
                      <p>Preview akan muncul di sini</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Button type="submit" disabled={isUpdating} className="w-full">
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Perubahan
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
