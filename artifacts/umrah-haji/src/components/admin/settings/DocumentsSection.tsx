import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight, Palette } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { DocumentLayoutEditor } from "@/components/admin/appearance/DocumentLayoutEditor";
import { DocumentSettingsFormExtended } from "@/components/admin/DocumentSettingsForm.extended";

export function DocumentsSection() {
  return (
    <>
      <SectionHead icon={FileText} title="Dokumen & Template Surat" desc="Pengaturan kop surat, warna invoice, dan tampilan dokumen PDF" />
      <div className="space-y-8">
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                Template Form Transaksi Umrah
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Konfigurasi layout PDF, informasi pembayaran dinamis, syarat &amp; ketentuan, dan tanda tangan.
                Template ini digunakan saat mencetak "Form Transaksi" dari halaman booking.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-2"
              onClick={() => window.location.href = "/admin/invoice-template"}
            >
              <ChevronRight className="h-4 w-4" />
              Buka Editor Template
            </Button>
          </CardContent>
        </Card>

        <DocumentSettingsFormExtended />
        <div className="pt-8 border-t">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Layout & Preview Per Dokumen
          </h3>
          <DocumentLayoutEditor />
        </div>
      </div>
    </>
  );
}