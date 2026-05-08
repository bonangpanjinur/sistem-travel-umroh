import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Hash, Copy, RefreshCcw, CheckCircle2, AlertCircle, Search,
  Download, Users, CreditCard, TrendingUp, Info, Zap, Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import * as XLSX from "xlsx";

const BANK_PREFIX: Record<string, string> = {
  BCA: "1234",
  BNI: "8808",
  BRI: "8807",
  Mandiri: "8800",
  BSI: "8809",
};

function generateVA(customerId: string, bankCode: string): string {
  const prefix = BANK_PREFIX[bankCode] || "9999";
  const hash = customerId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const checksum = (parseInt(hash.replace(/[^0-9]/g, "0").slice(0, 4)) % 97).toString().padStart(2, "0");
  return `${prefix}${hash.replace(/[^0-9]/g, "").slice(0, 6)}${checksum}`;
}

export default function AdminVirtualAccount() {
  const queryClient = useQueryClient();
  const [selectedBank, setSelectedBank] = useState("BCA");
  const [search, setSearch] = useState("");
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [vaData, setVaData] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("va_data") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('virtual_accounts').select('customer_id,bank_code,va_number');
        if (!data?.length) return;
        const map: Record<string, string> = {};
        for (const row of data) map[`${row.customer_id}_${row.bank_code}`] = row.va_number;
        setVaData(prev => ({ ...prev, ...map }));
        localStorage.setItem("va_data", JSON.stringify({ ...JSON.parse(localStorage.getItem("va_data") || "{}"), ...map }));
      } catch {}
    })();
  }, []);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["va-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, phone, email,
          bookings(id, booking_code, booking_status, total_amount)
        `)
        .eq("role", "customer")
        .order("full_name");
      if (error) throw error;
      return (data || []).filter((c: any) => (c.bookings || []).length > 0);
    },
  });

  const filtered = (customers as any[]).filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  function getVA(customerId: string): string | null {
    return vaData[`${customerId}_${selectedBank}`] || null;
  }

  async function generateForCustomer(customer: any) {
    setGeneratingIds(prev => new Set(prev).add(customer.id));
    const va = generateVA(customer.id, selectedBank);
    const key = `${customer.id}_${selectedBank}`;
    const next = { ...vaData, [key]: va };
    setVaData(next);
    localStorage.setItem("va_data", JSON.stringify(next));
    try {
      await supabase.from('virtual_accounts').upsert(
        { customer_id: customer.id, bank_code: selectedBank, va_number: va },
        { onConflict: 'customer_id,bank_code' }
      );
    } catch {}
    setGeneratingIds(prev => { const s = new Set(prev); s.delete(customer.id); return s; });
    toast.success(`VA ${selectedBank} digenerate untuk ${customer.full_name}`);
  }

  async function generateAll() {
    setGeneratingAll(true);
    let next = { ...vaData };
    const rows: any[] = [];
    for (const customer of filtered) {
      const va = generateVA(customer.id, selectedBank);
      next[`${customer.id}_${selectedBank}`] = va;
      rows.push({ customer_id: customer.id, bank_code: selectedBank, va_number: va });
    }
    setVaData(next);
    localStorage.setItem("va_data", JSON.stringify(next));
    try {
      await supabase.from('virtual_accounts').upsert(rows, { onConflict: 'customer_id,bank_code' });
    } catch {}
    setGeneratingAll(false);
    toast.success(`${filtered.length} Virtual Account ${selectedBank} berhasil digenerate`);
  }

  function copyVA(va: string, name: string) {
    navigator.clipboard.writeText(va);
    toast.success(`VA ${name} disalin`);
  }

  function exportExcel() {
    const rows = filtered.map(c => ({
      "Nama": c.full_name,
      "Email": c.email,
      "Telepon": c.phone,
      [`VA ${selectedBank}`]: getVA(c.id) || "Belum digenerate",
      "Booking Aktif": (c.bookings || []).filter((b: any) => b.booking_status !== "cancelled").length,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Virtual Account");
    XLSX.writeFile(wb, `VA_${selectedBank}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Export Excel berhasil");
  }

  const generatedCount = filtered.filter(c => getVA(c.id)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hash className="h-6 w-6 text-indigo-500" />
            Nomor Rekening Virtual (VA)
          </h1>
          <p className="text-muted-foreground mt-1">Generate kode transfer unik per jamaah untuk identifikasi pembayaran otomatis</p>
        </div>
        <div className="flex gap-2">
          <Badge className="gap-1 bg-indigo-100 text-indigo-700 border-0">
            <CheckCircle2 className="h-3 w-3" /> {generatedCount}/{filtered.length} Generated
          </Badge>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Setiap jamaah mendapat nomor Virtual Account unik per bank. Saat jamaah transfer ke VA ini, sistem dapat langsung mengidentifikasi pembayaran tanpa perlu konfirmasi manual. Untuk implementasi penuh, integrasikan dengan Midtrans VA atau bank langsung.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-lg"><Users className="h-5 w-5 text-indigo-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Jamaah</p><p className="text-xl font-bold">{customers.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">VA Tergenerate</p><p className="text-xl font-bold">{generatedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-lg"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-sm text-muted-foreground">Belum Ada VA</p><p className="text-xl font-bold">{filtered.length - generatedCount}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Daftar Virtual Account Jamaah</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(BANK_PREFIX).map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-48" placeholder="Cari jamaah..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
              <Button onClick={generateAll} disabled={generatingAll}>
                {generatingAll ? <RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                Generate Semua
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Memuat data...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Tidak ada data jamaah</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Jamaah</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Booking Aktif</TableHead>
                  <TableHead>VA {selectedBank}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer: any) => {
                  const va = getVA(customer.id);
                  const activeBookings = (customer.bookings || []).filter((b: any) => b.booking_status !== "cancelled").length;
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{customer.full_name}</p>
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{customer.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{activeBookings} booking</Badge>
                      </TableCell>
                      <TableCell>
                        {va ? (
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{va}</code>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyVA(va, customer.full_name)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Belum digenerate</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={generatingIds.has(customer.id)}
                          onClick={() => generateForCustomer(customer)}
                        >
                          {generatingIds.has(customer.id) ? <RefreshCcw className="h-3 w-3 animate-spin" /> : va ? <RefreshCcw className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                          {!generatingIds.has(customer.id) && (va ? "Regenerate" : "Generate")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
