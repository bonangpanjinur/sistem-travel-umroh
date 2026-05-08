import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Palette, AlignLeft, Settings2, File, BookText, Plane, Award, Mail, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const documentSettingsSchema = z.object({
  company_city: z.string().min(2, "Kota minimal 2 karakter"),
  company_website: z.string().url("Format URL tidak valid").or(z.literal("")),

  pdf_global_font_family: z.enum(["helvetica", "times", "courier"]),
  pdf_global_font_size_header: z.coerce.number().min(8).max(24),
  pdf_global_font_size_body: z.coerce.number().min(6).max(16),
  pdf_global_text_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  pdf_global_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  pdf_global_margin_top: z.coerce.number().min(5).max(30),
  pdf_global_margin_bottom: z.coerce.number().min(5).max(30),
  pdf_global_margin_left: z.coerce.number().min(5).max(30),
  pdf_global_margin_right: z.coerce.number().min(5).max(30),
  pdf_global_show_logo: z.boolean(),
  pdf_global_logo_position: z.enum(["left", "center", "right"]),
  pdf_global_page_orientation: z.enum(["portrait", "landscape"]),
  pdf_global_show_website: z.boolean(),
  pdf_global_show_timestamp: z.boolean(),
  pdf_global_show_page_number: z.boolean(),
  pdf_global_show_company_info: z.boolean(),
  pdf_global_show_address: z.boolean(),
  pdf_global_show_phone: z.boolean(),
  pdf_global_show_email: z.boolean(),

  invoice_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  invoice_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  invoice_header_bg_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  invoice_table_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  invoice_watermark_text: z.string().optional(),
  invoice_watermark_opacity: z.coerce.number().min(0).max(1).optional(),
  invoice_show_bank_info: z.boolean(),
  invoice_show_notes_section: z.boolean(),
  invoice_show_package_info: z.boolean(),
  invoice_watermark_paid: z.boolean(),
  invoice_number_prefix: z.string().min(1, "Prefix tidak boleh kosong"),
  invoice_number_format: z.string().min(1, "Format tidak boleh kosong"),

  passport_letter_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  passport_letter_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  passport_letter_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  passport_letter_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  passport_letter_show_photo: z.boolean(),
  passport_letter_show_qr_code: z.boolean(),

  leave_permit_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  leave_permit_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  leave_permit_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  leave_permit_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  leave_permit_include_company_logo: z.boolean(),

  certificate_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  certificate_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  certificate_border_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  certificate_text_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  certificate_background_image_url: z.string().url("Format URL tidak valid").or(z.literal("")).optional(),

  general_letter_page_orientation: z.enum(["portrait", "landscape"]).optional(),
  general_letter_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  general_letter_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  general_letter_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().or(z.literal("")),
  general_letter_show_letterhead: z.boolean(),
});

type DocumentSettingsFormData = z.infer<typeof documentSettingsSchema>;
type DocumentType = "invoice" | "passport_letter" | "leave_permit" | "certificate" | "general_letter" | "global";

function OverrideBanner({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <strong>{title}</strong>
        <p className="text-xs mt-0.5 text-blue-600">{description}</p>
      </div>
    </div>
  );
}

function ColorField({ label, field }: { label: string; field: any }) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={field.value || "#16a34a"}
          onChange={(e) => field.onChange(e.target.value)}
          className="h-10 w-14 rounded border cursor-pointer p-0.5"
        />
        <Input
          type="text"
          value={field.value || ""}
          onChange={field.onChange}
          className="flex-1 font-mono"
          placeholder="#16a34a"
        />
      </div>
      <FormMessage />
    </FormItem>
  );
}

