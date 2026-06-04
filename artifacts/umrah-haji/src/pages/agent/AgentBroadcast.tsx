import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, Users, CheckCircle2, Search,
  Copy, Eye, Megaphone, Smartphone, RefreshCw, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WA_TEMPLATES = [
  {
    id: "promo_paket",
    label: "Promo Paket Umroh",
    category: "Pemasaran",
    message: `Assalamu'alaikum Bapak/Ibu {nama} 🌙

Ada kabar gembira untuk Anda! Kami membuka pendaftaran paket Umroh terbaru dengan harga spesial.

🕋 *Paket Umroh Reguler*
✅ Hotel bintang 4 dekat Masjidil Haram
✅ Visa + handling resmi
✅ Pembimbing ibadah berpengalaman
✅ Harga terjangkau, cicilan ringan

Segera amankan kursi Anda! Kuota terbatas 🔥

📞 Hubungi saya untuk info lebih lanjut.

_Salam, {nama_agen}_`,
  },
  {
    id: "follow_up",
    label: "Follow-up Prospek",
    category: "Pemasaran",
    message: `Assalamu'alaikum Bapak/Ibu {nama} 😊

Saya dari *Vinstour Travel*, ingin menindaklanjuti diskusi kita sebelumnya mengenai paket Umroh.

Apakah ada pertanyaan yang bisa saya bantu? Kami siap memberikan simulasi biaya dan jadwal keberangkatan sesuai kebutuhan Bapak/Ibu.

Barakallahu fiikum 🤲

_Salam, {nama_agen}_`,
  },
  {
    id: "reminder_bayar",
    label: "Pengingat Pembayaran",
    category: "Operasional",
    message: `Assalamu'alaikum Bapak/Ibu {nama},

Kami ingin mengingatkan bahwa jadwal cicilan Umroh Anda sudah mendekati tenggat waktu.

💳 *Info Pembayaran:*
• Silakan login ke portal jamaah Anda
• Pilih menu Pembayaran Online
• Atau hubungi kami untuk transfer manual

Terima kasih atas kepercayaan Anda. Semoga perjalanan umroh Anda mabrur 🕋

_Tim Vinstour Travel_`,
  },
  {
    id: "ucapan_eid",
    label: "Ucapan Hari Raya",
    category: "Hubungan",
    message: `Assalamu'alaikum Bapak/Ibu {nama} 🌙

*Taqabbalallahu minna wa minkum* 🤲

Selamat Hari Raya Idul Fitri / Idul Adha. Semoga amal ibadah kita diterima Allah SWT, dan semoga kita semua diberikan kesempatan untuk menjadi tamu-Nya di Tanah Suci.

Mohon maaf lahir dan batin 🌸

_Salam, {nama_agen}_`,
  },
  {
    id: "info_keberangkatan",
    label: "Info Keberangkatan",
    category: "Operasional",
    message: `Assalamu'alaikum Bapak/Ibu {nama},

Kami informasikan detail keberangkatan Anda:

✈️ *Keberangkatan:* [Tanggal]
📍 *Titik Kumpul:* [Lokasi]
🕐 *Jam Berkumpul:* [Jam]
🧳 *Maks. Bagasi:* 23 kg + kabin 7 kg

Harap bawa dokumen: paspor, buku kuning vaksin, dan ID card jamaah.

Hubungi kami jika ada pertanyaan. Bismillah, semoga perjalanan Anda lancar dan mabrur 🕋

_Salam, {nama_agen}_`,
  },
  {
    id: "custom",
    label: "Pesan Kustom",
    category: "Lainnya",
    message: "",
  },
];

const CATEGORIES = ["Semua", "Pemasaran", "Operasional", "Hubungan", "Lainnya"];

