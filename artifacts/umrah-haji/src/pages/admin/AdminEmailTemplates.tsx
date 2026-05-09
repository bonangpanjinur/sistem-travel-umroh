import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Mail, Copy, Eye, Info, RefreshCw, Send, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

const DEFAULT_TEMPLATES = [
  {
    code: "BOOKING_CONFIRM",
    name: "Konfirmasi Booking",
    subject: "Konfirmasi Booking {{kode_booking}} - {{nama_paket}}",
    body: `Assalamu'alaikum {{nama_jamaah}},

Terima kasih telah melakukan pemesanan paket Umroh/Haji bersama kami.

📋 *Detail Booking:*
• Kode Booking: {{kode_booking}}
• Paket: {{nama_paket}}
• Keberangkatan: {{tanggal_berangkat}}
• Jumlah Jamaah: {{jumlah_pax}} orang
• Total Harga: {{total_harga}}

Silakan lakukan pembayaran DP sebesar {{dp_amount}} sebelum tanggal {{batas_dp}}.

Untuk informasi lebih lanjut, hubungi tim kami.

Wassalamu'alaikum,
Tim {{nama_perusahaan}}`,
    variables: ["nama_jamaah", "kode_booking", "nama_paket", "tanggal_berangkat", "jumlah_pax", "total_harga", "dp_amount", "batas_dp", "nama_perusahaan"],
    trigger: "on_booking_created",
    is_active: true,
  },
  {
    code: "PAYMENT_RECEIPT",
    name: "Kwitansi Pembayaran",
    subject: "Kwitansi Pembayaran - {{kode_booking}}",
    body: `Assalamu'alaikum {{nama_jamaah}},

Pembayaran Anda telah kami terima. Berikut rinciannya:

💳 *Detail Pembayaran:*
• Kode Booking: {{kode_booking}}
• Jumlah Bayar: {{jumlah_bayar}}
• Tanggal: {{tanggal_bayar}}
• Total Terbayar: {{total_terbayar}}
• Sisa: {{sisa_bayar}}

Mohon simpan email ini sebagai bukti pembayaran.

Wassalamu'alaikum,
Tim {{nama_perusahaan}}`,
    variables: ["nama_jamaah", "kode_booking", "jumlah_bayar", "tanggal_bayar", "total_terbayar", "sisa_bayar", "nama_perusahaan"],
    trigger: "on_payment_verified",
    is_active: true,
  },
  {
    code: "DEPARTURE_REMINDER",
    name: "Pengingat Keberangkatan",
    subject: "Pengingat: {{sisa_hari}} Hari Lagi Keberangkatan Anda",
    body: `Assalamu'alaikum {{nama_jamaah}},

Kami ingin mengingatkan bahwa keberangkatan Anda tinggal {{sisa_hari}} hari lagi! ✈️

📅 *Detail Keberangkatan:*
• Tanggal: {{tanggal_berangkat}}
• No. Penerbangan: {{nomor_penerbangan}}
• Titik Kumpul: {{titik_kumpul}}
• Jam Berkumpul: {{jam_kumpul}}

📋 *Dokumen yang perlu disiapkan:*
• Paspor (masih berlaku min. 6 bulan)
• Buku kesehatan
• Kartu identitas

Silakan pastikan semua dokumen sudah lengkap.

Wassalamu'alaikum,
Tim {{nama_perusahaan}}`,
    variables: ["nama_jamaah", "sisa_hari", "tanggal_berangkat", "nomor_penerbangan", "titik_kumpul", "jam_kumpul", "nama_perusahaan"],
    trigger: "on_departure_reminder",
    is_active: true,
  },
  {
    code: "INVOICE",
    name: "Invoice / Tagihan",
    subject: "Invoice {{nomor_invoice}} - {{nama_paket}}",
    body: `Assalamu'alaikum {{nama_jamaah}},

Berikut invoice untuk pemesanan Anda:

🧾 *Invoice #{{nomor_invoice}}*
• Paket: {{nama_paket}}
• Keberangkatan: {{tanggal_berangkat}}
• Jumlah Pax: {{jumlah_pax}}
• Harga per Pax: {{harga_per_pax}}
• Total: {{total_harga}}
• Terbayar: {{total_terbayar}}
• Sisa Tagihan: {{sisa_bayar}}

🏦 *Rekening Pembayaran:*
{{rekening_pembayaran}}

Harap melunasi sebelum {{batas_lunas}}.

Wassalamu'alaikum,
Tim {{nama_perusahaan}}`,
    variables: ["nama_jamaah", "nomor_invoice", "nama_paket", "tanggal_berangkat", "jumlah_pax", "harga_per_pax", "total_harga", "total_terbayar", "sisa_bayar", "rekening_pembayaran", "batas_lunas", "nama_perusahaan"],
    trigger: "manual",
    is_active: true,
  },
];

const TRIGGER_LABELS: Record<string, string> = {
  on_booking_created: "Saat Booking Dibuat",
  on_payment_verified: "Saat Pembayaran Diverifikasi",
  on_departure_reminder: "Pengingat Keberangkatan",
  manual: "Manual / On Demand",
};

interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  trigger: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [isSeedingDefaults, setIsSeedingDefaults] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTest = async (template: Partial<EmailTemplate>) => {
    if (!testEmail) { toast.error("Masukkan alamat email tujuan terlebih dahulu"); return; }
    setIsSendingTest(true);
    try {
      const res = await fetch(`${API_BASE}/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          template: "custom",
          subject: template.subject || "(Tanpa Subject)",
          body: template.body || "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const msg: string = json.error ?? `HTTP ${res.status}`;
        if (msg.includes("SMTP") || msg.includes("dikonfigurasi")) {
          toast.warning("Email tidak terkirim — SMTP belum dikonfigurasi. Tambahkan SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM di Secrets.");
        } else {
          toast.error("Gagal kirim test: " + msg);
        }
      } else {
        toast.success(`Email test berhasil dikirim ke ${testEmail}`);
      }
    } catch {
      toast.warning("Email tidak terkirim — API server tidak terjangkau.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as unknown as EmailTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate>) => {
      const payload = {
        code: template.code,
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables || [],
        trigger: template.trigger || "manual",
        is_active: template.is_active ?? true,
      };
      if (template.id) {
        const { error } = await supabase.from("email_templates" as any).update(payload).eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template email disimpan");
      setDialogOpen(false);
      setEditTemplate(null);
    },
    onError: (e: any) => toast.error("Gagal menyimpan: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template dihapus");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("email_templates" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });

  const seedDefaults = async () => {
    setIsSeedingDefaults(true);
    try {
      for (const t of DEFAULT_TEMPLATES) {
        await supabase.from("email_templates" as any).upsert({ ...t } as any, { onConflict: "code" });
      }
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template default berhasil ditambahkan");
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    } finally {
      setIsSeedingDefaults(false);
    }
  };

  const openEdit = (t?: Partial<EmailTemplate>) => {
    setEditTemplate(t || { code: "", name: "", subject: "", body: "", variables: [], trigger: "manual", is_active: true });
    setDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const varsStr = fd.get("variables") as string;
    saveMutation.mutate({
      ...editTemplate,
      code: fd.get("code") as string,
      name: fd.get("name") as string,
      subject: fd.get("subject") as string,
      body: fd.get("body") as string,
      variables: varsStr ? varsStr.split(",").map((v) => v.trim()).filter(Boolean) : [],
      trigger: fd.get("trigger") as string,
      is_active: editTemplate?.is_active ?? true,
    });
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin!");
  };

  const tableNeeded = templates.length === 0 && !isLoading;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Template Email</h1>
            <p className="text-muted-foreground text-sm">Kelola template email otomatis (konfirmasi booking, invoice, pengingat)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tableNeeded && (
            <Button variant="outline" onClick={seedDefaults} disabled={isSeedingDefaults}>
              {isSeedingDefaults ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Tambah Template Default
            </Button>
          )}
          <Button onClick={() => openEdit()}>
            <Plus className="h-4 w-4 mr-2" /> Template Baru
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Template email menggunakan variabel seperti <code className="bg-muted px-1 rounded text-xs">{"{{nama_jamaah}}"}</code>. Pastikan tabel <code className="bg-muted px-1 rounded text-xs">email_templates</code> sudah dibuat di Supabase. Klik "Tambah Template Default" untuk memuat template bawaan.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Template", value: templates.length, color: "text-primary" },
          { label: "Aktif", value: templates.filter((t) => t.is_active).length, color: "text-emerald-500" },
          { label: "Nonaktif", value: templates.filter((t) => !t.is_active).length, color: "text-slate-400" },
          { label: "Otomatis", value: templates.filter((t) => t.trigger !== "manual").length, color: "text-blue-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Template</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Variabel</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !templates.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada template. Klik "Tambah Template Default" untuk memulai.</TableCell></TableRow>
              ) : templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(t.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {TRIGGER_LABELS[t.trigger] || t.trigger}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.variables?.length ? `${t.variables.length} variabel` : "-"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(v) => toggleActiveMutation.mutate({ id: t.id, is_active: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                        if (confirm("Hapus template ini?")) deleteMutation.mutate(t.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setEditTemplate(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTemplate?.id ? "Edit Template" : "Template Baru"}</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Template *</Label>
                  <Input name="name" defaultValue={editTemplate.name} required />
                </div>
                <div>
                  <Label>Kode Unik *</Label>
                  <Input name="code" defaultValue={editTemplate.code} required placeholder="BOOKING_CONFIRM" />
                </div>
              </div>
              <div>
                <Label>Trigger Otomatis</Label>
                <Select name="trigger" defaultValue={editTemplate.trigger || "manual"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject Email *</Label>
                <Input name="subject" defaultValue={editTemplate.subject} required placeholder="Konfirmasi Booking {{kode_booking}}" />
              </div>
              <div>
                <Label>Body Email *</Label>
                <Textarea name="body" defaultValue={editTemplate.body} required rows={10} className="font-mono text-xs" />
              </div>
              <div>
                <Label>Variabel (pisahkan dengan koma)</Label>
                <Input name="variables" defaultValue={editTemplate.variables?.join(", ")} placeholder="nama_jamaah, kode_booking, total_harga" />
                <p className="text-xs text-muted-foreground mt-1">Contoh penggunaan: {"{{nama_jamaah}}"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={editTemplate.is_active ?? true}
                  onCheckedChange={(v) => setEditTemplate((prev) => prev ? { ...prev, is_active: v } : prev)}
                />
                <Label htmlFor="is_active">Template Aktif</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditTemplate(null); }}>Batal</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Template"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Subject</p>
                <p className="font-medium">{previewTemplate.subject}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Body</p>
                <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-sans">{previewTemplate.body}</pre>
              </div>
              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Variabel yang digunakan</p>
                    <div className="flex flex-wrap gap-2">
                      {previewTemplate.variables.map((v) => (
                        <code key={v} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{`{{${v}}}`}</code>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Kirim Email Test</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSendTest(previewTemplate)}
                    disabled={isSendingTest}
                    size="sm"
                  >
                    {isSendingTest ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Kirim Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email dikirim melalui SMTP server. Pastikan SMTP sudah dikonfigurasi di Secrets.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
