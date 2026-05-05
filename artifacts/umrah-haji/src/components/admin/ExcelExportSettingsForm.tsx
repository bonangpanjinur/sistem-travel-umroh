import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileSpreadsheet, RotateCcw } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { DEFAULT_EXCEL_STYLE, ExcelStyleConfig } from "@/lib/dynamic-excel-exporter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const excelStyleSchema = z.object({
  title_bg_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  title_text_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  title_font_size: z.number().min(8).max(20),
  title_bold: z.boolean(),

  header_bg_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  header_text_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  header_font_size: z.number().min(8).max(16),
  header_bold: z.boolean(),

  section_bg_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  section_text_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  section_font_size: z.number().min(8).max(16),
  section_bold: z.boolean(),

  summary_bg_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  summary_text_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),

  row_bg_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  row_text_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  alt_row_bg_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),

  border_color: z.string().regex(/^[0-9A-F]{6}$/i, "Format hex tidak valid"),
  border_style: z.enum(['thin', 'medium', 'thick']),

  body_font_size: z.number().min(8).max(14),
  footer_font_size: z.number().min(7).max(12),
});

type ExcelStyleFormData = z.infer<typeof excelStyleSchema>;

export function ExcelExportSettingsForm() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();
  const [previewColors, setPreviewColors] = useState<Record<string, string>>({});

  const form = useForm<ExcelStyleFormData>({
    resolver: zodResolver(excelStyleSchema),
    defaultValues: {
      title_bg_color: DEFAULT_EXCEL_STYLE.title_bg_color,
      title_text_color: DEFAULT_EXCEL_STYLE.title_text_color,
      title_font_size: DEFAULT_EXCEL_STYLE.title_font_size,
      title_bold: DEFAULT_EXCEL_STYLE.title_bold,

      header_bg_color: DEFAULT_EXCEL_STYLE.header_bg_color,
      header_text_color: DEFAULT_EXCEL_STYLE.header_text_color,
      header_font_size: DEFAULT_EXCEL_STYLE.header_font_size,
      header_bold: DEFAULT_EXCEL_STYLE.header_bold,

      section_bg_color: DEFAULT_EXCEL_STYLE.section_bg_color,
      section_text_color: DEFAULT_EXCEL_STYLE.section_text_color,
      section_font_size: DEFAULT_EXCEL_STYLE.section_font_size,
      section_bold: DEFAULT_EXCEL_STYLE.section_bold,

      summary_bg_color: DEFAULT_EXCEL_STYLE.summary_bg_color,
      summary_text_color: DEFAULT_EXCEL_STYLE.summary_text_color,

      row_bg_color: DEFAULT_EXCEL_STYLE.row_bg_color,
      row_text_color: DEFAULT_EXCEL_STYLE.row_text_color,
      alt_row_bg_color: DEFAULT_EXCEL_STYLE.alt_row_bg_color,

      border_color: DEFAULT_EXCEL_STYLE.border_color,
      border_style: DEFAULT_EXCEL_STYLE.border_style,

      body_font_size: DEFAULT_EXCEL_STYLE.body_font_size,
      footer_font_size: DEFAULT_EXCEL_STYLE.footer_font_size,
    },
  });

  // Load settings from database
  useEffect(() => {
    if (!isLoading) {
      const loadedSettings: ExcelStyleFormData = {
        title_bg_color: getSetting('excel_title_bg_color') || DEFAULT_EXCEL_STYLE.title_bg_color,
        title_text_color: getSetting('excel_title_text_color') || DEFAULT_EXCEL_STYLE.title_text_color,
        title_font_size: parseInt(getSetting('excel_title_font_size')) || DEFAULT_EXCEL_STYLE.title_font_size,
        title_bold: getSetting('excel_title_bold') !== 'false',

        header_bg_color: getSetting('excel_header_bg_color') || DEFAULT_EXCEL_STYLE.header_bg_color,
        header_text_color: getSetting('excel_header_text_color') || DEFAULT_EXCEL_STYLE.header_text_color,
        header_font_size: parseInt(getSetting('excel_header_font_size')) || DEFAULT_EXCEL_STYLE.header_font_size,
        header_bold: getSetting('excel_header_bold') !== 'false',

        section_bg_color: getSetting('excel_section_bg_color') || DEFAULT_EXCEL_STYLE.section_bg_color,
        section_text_color: getSetting('excel_section_text_color') || DEFAULT_EXCEL_STYLE.section_text_color,
        section_font_size: parseInt(getSetting('excel_section_font_size')) || DEFAULT_EXCEL_STYLE.section_font_size,
        section_bold: getSetting('excel_section_bold') !== 'false',

        summary_bg_color: getSetting('excel_summary_bg_color') || DEFAULT_EXCEL_STYLE.summary_bg_color,
        summary_text_color: getSetting('excel_summary_text_color') || DEFAULT_EXCEL_STYLE.summary_text_color,

        row_bg_color: getSetting('excel_row_bg_color') || DEFAULT_EXCEL_STYLE.row_bg_color,
        row_text_color: getSetting('excel_row_text_color') || DEFAULT_EXCEL_STYLE.row_text_color,
        alt_row_bg_color: getSetting('excel_alt_row_bg_color') || DEFAULT_EXCEL_STYLE.alt_row_bg_color,

        border_color: getSetting('excel_border_color') || DEFAULT_EXCEL_STYLE.border_color,
        border_style: (getSetting('excel_border_style') as 'thin' | 'medium' | 'thick') || DEFAULT_EXCEL_STYLE.border_style,

        body_font_size: parseInt(getSetting('excel_body_font_size')) || DEFAULT_EXCEL_STYLE.body_font_size,
        footer_font_size: parseInt(getSetting('excel_footer_font_size')) || DEFAULT_EXCEL_STYLE.footer_font_size,
      };

      form.reset(loadedSettings);
      updatePreviewColors(loadedSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const updatePreviewColors = (data: ExcelStyleFormData) => {
    setPreviewColors({
      title: `#${data.title_bg_color}`,
      header: `#${data.header_bg_color}`,
      section: `#${data.section_bg_color}`,
      summary: `#${data.summary_bg_color}`,
      row: `#${data.row_bg_color}`,
      altRow: `#${data.alt_row_bg_color}`,
      border: `#${data.border_color}`,
    });
  };

  const onSave = (data: ExcelStyleFormData) => {
    updateMultipleSettings([
      { key: 'excel_title_bg_color', value: data.title_bg_color },
      { key: 'excel_title_text_color', value: data.title_text_color },
      { key: 'excel_title_font_size', value: data.title_font_size.toString() },
      { key: 'excel_title_bold', value: data.title_bold.toString() },

      { key: 'excel_header_bg_color', value: data.header_bg_color },
      { key: 'excel_header_text_color', value: data.header_text_color },
      { key: 'excel_header_font_size', value: data.header_font_size.toString() },
      { key: 'excel_header_bold', value: data.header_bold.toString() },

      { key: 'excel_section_bg_color', value: data.section_bg_color },
      { key: 'excel_section_text_color', value: data.section_text_color },
      { key: 'excel_section_font_size', value: data.section_font_size.toString() },
      { key: 'excel_section_bold', value: data.section_bold.toString() },

      { key: 'excel_summary_bg_color', value: data.summary_bg_color },
      { key: 'excel_summary_text_color', value: data.summary_text_color },

      { key: 'excel_row_bg_color', value: data.row_bg_color },
      { key: 'excel_row_text_color', value: data.row_text_color },
      { key: 'excel_alt_row_bg_color', value: data.alt_row_bg_color },

      { key: 'excel_border_color', value: data.border_color },
      { key: 'excel_border_style', value: data.border_style },

      { key: 'excel_body_font_size', value: data.body_font_size.toString() },
      { key: 'excel_footer_font_size', value: data.footer_font_size.toString() },
    ]);

    updatePreviewColors(data);
  };

  const resetToDefault = () => {
    form.reset({
      title_bg_color: DEFAULT_EXCEL_STYLE.title_bg_color,
      title_text_color: DEFAULT_EXCEL_STYLE.title_text_color,
      title_font_size: DEFAULT_EXCEL_STYLE.title_font_size,
      title_bold: DEFAULT_EXCEL_STYLE.title_bold,

      header_bg_color: DEFAULT_EXCEL_STYLE.header_bg_color,
      header_text_color: DEFAULT_EXCEL_STYLE.header_text_color,
      header_font_size: DEFAULT_EXCEL_STYLE.header_font_size,
      header_bold: DEFAULT_EXCEL_STYLE.header_bold,

      section_bg_color: DEFAULT_EXCEL_STYLE.section_bg_color,
      section_text_color: DEFAULT_EXCEL_STYLE.section_text_color,
      section_font_size: DEFAULT_EXCEL_STYLE.section_font_size,
      section_bold: DEFAULT_EXCEL_STYLE.section_bold,

      summary_bg_color: DEFAULT_EXCEL_STYLE.summary_bg_color,
      summary_text_color: DEFAULT_EXCEL_STYLE.summary_text_color,

      row_bg_color: DEFAULT_EXCEL_STYLE.row_bg_color,
      row_text_color: DEFAULT_EXCEL_STYLE.row_text_color,
      alt_row_bg_color: DEFAULT_EXCEL_STYLE.alt_row_bg_color,

      border_color: DEFAULT_EXCEL_STYLE.border_color,
      border_style: DEFAULT_EXCEL_STYLE.border_style,

      body_font_size: DEFAULT_EXCEL_STYLE.body_font_size,
      footer_font_size: DEFAULT_EXCEL_STYLE.footer_font_size,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Pengaturan Export Excel
        </CardTitle>
        <CardDescription>
          Kustomisasi warna, font, dan styling untuk export Excel booking dan statistik
        </CardDescription>
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
              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="colors">Warna</TabsTrigger>
                  <TabsTrigger value="fonts">Font</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                {/* Colors Tab */}
                <TabsContent value="colors" className="space-y-6 mt-6">
                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Warna Judul</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title_bg_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Judul</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="1E40AF" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="title_text_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warna Teks Judul</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="FFFFFF" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Warna Header Tabel</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="header_bg_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Header</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="2563EB" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="header_text_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warna Teks Header</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="FFFFFF" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Warna Bagian</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="section_bg_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Bagian</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="DBEAFE" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="section_text_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warna Teks Bagian</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="1E3A8A" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Warna Ringkasan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="summary_bg_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Ringkasan</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="FEF3C7" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="summary_text_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warna Teks Ringkasan</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="78350F" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Warna Baris Data</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="row_bg_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Baris</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="F9FAFB" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alt_row_bg_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Baris Alternatif</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="FFFFFF" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Warna Lainnya</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="row_text_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warna Teks Baris</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="1F2937" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="border_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warna Border</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input type="color" {...field} value={`#${field.value}`} onChange={(e) => field.onChange(e.target.value.replace('#', ''))} className="h-10 w-20" />
                              </FormControl>
                              <FormControl>
                                <Input {...field} placeholder="E5E7EB" className="flex-1" />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Fonts Tab */}
                <TabsContent value="fonts" className="space-y-6 mt-6">
                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Ukuran Font Judul</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ukuran Font (pt)</FormLabel>
                            <FormControl>
                              <Input type="number" min="8" max="20" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="title_bold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bold</FormLabel>
                            <FormControl>
                              <select {...field} value={field.value ? 'true' : 'false'} onChange={(e) => field.onChange(e.target.value === 'true')} className="w-full px-3 py-2 border rounded-md">
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Ukuran Font Header</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="header_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ukuran Font (pt)</FormLabel>
                            <FormControl>
                              <Input type="number" min="8" max="16" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="header_bold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bold</FormLabel>
                            <FormControl>
                              <select {...field} value={field.value ? 'true' : 'false'} onChange={(e) => field.onChange(e.target.value === 'true')} className="w-full px-3 py-2 border rounded-md">
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Ukuran Font Bagian</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="section_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ukuran Font (pt)</FormLabel>
                            <FormControl>
                              <Input type="number" min="8" max="16" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="section_bold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bold</FormLabel>
                            <FormControl>
                              <select {...field} value={field.value ? 'true' : 'false'} onChange={(e) => field.onChange(e.target.value === 'true')} className="w-full px-3 py-2 border rounded-md">
                                <option value="true">Ya</option>
                                <option value="false">Tidak</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pb-4 border-b">
                    <h3 className="font-semibold text-sm">Ukuran Font Body & Footer</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="body_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Body Font Size (pt)</FormLabel>
                            <FormControl>
                              <Input type="number" min="8" max="14" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="footer_font_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Footer Font Size (pt)</FormLabel>
                            <FormControl>
                              <Input type="number" min="7" max="12" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Gaya Border</h3>
                    <FormField
                      control={form.control}
                      name="border_style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gaya Border</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full px-3 py-2 border rounded-md">
                              <option value="thin">Tipis</option>
                              <option value="medium">Sedang</option>
                              <option value="thick">Tebal</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Preview Warna</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Judul</Label>
                        <div
                          className="h-16 rounded border flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: previewColors.title || `#${DEFAULT_EXCEL_STYLE.title_bg_color}` }}
                        >
                          LAPORAN
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Header Tabel</Label>
                        <div
                          className="h-16 rounded border flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: previewColors.header || `#${DEFAULT_EXCEL_STYLE.header_bg_color}` }}
                        >
                          HEADER
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Bagian</Label>
                        <div
                          className="h-16 rounded border flex items-center justify-center font-bold"
                          style={{ backgroundColor: previewColors.section || `#${DEFAULT_EXCEL_STYLE.section_bg_color}`, color: previewColors.section ? '#1E3A8A' : '#1E3A8A' }}
                        >
                          BAGIAN
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Ringkasan</Label>
                        <div
                          className="h-16 rounded border flex items-center justify-center font-bold"
                          style={{ backgroundColor: previewColors.summary || `#${DEFAULT_EXCEL_STYLE.summary_bg_color}`, color: '#78350F' }}
                        >
                          RINGKASAN
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Baris Data</Label>
                        <div className="flex gap-1 h-16 rounded border overflow-hidden">
                          <div
                            className="flex-1 flex items-center justify-center"
                            style={{ backgroundColor: previewColors.row || `#${DEFAULT_EXCEL_STYLE.row_bg_color}` }}
                          >
                            Data 1
                          </div>
                          <div
                            className="flex-1 flex items-center justify-center"
                            style={{ backgroundColor: previewColors.altRow || `#${DEFAULT_EXCEL_STYLE.alt_row_bg_color}` }}
                          >
                            Data 2
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Border</Label>
                        <div
                          className="h-16 rounded flex items-center justify-center"
                          style={{ borderColor: previewColors.border || `#${DEFAULT_EXCEL_STYLE.border_color}`, borderWidth: '2px' }}
                        >
                          Border
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Simpan Pengaturan
                </Button>
                <Button type="button" variant="outline" onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset ke Default
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
