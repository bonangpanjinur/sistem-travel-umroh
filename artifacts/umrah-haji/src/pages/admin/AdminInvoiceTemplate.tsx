import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText, Plus, Trash2, Save, Eye, ChevronUp, ChevronDown,
  Palette, Settings, CreditCard, FileSignature, GripVertical, Info,
  Download, X, Loader2, ExternalLink, RefreshCw
} from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import {
  generateTransactionForm,
  DEFAULT_TEMPLATE,
  type TransactionFormTemplate,
  type PaymentInfoBlock,
} from "@/lib/transaction-form-generator";

// ─── DB type ─────────────────────────────────────────────────────────────────
interface DBTemplate {
  id: string;
  name: string;
  is_default: boolean;
  accent_color: string;
  font_family: string;
  header_style: string;
  show_logo: boolean;
  show_passenger_list: boolean;
  show_signature: boolean;
  left_signature_label: string;
  right_signature_label: string;
  payment_info_blocks: PaymentInfoBlock[];
  terms_text: string;
  footer_text: string | null;
  show_qr_code: boolean;
  qr_placement: string;
}

function dbToTemplate(db: DBTemplate): TransactionFormTemplate {
  return {
    accentColor: db.accent_color ?? "#1e3a5f",
    fontFamily: (db.font_family as any) ?? "helvetica",
    headerStyle: (db.header_style as any) ?? "centered",
    showLogo: db.show_logo ?? true,
    showPassengerList: db.show_passenger_list ?? true,
    showSignature: db.show_signature ?? true,
    leftSignatureLabel: db.left_signature_label ?? "PETUGAS",
    rightSignatureLabel: db.right_signature_label ?? "PEMESAN",
    paymentInfoBlocks: (db.payment_info_blocks as PaymentInfoBlock[]) ?? [],
    termsText: db.terms_text ?? "",
    footerText: db.footer_text ?? "",
    showQrCode: db.show_qr_code ?? true,
    qrPlacement: (db.qr_placement as any) ?? "bottom-right",
  };
}

// ─── Sample data for preview ──────────────────────────────────────────────────
const PREVIEW_DATA = {
  transactionCode: "TRA012753",
  customerCode: "JMH030594",
  transactionDate: new Date("2026-05-06"),
  referenceAgent: "FAIZAL AMIRUDIN",
  customerName: "ERLINA KUMALASARI",
  customerAddress: "-",
  customerPhone: "+6285215213919",
  packageName: "ADEN 1448 JUNI - DESEMBER",
  packageType: "ADEN 9 HARI",
  umrahSeason: "1448 HIJRIAH",
  programDays: "9 HARI",
  departureDate: new Date("2026-09-10"),
  returnDate: new Date("2026-09-18"),
  hotelMakkah: "AZKA AL SAFA HOTEL (4N)",
  hotelMadinah: "KAYAN INTERNATIONAL (3N)",
  airline: "QATAR AIRWAYS",
  airport: "SOEKARNO-HATTA INTERNATIONAL AIRPORT (CGK)",
  roomCombinations: [{ roomType: "Double", pricePerPax: 34600000, paxCount: 2, roomCount: 1 }],
  discounts: [{ label: "DISKON MAYDAY", amount: 5000000 }],
  totalPrice: 64200000,
  notes: "",
  passengers: [
    { name: "ERLINA KUMALASARI", roomType: "Double", basePrice: 34600000, additionalCost: 0, discount: 2500000, totalBill: 32100000 },
    { name: "VICKY ANJAR SUTRISNO", roomType: "Double", basePrice: 34600000, additionalCost: 0, discount: 2500000, totalBill: 32100000 },
  ],
};

