import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { History, AlertCircle, Copy, Search, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

interface PackagePriceAuditCardProps {
  packageId: string;
}

const ROOM_LABELS: Record<string, string> = {
  price_quad: "Quad",
  price_triple: "Triple",
  price_double: "Double",
  price_single: "Single",
};

const SQL_SETUP = `-- Jalankan di Supabase SQL Editor jika tabel belum ada:
CREATE TABLE IF NOT EXISTS departure_price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  package_id uuid REFERENCES packages(id),
  changed_at timestamptz DEFAULT now(),
  price_quad numeric DEFAULT 0,
  price_triple numeric DEFAULT 0,
  price_double numeric DEFAULT 0,
  price_single numeric DEFAULT 0,
  keterangan text,
  changed_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dph_departure_id ON departure_price_history(departure_id);
CREATE INDEX IF NOT EXISTS idx_dph_changed_at ON departure_price_history(changed_at);`;

function DiffBadge({ current, prev, field }: { current: number; prev: number | null; field: string }) {
  if (prev === null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - prev;
  if (diff === 0) return <Minus className="h-3 w-3 text-muted-foreground inline" />;
  const isUp = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-red-600" : "text-green-600"}`}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatCurrency(Math.abs(diff))}
    </span>
  );
}

export function PackagePriceAuditCard({ packageId }: PackagePriceAuditCardProps) {
  const [search, setSearch] = useState("");
  const [showSql, setShowSql] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const db = supabase as any;

  const { data: history = [], isLoading, error } = useQuery({
    queryKey: ["package-price-audit", packageId],
    queryFn: async () => {
      const { data, error } = await db
        .from("departure_price_history")
        .select("*, departures(departure_date, package_id)")
        .eq("package_id", packageId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    retry: false,
  });

  const isDbMissing =
    error && (String(error).includes("does not exist") || String(error).includes("42P01"));

  const filtered = history.filter((row: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (row.changed_by || "").toLowerCase().includes(q) ||
      (row.keterangan || "").toLowerCase().includes(q) ||
      (row.departures?.departure_date || "").includes(q)
    );
  });

  const groupedByDeparture: Record<string, any[]> = {};
  [...history].reverse().forEach((row: any) => {
    const key = row.departure_id;
    if (!groupedByDeparture[key]) groupedByDeparture[key] = [];
    groupedByDeparture[key].push(row);
  });

  function getPrev(row: any, field: string): number | null {
    const key = row.departure_id;
    const group = groupedByDeparture[key] || [];
    const idx = group.findIndex((r: any) => r.id === row.id);
    if (idx <= 0) return null;
    return Number(group[idx - 1]?.[field] ?? 0);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Riwayat Perubahan Harga Paket
          {history.length > 0 && (
            <Badge variant="secondary">{history.length} entri</Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 w-7 p-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {isDbMissing ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Tabel <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">departure_price_history</code> belum ada.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Jalankan SQL berikut di Supabase SQL Editor untuk mengaktifkan fitur riwayat harga.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowSql((v) => !v)}>
                {showSql ? "Sembunyikan SQL" : "Tampilkan SQL Setup"}
              </Button>
              {showSql && (
                <div className="relative">
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{SQL_SETUP}</pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => { navigator.clipboard.writeText(SQL_SETUP); toast.success("SQL disalin"); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Memuat riwayat harga…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Belum ada riwayat perubahan harga untuk paket ini.</p>
              <p className="text-xs mt-1">Riwayat otomatis tercatat saat admin mengubah harga di tiap keberangkatan.</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Cari oleh siapa, tanggal, atau keterangan…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="min-w-[120px]">Waktu Perubahan</TableHead>
                      <TableHead className="min-w-[100px]">Keberangkatan</TableHead>
                      <TableHead className="text-right">Quad</TableHead>
                      <TableHead className="text-right">Triple</TableHead>
                      <TableHead className="text-right">Double</TableHead>
                      <TableHead className="text-right">Single</TableHead>
                      <TableHead className="min-w-[100px]">Oleh</TableHead>
                      <TableHead className="min-w-[140px]">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-6">
                          Tidak ada entri yang cocok
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row: any, idx: number) => {
                        const changedAt = row.changed_at
                          ? format(parseISO(row.changed_at), "dd MMM yyyy HH:mm", { locale: idLocale })
                          : "-";
                        const depDate = row.departures?.departure_date
                          ? format(parseISO(row.departures.departure_date), "dd MMM yyyy", { locale: idLocale })
                          : "Belum ditentukan";

                        const isFirst = idx === filtered.length - 1;

                        return (
                          <TableRow key={row.id} className="text-xs">
                            <TableCell className="font-mono text-xs">{changedAt}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-normal">{depDate}</Badge>
                            </TableCell>
                            {(["price_quad", "price_triple", "price_double", "price_single"] as const).map((field) => {
                              const prev = getPrev(row, field);
                              return (
                                <TableCell key={field} className="text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-medium">{formatCurrency(Number(row[field] ?? 0))}</span>
                                    {!isFirst && <DiffBadge current={Number(row[field] ?? 0)} prev={prev} field={field} />}
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="truncate max-w-[80px] block cursor-default text-muted-foreground">
                                      {row.changed_by || <span className="italic opacity-50">—</span>}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{row.changed_by || "Tidak tercatat"}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[160px] truncate">
                              {row.keterangan || <span className="italic opacity-50">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground text-right">
                Menampilkan {filtered.length} dari {history.length} entri · diurutkan terbaru dulu
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
