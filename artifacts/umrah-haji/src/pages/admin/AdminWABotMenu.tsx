import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ListOrdered, Plus, Edit, Trash2, RefreshCw,
  Bot, Hash, CheckCircle2, Info, Smartphone, Zap, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api/v1/whatsapp";

interface BotMenuItem {
  id: string;
  menu_number: number;
  label: string;
  description?: string;
  reply_message: string;
  is_active: boolean;
  sort_order: number;
  trigger_count: number;
}

interface BotMenuConfig {
  enabled: boolean;
  trigger: string;
  header: string;
  footer: string;
  interactive: boolean;
  button_text: string;
  section_title: string;
}

const emptyItem = (): Partial<BotMenuItem> => ({
  menu_number: 0,
  label: "",
  description: "",
  reply_message: "",
  is_active: true,
  sort_order: 0,
});

const DEFAULT_CONFIG: BotMenuConfig = {
  enabled: true,
  trigger: "menu",
  header: "Assalamu'alaikum! 👋 Selamat datang.\n\nSilakan pilih menu:",
  footer: "",
  interactive: false,
  button_text: "Pilih Menu",
  section_title: "Layanan Kami",
};

export default function AdminWABotMenu() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BotMenuItem | null>(null);
  const [form, setForm] = useState(emptyItem());
  const [configEditing, setConfigEditing] = useState(false);
  const [configForm, setConfigForm] = useState<BotMenuConfig>(DEFAULT_CONFIG);

  const { data: itemsData, isLoading, refetch } = useQuery<{ items: BotMenuItem[] }>({
    queryKey: ["wa-bot-menu-items"],
    queryFn: () => fetch(`${API}/bot-menu`).then(r => r.json()),
  });

  const { data: configData, refetch: refetchConfig } = useQuery<BotMenuConfig>({
    queryKey: ["wa-bot-menu-config"],
    queryFn: () => fetch(`${API}/bot-menu/config`).then(r => r.json()),
  });

  useEffect(() => {
    if (configData) setConfigForm({ ...DEFAULT_CONFIG, ...configData });
  }, [configData]);

  const items = (itemsData?.items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.menu_number - b.menu_number);
  const config: BotMenuConfig = { ...DEFAULT_CONFIG, ...(configData ?? configForm) };

  const saveMut = useMutation({
    mutationFn: async (data: typeof form) => {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `${API}/bot-menu/${editing.id}` : `${API}/bot-menu`;
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      return d;
    },
    onSuccess: () => {
      toast.success(editing ? "Menu diperbarui" : "Menu ditambahkan");
      qc.invalidateQueries({ queryKey: ["wa-bot-menu-items"] });
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/bot-menu/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Menu item dihapus");
      qc.invalidateQueries({ queryKey: ["wa-bot-menu-items"] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetch(`${API}/bot-menu/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-bot-menu-items"] }),
  });

  const saveConfigMut = useMutation({
    mutationFn: (data: BotMenuConfig) =>
      fetch(`${API}/bot-menu/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal menyimpan konfigurasi");
        return d;
      }),
    onSuccess: () => {
      toast.success("Konfigurasi menu disimpan");
      setConfigEditing(false);
      qc.invalidateQueries({ queryKey: ["wa-bot-menu-config"] });
      refetchConfig();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    const nextNum = items.length > 0 ? Math.max(...items.map(i => i.menu_number)) + 1 : 1;
    setEditing(null);
    setForm({ ...emptyItem(), menu_number: nextNum, sort_order: nextNum * 10 });
    setShowForm(true);
  }

  function openEdit(item: BotMenuItem) {
    setEditing(item);
    setForm({
      menu_number: item.menu_number,
      label: item.label,
      description: item.description || "",
      reply_message: item.reply_message,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyItem());
  }

  const totalActive = items.filter(i => i.is_active).length;
  const totalTriggers = items.reduce((s, i) => s + i.trigger_count, 0);
  const activeItems = items.filter(i => i.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-violet-600" />
            Bot Menu Interaktif
          </h1>
          <p className="text-muted-foreground mt-1">
            Menu bernomor & Quick Reply Buttons via Meta WABA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4 mr-1" /> Tambah Menu
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-violet-600">{items.length}</div>
            <div className="text-sm text-muted-foreground">Total Menu Item</div>
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
            <div className="text-sm text-muted-foreground">Total Dipilih Jamaah</div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Cara kerja:</strong> Jamaah kirim kata pemicu (default:{" "}
          <code className="bg-blue-100 px-1 rounded">{config.trigger || "menu"}</code>
          ) → bot balas daftar menu → jamaah pilih angka → bot balas otomatis.{" "}
          {config.interactive && (
            <span className="text-violet-700 font-medium">
              ✦ Mode Interaktif aktif — menggunakan List Message Meta WABA.
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Hash className="h-4 w-4 text-violet-500" />
            Daftar Menu
          </h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada menu item. Klik "Tambah Menu" untuk mulai.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className={cn(
                  "border transition-all",
                  item.is_active ? "border-violet-200 bg-violet-50/20" : "border-border opacity-60",
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                        item.is_active ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground",
                      )}>
                        {item.menu_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{item.label}</span>
                          {item.trigger_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {item.trigger_count}× dipilih
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{item.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.reply_message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(v) => toggleMut.mutate({ id: item.id, is_active: v })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => { if (confirm("Hapus menu item ini?")) deleteMut.mutate(item.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Preview + Config */}
        <div className="space-y-4">
          {/* Phone preview */}
          <Card className="border-2 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Preview Pesan Menu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {config.interactive ? (
                /* Interactive List Message Preview */
                <div className="bg-[#e5ddd5] rounded-lg p-3 min-h-[200px] space-y-2">
                  {/* Bot bubble */}
                  <div className="bg-white rounded-lg p-3 shadow-sm text-xs max-w-[240px] font-sans">
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {config.header || "Assalamu'alaikum! 👋 Selamat datang.\n\nSilakan pilih menu:"}
                    </p>
                    {config.footer && (
                      <p className="text-[10px] text-gray-400 mt-1 border-t pt-1">{config.footer}</p>
                    )}
                    {/* List button */}
                    <button className="mt-2 w-full flex items-center justify-center gap-1 border border-[#25d366] rounded-md py-1.5 text-[#25d366] text-xs font-medium">
                      <ListOrdered className="h-3 w-3" />
                      {config.button_text || "Pilih Menu"}
                    </button>
                  </div>
                  {/* Simulated list popup */}
                  {activeItems.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md text-xs overflow-hidden max-w-[240px]">
                      <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700 border-b text-[11px]">
                        {config.section_title || "Layanan Kami"}
                      </div>
                      {activeItems.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-gray-50">
                          <div>
                            <p className="font-medium text-[11px] text-gray-800">{`${item.menu_number}. ${item.label}`.slice(0, 24)}</p>
                            {item.description && <p className="text-[10px] text-gray-400 truncate">{item.description.slice(0, 40)}</p>}
                          </div>
                          <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />
                        </div>
                      ))}
                      {activeItems.length > 5 && (
                        <div className="px-3 py-1.5 text-[10px] text-gray-400 text-center">+{activeItems.length - 5} lainnya</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Plain Text Preview */
                <div className="bg-[#e5ddd5] rounded-lg p-3 min-h-[160px]">
                  <div className="bg-white rounded-lg p-3 shadow-sm text-xs leading-relaxed whitespace-pre-wrap font-sans max-w-[240px] ml-auto">
                    {config.header || "Selamat datang!"}{"\n\n"}
                    {activeItems.map(i => `${i.menu_number}. ${i.label}`).join("\n") || "1. Contoh Menu"}
                    {config.footer}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Preview saat jamaah ketik "{config.trigger || "menu"}"
              </p>
            </CardContent>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-500" />
                  Konfigurasi Menu
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                  if (!configEditing) setConfigForm({ ...DEFAULT_CONFIG, ...config });
                  setConfigEditing(v => !v);
                }}>
                  <Edit className="h-3 w-3 mr-1" />
                  {configEditing ? "Batal" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {configEditing ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Aktif</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={configForm.enabled}
                        onCheckedChange={v => setConfigForm(f => ({ ...f, enabled: v }))}
                      />
                      <span className="text-xs text-muted-foreground">
                        {configForm.enabled ? "Menu aktif" : "Menu nonaktif"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Kata Pemicu Menu</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="menu"
                      value={configForm.trigger}
                      onChange={e => setConfigForm(f => ({ ...f, trigger: e.target.value.toLowerCase() }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Jamaah ketik kata ini untuk melihat menu</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teks Pembuka</Label>
                    <Textarea
                      rows={3}
                      className="text-xs"
                      value={configForm.header}
                      onChange={e => setConfigForm(f => ({ ...f, header: e.target.value }))}
                      placeholder="Selamat datang di..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teks Penutup</Label>
                    <Textarea
                      rows={2}
                      className="text-xs"
                      value={configForm.footer}
                      onChange={e => setConfigForm(f => ({ ...f, footer: e.target.value }))}
                      placeholder="Atau hubungi CS kami..."
                    />
                  </div>

                  {/* Interactive section */}
                  <div className="border rounded-lg p-3 space-y-3 bg-violet-50/40">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-violet-600" />
                      <span className="text-xs font-medium text-violet-800">Quick Reply Buttons (Meta WABA)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={configForm.interactive}
                        onCheckedChange={v => setConfigForm(f => ({ ...f, interactive: v }))}
                      />
                      <span className="text-xs text-muted-foreground">
                        {configForm.interactive ? "Interactive List aktif" : "Mode teks biasa"}
                      </span>
                    </div>
                    {configForm.interactive && (
                      <>
                        <p className="text-[10px] text-violet-600 bg-violet-100 rounded p-2">
                          ⚠ Hanya berfungsi dengan provider <strong>Meta WABA Cloud API</strong>. Provider lain tetap menerima teks biasa.
                        </p>
                        <div className="space-y-1">
                          <Label className="text-xs">Teks Tombol List</Label>
                          <Input
                            className="h-8 text-xs"
                            maxLength={20}
                            placeholder="Pilih Menu"
                            value={configForm.button_text}
                            onChange={e => setConfigForm(f => ({ ...f, button_text: e.target.value }))}
                          />
                          <p className="text-[10px] text-muted-foreground">Maks 20 karakter</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Judul Seksi</Label>
                          <Input
                            className="h-8 text-xs"
                            maxLength={24}
                            placeholder="Layanan Kami"
                            value={configForm.section_title}
                            onChange={e => setConfigForm(f => ({ ...f, section_title: e.target.value }))}
                          />
                          <p className="text-[10px] text-muted-foreground">Maks 24 karakter</p>
                        </div>
                      </>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={() => saveConfigMut.mutate(configForm)}
                    disabled={saveConfigMut.isPending}
                  >
                    {saveConfigMut.isPending ? "Menyimpan..." : "Simpan Konfigurasi"}
                  </Button>
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-24">Status</span>
                    <Badge className={config.enabled ? "bg-green-100 text-green-700 border-green-200 border" : "bg-gray-100 text-gray-500 border"}>
                      {config.enabled ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-24">Pemicu</span>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs">{config.trigger || "menu"}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-24">Mode</span>
                    {config.interactive ? (
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200 border text-xs gap-1">
                        <Zap className="h-3 w-3" /> Interactive List
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Teks Biasa</Badge>
                    )}
                  </div>
                  {config.interactive && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-24">Tombol</span>
                        <span className="text-xs font-medium">"{config.button_text || "Pilih Menu"}"</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-24">Seksi</span>
                        <span className="text-xs font-medium">"{config.section_title || "Layanan Kami"}"</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-muted-foreground text-xs">Pembuka:</span>
                    <p className="text-xs mt-0.5 text-muted-foreground line-clamp-2">{config.header || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Penutup:</span>
                    <p className="text-xs mt-0.5 text-muted-foreground line-clamp-2">{config.footer || "—"}</p>
                  </div>

                  {config.interactive && (
                    <div className="mt-2 p-2 bg-violet-50 rounded-md border border-violet-100 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-violet-700">
                        Siap mengirim Interactive List Message ke jamaah via Meta WABA.
                        Jamaah pilih dari popup daftar, bot reply otomatis.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Menu Item" : "Tambah Menu Item Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nomor Menu <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="1"
                  value={form.menu_number || ""}
                  onChange={e => setForm(f => ({ ...f, menu_number: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Angka 1–10</p>
              </div>
              <div>
                <Label>Urutan Tampil</Label>
                <Input
                  type="number"
                  value={form.sort_order ?? 0}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label>Label Menu <span className="text-red-500">*</span></Label>
              <Input
                placeholder="cth: Cek Status Booking"
                maxLength={24}
                value={form.label || ""}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Teks di daftar menu. Maks 24 karakter (batas Meta WABA).
              </p>
            </div>
            <div>
              <Label>Deskripsi Singkat <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input
                placeholder="cth: Masukkan kode booking Anda"
                maxLength={72}
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tampil di bawah label pada Interactive List. Maks 72 karakter.
              </p>
            </div>
            <div>
              <Label>Pesan Balasan <span className="text-red-500">*</span></Label>
              <Textarea
                rows={6}
                placeholder="Assalamu'alaikum! Untuk cek booking..."
                value={form.reply_message || ""}
                onChange={e => setForm(f => ({ ...f, reply_message: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variabel: <code>{"{portal_url}"}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
              <Label>{form.is_active ? "Aktif" : "Nonaktif"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending || !form.label || !form.reply_message || !form.menu_number}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {saveMut.isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
