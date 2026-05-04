import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText } from "lucide-react";
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
  letterhead_show_logo: z.boolean(),
  letterhead_show_website: z.boolean(),
  invoice_number_prefix: z.string().min(1, "Prefix tidak boleh kosong"),
  invoice_number_format: z.string().min(1, "Format tidak boleh kosong"),
  invoice_show_bank_info: z.boolean(),
  invoice_show_notes_section: z.boolean(),
  eticket_header_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  certificate_border_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  certificate_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid"),
  document_footer_show_timestamp: z.boolean(),
  document_footer_show_page_number: z.boolean(),
});

type DocumentSettingsFormData = z.infer<typeof documentSettingsSchema>;

export function DocumentSettingsForm() {
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
      eticket_header_color: "#16a34a",
      certificate_border_color: "#daa520",
      certificate_text_color: "#165634",
      document_footer_show_timestamp: true,
      document_footer_show_page_number: true,
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
        eticket_header_color: getSetting("eticket_header_color") || "#16a34a",
        certificate_border_color: getSetting("certificate_border_color") || "#daa520",
        certificate_text_color: getSetting("certificate_text_color") || "#165634",
        document_footer_show_timestamp: getSetting("document_footer_show_timestamp") !== "false",
        document_footer_show_page_number: getSetting("document_footer_show_page_number") !== "false",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const onSave = (data: DocumentSettingsFormData) => {
    updateMultipleSettings([
      { key: "company_city", value: data.company_city },
      { key: "company_website", value: data.company_website },
      { key: "letterhead_show_logo", value: data.letterhead_show_logo },
      { key: "letterhead_show_website", value: data.letterhead_show_website },
      { key: "invoice_number_prefix", value: data.invoice_number_prefix },
      { key: "invoice_number_format", value: data.invoice_number_format },
      { key: "invoice_show_bank_info", value: data.invoice_show_bank_info },
      { key: "invoice_show_notes_section", value: data.invoice_show_notes_section },
      { key: "eticket_header_color", value: data.eticket_header_color },
      { key: "certificate_border_color", value: data.certificate_border_color },
      { key: "certificate_text_color", value: data.certificate_text_color },
      { key: "document_footer_show_timestamp", value: data.document_footer_show_timestamp },
      { key: "document_footer_show_page_number", value: data.document_footer_show_page_number },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Pengaturan Dokumen & Kop Surat
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
              {/* Basic Info */}
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
                  <strong>Catatan:</strong> Nama, Alamat, Telepon, dan Email perusahaan diambil dari <strong>Master Data Informasi Perusahaan</strong> untuk menjaga konsistensi dokumen.
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

              {/* Invoice Settings */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm">Pengaturan Invoice</h3>

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

                <FormField
                  control={form.control}
                  name="invoice_show_bank_info"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel className="mb-0">Tampilkan Info Bank di Invoice</FormLabel>
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
                      <FormLabel className="mb-0">Tampilkan Bagian Catatan di Invoice</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Color Settings */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm">Pengaturan Warna Dokumen</h3>

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

              {/* Footer Settings */}
              <div className="space-y-4 pb-4">
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

              <Button type="submit" disabled={isUpdating}>
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