function OptionalOrientationField({ form, name }: { form: any; name: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Orientasi Halaman <span className="text-muted-foreground font-normal">(opsional)</span></FormLabel>
          <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || undefined)}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Pakai default global" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="">Pakai default global</SelectItem>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function OptionalFontField({ form, name }: { form: any; name: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Font Dokumen <span className="text-muted-foreground font-normal">(opsional)</span></FormLabel>
          <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || undefined)}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Pakai font global" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="">Pakai font global</SelectItem>
              <SelectItem value="helvetica">Helvetica</SelectItem>
              <SelectItem value="times">Times New Roman</SelectItem>
              <SelectItem value="courier">Courier</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DocumentSettingsFormExtended() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>("global");

  const form = useForm<DocumentSettingsFormData>({
    resolver: zodResolver(documentSettingsSchema),
    defaultValues: {
      company_city: "Jakarta",
      company_website: "",
      pdf_global_font_family: "helvetica",
      pdf_global_font_size_header: 12,
      pdf_global_font_size_body: 10,
      pdf_global_text_color: "#333333",
      pdf_global_accent_color: "#16a34a",
      pdf_global_margin_top: 15,
      pdf_global_margin_bottom: 15,
      pdf_global_margin_left: 15,
      pdf_global_margin_right: 15,
      pdf_global_show_logo: true,
      pdf_global_logo_position: "left",
      pdf_global_page_orientation: "portrait",
      pdf_global_show_website: true,
      pdf_global_show_timestamp: true,
      pdf_global_show_page_number: true,
      pdf_global_show_company_info: true,
      pdf_global_show_address: true,
      pdf_global_show_phone: true,
      pdf_global_show_email: true,
      invoice_show_bank_info: true,
      invoice_show_notes_section: true,
      invoice_show_package_info: true,
      invoice_watermark_paid: true,
      invoice_number_prefix: "INV",
      invoice_number_format: "YYYY-MM-{SEQ}",
      passport_letter_show_photo: true,
      passport_letter_show_qr_code: true,
      leave_permit_include_company_logo: true,
      general_letter_show_letterhead: true,
    },
  });

  useEffect(() => {
    if (!isLoading) {
      form.reset({
        company_city: getSetting("company_city") || "Jakarta",
        company_website: getSetting("company_website") || "",

        pdf_global_font_family: (getSetting("pdf_global_font_family") as any) || (getSetting("pdf_default_font") as any) || "helvetica",
        pdf_global_font_size_header: parseInt(getSetting("pdf_global_font_size_header") as any) || 12,
        pdf_global_font_size_body: parseInt(getSetting("pdf_global_font_size_body") as any) || 10,
        pdf_global_text_color: getSetting("pdf_global_text_color") || "#333333",
        pdf_global_accent_color: getSetting("pdf_global_accent_color") || getSetting("invoice_accent_color") || "#16a34a",
        pdf_global_margin_top: parseInt(getSetting("pdf_global_margin_top") as any) || 15,
        pdf_global_margin_bottom: parseInt(getSetting("pdf_global_margin_bottom") as any) || 15,
        pdf_global_margin_left: parseInt(getSetting("pdf_global_margin_left") as any) || 15,
        pdf_global_margin_right: parseInt(getSetting("pdf_global_margin_right") as any) || 15,
        pdf_global_show_logo: getSetting("pdf_global_show_logo") !== "false" && getSetting("letterhead_show_logo") !== "false",
        pdf_global_logo_position: (getSetting("pdf_global_logo_position") as any) || "left",
        pdf_global_page_orientation: (getSetting("pdf_global_page_orientation") as any) || "portrait",
        pdf_global_show_website: getSetting("pdf_global_show_website") !== "false" && getSetting("letterhead_show_website") !== "false",
        pdf_global_show_timestamp: getSetting("pdf_global_show_timestamp") !== "false" && getSetting("document_footer_show_timestamp") !== "false",
        pdf_global_show_page_number: getSetting("pdf_global_show_page_number") !== "false" && getSetting("document_footer_show_page_number") !== "false",
        pdf_global_show_company_info: getSetting("pdf_global_show_company_info") !== "false",
        pdf_global_show_address: getSetting("pdf_global_show_address") !== "false",
        pdf_global_show_phone: getSetting("pdf_global_show_phone") !== "false",
        pdf_global_show_email: getSetting("pdf_global_show_email") !== "false",

        invoice_page_orientation: (getSetting("invoice_page_orientation") as any) || undefined,
        invoice_font_family: (getSetting("invoice_font_family") as any) || undefined,
        invoice_header_bg_color: getSetting("invoice_header_bg_color") || "",
        invoice_table_header_text_color: getSetting("invoice_table_header_text_color") || "",
        invoice_watermark_text: getSetting("invoice_watermark_text") || undefined,
        invoice_watermark_opacity: parseFloat(getSetting("invoice_watermark_opacity") as any) || undefined,
        invoice_show_bank_info: getSetting("invoice_show_bank_info") !== "false",
        invoice_show_notes_section: getSetting("invoice_show_notes_section") !== "false",
        invoice_show_package_info: getSetting("invoice_show_package_info") !== "false",
        invoice_watermark_paid: getSetting("invoice_watermark_paid") !== "false",
        invoice_number_prefix: getSetting("invoice_number_prefix") || "INV",
        invoice_number_format: getSetting("invoice_number_format") || "YYYY-MM-{SEQ}",

        passport_letter_page_orientation: (getSetting("passport_letter_page_orientation") as any) || undefined,
        passport_letter_font_family: (getSetting("passport_letter_font_family") as any) || undefined,
        passport_letter_header_text_color: getSetting("passport_letter_header_text_color") || "",
        passport_letter_accent_color: getSetting("passport_letter_accent_color") || "",
        passport_letter_show_photo: getSetting("passport_letter_show_photo") !== "false",
        passport_letter_show_qr_code: getSetting("passport_letter_show_qr_code") !== "false",

        leave_permit_page_orientation: (getSetting("leave_permit_page_orientation") as any) || undefined,
        leave_permit_font_family: (getSetting("leave_permit_font_family") as any) || undefined,
        leave_permit_header_text_color: getSetting("leave_permit_header_text_color") || "",
        leave_permit_accent_color: getSetting("leave_permit_accent_color") || "",
        leave_permit_include_company_logo: getSetting("leave_permit_include_company_logo") !== "false",

        certificate_page_orientation: (getSetting("certificate_page_orientation") as any) || undefined,
        certificate_font_family: (getSetting("certificate_font_family") as any) || undefined,
        certificate_border_color: getSetting("certificate_border_color") || "",
        certificate_text_color: getSetting("certificate_text_color") || "",
        certificate_background_image_url: getSetting("certificate_background_image_url") || "",

        general_letter_page_orientation: (getSetting("general_letter_page_orientation") as any) || undefined,
        general_letter_font_family: (getSetting("general_letter_font_family") as any) || undefined,
        general_letter_header_text_color: getSetting("general_letter_header_text_color") || "",
        general_letter_accent_color: getSetting("general_letter_accent_color") || "",
        general_letter_show_letterhead: getSetting("general_letter_show_letterhead") !== "false",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const onSave = (data: DocumentSettingsFormData) => {
    const settingsToUpdate: Array<{ key: string; value: any }> = [
      { key: "company_city", value: data.company_city },
      { key: "company_website", value: data.company_website },
      { key: "pdf_global_font_family", value: data.pdf_global_font_family },
      { key: "pdf_global_font_size_header", value: data.pdf_global_font_size_header.toString() },
      { key: "pdf_global_font_size_body", value: data.pdf_global_font_size_body.toString() },
      { key: "pdf_global_text_color", value: data.pdf_global_text_color },
      { key: "pdf_global_accent_color", value: data.pdf_global_accent_color },
      { key: "pdf_global_margin_top", value: data.pdf_global_margin_top.toString() },
      { key: "pdf_global_margin_bottom", value: data.pdf_global_margin_bottom.toString() },
      { key: "pdf_global_margin_left", value: data.pdf_global_margin_left.toString() },
      { key: "pdf_global_margin_right", value: data.pdf_global_margin_right.toString() },
      { key: "pdf_global_show_logo", value: data.pdf_global_show_logo.toString() },
      { key: "pdf_global_logo_position", value: data.pdf_global_logo_position },
      { key: "pdf_global_page_orientation", value: data.pdf_global_page_orientation },
      { key: "pdf_global_show_website", value: data.pdf_global_show_website.toString() },
      { key: "pdf_global_show_timestamp", value: data.pdf_global_show_timestamp.toString() },
      { key: "pdf_global_show_page_number", value: data.pdf_global_show_page_number.toString() },
      { key: "pdf_global_show_company_info", value: data.pdf_global_show_company_info.toString() },
      { key: "pdf_global_show_address", value: data.pdf_global_show_address.toString() },
      { key: "pdf_global_show_phone", value: data.pdf_global_show_phone.toString() },
      { key: "pdf_global_show_email", value: data.pdf_global_show_email.toString() },
      // Backward compat
      { key: "letterhead_show_logo", value: data.pdf_global_show_logo.toString() },
      { key: "letterhead_show_website", value: data.pdf_global_show_website.toString() },
      { key: "document_footer_show_timestamp", value: data.pdf_global_show_timestamp.toString() },
      { key: "document_footer_show_page_number", value: data.pdf_global_show_page_number.toString() },
      { key: "pdf_default_font", value: data.pdf_global_font_family },
      { key: "invoice_accent_color", value: data.pdf_global_accent_color },
      // Invoice
      { key: "invoice_show_bank_info", value: data.invoice_show_bank_info.toString() },
      { key: "invoice_show_notes_section", value: data.invoice_show_notes_section.toString() },
      { key: "invoice_show_package_info", value: data.invoice_show_package_info.toString() },
      { key: "invoice_watermark_paid", value: data.invoice_watermark_paid.toString() },
      { key: "invoice_number_prefix", value: data.invoice_number_prefix },
      { key: "invoice_number_format", value: data.invoice_number_format },
      // Passport
      { key: "passport_letter_show_photo", value: data.passport_letter_show_photo.toString() },
      { key: "passport_letter_show_qr_code", value: data.passport_letter_show_qr_code.toString() },
      // Leave
      { key: "leave_permit_include_company_logo", value: data.leave_permit_include_company_logo.toString() },
      // General
      { key: "general_letter_show_letterhead", value: data.general_letter_show_letterhead.toString() },
    ];

    if (data.invoice_page_orientation) settingsToUpdate.push({ key: "invoice_page_orientation", value: data.invoice_page_orientation });
    if (data.invoice_font_family) settingsToUpdate.push({ key: "invoice_font_family", value: data.invoice_font_family });
    if (data.invoice_header_bg_color) settingsToUpdate.push({ key: "invoice_header_bg_color", value: data.invoice_header_bg_color });
    if (data.invoice_table_header_text_color) settingsToUpdate.push({ key: "invoice_table_header_text_color", value: data.invoice_table_header_text_color });
    if (data.invoice_watermark_text) settingsToUpdate.push({ key: "invoice_watermark_text", value: data.invoice_watermark_text });
    if (data.invoice_watermark_opacity !== undefined) settingsToUpdate.push({ key: "invoice_watermark_opacity", value: data.invoice_watermark_opacity.toString() });

    if (data.passport_letter_page_orientation) settingsToUpdate.push({ key: "passport_letter_page_orientation", value: data.passport_letter_page_orientation });
    if (data.passport_letter_font_family) settingsToUpdate.push({ key: "passport_letter_font_family", value: data.passport_letter_font_family });
    if (data.passport_letter_header_text_color) settingsToUpdate.push({ key: "passport_letter_header_text_color", value: data.passport_letter_header_text_color });
    if (data.passport_letter_accent_color) settingsToUpdate.push({ key: "passport_letter_accent_color", value: data.passport_letter_accent_color });

    if (data.leave_permit_page_orientation) settingsToUpdate.push({ key: "leave_permit_page_orientation", value: data.leave_permit_page_orientation });
    if (data.leave_permit_font_family) settingsToUpdate.push({ key: "leave_permit_font_family", value: data.leave_permit_font_family });
    if (data.leave_permit_header_text_color) settingsToUpdate.push({ key: "leave_permit_header_text_color", value: data.leave_permit_header_text_color });
    if (data.leave_permit_accent_color) settingsToUpdate.push({ key: "leave_permit_accent_color", value: data.leave_permit_accent_color });

    if (data.certificate_page_orientation) settingsToUpdate.push({ key: "certificate_page_orientation", value: data.certificate_page_orientation });
    if (data.certificate_font_family) settingsToUpdate.push({ key: "certificate_font_family", value: data.certificate_font_family });
    if (data.certificate_border_color) settingsToUpdate.push({ key: "certificate_border_color", value: data.certificate_border_color });
    if (data.certificate_text_color) settingsToUpdate.push({ key: "certificate_text_color", value: data.certificate_text_color });
    if (data.certificate_background_image_url) settingsToUpdate.push({ key: "certificate_background_image_url", value: data.certificate_background_image_url });

    if (data.general_letter_page_orientation) settingsToUpdate.push({ key: "general_letter_page_orientation", value: data.general_letter_page_orientation });
    if (data.general_letter_font_family) settingsToUpdate.push({ key: "general_letter_font_family", value: data.general_letter_font_family });
    if (data.general_letter_header_text_color) settingsToUpdate.push({ key: "general_letter_header_text_color", value: data.general_letter_header_text_color });
    if (data.general_letter_accent_color) settingsToUpdate.push({ key: "general_letter_accent_color", value: data.general_letter_accent_color });

    updateMultipleSettings(settingsToUpdate);
  };

  const renderTabContent = () => {
    switch (selectedDocument) {
      case "global":
        return (
          <div className="space-y-6">
            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="h-4 w-4" />Desain Global PDF</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pdf_global_font_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Font Default</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="helvetica">Helvetica (Default)</SelectItem>
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
                  name="pdf_global_page_orientation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orientasi Halaman Default</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                  name="pdf_global_accent_color"
                  render={({ field }) => <ColorField label="Warna Aksen (Brand)" field={field} />}
                />
                <FormField
                  control={form.control}
                  name="pdf_global_text_color"
                  render={({ field }) => <ColorField label="Warna Teks Utama" field={field} />}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <FormField control={form.control} name="pdf_global_font_size_header" render={({ field }) => (
                  <FormItem><FormLabel>Size Header (pt)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pdf_global_font_size_body" render={({ field }) => (
                  <FormItem><FormLabel>Size Body (pt)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pdf_global_margin_top" render={({ field }) => (
                  <FormItem><FormLabel>Margin Atas (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pdf_global_margin_bottom" render={({ field }) => (
                  <FormItem><FormLabel>Margin Bawah (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pdf_global_margin_left" render={({ field }) => (
                  <FormItem><FormLabel>Margin Kiri (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pdf_global_margin_right" render={({ field }) => (
                  <FormItem><FormLabel>Margin Kanan (mm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><AlignLeft className="h-4 w-4" />Kop & Informasi Perusahaan</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { name: "pdf_global_show_logo" as const, label: "Tampilkan Logo" },
                  { name: "pdf_global_show_website" as const, label: "Tampilkan Website" },
                  { name: "pdf_global_show_company_info" as const, label: "Tampilkan Info Perusahaan" },
                  { name: "pdf_global_show_address" as const, label: "Tampilkan Alamat" },
                  { name: "pdf_global_show_phone" as const, label: "Tampilkan Telepon" },
                  { name: "pdf_global_show_email" as const, label: "Tampilkan Email" },
                ].map(({ name, label }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel className="mb-0 text-sm">{label}</FormLabel>
                      <FormControl><Switch checked={field.value as boolean} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Footer & Metadata</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { name: "pdf_global_show_timestamp" as const, label: "Waktu Cetak di Footer" },
                  { name: "pdf_global_show_page_number" as const, label: "Nomor Halaman di Footer" },
                ].map(({ name, label }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel className="mb-0 text-sm">{label}</FormLabel>
                      <FormControl><Switch checked={field.value as boolean} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
            </div>
          </div>
        );

      case "invoice":
        return (
          <div className="space-y-6">
            <OverrideBanner
              title="Pengaturan Invoice"
              description="Pengaturan di sini khusus untuk dokumen Invoice. Bidang orientasi dan font yang dikosongkan akan menggunakan pengaturan Global."
            />

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm">Nomor Invoice</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="invoice_number_prefix" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefix Nomor Invoice</FormLabel>
                    <FormControl><Input placeholder="INV" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Contoh: INV-2024-001</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="invoice_number_format" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format Nomor Invoice</FormLabel>
                    <FormControl><Input placeholder="YYYY-MM-{SEQ}" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">YYYY=tahun, MM=bulan, {"{SEQ}"}=urut</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm">Konten Invoice</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { name: "invoice_show_bank_info" as const, label: "Tampilkan Info Bank" },
                  { name: "invoice_watermark_paid" as const, label: "Watermark \"LUNAS\"" },
                  { name: "invoice_show_notes_section" as const, label: "Tampilkan Bagian Catatan" },
                  { name: "invoice_show_package_info" as const, label: "Tampilkan Info Paket & Keberangkatan" },
                ].map(({ name, label }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel className="mb-0 text-sm">{label}</FormLabel>
                      <FormControl><Switch checked={field.value as boolean} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Override Opsional</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <OptionalOrientationField form={form} name="invoice_page_orientation" />
                <OptionalFontField form={form} name="invoice_font_family" />
                <FormField control={form.control} name="invoice_header_bg_color" render={({ field }) => (
                  <ColorField label="Warna Header Invoice (opsional)" field={field} />
                )} />
                <FormField control={form.control} name="invoice_table_header_text_color" render={({ field }) => (
                  <ColorField label="Warna Teks Header Tabel (opsional)" field={field} />
                )} />
              </div>
            </div>
          </div>
        );

      case "passport_letter":
        return (
          <div className="space-y-6">
            <OverrideBanner
              title="Pengaturan Surat Paspor"
              description="Kustomisasi tampilan Surat Pengantar Paspor. Bidang opsional yang dikosongkan akan menggunakan pengaturan Global."
            />

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><BookText className="h-4 w-4" />Konten Surat Paspor</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <FormField control={form.control} name="passport_letter_show_photo" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                      <FormLabel className="mb-0 text-sm">Tampilkan Foto Jamaah</FormLabel>
                      <p className="text-xs text-muted-foreground">Foto pas foto di badan surat</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="passport_letter_show_qr_code" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                      <FormLabel className="mb-0 text-sm">Tampilkan QR Code</FormLabel>
                      <p className="text-xs text-muted-foreground">QR verifikasi dokumen digital</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Override Opsional</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <OptionalOrientationField form={form} name="passport_letter_page_orientation" />
                <OptionalFontField form={form} name="passport_letter_font_family" />
                <FormField control={form.control} name="passport_letter_header_text_color" render={({ field }) => (
                  <ColorField label="Warna Teks Header (opsional)" field={field} />
                )} />
                <FormField control={form.control} name="passport_letter_accent_color" render={({ field }) => (
                  <ColorField label="Warna Aksen Surat (opsional)" field={field} />
                )} />
              </div>
            </div>
          </div>
        );

      case "leave_permit":
        return (
          <div className="space-y-6">
            <OverrideBanner
              title="Pengaturan Surat Izin Cuti"
              description="Kustomisasi tampilan Surat Izin Cuti untuk keperluan Umroh/Haji jamaah. Bidang opsional yang dikosongkan menggunakan pengaturan Global."
            />

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Plane className="h-4 w-4" />Konten Surat Cuti</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <FormField control={form.control} name="leave_permit_include_company_logo" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                      <FormLabel className="mb-0 text-sm">Sertakan Logo Perusahaan</FormLabel>
                      <p className="text-xs text-muted-foreground">Logo di kop surat izin cuti</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Override Opsional</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <OptionalOrientationField form={form} name="leave_permit_page_orientation" />
                <OptionalFontField form={form} name="leave_permit_font_family" />
                <FormField control={form.control} name="leave_permit_header_text_color" render={({ field }) => (
                  <ColorField label="Warna Teks Header (opsional)" field={field} />
                )} />
                <FormField control={form.control} name="leave_permit_accent_color" render={({ field }) => (
                  <ColorField label="Warna Aksen Surat (opsional)" field={field} />
                )} />
              </div>
            </div>
          </div>
        );

      case "certificate":
        return (
          <div className="space-y-6">
            <OverrideBanner
              title="Pengaturan Sertifikat"
              description="Kustomisasi tampilan Sertifikat Penyelesaian Program Umroh/Haji. Warna yang dikosongkan akan menggunakan pengaturan Global."
            />

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Award className="h-4 w-4" />Warna & Desain Sertifikat</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="certificate_border_color" render={({ field }) => (
                  <ColorField label="Warna Border Sertifikat" field={field} />
                )} />
                <FormField control={form.control} name="certificate_text_color" render={({ field }) => (
                  <ColorField label="Warna Teks Sertifikat" field={field} />
                )} />
              </div>
              <FormField control={form.control} name="certificate_background_image_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Gambar Latar (opsional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/background.jpg" {...field} value={field.value || ""} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">URL gambar untuk dijadikan latar sertifikat. Kosongkan jika tidak digunakan.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Override Opsional</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <OptionalOrientationField form={form} name="certificate_page_orientation" />
                <OptionalFontField form={form} name="certificate_font_family" />
              </div>
            </div>
          </div>
        );

      case "general_letter":
        return (
          <div className="space-y-6">
            <OverrideBanner
              title="Pengaturan Surat Umum"
              description="Kustomisasi tampilan Surat Resmi Umum. Berlaku untuk surat-surat yang tidak masuk kategori khusus di atas."
            />

            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Mail className="h-4 w-4" />Konten Surat Umum</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <FormField control={form.control} name="general_letter_show_letterhead" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                      <FormLabel className="mb-0 text-sm">Tampilkan Kop Surat</FormLabel>
                      <p className="text-xs text-muted-foreground">Header dengan info perusahaan</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Override Opsional</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <OptionalOrientationField form={form} name="general_letter_page_orientation" />
                <OptionalFontField form={form} name="general_letter_font_family" />
                <FormField control={form.control} name="general_letter_header_text_color" render={({ field }) => (
                  <ColorField label="Warna Teks Header (opsional)" field={field} />
                )} />
                <FormField control={form.control} name="general_letter_accent_color" render={({ field }) => (
                  <ColorField label="Warna Aksen Surat (opsional)" field={field} />
                )} />
              </div>
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
          Pengaturan Dokumen & Kop Surat
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Atur tampilan PDF global, lalu sesuaikan per jenis dokumen jika diperlukan.
        </p>
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
              <Tabs value={selectedDocument} onValueChange={(v) => setSelectedDocument(v as DocumentType)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50">
                  <TabsTrigger value="global" className="py-2 flex flex-col gap-1">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-[10px]">Global</span>
                  </TabsTrigger>
                  <TabsTrigger value="invoice" className="py-2 flex flex-col gap-1">
                    <File className="h-4 w-4" />
                    <span className="text-[10px]">Invoice</span>
                  </TabsTrigger>
                  <TabsTrigger value="passport_letter" className="py-2 flex flex-col gap-1">
                    <BookText className="h-4 w-4" />
                    <span className="text-[10px]">Paspor</span>
                  </TabsTrigger>
                  <TabsTrigger value="leave_permit" className="py-2 flex flex-col gap-1">
                    <Plane className="h-4 w-4" />
                    <span className="text-[10px]">Cuti</span>
                  </TabsTrigger>
                  <TabsTrigger value="certificate" className="py-2 flex flex-col gap-1">
                    <Award className="h-4 w-4" />
                    <span className="text-[10px]">Sertifikat</span>
                  </TabsTrigger>
                  <TabsTrigger value="general_letter" className="py-2 flex flex-col gap-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-[10px]">Umum</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  {renderTabContent()}
                </div>
              </Tabs>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan Semua Pengaturan
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
