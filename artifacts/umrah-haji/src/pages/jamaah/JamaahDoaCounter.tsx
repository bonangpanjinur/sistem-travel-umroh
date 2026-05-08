import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, RefreshCcw, CheckCircle2, Volume2, VolumeX, Trash2, Settings } from "lucide-react";

const PRESET_DZIKIR = [
  { id: "subhanallah",   arab: "سُبْحَانَ اللَّهِ",     latin: "Subhanallah",      arti: "Maha Suci Allah",                  default_target: 33,  icon: "🌟" },
  { id: "alhamdulillah", arab: "الْحَمْدُ لِلَّهِ",     latin: "Alhamdulillah",    arti: "Segala Puji bagi Allah",           default_target: 33,  icon: "✨" },
  { id: "allahuakbar",   arab: "اللَّهُ أَكْبَرُ",      latin: "Allahu Akbar",     arti: "Allah Maha Besar",                 default_target: 34,  icon: "🕌" },
  { id: "lailahaillallah", arab: "لَا إِلَهَ إِلَّا اللَّهُ", latin: "La ilaha illallah", arti: "Tiada Tuhan selain Allah", default_target: 100, icon: "💚" },
  { id: "astaghfirullah", arab: "أَسْتَغْفِرُ اللَّهَ", latin: "Astaghfirullah",   arti: "Aku memohon ampun kepada Allah",  default_target: 100, icon: "🤲" },
  { id: "sholawat",      arab: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", latin: "Allahumma Sholli Ala Muhammad", arti: "Ya Allah, limpahkan shalawat atas Muhammad", default_target: 100, icon: "🌹" },
  { id: "hauqalah",      arab: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", latin: "La hawla wa la quwwata illa billah", arti: "Tiada daya dan kekuatan kecuali dari Allah", default_target: 100, icon: "⚡" },
];

type Session = {
  id: string;
  dzikir_id: string;
  dzikir_name: string;
  dzikir_arab: string;
  dzikir_latin: string;
  icon: string;
  target: number;
  count: number;
  completed: boolean;
  created_at: string;
};

export default function JamaahDoaCounter() {
  const { user } = useAuth();
  const storageKey = `doa_sessions_${user?.id || "guest"}`;
  const vibratePref = `vibrate_${user?.id || "guest"}`;

  const [sessions, setSessions] = useState<Session[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_DZIKIR[0].id);
  const [customTarget, setCustomTarget] = useState(33);
  const [vibrate, setVibrate] = useState(() => localStorage.getItem(vibratePref) !== "false");

  function saveSessions(list: Session[]) {
    setSessions(list);
    localStorage.setItem(storageKey, JSON.stringify(list));
  }

  const activeSession = sessions.find(s => s.id === activeSessionId);

  function addSession() {
    const preset = PRESET_DZIKIR.find(p => p.id === selectedPreset);
    if (!preset) return;
    const newSession: Session = {
      id: Date.now().toString(),
      dzikir_id: preset.id,
      dzikir_name: preset.latin,
      dzikir_arab: preset.arab,
      dzikir_latin: preset.latin,
      icon: preset.icon,
      target: customTarget,
      count: 0,
      completed: false,
      created_at: new Date().toISOString(),
    };
    saveSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setShowAdd(false);
    toast.success(`Sesi ${preset.latin} dimulai — target ${customTarget}x`);
  }

  function increment() {
    if (!activeSession || activeSession.completed) return;
    const newCount = activeSession.count + 1;
    const completed = newCount >= activeSession.target;
    if (vibrate && "vibrate" in navigator) navigator.vibrate(30);
    saveSessions(sessions.map(s =>
      s.id === activeSessionId ? { ...s, count: newCount, completed } : s
    ));
    if (completed) toast.success(`🎉 ${activeSession.target}x ${activeSession.dzikir_name} selesai!`);
  }

  function resetSession(id: string) {
    saveSessions(sessions.map(s => s.id === id ? { ...s, count: 0, completed: false } : s));
  }

  function deleteSession(id: string) {
    const next = sessions.filter(s => s.id !== id);
    saveSessions(next);
    if (activeSessionId === id) setActiveSessionId(next[0]?.id || null);
  }

  const totalCompleted = sessions.filter(s => s.completed).length;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">Doa & Dzikir Counter</h1>
        <p className="text-muted-foreground text-sm mt-1">Tracker dzikir harian dengan target dan sesi tersimpan</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-3 text-center">
          <p className="text-2xl font-bold">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Sesi</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalCompleted}</p>
          <p className="text-xs text-muted-foreground">Selesai</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {sessions.reduce((s, sess) => s + sess.count, 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Total Dzikir</p>
        </CardContent></Card>
      </div>

      {/* Active counter */}
      {activeSession ? (
        <Card className={`border-2 ${activeSession.completed ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-primary/30"}`}>
          <CardContent className="pt-5 pb-5 text-center">
            <div className="text-5xl mb-2">{activeSession.icon}</div>
            <p className="text-2xl font-bold mb-0.5">{activeSession.dzikir_arab}</p>
            <p className="text-sm text-muted-foreground mb-3">{activeSession.dzikir_latin}</p>

            <div className="text-6xl font-black text-primary mb-2">
              {activeSession.count}
              <span className="text-2xl font-normal text-muted-foreground">/{activeSession.target}</span>
            </div>
            <Progress value={(activeSession.count / activeSession.target) * 100} className="h-3 mb-4" />

            {activeSession.completed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                  <CheckCircle2 className="h-6 w-6" /> Selesai! Alhamdulillah 🎉
                </div>
                <Button variant="outline" onClick={() => resetSession(activeSession.id)}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Ulangi Sesi
                </Button>
              </div>
            ) : (
              <button
                onClick={increment}
                className="w-48 h-48 rounded-full bg-primary text-primary-foreground text-5xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all duration-150 mx-auto flex items-center justify-center select-none"
                style={{ WebkitUserSelect: "none", touchAction: "manipulation" }}
              >
                {activeSession.count === 0 ? "Mulai" : "+"}
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="text-5xl mb-3">📿</div>
            <p>Pilih sesi di bawah atau tambah sesi baru</p>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Sesi Baru
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const next = !vibrate;
            setVibrate(next);
            localStorage.setItem(vibratePref, String(next));
            toast.info(next ? "Getaran aktif" : "Getaran nonaktif");
          }}
        >
          {vibrate ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      {/* Session list */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sesi Tersimpan</p>
          {sessions.map(session => (
            <Card
              key={session.id}
              className={`cursor-pointer transition-all ${activeSessionId === session.id ? "ring-2 ring-primary" : "hover:shadow-sm"} ${session.completed ? "opacity-70" : ""}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <CardContent className="pt-2.5 pb-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{session.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{session.dzikir_latin}</p>
                      {session.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />}
                    </div>
                    <Progress value={(session.count / session.target) * 100} className="h-1.5 mt-1" />
                    <p className="text-xs text-muted-foreground mt-0.5">{session.count} / {session.target}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); resetSession(session.id); }}>
                      <RefreshCcw className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={e => { e.stopPropagation(); deleteSession(session.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Sesi Dzikir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Jenis Dzikir</Label>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_DZIKIR.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPreset(p.id); setCustomTarget(p.default_target); }}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${selectedPreset === p.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{p.latin}</p>
                        <p className="text-xs text-muted-foreground">{p.arti}</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-auto">{p.default_target}x</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Target Hitungan</Label>
              <Input
                type="number"
                min={1}
                value={customTarget}
                onChange={e => setCustomTarget(parseInt(e.target.value) || 1)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button onClick={addSession}>Mulai Sesi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
