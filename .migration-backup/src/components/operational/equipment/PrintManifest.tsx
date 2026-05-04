import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Distribution } from "@/pages/operational/EquipmentPage";

interface PrintManifestProps {
  distributions: Distribution[] | undefined;
  departureName?: string;
  departureDate?: string;
}

export function PrintManifest({
  distributions,
  departureName,
  departureDate,
}: PrintManifestProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "", "height=600,width=800");
      if (printWindow) {
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownloadPDF = () => {
    // This would require a PDF library like jsPDF or html2pdf
    // For now, we'll just trigger the browser's print-to-PDF
    handlePrint();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Cetak Manifest
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Hidden print content */}
      <div ref={printRef} className="hidden print:block">
        <div className="p-8 bg-white">
          {/* Header */}
          <div className="text-center mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold">MANIFEST PEMBAGIAN PERLENGKAPAN</h1>
            <p className="text-sm text-gray-600 mt-2">
              {departureName && `Keberangkatan: ${departureName}`}
            </p>
            {departureDate && (
              <p className="text-sm text-gray-600">
                Tanggal: {format(new Date(departureDate), "dd MMMM yyyy", {
                  locale: localeId,
                })}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              Dicetak: {format(new Date(), "dd MMMM yyyy HH:mm", {
                locale: localeId,
              })}
            </p>
          </div>

          {/* Table */}
          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="border p-2 text-left text-sm font-bold">No</th>
                <th className="border p-2 text-left text-sm font-bold">Item</th>
                <th className="border p-2 text-left text-sm font-bold">Jamaah</th>
                <th className="border p-2 text-center text-sm font-bold">Qty</th>
                <th className="border p-2 text-left text-sm font-bold">Status</th>
                <th className="border p-2 text-left text-sm font-bold">Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              {distributions?.map((dist, idx) => (
                <tr key={dist.id} className="border-b border-gray-300">
                  <td className="border p-2 text-sm">{idx + 1}</td>
                  <td className="border p-2 text-sm">{dist.equipment?.name}</td>
                  <td className="border p-2 text-sm">{dist.customer?.full_name}</td>
                  <td className="border p-2 text-center text-sm">{dist.quantity}</td>
                  <td className="border p-2 text-sm">
                    {dist.status === "returned" ? "Dikembalikan" : "Terdistribusi"}
                  </td>
                  <td className="border p-2 text-sm h-12"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <p className="text-xs font-semibold mb-8">Pengirim</p>
              <p className="text-xs">(Tanda Tangan & Nama)</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold mb-8">Penerima</p>
              <p className="text-xs">(Tanda Tangan & Nama)</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold mb-8">Diketahui</p>
              <p className="text-xs">(Tanda Tangan & Nama)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview for screen */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-sm">Preview Manifest</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Jamaah</TableHead>
                  <TableHead className="w-16 text-center">Qty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions?.map((dist, idx) => (
                  <TableRow key={dist.id}>
                    <TableCell className="text-sm">{idx + 1}</TableCell>
                    <TableCell className="text-sm">{dist.equipment?.name}</TableCell>
                    <TableCell className="text-sm">{dist.customer?.full_name}</TableCell>
                    <TableCell className="text-center text-sm">{dist.quantity}</TableCell>
                    <TableCell className="text-sm">
                      {dist.status === "returned" ? "Dikembalikan" : "Terdistribusi"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
