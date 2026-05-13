import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateUmrahCertificate, type CompanyInfo } from "@/lib/document-generator";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

interface PassengerLike {
  id: string;
  customer?: {
    id?: string;
    full_name?: string | null;
    passport_number?: string | null;
    birth_date?: string | null;
    birth_place?: string | null;
  } | null;
}

interface DepartureLike {
  id: string;
  departure_date?: string | null;
  return_date?: string | null;
  package?: { name?: string | null } | null;
}

interface Props {
  departure: DepartureLike;
  passengers: PassengerLike[];
}

/**
 * K7 — Generate sertifikat massal di DepartureDetail.
 * Loop semua jamaah, generate PDF per jamaah, lalu zip.
 */
export function DepartureCertificateGenerator({ departure, passengers }: Props) {
  const { company } = useCompanyInfo();
  const companyInfo: CompanyInfo = company as CompanyInfo;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(0);

  // Filter unique passengers with customer
  const valid = passengers.filter(
    (p, idx, arr) =>
      p.customer?.id &&
      arr.findIndex((x) => x.customer?.id === p.customer?.id) === idx,
  );

  const handleGenerate = async () => {
    if (valid.length === 0) {
      toast.error("Tidak ada jamaah untuk dibuatkan sertifikat");
      return;
    }
    setRunning(true);
    setProgress(0);
    setDone(0);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folderName = `sertifikat-${(departure.package?.name || "departure")
        .replace(/\s+/g, "-")
        .toLowerCase()}-${departure.id.slice(0, 8)}`;
      const folder = zip.folder(folderName)!;

      const departureDate = departure.departure_date
        ? new Date(departure.departure_date)
        : new Date();
      const returnDate = departure.return_date
        ? new Date(departure.return_date)
        : new Date(departureDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const year = new Date().getFullYear();

      for (let i = 0; i < valid.length; i++) {
        const c = valid[i].customer!;
        const safeName = (c.full_name || "jamaah").replace(/\s+/g, "-");
        const certNo = `CERT/${year}/${departure.id.slice(0, 6).toUpperCase()}-${i + 1}`;
        const doc = await generateUmrahCertificate(
          {
            participantName: c.full_name || "-",
            passportNumber: c.passport_number || "-",
            birthPlace: c.birth_place || "-",
            birthDate: c.birth_date ? new Date(c.birth_date) : new Date(),
            packageName: departure.package?.name || "-",
            departureDate,
            returnDate,
            certificateNumber: certNo,
          },
          companyInfo,
        );
        folder.file(`sertifikat-umrah-${safeName}.pdf`, doc.output("arraybuffer"));
        setDone(i + 1);
        setProgress(Math.round(((i + 1) / valid.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Berhasil membuat ${valid.length} sertifikat`);
    } catch (err: any) {
      console.error("[DepartureCertificateGenerator]", err);
      toast.error(err?.message || "Gagal membuat sertifikat");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Award className="h-5 w-5" />
          Sertifikat Massal Jamaah
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Hasilkan sertifikat umrah untuk seluruh{" "}
          <strong>{valid.length}</strong> jamaah keberangkatan ini sekaligus.
          File akan diunduh dalam bentuk ZIP berisi PDF per jamaah.
        </p>

        {running && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Memproses {done} / {valid.length} sertifikat…
            </p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={running || valid.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sedang membuat…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Cetak Semua Sertifikat ({valid.length})
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}