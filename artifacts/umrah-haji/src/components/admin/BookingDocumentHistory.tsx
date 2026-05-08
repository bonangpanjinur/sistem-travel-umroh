import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  History, Stamp, Award, Ticket, FileText, ClipboardSignature,
  PackageCheck, Receipt, AlertCircle,
} from "lucide-react";
import type { BookingDocumentLog, DocumentLogType } from "@/hooks/useDocumentLogger";

const DOC_CONFIG: Record<
  DocumentLogType,
  { label: string; icon: typeof Stamp; color: string; bg: string }
> = {
  passport:         { label: "Surat Paspor",         icon: Stamp,            color: "text-violet-700", bg: "bg-violet-100 dark:bg-violet-900/30" },
  certificate:      { label: "Sertifikat Umrah",     icon: Award,            color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  cuti_jamaah:      { label: "Surat Cuti Jamaah",    icon: ClipboardSignature,color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/30" },
  eticket:          { label: "E-Ticket",             icon: Ticket,           color: "text-sky-700",     bg: "bg-sky-100 dark:bg-sky-900/30" },
  general:          { label: "Surat Umum",           icon: FileText,         color: "text-slate-700",   bg: "bg-slate-100 dark:bg-slate-800/60" },
  invoice:          { label: "Invoice",              icon: Receipt,          color: "text-indigo-700",  bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  bulk_passport:    { label: "Surat Paspor (Bulk)",  icon: PackageCheck,     color: "text-violet-700", bg: "bg-violet-100 dark:bg-violet-900/30" },
  bulk_certificate: { label: "Sertifikat (Bulk)",    icon: PackageCheck,     color: "text-emerald-700", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  bulk_cuti:        { label: "Surat Cuti (Bulk)",    icon: PackageCheck,     color: "text-orange-700", bg: "bg-orange-100 dark:bg-orange-900/30" },
};

function DocIcon({ type }: { type: DocumentLogType }) {
  const cfg = DOC_CONFIG[type] ?? DOC_CONFIG.general;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 ${cfg.bg}`}>
      <Icon className={`h-4 w-4 ${cfg.color}`} />
    </span>
  );
}

interface Props {
  bookingId: string;
}

export function BookingDocumentHistory({ bookingId }: Props) {
  const { data: logs, isLoading, isError } = useQuery<BookingDocumentLog[]>({
    queryKey: ["booking-document-logs", bookingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("booking_document_logs")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.message?.includes("does not exist")) return [];
        throw error;
      }
      return (data ?? []) as BookingDocumentLog[];
    },
    retry: false,
    staleTime: 30_000,
  });

  return (
    <Card className="overflow-hidden border-none shadow-md">
      <div className="bg-slate-500/5 px-6 py-4 border-b flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <History className="h-5 w-5" />
          Riwayat Dokumen Diterbitkan
        </h2>
        {!isLoading && !isError && (
          <Badge variant="secondary" className="font-bold">
            {logs?.length ?? 0} Dokumen
          </Badge>
        )}
      </div>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-10 text-center px-6">
            <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Tabel riwayat belum tersedia
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jalankan migration SQL di Supabase Dashboard untuk mengaktifkan fitur ini.
            </p>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center px-6">
            <History className="h-10 w-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">
              Belum ada dokumen yang diterbitkan dari booking ini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const cfg = DOC_CONFIG[log.document_type as DocumentLogType] ?? DOC_CONFIG.general;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <DocIcon type={log.document_type as DocumentLogType} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`text-sm font-bold ${cfg.color}`}>
                        {log.document_label || cfg.label}
                      </span>
                      {log.is_bulk && log.bulk_count && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-bold px-1.5 py-0"
                        >
                          {log.bulk_count} file
                        </Badge>
                      )}
                    </div>
                    {log.jamaah_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        Jamaah: <span className="font-medium text-foreground">{log.jamaah_name}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: id })}
                      </span>
                      {log.generated_by_name && (
                        <span className="text-[10px] text-muted-foreground">
                          oleh <span className="font-medium">{log.generated_by_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
