import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Phone, Mail, MapPin, Globe, Save, Loader2 } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const companySchema = z.object({
  company_name: z.string().min(3, "Nama perusahaan minimal 3 karakter"),
  company_phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  company_email: z.string().email("Format email tidak valid"),
  company_address: z.string().min(5, "Alamat minimal 5 karakter"),
  company_city: z.string().optional(),
  company_website: z.string().optional(),
  company_tagline: z.string().optional(),
  company_license: z.string().optional(),
});
type CompanyFormData = z.infer<typeof companySchema>;

export function CompanySection() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "", company_phone: "", company_email: "", company_address: "",
      company_city: "", company_website: "", company_tagline: "", company_license: "",
    },
  });

  useEffect(() => {
    if (!isLoading) {
      form.reset({
        company_name:    getSetting("company_name")    || "",
        company_phone:   getSetting("company_phone")   || "",
        company_email:   getSetting("company_email")   || "",
        company_address: getSetting("company_address") || "",
        company_city:    getSetting("company_city")    || "",
        company_website: getSetting("company_website") || "",
        company_tagline: getSetting("company_tagline") || "",
        company_license: getSetting("company_license") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const onSubmit = (data: CompanyFormData) => {
    updateMultipleSettings([
      { key: "company_name",    value: data.company_name },
      { key: "company_phone",   value: data.company_phone },
      { key: "company_email",   value: data.company_email },
      { key: "company_address", value: data.company_address },
      { key: "company_city",    value: data.company_city    || "" },
      { key: "company_website", value: data.company_website || "" },
      { key: "company_tagline", value: data.company_tagline || "" },
      { key: "company_license", value: data.company_license || "" },
    ]);
  };

  return (
    <>
      <SectionHead icon={Building2} title="Data Perusahaan" desc="Informasi yang muncul di kop surat dan dokumen resmi" />
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="company_name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Nama Perusahaan *</FormLabel>
                    <FormControl><Input placeholder="PT. Umrah Haji Travel Indonesia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_tagline" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tagline / Slogan</FormLabel>
                    <FormControl><Input placeholder="Perjalanan Suci Anda, Amanah Kami" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telepon *</FormLabel>
                    <FormControl><Input placeholder="+62 21-1234-5678" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email *</FormLabel>
                    <FormControl><Input placeholder="info@perusahaan.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_city" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Kota</FormLabel>
                    <FormControl><Input placeholder="Jakarta" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_website" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</FormLabel>
                    <FormControl><Input placeholder="https://perusahaan.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_address" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Alamat Lengkap *</FormLabel>
                    <FormControl><Textarea placeholder="Jl. Raya No. 123, Jakarta Selatan 12345" rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company_license" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nomor Izin PPIU / SK</FormLabel>
                    <FormControl><Input placeholder="No. SK. D/223/2020..." {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Muncul di kop surat resmi dokumen</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end pt-2 border-t">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan Data Perusahaan</>}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}