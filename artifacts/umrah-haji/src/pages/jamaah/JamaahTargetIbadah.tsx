import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Target, Plus, Edit, Trash2, CheckCircle2, Circle, Flame,
  BookOpen, Moon, Heart, Star, RefreshCcw, TrendingUp
} from "lucide-react";

const PRESET_TARGETS = [
  { name: "Baca Al-Qur'an 1 Juz", icon: "📖", unit: "juz", default_target: 1, category: "spiritual" },
  { name: "Sholat Dhuha", icon: "🌅", unit: "rakaat", default_target: 4, category: "sholat" },
  { name: "Dzikir Pagi & Petang", icon: "📿", unit: "sesi", default_target: 2, category: "spiritual" },
  { name: "Sedekah", icon: "💝", unit: "kali", default_target: 1, category: "sosial" },
  { name: "Sholat Tahajud", icon: "🌙", unit: "rakaat", default_target: 8, category: "sholat" },
  { name: "Baca Istighfar 100x", icon: "🤲", unit: "kali", default_target: 1, category: "dzikir" },
  { name: "Sholawat Nabi 100x", icon: "✨", unit: "kali", default_target: 1, category: "dzikir" },
  { name: "Puasa Sunnah", icon: "🌙", unit: "hari", default_target: 1, category: "sholat" },
];

type Target = {
  id: string;
  name: string;
  icon: string;
  unit: string;
  daily_target: number;
  category: string;
  active: boolean;
};

type DailyLog = Record<string, Record<string, number>>; // { "2025-01-01": { targetId: count } }

