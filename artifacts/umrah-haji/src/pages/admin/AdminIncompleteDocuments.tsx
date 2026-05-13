import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileWarning, ExternalLink } from "lucide-react";

/**
 * KEP-FIX4 — Dashboard "Jamaah Belum Lengkap Dokumen"
 * Menampilkan jamaah dengan dokumen wajib (KTP, Paspor) belum lengkap atau belum diverifikasi.
 */
export default function AdminIncompleteDocuments() {
  const { data, isLoading } = useQuery({
    queryKey: ["incomplete-documents"],
    queryFn: async () => {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, full_name, phone, ktp_number, passport_number, passport_expiry, branch_id")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!customers) return [];
      const ids = customers.map((c: any) => c.id);
      const { data: docs } = await supabase
        .from("customer_documents")
        .select("customer_id, document_type, status")
        .in("customer_id", ids);

      return customers.map((c: any) => {
        const cd = (docs || []).filter((d: any) => d.customer_id === c.id);
        const ktpVerified = cd.some((d: any) => d.document_type === "ktp" && d.status === "verified");
        const passportVerified = cd.some((d: any) => d.document_type === "passport" && d.status === "verified");
        const missingFields: string[] = [];
        if (!c.ktp_number) missingFields.push("Nomor KTP");
        if (!c.passport_number) missingFields.push("Nomor Paspor");
        if (!c.passport_expiry) missingFields.push("Masa berlaku Paspor");
        if (!ktpVerified) missingFields.push("Upload/verif KTP");
        if (!passportVerified) missingFields.push("Upload/verif Paspor");
        return { ...c, missingFields };
      }).filter((c: any) => c.missingFields.length > 0);
    },
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning className="h-6 w-6" /> Jamaah Belum Lengkap Dokumen
        </h1>
        <p className="text-muted-foreground text-sm">
          Daftar jamaah yang masih kekurangan data atau belum mengunggah dokumen wajib.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {isLoading ? "Memuat..." : `${data?.length || 0} jamaah belum lengkap`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (data?.length || 0) === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Semua jamaah sudah lengkap dokumennya.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jamaah</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Yang Belum Lengkap</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.missingFields.map((f: string) => (
                            <Badge key={f} variant="destructive" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/customers/${c.id}`}>
                            <ExternalLink className="h-3 w-3 mr-1" /> Lihat
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}