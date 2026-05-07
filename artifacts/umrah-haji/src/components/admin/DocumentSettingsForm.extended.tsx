import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Palette, AlignLeft, Settings2 } from "lucide-react";
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

// Extended schema with new PDF design settings
const documentSettingsSchema = z.object({
  // Existing settings
  company_city: z.string().min(2, "Kota minimal 2 karakter"),
  company_website: z.string().url("Format URL tidak valid").or(z.literal("")),
  letterhead_show_logo: z.boolean(),
  letterhead_show_website: z.boolean(),
  invoice_number_prefix: z.string().min(1, "Prefix tidak boleh kosong"),
  invoice_number_format: z.string().min(1, "Format tidak boleh kosong"),
  invoice_show_bank_info: z.boolean(),
  invoice_show_notes_section: z.boolean(),
  invoice_show_package_info: z.boolean(),
  invoice_watermark_paid: z.boolean(),
  invoice_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  eticket_header_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  certificate_border_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  certificate_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  manifest_layout: z.enum(["compact", "detailed", "full"]),
  pdf_default_font: z.enum(["helvetica", "times"]),
  document_footer_show_timestamp: z.boolean(),
  document_footer_show_page_number: z.boolean(),

  // NEW: Global PDF Design Settings
  pdf_global_font_family: z.enum(["helvetica", "times", "courier"]),
  pdf_global_font_size_header: z.number().min(8).max(24),
  pdf_global_font_size_body: z.number().min(6).max(16),
  pdf_global_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  pdf_global_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  pdf_global_margin_top: z.number().min(5).max(30),
  pdf_global_margin_bottom: z.number().min(5).max(30),
  pdf_global_margin_left: z.number().min(5).max(30),
  pdf_global_margin_right: z.number().min(5).max(30),
  pdf_global_show_logo: z.boolean(),
  pdf_global_logo_position: z.enum(["left", "center", "right"]),
  pdf_global_show_page_number: z.boolean(),
  pdf_global_show_timestamp: z.boolean(),

  // NEW: Invoice-specific Design Settings
  invoice_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  invoice_header_bg_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  invoice_table_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  invoice_watermark_text: z.string().optional(),
  invoice_watermark_opacity: z.number().min(0).max(1).optional(),

  // NEW: Passport Letter-specific Design Settings
  passport_letter_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  passport_letter_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  passport_letter_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),

  // NEW: Leave Permit-specific Design Settings
  leave_permit_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  leave_permit_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  leave_permit_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
});

type DocumentSettingsFormData = z.infer<typeof documentSettingsSchema>;

