import { useState, useEffect } from "react";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  BookOpen, Plus, Edit, Trash2, Search, Heart, Star,
  MapPin, Camera, Moon, Sun, Smile, Filter
} from "lucide-react";

const MOODS = [
  { id: "khusyuk",   emoji: "🤲", label: "Khusyuk",   color: "text-indigo-600" },
  { id: "syukur",    emoji: "😊", label: "Bersyukur", color: "text-emerald-600" },
  { id: "haru",      emoji: "🥹", label: "Terharu",   color: "text-blue-600" },
  { id: "bersemangat", emoji: "💪", label: "Semangat",color: "text-amber-600" },
  { id: "rindu",     emoji: "💙", label: "Rindu",      color: "text-purple-600" },
  { id: "lelah",     emoji: "😴", label: "Kelelahan",  color: "text-gray-500" },
];

const LOCATIONS = [
  "Masjidil Haram", "Masjid Nabawi", "Raudhah Syarifah", "Jabal Nur",
  "Jabal Tsur", "Masjid Quba", "Baqi'", "Arafah", "Mina", "Muzdalifah",
  "Zamzam Tower", "Hotel Makkah", "Hotel Madinah", "Bandara", "Bus",
];

type JournalEntry = {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  location: string;
  tags: string[];
  created_at: string;
};

export default function JamaahJurnal() {
  const { user } = useAuth();
  const storageKey = `jurnal_${user?.id || "guest"}`;

  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    title: "",
    content: "",
    mood: "syukur",
    location: "",
    tags: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('jamaah_jurnal')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data?.length) {
          const mapped = data.map((r: any) => ({
            id: r.id,
            date: r.date,
            title: r.title,
            content: r.content,
            mood: r.mood,
            location: r.location,
            tags: r.tags || [],
            created_at: r.created_at,
          }));
          setEntries(mapped);
          localStorage.setItem(storageKey, JSON.stringify(mapped));
        }
      } catch {}
    })();
  }, [user?.id]);

  async function saveEntries(list: JournalEntry[]) {
    setEntries(list);
    localStorage.setItem(storageKey, JSON.stringify(list));
  }

  async function saveEntryToDb(entry: JournalEntry, isEdit: boolean) {
    if (!user?.id) return;
    try {
      if (isEdit) {
        await supabase.from('jamaah_jurnal').update({
          date: entry.date, title: entry.title, content: entry.content,
          mood: entry.mood, location: entry.location, tags: entry.tags,
        }).eq('id', entry.id);
      } else {
        await supabase.from('jamaah_jurnal').insert({
          id: entry.id, user_id: user.id, date: entry.date, title: entry.title,
          content: entry.content, mood: entry.mood, location: entry.location, tags: entry.tags,
        });
      }
    } catch {}
  }

  async function deleteEntryFromDb(id: string) {
    if (!user?.id) return;
    try { await supabase.from('jamaah_jurnal').delete().eq('id', id); } catch {}
  }

  function submitForm() {
    if (!form.title.trim()) { toast.error("Judul jurnal harus diisi"); return; }
    if (!form.content.trim()) { toast.error("Isi jurnal harus diisi"); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    if (editEntry) {
      const updated = { ...editEntry, ...form, tags };
      saveEntries(entries.map(e => e.id === editEntry.id ? updated : e));
      saveEntryToDb(updated, true);
      toast.success("Jurnal diperbarui");
    } else {
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        ...form,
        tags,
        created_at: new Date().toISOString(),
      };
      saveEntries([newEntry, ...entries]);
      saveEntryToDb(newEntry, false);
      toast.success("Jurnal berhasil disimpan 📖");
    }
    closeForm();
  }

  function deleteEntry(id: string) {
    saveEntries(entries.filter(e => e.id !== id));
    deleteEntryFromDb(id);
    setViewEntry(null);
    toast.success("Jurnal dihapus");
  }

  function openEdit(entry: JournalEntry) {
    setEditEntry(entry);
    setForm({
      date: entry.date,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      location: entry.location,
      tags: entry.tags.join(", "),
    });
    setViewEntry(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditEntry(null);
    setForm({ date: format(new Date(), "yyyy-MM-dd"), title: "", content: "", mood: "syukur", location: "", tags: "" });
  }

  const filtered = entries.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  const getMood = (id: string) => MOODS.find(m => m.id === id);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">Jurnal Ibadah</h1>
        <p className="text-muted-foreground text-sm mt-1">Catatan pribadi pengalaman spiritualmu</p>
        <Badge variant="outline" className="mt-2 text-xs">{entries.length} entri • Hanya kamu yang bisa lihat</Badge>
      </div>

      {/* Action */}
      <Button className="w-full" onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 mr-2" /> Tulis Jurnal Baru
      </Button>

      {/* Search */}
      {entries.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari jurnal..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
      )}

      {/* Entries */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">{search ? "Tidak ada jurnal ditemukan" : "Belum ada jurnal"}</p>
            <p className="text-xs text-muted-foreground mt-1">Tuliskan pengalaman ibadah dan perasaanmu setiap hari</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const mood = getMood(entry.mood);
            return (
              <Card key={entry.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewEntry(entry)}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{mood?.emoji || "📝"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{entry.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{entry.content}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(entry.date), "d MMM yyyy", { locale: idLocale })}
                        </span>
                        {entry.location && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {entry.location}
                          </span>
                        )}
                        {entry.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) closeForm(); else setShowForm(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit Jurnal" : "Tulis Jurnal Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Perasaan</Label>
                <Select value={form.mood} onValueChange={v => setForm({ ...form, mood: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.emoji} {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Judul Jurnal</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Apa yang ingin kamu abadikan hari ini?" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Lokasi (opsional)</Label>
              <Select value={form.location} onValueChange={v => setForm({ ...form, location: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih lokasi..." />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Isi Jurnal</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={6}
                placeholder="Ceritakan pengalamanmu, perasaanmu, doa-doamu, atau momen yang tidak terlupakan..."
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Tag (pisahkan koma)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="thawaf, doa, syukur..." className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button onClick={submitForm}>{editEntry ? "Simpan Perubahan" : "Simpan Jurnal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={v => { if (!v) setViewEntry(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getMood(viewEntry.mood)?.emoji}</span>
                  <DialogTitle className="leading-snug">{viewEntry.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>📅 {format(parseISO(viewEntry.date), "d MMMM yyyy", { locale: idLocale })}</span>
                  {viewEntry.location && <span>📍 {viewEntry.location}</span>}
                  <span className={getMood(viewEntry.mood)?.color}>{getMood(viewEntry.mood)?.emoji} {getMood(viewEntry.mood)?.label}</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {viewEntry.content}
                </div>
                {viewEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {viewEntry.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => deleteEntry(viewEntry.id)}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                </Button>
                <Button variant="outline" onClick={() => openEdit(viewEntry)}>
                  <Edit className="h-4 w-4 mr-1.5" /> Edit
                </Button>
                <Button onClick={() => setViewEntry(null)}>Tutup</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