export default function AgentBroadcast() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(WA_TEMPLATES[0].id);
  const [message, setMessage] = useState(WA_TEMPLATES[0].message);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Semua");
  const [previewName, setPreviewName] = useState("Budi Santoso");
  const [tab, setTab] = useState("template");

  const { data: agentData } = useQuery({
    queryKey: ["agent-profile-broadcast", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, user_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["agent-leads-broadcast", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_leads")
        .select("id, name, phone, stage")
        .eq("agent_id", agentData!.id)
        .order("name");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: jamaahList = [], isLoading: jamaahLoading } = useQuery({
    queryKey: ["agent-jamaah-broadcast", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("id, full_name, phone")
        .eq("agent_id", agentData!.id)
        .not("phone", "is", null)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const agentName = agentData?.company_name || "Agen Vinstour";

  const previewMessage = message
    .replace(/{nama}/g, previewName)
    .replace(/{nama_agen}/g, agentName);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const tpl = WA_TEMPLATES.find(t => t.id === id);
    if (tpl) setMessage(tpl.message);
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewMessage);
    toast.success("Pesan disalin!");
  };

  const allContacts = [
    ...leads.map((l: any) => ({ id: `lead_${l.id}`, name: l.name, phone: l.phone, type: "Lead", stage: l.stage })),
    ...jamaahList.map((j: any) => ({ id: `jm_${j.id}`, name: j.full_name, phone: j.phone, type: "Jamaah", stage: null })),
  ];

  const filteredContacts = allContacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
  };

  const clearAll = () => setSelectedContacts(new Set());

  const sendToSelected = () => {
    const selected = allContacts.filter(c => selectedContacts.has(c.id));
    if (selected.length === 0) { toast.error("Pilih kontak terlebih dahulu"); return; }
    if (!message.trim()) { toast.error("Pesan tidak boleh kosong"); return; }

    let sent = 0;
    for (const contact of selected) {
      if (!contact.phone) continue;
      const phone = contact.phone.replace(/^0/, "62").replace(/\D/g, "");
      const personalMsg = message.replace(/{nama}/g, contact.name || "").replace(/{nama_agen}/g, agentName);
      const encodedMsg = encodeURIComponent(personalMsg);
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, "_blank");
      sent++;
      if (sent >= 5) break;
    }

    if (sent < selected.length) {
      toast.info(`${sent} pesan dibuka. Browser mungkin memblokir lebih dari 5 tab. Lanjutkan manual.`);
    } else {
      toast.success(`${sent} pesan WhatsApp dibuka!`);
    }
  };

  const filteredTemplates = WA_TEMPLATES.filter(t =>
    filterCat === "Semua" || t.category === filterCat
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Broadcast Pesan WA</h1>
        <p className="text-sm text-muted-foreground">Kirim pesan WhatsApp ke prospek dan jamaah Anda</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="compose">Tulis Pesan</TabsTrigger>
          <TabsTrigger value="kirim">Kirim</TabsTrigger>
        </TabsList>

        {/* Tab 1: Pilih Template */}
        <TabsContent value="template" className="space-y-3 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
                  filterCat === cat ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredTemplates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => { handleTemplateSelect(tpl.id); setTab("compose"); }}
                className={cn(
                  "w-full text-left border rounded-xl p-3 transition-all",
                  selectedTemplate === tpl.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-white border-border hover:border-primary/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{tpl.label}</p>
                      <Badge variant="secondary" className="text-[10px]">{tpl.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.message || "Tulis pesan kustom Anda sendiri"}</p>
                  </div>
                  {selectedTemplate === tpl.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Tulis Pesan */}
        <TabsContent value="compose" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Edit Pesan</CardTitle>
              <CardDescription className="text-xs">Gunakan {`{nama}`} untuk nama penerima, {`{nama_agen}`} untuk nama agen Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                placeholder="Tulis pesan Anda di sini..."
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setMessage(m => m + " {nama}")}>
                  + {`{nama}`}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMessage(m => m + " {nama_agen}")}>
                  + {`{nama_agen}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-600" /> Preview
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopyPreview}>
                  <Copy className="h-3 w-3 mr-1" /> Salin
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 items-center">
                <Label className="text-xs w-20 shrink-0">Nama contoh:</Label>
                <Input
                  className="h-7 text-xs"
                  value={previewName}
                  onChange={e => setPreviewName(e.target.value)}
                />
              </div>
              <div className="bg-white rounded-xl p-3 border border-green-200">
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{previewMessage}</p>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => setTab("kirim")}>
            Lanjut: Pilih Penerima <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </TabsContent>

        {/* Tab 3: Kirim */}
        <TabsContent value="kirim" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Pilih Penerima <span className="text-primary ml-1">{selectedContacts.size} dipilih</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>Semua</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearAll}>Reset</Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari kontak..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {(leadsLoading || jamaahLoading) ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>Belum ada kontak. Tambahkan lead atau jamaah terlebih dahulu.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredContacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 bg-white border rounded-xl hover:border-primary/40 transition-colors">
                  <Checkbox
                    checked={selectedContacts.has(c.id)}
                    onCheckedChange={() => toggleContact(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{c.type}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              ⚠️ Fitur ini akan membuka tab WhatsApp Web untuk setiap kontak (maks. 5 sekaligus). Pastikan Anda sudah login di WhatsApp Web.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={selectedContacts.size === 0 || !message.trim()}
            onClick={sendToSelected}
          >
            <Send className="h-4 w-4 mr-2" />
            Kirim ke {selectedContacts.size} Kontak via WhatsApp
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
