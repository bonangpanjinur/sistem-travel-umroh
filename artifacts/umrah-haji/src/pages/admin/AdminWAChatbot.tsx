import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Bot, Plus, Edit, Trash2, Zap, MessageSquare, RefreshCw,
  CheckCircle2, AlertCircle, Hash, ArrowUpDown, Info
} from "lucide-react";

const API = "/api/v1/whatsapp";

interface ChatbotKeyword {
  id: string;
  keyword: string;
  match_type: "exact" | "contains" | "startswith";
  reply_message: string;
  is_active: boolean;
  priority: number;
  trigger_count: number;
  created_at: string;
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  exact: "Tepat",
  contains: "Mengandung",
  startswith: "Diawali",
};

const emptyForm = (): Partial<ChatbotKeyword> => ({
  keyword: "",
  match_type: "contains",
  reply_message: "",
  is_active: true,
  priority: 0,
});

export default function AdminWAChatbot() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChatbotKeyword | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading, refetch } = useQuery<{ keywords: ChatbotKeyword[] }>({
    queryKey: ["wa-chatbot-keywords"],
    queryFn: () => fetch(`${API}/chatbot`).then(r => r.json()),
  });

  const keywords = data?.keywords ?? [];

  const saveMut = useMutation({
    mutationFn: async (kw: typeof form) => {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `${API}/chatbot/${editing.id}` : `${API}/chatbot`;
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kw),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      return d;
    },
    onSuccess: () => {
      toast.success(editing ? "Kata kunci diperbarui" : "Kata kunci ditambahkan");
      qc.invalidateQueries({ queryKey: ["wa-chatbot-keywords"] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/chatbot/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Kata kunci dihapus");
      qc.invalidateQueries({ queryKey: ["wa-chatbot-keywords"] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetch(`${API}/chatbot/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-chatbot-keywords"] }),
  });

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(kw: ChatbotKeyword) {
    setEditing(kw);
    setForm({ keyword: kw.keyword, match_type: kw.match_type, reply_message: kw.reply_message, is_active: kw.is_active, priority: kw.priority });
    setShowForm(true);
  }

  const totalActive = keywords.filter(k => k.is_active).length;
  const totalTriggers = keywords.reduce((s, k) => s + k.trigger_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-600" />
            Chatbot Auto-Reply
          </h1>
          <p className="text-muted-foreground mt-1">
            Balas otomatis pesan masuk berdasarkan kata kunci
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-1" /> Tambah Kata Kunci
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{keywords.length}</div>
            <div className="text-sm text-muted-foreground">Total Kata Kunci</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{totalActive}</div>
            <div className="text-sm text-muted-foreground">Aktif</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{totalTriggers}</div>
            <div className="text-sm text-muted-foreground">Total Terpicu</div>
          </CardContent>
        </Card>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Webhook URL untuk Fonnte/Wablas: <code className="bg-blue-100 px-1 rounded text-xs">{window.location.origin}/api/v1/whatsapp/webhook</code>
          — Daftarkan URL ini di dashboard provider WA Anda agar pesan masuk dan delivery receipt terproses otomatis.
        </AlertDescription>
      </Alert>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Daftar Kata Kunci
          </CardTitle>
          <CardDescription>Urutkan berdasarkan prioritas (angka lebih besar = lebih diprioritaskan)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat...</div>
          ) : keywords.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Belum ada kata kunci. Klik "Tambah Kata Kunci" untuk mulai.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><ArrowUpDown className="h-4 w-4 inline mr-1" />Prioritas</TableHead>
                  <TableHead>Kata Kunci</TableHead>
                  <TableHead>Tipe Cocok</TableHead>
                  <TableHead>Balasan</TableHead>
                  <TableHead><Zap className="h-4 w-4 inline mr-1" />Terpicu</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map(kw => (
                  <TableRow key={kw.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{kw.priority}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Hash className="h-3 w-3 inline mr-1 text-purple-500" />
                      {kw.keyword}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {MATCH_TYPE_LABEL[kw.match_type] || kw.match_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="text-sm text-muted-foreground truncate">{kw.reply_message}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">{kw.trigger_count}</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={kw.is_active}
                        onCheckedChange={(v) => toggleMut.mutate({ id: kw.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(kw)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => { if (confirm("Hapus kata kunci ini?")) deleteMut.mutate(kw.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kata Kunci" : "Tambah Kata Kunci Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kata Kunci <span className="text-red-500">*</span></Label>
              <Input
                placeholder="cth: cek booking"
                value={form.keyword || ""}
                onChange={e => setForm(f => ({ ...f, keyword: e.target.value.toLowerCase() }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Akan dicocokkan dalam huruf kecil secara otomatis</p>
            </div>
            <div>
              <Label>Tipe Pencocokan</Label>
              <Select value={form.match_type} onValueChange={v => setForm(f => ({ ...f, match_type: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Mengandung kata kunci</SelectItem>
                  <SelectItem value="startswith">Diawali kata kunci</SelectItem>
                  <SelectItem value="exact">Tepat sama</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pesan Balasan <span className="text-red-500">*</span></Label>
              <Textarea
                rows={5}
                placeholder="Assalamu'alaikum! Gunakan {portal_url} untuk link portal."
                value={form.reply_message || ""}
                onChange={e => setForm(f => ({ ...f, reply_message: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Variabel: <code>{"{portal_url}"}</code></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioritas</Label>
                <Input
                  type="number"
                  value={form.priority ?? 0}
                  onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Angka lebih besar = lebih prioritas</p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.is_active ?? true}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label>{form.is_active ? "Aktif" : "Nonaktif"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm()); }}>
              Batal
            </Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending || !form.keyword || !form.reply_message}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveMut.isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