export function DocumentSettingsFormExtended() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();

  const form = useForm<DocumentSettingsFormData>({
    resolver: zodResolver(documentSettingsSchema),
    defaultValues: {
      company_city: "",
      company_website: "",
      letterhead_show_logo: true,
      letterhead_show_website: true,
      invoice_number_prefix: "INV",
      invoice_number_format: "YYYY-MM-{SEQ}",
      invoice_show_bank_info: true,
      invoice_show_notes_section: true,
      invoice_show_package_info: true,
      invoice_watermark_paid: true,
      invoice_accent_color: "#16a34a",
      eticket_header_color: "#16a34a",
      certificate_border_color: "#daa520",
      certificate_text_color: "#165634",
      manifest_layout: "detailed" as const,
      pdf_default_font: "helvetica" as const,
      document_footer_show_timestamp: true,
      document_footer_show_page_number: true,
      // NEW defaults
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
      pdf_global_show_page_number: true,
      pdf_global_show_timestamp: true,
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
        invoice_number_prefix: getSetting("invoice_number_prefix") || "INV",
        invoice_number_format: getSetting("invoice_number_format") || "YYYY-MM-{SEQ}",
        invoice_show_bank_info: getSetting("invoice_show_bank_info") !== "false",
        invoice_show_notes_section: getSetting("invoice_show_notes_section") !== "false",
        invoice_show_package_info: getSetting("invoice_show_package_info") !== "false",
        invoice_watermark_paid: getSetting("invoice_watermark_paid") !== "false",
        invoice_accent_color: getSetting("invoice_accent_color") || "#16a34a",
        eticket_header_color: getSetting("eticket_header_color") || "#16a34a",
        certificate_border_color: getSetting("certificate_border_color") || "#daa520",
        certificate_text_color: getSetting("certificate_text_color") || "#165634",
        manifest_layout: (getSetting("manifest_layout") as "compact" | "detailed" | "full") || "detailed",
        pdf_default_font: (getSetting("pdf_default_font") as "helvetica" | "times") || "helvetica",
        document_footer_show_timestamp: getSetting("document_footer_show_timestamp") !== "false",
        document_footer_show_page_number: getSetting("document_footer_show_page_number") !== "false",
        // NEW settings
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
        pdf_global_show_page_number: getSetting("pdf_global_show_page_number") !== "false",
        pdf_global_show_timestamp: getSetting("pdf_global_show_timestamp") !== "false",
        invoice_font_family: (getSetting("invoice_font_family") as any) || undefined,
        invoice_header_bg_color: getSetting("invoice_header_bg_color") || undefined,
        invoice_table_header_text_color: getSetting("invoice_table_header_text_color") || undefined,
        invoice_watermark_text: getSetting("invoice_watermark_text") || undefined,
        invoice_watermark_opacity: parseFloat(getSetting("invoice_watermark_opacity") as any) || undefined,
        passport_letter_font_family: (getSetting("passport_letter_font_family") as any) || undefined,
        passport_letter_header_text_color: getSetting("passport_letter_header_text_color") || undefined,
        passport_letter_accent_color: getSetting("passport_letter_accent_color") || undefined,
        leave_permit_font_family: (getSetting("leave_permit_font_family") as any) || undefined,
        leave_permit_header_text_color: getSetting("leave_permit_header_text_color") || undefined,
        leave_permit_accent_color: getSetting("leave_permit_accent_color") || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const onSave = (data: DocumentSettingsFormData) => {
    const settings = [
      { key: "company_city", value: data.company_city },
      { key: "company_website", value: data.company_website },
      { key: "letterhead_show_logo", value: data.letterhead_show_logo },
      { key: "letterhead_show_website", value: data.letterhead_show_website },
      { key: "invoice_number_prefix", value: data.invoice_number_prefix },
      { key: "invoice_number_format", value: data.invoice_number_format },
      { key: "invoice_show_bank_info", value: data.invoice_show_bank_info },
      { key: "invoice_show_notes_section", value: data.invoice_show_notes_section },
      { key: "invoice_show_package_info", value: data.invoice_show_package_info },
      { key: "invoice_watermark_paid", value: data.invoice_watermark_paid },
      { key: "invoice_accent_color", value: data.invoice_accent_color },
      { key: "manifest_layout", value: data.manifest_layout },
      { key: "pdf_default_font", value: data.pdf_default_font },
      { key: "eticket_header_color", value: data.eticket_header_color },
      { key: "certificate_border_color", value: data.certificate_border_color },
      { key: "certificate_text_color", value: data.certificate_text_color },
      { key: "document_footer_show_timestamp", value: data.document_footer_show_timestamp },
      { key: "document_footer_show_page_number", value: data.document_footer_show_page_number },
      // NEW settings
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
      { key: "pdf_global_show_page_number", value: data.pdf_global_show_page_number },
      { key: "pdf_global_show_timestamp", value: data.pdf_global_show_timestamp },
    ];

    // Add optional settings only if they have values
    if (data.invoice_font_family) settings.push({ key: "invoice_font_family", value: data.invoice_font_family });
    if (data.invoice_header_bg_color) settings.push({ key: "invoice_header_bg_color", value: data.invoice_header_bg_color });
    if (data.invoice_table_header_text_color) settings.push({ key: "invoice_table_header_text_color", value: data.invoice_table_header_text_color });
    if (data.invoice_watermark_text) settings.push({ key: "invoice_watermark_text", value: data.invoice_watermark_text });
    if (data.invoice_watermark_opacity !== undefined) settings.push({ key: "invoice_watermark_opacity", value: data.invoice_watermark_opacity });
    if (data.passport_letter_font_family) settings.push({ key: "passport_letter_font_family", value: data.passport_letter_font_family });
    if (data.passport_letter_header_text_color) settings.push({ key: "passport_letter_header_text_color", value: data.passport_letter_header_text_color });
    if (data.passport_letter_accent_color) settings.push({ key: "passport_letter_accent_color", value: data.passport_letter_accent_color });
    if (data.leave_permit_font_family) settings.push({ key: "leave_permit_font_family", value: data.leave_permit_font_family });
    if (data.leave_permit_header_text_color) settings.push({ key: "leave_permit_header_text_color", value: data.leave_permit_header_text_color });
    if (data.leave_permit_accent_color) settings.push({ key: "leave_permit_accent_color", value: data.leave_permit_accent_color });

    updateMultipleSettings(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Pengaturan Dokumen & Desain PDF
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
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Dasar</TabsTrigger>
                  <TabsTrigger value="global">Desain Global</TabsTrigger>
                  <TabsTrigger value="invoice">Invoice</TabsTrigger>
                  <TabsTrigger value="letters">Surat-Surat</TabsTrigger>
                </TabsList>

                {/* BASIC TAB */}
                <TabsContent value="basic" className="space-y-6">
                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Informasi Dasar</h3>
                    
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

                  {/* Letterhead Settings */}
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

                  {/* Footer Settings */}
                  <div className="space-y-4">
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
                </TabsContent>

                {/* GLOBAL DESIGN TAB */}
                <TabsContent value="global" className="space-y-6">
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
                            <Input type="number" min="8" max="24" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                            <Input type="number" min="6" max="16" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                              <Input type="number" min="5" max="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                              <Input type="number" min="5" max="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                              <Input type="number" min="5" max="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
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
                              <Input type="number" min="5" max="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Logo & Header</h3>

                    <FormField
                      control={form.control}
                      name="pdf_global_show_logo"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Logo</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="pdf_global_show_page_number"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Nomor Halaman</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pdf_global_show_timestamp"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel className="mb-0">Tampilkan Waktu Cetak</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* INVOICE TAB */}
                <TabsContent value="invoice" className="space-y-6">
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
                            Gunakan: YYYY=tahun, MM=bulan, {'{SEQ}'}=nomor urut
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
                      name="invoice_accent_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warna Aksen Invoice</FormLabel>
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
                      name="invoice_font_family"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jenis Font (Opsional - Gunakan Global jika kosong)</FormLabel>
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
                            <Input type="number" min="0" max="1" step="0.1" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><AlignLeft className="h-4 w-4" />Layout Manifest</h3>

                    <FormField
                      control={form.control}
                      name="manifest_layout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tata Letak Manifest PDF</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compact">Kompak — lebih banyak nama per halaman</SelectItem>
                              <SelectItem value="detailed">Detail — nama + data lengkap</SelectItem>
                              <SelectItem value="full">Penuh — termasuk foto & QR</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">Berlaku saat mencetak manifest keberangkatan</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* LETTERS TAB */}
                <TabsContent value="letters" className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-700">
                    <strong>Pengaturan Surat-Surat</strong> untuk Surat Paspor, Surat Izin Cuti, dan dokumen surat lainnya.
                  </div>

                  {/* Passport Letter Settings */}
                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Surat Rekomendasi Paspor</h3>

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

                  {/* Leave Permit Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Surat Izin Cuti</h3>

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
                </TabsContent>

                {/* Color Settings Tab - Existing */}
                <TabsContent value="colors" className="space-y-6">
                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Warna E-Tiket & Sertifikat</h3>

                    <FormField
                      control={form.control}
                      name="eticket_header_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warna Header E-Ticket</FormLabel>
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
                      name="certificate_border_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warna Border Sertifikat</FormLabel>
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
                      name="certificate_text_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warna Teks Sertifikat</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="pdf_default_font"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Font Default PDF (Legacy)</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="helvetica">Helvetica (Modern)</SelectItem>
                            <SelectItem value="times">Times New Roman (Formal)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

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
