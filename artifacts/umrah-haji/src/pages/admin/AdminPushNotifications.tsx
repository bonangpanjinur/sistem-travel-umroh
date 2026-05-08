import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Bell, Send, Users, CheckCircle2, XCircle, Clock, Search, Info, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

const NOTIF_TYPES = [
  { value: "info", label: "Informasi", color: "bg-blue-100 text-blue-800" },
  { value: "warning", label: "Peringatan", color: "bg-amber-100 text-amber-800" },
  { value: "success", label: "Sukses", color: "bg-green-100 text-green-800" },
  { value: "urgent", label: "Penting/Mendesak", color: "bg-red-100 text-red-800" },
];

const RECIPIENT_TYPES = [
  { value: "all", label: "Semua Jamaah" },
  { value: "departure", label: "Per Keberangkatan" },
  { value: "custom", label: "Pilih Manual" },
];

export default function AdminPushNotifications() {
  const queryClient = useQueryClient();
  const [recipientType, setRecipientType] = useState("all");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ title: "", message: "", type: "info" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const { data: departures = [] } = useQuery({
    queryKey: ["departures-notif"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-notif", selectedDeparture, recipientType],
    queryFn: async () => {
      if (recipientType === "departure" && selectedDeparture) {
        const { data } = await supabase
          .from("booking_passengers")
          .select("customer:customers(id, full_name, phone)")
          .eq("booking.departure_id" as any, selectedDeparture)
          .limit(500);
        const seen = new Set<string>();
        const list: any[] = [];
        (data || []).forEach((row: any) => {
          if (row.customer && !seen.has(row.customer.id)) {
            seen.add(row.customer.id);
            list.push(row.customer);
          }
        });
        return list;
      }
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .order("full_name")
        .limit(500);
      return data || [];
    },
    enabled: recipientType !== "departure" || !!selectedDeparture,
  });

  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["customer-notifications-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notifications" as any)
        .select("*, customer:customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as any[];
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
    );
  }, [customers, customerSearch]);

  const getTargets = () => {
    if (recipientType === "all") return customers;
    if (recipientType === "departure") return customers;
    return customers.filter((c: any) => selectedCustomers.has(c.id));
  };

  const handleSend = async () => {
    const targets = getTargets();
    if (!targets.length) { toast.error("Tidak ada penerima"); return; }
    if (!form.title || !form.message) { toast.error("Judul dan pesan harus diisi"); return; }

    setIsSending(true);
    setSendProgress(0);
    let success = 0;

    try {
      const rows = targets.map((c: any) => ({
        customer_id: c.id,
        title: form.title,
        message: form.message,
        type: form.type,
        is_read: false,
      }));

      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await supabase.from("customer_notifications" as any).insert(chunk as any);
        success += chunk.length;
        setSendProgress(Math.round((success / rows.length) * 100));
      }

      toast.success(`Notifikasi berhasil dikirim ke ${success} jamaah`);
      refetchNotifs();
      setForm({ title: "", message: "", type: "info" });
      setSelectedCustomers(new Set());
    } catch (e: any) {
      toast.error("Gagal mengirim: " + e.message);
    } finally {
      setIsSending(false);
      setSendProgress(0);
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedCustomers(new Set(filteredCustomers.map((c: any) => c.id)));
  const clearAll = () => setSelectedCustomers(new Set());

  const notifStats = {
    total: notifications.length,
    read: notifications.filter((n: any) => n.is_read).length,
    unread: notifications.filter((n: any) => !n.is_read).length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/10 rounded-xl">
          <Bell className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Push Notifikasi Jamaah</h1>
          <p className="text-muted-foreground text-sm">Kirim notifikasi ke portal jamaah — semua atau spesifik</p>
        </div>
      </div>

      <Tabs defaultValue="kirim" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kirim" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Kirim Notifikasi</TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="kirim" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Notifikasi akan tampil di portal jamaah (<code className="bg-muted px-1 rounded text-xs">/jamaah</code>). Pastikan tabel <code className="bg-muted px-1 rounded text-xs">customer_notifications</code> sudah ada di Supabase (jalankan migrasi Fase 3).
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compose */}
            <Card>
              <CardHeader><CardTitle className="text-base">Tulis Notifikasi</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Judul Notifikasi *</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Pengingat keberangkatan..." />
                </div>
                <div>
                  <Label>Pesan *</Label>
                  <Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={5} placeholder="Isi pesan notifikasi..." />
                </div>
                <div>
                  <Label>Tipe Notifikasi</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NOTIF_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview */}
                {(form.title || form.message) && (
                  <div className={`p-3 rounded-lg border ${form.type === "urgent" ? "border-red-200 bg-red-50" : form.type === "warning" ? "border-amber-200 bg-amber-50" : form.type === "success" ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Preview</p>
                    <p className="font-semibold text-sm">{form.title || "(Judul)"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{form.message || "(Pesan)"}</p>
                  </div>
                )}

                {isSending && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Mengirim... {sendProgress}%</p>
                    <Progress value={sendProgress} />
                  </div>
                )}

                <Button className="w-full" onClick={handleSend} disabled={isSending || !form.title || !form.message}>
                  {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</> : <><Send className="h-4 w-4 mr-2" />Kirim ke {getTargets().length} Jamaah</>}
                </Button>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Penerima</CardTitle>
                <Select value={recipientType} onValueChange={(v) => { setRecipientType(v); setSelectedCustomers(new Set()); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-3">
                {recipientType === "departure" && (
                  <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                    <SelectTrigger><SelectValue placeholder="Pilih keberangkatan" /></SelectTrigger>
                    <SelectContent>
                      {departures.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.package?.name} — {format(new Date(d.departure_date), "dd MMM yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {recipientType === "custom" && (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 h-9" placeholder="Cari jamaah..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                      </div>
                      <Button variant="outline" size="sm" onClick={selectAll}>Semua</Button>
                      <Button variant="outline" size="sm" onClick={clearAll}>Reset</Button>
                    </div>
                    <ScrollArea className="h-[280px] border rounded-md">
                      <div className="p-2 space-y-1">
                        {loadingCustomers ? <p className="text-sm text-center py-4 text-muted-foreground">Memuat...</p> :
                          filteredCustomers.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer" onClick={() => toggleCustomer(c.id)}>
                              <Checkbox checked={selectedCustomers.has(c.id)} onCheckedChange={() => toggleCustomer(c.id)} />
                              <div>
                                <p className="text-sm font-medium">{c.full_name}</p>
                                <p className="text-xs text-muted-foreground">{c.phone || "-"}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">{selectedCustomers.size} dipilih dari {filteredCustomers.length} jamaah</p>
                  </>
                )}

                {recipientType !== "custom" && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm">
                      {loadingCustomers ? "Memuat..." : `${customers.length} jamaah akan menerima notifikasi`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Terkirim", value: notifStats.total, icon: Bell, color: "text-primary" },
              { label: "Sudah Dibaca", value: notifStats.read, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Belum Dibaca", value: notifStats.unread, icon: Clock, color: "text-amber-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 flex items-center gap-3">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!notifications.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada riwayat notifikasi</TableCell></TableRow>
                  ) : notifications.slice(0, 100).map((n: any) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium text-sm">{n.customer?.full_name || "-"}</TableCell>
                      <TableCell className="font-medium text-sm">{n.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{n.message}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${NOTIF_TYPES.find((t) => t.value === n.type)?.color || ""}`}>
                          {NOTIF_TYPES.find((t) => t.value === n.type)?.label || n.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {n.is_read
                          ? <Badge variant="outline" className="text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Dibaca</Badge>
                          : <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Belum</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {n.created_at ? format(parseISO(n.created_at), "dd MMM HH:mm", { locale: id }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