// ─── PaymentBlock editor ──────────────────────────────────────────────────────
function PaymentBlockEditor({
  block, index, total,
  onChange, onRemove, onMoveUp, onMoveDown,
}: {
  block: PaymentInfoBlock;
  index: number;
  total: number;
  onChange: (b: PaymentInfoBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const addItem = () => onChange({ ...block, items: [...block.items, ""] });
  const updateItem = (i: number, val: string) => {
    const items = [...block.items];
    items[i] = val;
    onChange({ ...block, items });
  };
  const removeItem = (i: number) => onChange({ ...block, items: block.items.filter((_, idx) => idx !== i) });

  return (
    <Card className="border-l-4" style={{ borderLeftColor: "#3b82f6" }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">Blok {index + 1}</span>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMoveUp} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMoveDown} disabled={index === total - 1}><ChevronDown className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Teks Judul Blok (instruksi)</Label>
          <Input
            value={block.title}
            onChange={e => onChange({ ...block, title: e.target.value })}
            placeholder="Contoh: UNTUK PEMBAYARAN MELALUI TRANSFER DAPAT DITUJUKAN KE :"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Item Pembayaran</Label>
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={e => updateItem(i, e.target.value)}
                placeholder="Contoh: BANK BCA : 7015777761, A/N : PT UMRAH HAJI TRAVEL"
                className="text-sm flex-1"
              />
              <Button size="sm" variant="ghost" className="h-9 px-2 text-red-500" onClick={() => removeItem(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={addItem}>
            <Plus className="h-3 w-3" /> Tambah Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminInvoiceTemplate() {
  const queryClient = useQueryClient();
  const { company: companyInfo } = useCompanyInfo();

  const [template, setTemplate] = useState<TransactionFormTemplate>(DEFAULT_TEMPLATE);
  const [dbId, setDbId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const prevUrlRef = useRef<string | null>(null);

  // Cleanup blob URL when dialog closes or url changes
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  const closePreview = () => {
    setShowPreviewDialog(false);
    setIframeLoading(true);
    // revoke after animation
    setTimeout(() => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
      setPreviewUrl(null);
    }, 300);
  };

  // ── Load from DB ────────────────────────────────────────────────────────────
  const { isLoading } = useQuery({
    queryKey: ["invoice-template-default"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates" as any)
        .select("*")
        .eq("is_default", true)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const t = dbToTemplate(data as unknown as DBTemplate);
        setTemplate(t);
        setDbId((data as any).id);
      }
      return data;
    },
  });

  // ── Save ────────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: "Default",
        is_default: true,
        accent_color: template.accentColor,
        font_family: template.fontFamily,
        header_style: template.headerStyle,
        show_logo: template.showLogo,
        show_passenger_list: template.showPassengerList,
        show_signature: template.showSignature,
        left_signature_label: template.leftSignatureLabel,
        right_signature_label: template.rightSignatureLabel,
        payment_info_blocks: template.paymentInfoBlocks,
        terms_text: template.termsText,
        footer_text: template.footerText || null,
        show_qr_code: template.showQrCode !== false,
        qr_placement: template.qrPlacement ?? "bottom-right",
        updated_at: new Date().toISOString(),
      };

      if (dbId) {
        const { error } = await supabase
          .from("invoice_templates" as any)
          .update(payload)
          .eq("id", dbId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("invoice_templates" as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setDbId((data as any).id);
      }
    },
    onSuccess: () => {
      toast.success("✅ Template invoice berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["invoice-template-default"] });
    },
    onError: (e: Error) => toast.error("❌ " + e.message),
  });

  // ── Preview (embedded) ──────────────────────────────────────────────────────
  const buildPreview = async () => {
    setPreviewing(true);
    try {
      const company = {
        name: companyInfo?.name || "PT. Umrah Haji Travel",
        address: companyInfo?.address || "Jl. Raya No. 1",
        phone: companyInfo?.phone || "(021) 000-0000",
        email: companyInfo?.email || "info@umrahhaji.com",
        logo: companyInfo?.logo || undefined,
      };
      const doc = await generateTransactionForm(PREVIEW_DATA, company, template);
      const blob = doc.output("blob");

      // Revoke previous URL
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setPreviewUrl(url);
      setIframeLoading(true);
      setShowPreviewDialog(true);
    } catch (e: any) {
      toast.error("Gagal generate preview: " + e.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "FormTransaksi-Pratinjau.pdf";
    a.click();
  };

  const handleOpenNewTab = () => {
    if (previewUrl) window.open(previewUrl, "_blank");
  };

  // ── Payment blocks helpers ──────────────────────────────────────────────────
  const addBlock = () => setTemplate(t => ({
    ...t, paymentInfoBlocks: [...t.paymentInfoBlocks, { title: "", items: [""] }]
  }));

  const updateBlock = (i: number, b: PaymentInfoBlock) => setTemplate(t => {
    const blocks = [...t.paymentInfoBlocks]; blocks[i] = b;
    return { ...t, paymentInfoBlocks: blocks };
  });

  const removeBlock = (i: number) => setTemplate(t => ({
    ...t, paymentInfoBlocks: t.paymentInfoBlocks.filter((_, idx) => idx !== i)
  }));

  const moveBlock = (i: number, dir: -1 | 1) => setTemplate(t => {
    const blocks = [...t.paymentInfoBlocks];
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return t;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    return { ...t, paymentInfoBlocks: blocks };
  });

  const upd = useCallback(<K extends keyof TransactionFormTemplate>(k: K, v: TransactionFormTemplate[K]) =>
    setTemplate(t => ({ ...t, [k]: v })), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Template Form Transaksi
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Konfigurasi layout, informasi pembayaran, dan keterangan yang akan tampil di PDF
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={buildPreview} disabled={previewing}>
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            {previewing ? "Memuat..." : "Pratinjau PDF"}
          </Button>
          <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" /> {saveMutation.isPending ? "Menyimpan..." : "Simpan Template"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Memuat template...</CardContent></Card>
      ) : (
        <Tabs defaultValue="design" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="design" className="gap-1.5"><Palette className="h-4 w-4" />Desain</TabsTrigger>
            <TabsTrigger value="payment" className="gap-1.5">
              <CreditCard className="h-4 w-4" />Informasi Pembayaran
              {template.paymentInfoBlocks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{template.paymentInfoBlocks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-1.5"><FileSignature className="h-4 w-4" />Keterangan & T.T.</TabsTrigger>
            <TabsTrigger value="sections" className="gap-1.5"><Settings className="h-4 w-4" />Seksi & Tampilan</TabsTrigger>
          </TabsList>

          {/* ── Tab: Desain ── */}
          <TabsContent value="design">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colors & Font */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Warna & Font</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label>Warna Utama (Accent)</Label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={template.accentColor}
                        onChange={e => upd("accentColor", e.target.value)}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={template.accentColor}
                        onChange={e => upd("accentColor", e.target.value)}
                        placeholder="#1e3a5f"
                        className="font-mono max-w-[120px]"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {["#1e3a5f","#166534","#7c2d12","#1e40af","#7e22ce","#1f2937"].map(c => (
                          <button key={c} type="button"
                            className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                            style={{ backgroundColor: c, borderColor: template.accentColor === c ? "#000" : "transparent" }}
                            onClick={() => upd("accentColor", c)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Font PDF</Label>
                    <Select value={template.fontFamily} onValueChange={v => upd("fontFamily", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">Helvetica (Modern, bersih)</SelectItem>
                        <SelectItem value="times">Times New Roman (Formal, klasik)</SelectItem>
                        <SelectItem value="courier">Courier (Monospace, teknis)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Gaya Header Perusahaan</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: "centered", label: "Terpusat", desc: "Nama & alamat di tengah" },
                        { val: "left", label: "Kiri", desc: "Nama & alamat rata kiri" },
                      ].map(opt => (
                        <button key={opt.val} type="button"
                          className={`p-3 rounded-lg border text-left transition-all ${template.headerStyle === opt.val ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
                          onClick={() => upd("headerStyle", opt.val as any)}>
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview swatch */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Pratinjau Warna</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border shadow-sm">
                    {/* Mock header */}
                    <div className="p-3 text-center" style={{ backgroundColor: template.accentColor }}>
                      <p className="text-white text-xs font-bold tracking-wide">FORM TRANSAKSI PAKET UMRAH</p>
                      <p className="text-white text-[10px] opacity-90 mt-0.5">PT. Umrah Haji Travel</p>
                    </div>
                    {/* Mock content */}
                    <div className="p-4 space-y-2 bg-white">
                      <div className="grid grid-cols-4 gap-1">
                        {["KODE TRANSAKSI","KODE PEMESAN","TANGGAL","REFERENSI"].map((l, i) => (
                          <div key={i} className="border rounded p-1.5">
                            <p className="text-[7px] font-bold" style={{ color: "#888" }}>{l}</p>
                            <p className="text-[8px] font-bold text-gray-900">TRA012753</p>
                          </div>
                        ))}
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="space-y-0.5">
                        {["NAMA LENGKAP","PAKET UMRAH","TANGGAL BERANGKAT"].map((l, i) => (
                          <div key={i} className="flex gap-2 text-[8px]">
                            <span className="font-bold text-gray-500 w-24 shrink-0">{l}</span>
                            <span className="text-gray-800">—</span>
                          </div>
                        ))}
                      </div>
                      <div className="rounded text-white text-[8px] font-bold py-1.5 px-2 flex justify-between" style={{ backgroundColor: template.accentColor }}>
                        <span>TOTAL HARGA</span>
                        <span>IDR 64.200.000</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">Klik "Pratinjau PDF" untuk melihat hasil lengkap</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Tab: Informasi Pembayaran ── */}
          <TabsContent value="payment">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Blok Informasi Pembayaran</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Tambahkan grup dan item yang muncul di bagian "INFORMASI PEMBAYARAN" pada PDF
                    </p>
                  </div>
                  <Button className="gap-2" onClick={addBlock}>
                    <Plus className="h-4 w-4" /> Tambah Blok
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {template.paymentInfoBlocks.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed rounded-lg">
                    <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                    <p className="font-medium text-muted-foreground">Belum ada blok pembayaran</p>
                    <p className="text-sm text-muted-foreground mt-1">Klik "Tambah Blok" untuk mulai menambahkan informasi rekening/VA</p>
                    <Button variant="outline" className="mt-4 gap-2" onClick={addBlock}>
                      <Plus className="h-4 w-4" /> Tambah Blok Pertama
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm flex gap-2">
                      <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-blue-700 dark:text-blue-300">
                        Setiap <strong>blok</strong> memiliki satu teks judul (instruksi) dan beberapa item rekening/nomor VA.
                        Gunakan tombol ↑↓ untuk mengatur urutan.
                      </p>
                    </div>
                    {template.paymentInfoBlocks.map((block, i) => (
                      <PaymentBlockEditor
                        key={i}
                        block={block}
                        index={i}
                        total={template.paymentInfoBlocks.length}
                        onChange={b => updateBlock(i, b)}
                        onRemove={() => removeBlock(i)}
                        onMoveUp={() => moveBlock(i, -1)}
                        onMoveDown={() => moveBlock(i, 1)}
                      />
                    ))}
                    <Button variant="outline" className="w-full gap-2" onClick={addBlock}>
                      <Plus className="h-4 w-4" /> Tambah Blok Baru
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Keterangan & T.T. ── */}
          <TabsContent value="terms">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Teks Keterangan / Syarat & Ketentuan</CardTitle>
                  <p className="text-sm text-muted-foreground">Teks ini muncul di bagian kiri kolom "KETERANGAN" pada PDF</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={template.termsText}
                    onChange={e => upd("termsText", e.target.value)}
                    rows={18}
                    className="font-mono text-xs resize-none"
                    placeholder={`SYARAT DAN KETENTUAN PEMBAYARAN DAN PEMBATALAN 1448 H\n\n\nPEMBAYARAN :\n   DEPOSIT RP 500.000 UNTUK BLOCK SEAT\n   DEPOSIT RP 3.000.000 LANGSUNG AMBIL PERLENGKAPAN UMRAH\n\nPELUNASAN 30 HARI SEBELUM KEBERANGKATAN\n\n\nPEMBATALAN:\n   LEBIH DARI 60 HARI DIKENAKAN RP 1.000.000/PAX\n   30 HARI SEBELUM KEBERANGKATAN DIKENAKAN 100% DARI HARGA PAKET`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tekan Enter untuk baris baru. Gunakan spasi untuk indentasi poin-poin.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Label Tanda Tangan</CardTitle>
                    <p className="text-sm text-muted-foreground">Label yang muncul di bawah kotak tanda tangan</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Kolom Kiri</Label>
                        <Input
                          value={template.leftSignatureLabel}
                          onChange={e => upd("leftSignatureLabel", e.target.value)}
                          placeholder="PETUGAS"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Kolom Kanan</Label>
                        <Input
                          value={template.rightSignatureLabel}
                          onChange={e => upd("rightSignatureLabel", e.target.value)}
                          placeholder="PEMESAN"
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/40 px-3 py-1.5">
                        <p className="text-xs font-semibold">Pratinjau Kotak T.T.</p>
                      </div>
                      <div className="p-4 flex gap-4">
                        {[template.leftSignatureLabel, template.rightSignatureLabel].map((lbl, i) => (
                          <div key={i} className="flex-1 text-center">
                            <div className="border rounded h-16 mb-1" />
                            <p className="text-xs font-medium">{lbl}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Footer PDF</CardTitle>
                    <p className="text-sm text-muted-foreground">Teks di bawah halaman lampiran jamaah (opsional)</p>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={template.footerText ?? ""}
                      onChange={e => upd("footerText", e.target.value)}
                      placeholder="Dokumen ini dicetak secara otomatis dan sah tanpa tanda tangan"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Seksi & Tampilan ── */}
          <TabsContent value="sections">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tampilkan / Sembunyikan Seksi PDF</CardTitle>
                <p className="text-sm text-muted-foreground">Pilih bagian apa saja yang akan tampil saat PDF digenerate</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-lg">
                  {[
                    { key: "showLogo" as const, label: "Logo Perusahaan", desc: "Tampilkan logo di bagian atas header" },
                    { key: "showPassengerList" as const, label: "Lampiran Daftar Jamaah", desc: "Halaman kedua berisi tabel nama-nama jamaah" },
                    { key: "showSignature" as const, label: "Kotak Tanda Tangan", desc: "Kolom Disetujui & Yang Menyatakan" },
                    { key: "showQrCode" as const, label: "QR Code Verifikasi Publik", desc: "QR code yang bisa di-scan jamaah untuk verifikasi booking tanpa login" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={(template[key] as boolean) !== false}
                        onCheckedChange={v => upd(key, v)}
                      />
                    </div>
                  ))}

                  {(template.showQrCode !== false) && (
                    <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-3">
                      <p className="text-sm font-semibold">Posisi QR Code</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { val: "top-right", label: "Kanan Atas", icon: "↗" },
                          { val: "bottom-right", label: "Kanan Bawah", icon: "↘" },
                          { val: "bottom-center", label: "Bawah Tengah", icon: "↓" },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            className={`p-3 rounded-lg border text-center transition-all ${(template.qrPlacement ?? "bottom-right") === opt.val ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
                            onClick={() => upd("qrPlacement", opt.val as any)}
                          >
                            <p className="text-lg mb-1">{opt.icon}</p>
                            <p className="text-xs font-medium">{opt.label}</p>
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg space-y-1">
                        <p className="font-semibold text-blue-700 dark:text-blue-300">ℹ️ Cara kerja QR Code:</p>
                        <p>Jamaah bisa men-scan QR code di invoice untuk membuka halaman verifikasi booking secara publik (tanpa login). Link menggunakan token acak yang tidak bisa ditebak: <span className="font-mono text-[10px]">/transaksi/&lt;token&gt;</span></p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                <div className="p-4 bg-muted/40 rounded-lg text-sm space-y-2">
                  <p className="font-semibold">Panduan Penggunaan</p>
                  <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
                    <li>Template ini digunakan saat admin mencetak "Form Transaksi" dari halaman detail booking</li>
                    <li>Hanya 1 template aktif (Default) yang digunakan — simpan perubahan untuk mengaktifkannya</li>
                    <li>Klik "Pratinjau PDF" untuk melihat hasil dengan data sampel sebelum menyimpan</li>
                    <li>Data perusahaan (nama, alamat, dll) diambil dari pengaturan Profil Perusahaan</li>
                  </ul>
                </div>

                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm space-y-2 border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    ⚠️ Aktivasi Halaman Verifikasi Publik
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Agar halaman QR Scan (form transaksi tanpa login) berfungsi di production, jalankan SQL berikut
                    sekali di <strong>Supabase Dashboard → SQL Editor</strong>:
                  </p>
                  <pre className="text-[10px] bg-amber-100 dark:bg-amber-900/30 rounded p-2 overflow-x-auto font-mono text-amber-900 dark:text-amber-200">
{`-- File: supabase/migrations/fase26_public_booking_rpc_qr_settings.sql
-- (sudah tersedia di repo, jalankan via Supabase SQL Editor)`}
                  </pre>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Migration ini membuat fungsi <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">get_public_booking_details</code>{" "}
                    yang memungkinkan jamaah membuka halaman transaksi dari QR Code tanpa perlu login.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Embedded PDF Preview Dialog ────────────────────────────────────── */}
      <Dialog open={showPreviewDialog} onOpenChange={open => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-5xl w-full h-[92vh] flex flex-col p-0 gap-0">
          {/* Header bar */}
          <DialogHeader className="flex-row items-center justify-between px-4 py-3 border-b shrink-0 space-y-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Pratinjau — Form Transaksi Paket Umrah
              <Badge variant="outline" className="text-xs font-normal ml-1">Data Sampel</Badge>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={buildPreview} disabled={previewing}
              >
                {previewing
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />}
                Refresh
              </Button>
              <Button
                size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={handleOpenNewTab}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Tab Baru
              </Button>
              <Button
                size="sm" className="gap-1.5 h-8 text-xs"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button
                size="sm" variant="ghost" className="h-8 w-8 p-0 ml-1"
                onClick={closePreview}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* PDF iframe */}
          <div className="flex-1 relative bg-muted/30 min-h-0">
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Memuat PDF...</p>
              </div>
            )}
            {previewUrl && (
              <iframe
                key={previewUrl}
                src={previewUrl}
                className="w-full h-full border-0"
                title="Pratinjau Form Transaksi"
                onLoad={() => setIframeLoading(false)}
              />
            )}
          </div>

          {/* Footer hint */}
          <DialogFooter className="px-4 py-2 border-t bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground w-full text-center">
              Pratinjau menggunakan data sampel. Klik <strong>Refresh</strong> setelah mengubah pengaturan untuk melihat perubahan terbaru.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