export default function JamaahTargetIbadah() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale });

  const storageKey = `ibadah_targets_${user?.id || "guest"}`;
  const logKey = `ibadah_logs_${user?.id || "guest"}`;

  const [targets, setTargets] = useState<Target[]>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const [logs, setLogs] = useState<DailyLog>(() => {
    try {
      const s = localStorage.getItem(logKey);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Target | null>(null);
  const [form, setForm] = useState({ name: "", icon: "⭐", unit: "kali", daily_target: 1, category: "spiritual" });

  function saveTargets(list: Target[]) {
    setTargets(list);
    localStorage.setItem(storageKey, JSON.stringify(list));
  }

  function saveLog(newLogs: DailyLog) {
    setLogs(newLogs);
    localStorage.setItem(logKey, JSON.stringify(newLogs));
  }

  function getTodayCount(targetId: string) {
    return logs[today]?.[targetId] || 0;
  }

  function increment(targetId: string, unit: number = 1) {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    const current = getTodayCount(targetId);
    if (current >= target.daily_target) { toast.info("Target hari ini sudah tercapai! 🎉"); return; }
    const newLogs = { ...logs, [today]: { ...(logs[today] || {}), [targetId]: current + unit } };
    saveLog(newLogs);
  }

  function setCount(targetId: string, count: number) {
    const newLogs = { ...logs, [today]: { ...(logs[today] || {}), [targetId]: count } };
    saveLog(newLogs);
  }

  function addFromPreset(preset: typeof PRESET_TARGETS[0]) {
    const newTarget: Target = {
      id: Date.now().toString(),
      name: preset.name,
      icon: preset.icon,
      unit: preset.unit,
      daily_target: preset.default_target,
      category: preset.category,
      active: true,
    };
    saveTargets([...targets, newTarget]);
    toast.success(`Target "${preset.name}" ditambahkan`);
  }

  function saveCustomTarget() {
    if (!form.name.trim()) { toast.error("Nama target harus diisi"); return; }
    if (editTarget) {
      saveTargets(targets.map(t => t.id === editTarget.id ? { ...t, ...form } : t));
      toast.success("Target diperbarui");
    } else {
      saveTargets([...targets, { id: Date.now().toString(), ...form, active: true }]);
      toast.success("Target ditambahkan");
    }
    setShowAdd(false);
    setEditTarget(null);
    setForm({ name: "", icon: "⭐", unit: "kali", daily_target: 1, category: "spiritual" });
  }

  function deleteTarget(id: string) {
    saveTargets(targets.filter(t => t.id !== id));
  }

  function toggleActive(id: string) {
    saveTargets(targets.map(t => t.id === id ? { ...t, active: !t.active } : t));
  }

  // Weekly streak
  function getStreak(targetId: string) {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const key = format(d, "yyyy-MM-dd");
      const target = targets.find(t => t.id === targetId);
      if (logs[key]?.[targetId] >= (target?.daily_target || 1)) streak++;
      else break;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  const activeTargets = targets.filter(t => t.active);
  const completedToday = activeTargets.filter(t => getTodayCount(t.id) >= t.daily_target).length;
  const totalXPToday = activeTargets
    .filter(t => getTodayCount(t.id) >= t.daily_target)
    .length * 20;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">Target Ibadah Harian</h1>
        <p className="text-muted-foreground text-sm mt-1">{todayLabel}</p>
      </div>

      {/* Daily progress */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-emerald-100 text-xs">Progress Hari Ini</p>
              <p className="text-3xl font-black">{completedToday}<span className="text-xl font-normal text-emerald-200">/{activeTargets.length}</span></p>
            </div>
            <div className="text-right">
              <div className="text-3xl">🎯</div>
              <p className="text-emerald-100 text-xs">+{totalXPToday} XP</p>
            </div>
          </div>
          <Progress
            value={activeTargets.length > 0 ? (completedToday / activeTargets.length) * 100 : 0}
            className="h-3 bg-emerald-400/40"
          />
          {completedToday === activeTargets.length && activeTargets.length > 0 && (
            <p className="text-center text-sm font-bold mt-2">🎉 Semua target tercapai hari ini!</p>
          )}
        </CardContent>
      </Card>

      {/* Add target button */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Target
        </Button>
      </div>

      {/* Active targets */}
      {activeTargets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Belum ada target ibadah</p>
            <p className="text-xs text-muted-foreground mt-1">Tambahkan target dari preset atau buat sendiri</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeTargets.map(target => {
            const count = getTodayCount(target.id);
            const pct = Math.min((count / target.daily_target) * 100, 100);
            const done = count >= target.daily_target;
            const streak = getStreak(target.id);
            return (
              <Card key={target.id} className={done ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" : ""}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl flex-shrink-0">{target.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{target.name}</p>
                        {done && <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />}
                        {streak >= 3 && (
                          <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
                            <Flame className="h-2.5 w-2.5 mr-0.5" /> {streak} hari
                          </Badge>
                        )}
                      </div>
                      <Progress value={pct} className="h-2 mb-1" />
                      <p className="text-xs text-muted-foreground">{count} / {target.daily_target} {target.unit}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={done ? "secondary" : "default"}
                        className="h-8 px-3"
                        onClick={() => increment(target.id)}
                        disabled={done}
                      >
                        {done ? "✓" : "+1"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditTarget(target); setForm({ name: target.name, icon: target.icon, unit: target.unit, daily_target: target.daily_target, category: target.category }); setShowAdd(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => deleteTarget(target.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preset section */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Preset Populer</h3>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_TARGETS.filter(p => !targets.some(t => t.name === p.name)).map(preset => (
            <Button
              key={preset.name}
              variant="outline"
              className="h-auto py-2 px-3 text-left justify-start"
              onClick={() => addFromPreset(preset)}
            >
              <span className="text-lg mr-2">{preset.icon}</span>
              <span className="text-xs line-clamp-1">{preset.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) { setEditTarget(null); setForm({ name: "", icon: "⭐", unit: "kali", daily_target: 1, category: "spiritual" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Target" : "Tambah Target Ibadah"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-20">
                <Label className="text-xs">Ikon</Label>
                <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="h-9 text-center text-xl" maxLength={2} />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Nama Target</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Baca Qur'an" className="h-9" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Target Harian</Label>
                <Input type="number" min={1} value={form.daily_target} onChange={e => setForm({ ...form, daily_target: parseInt(e.target.value) || 1 })} className="h-9" />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Satuan</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="kali, juz, rakaat..." className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditTarget(null); }}>Batal</Button>
            <Button onClick={saveCustomTarget}>{editTarget ? "Simpan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
