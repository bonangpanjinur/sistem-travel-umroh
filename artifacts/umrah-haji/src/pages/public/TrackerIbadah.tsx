import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Trophy, Flame, RotateCcw, Plus, Minus } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { AppPageHeader } from "@/components/shared/AppPageHeader";

interface IbadahItem {
  id: string;
  label: string;
  emoji: string;
  category: string;
  target: number;
  unit: string;
  count: number;
  done: boolean;
}

const INITIAL_IBADAH: IbadahItem[] = [
  { id: "subuh", label: "Sholat Subuh", emoji: "🌙", category: "Sholat Wajib", target: 1, unit: "rakaat × 2", count: 0, done: false },
  { id: "dzuhur", label: "Sholat Dzuhur", emoji: "☀️", category: "Sholat Wajib", target: 1, unit: "rakaat × 4", count: 0, done: false },
  { id: "ashar", label: "Sholat Ashar", emoji: "🌤️", category: "Sholat Wajib", target: 1, unit: "rakaat × 4", count: 0, done: false },
  { id: "maghrib", label: "Sholat Maghrib", emoji: "🌆", category: "Sholat Wajib", target: 1, unit: "rakaat × 3", count: 0, done: false },
  { id: "isya", label: "Sholat Isya", emoji: "🌙", category: "Sholat Wajib", target: 1, unit: "rakaat × 4", count: 0, done: false },
  { id: "tahajud", label: "Sholat Tahajud", emoji: "⭐", category: "Sholat Sunnah", target: 1, unit: "kali", count: 0, done: false },
  { id: "dhuha", label: "Sholat Dhuha", emoji: "🌅", category: "Sholat Sunnah", target: 1, unit: "kali", count: 0, done: false },
  { id: "quran", label: "Baca Al-Quran", emoji: "📖", category: "Tilawah", target: 1, unit: "juz", count: 0, done: false },
  { id: "dzikir", label: "Dzikir Pagi & Petang", emoji: "📿", category: "Dzikir", target: 2, unit: "kali", count: 0, done: false },
  { id: "istighfar", label: "Istighfar", emoji: "🤲", category: "Dzikir", target: 100, unit: "kali", count: 0, done: false },
  { id: "shalawat", label: "Shalawat Nabi", emoji: "✨", category: "Dzikir", target: 100, unit: "kali", count: 0, done: false },
  { id: "puasa", label: "Puasa Sunnah", emoji: "🌙", category: "Puasa", target: 1, unit: "hari", count: 0, done: false },
  { id: "sedekah", label: "Sedekah", emoji: "💝", category: "Amal", target: 1, unit: "kali", count: 0, done: false },
  { id: "tahfidz", label: "Hafalan Al-Quran", emoji: "🧠", category: "Tilawah", target: 1, unit: "ayat", count: 0, done: false },
];

const STORAGE_KEY = "ibadah-tracker-v2";
const STREAK_KEY = "ibadah-streak-v2";
const LAST_DATE_KEY = "ibadah-last-date";

export default function TrackerIbadah() {
  const [items, setItems] = useState<IbadahItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_IBADAH;
    } catch { return INITIAL_IBADAH; }
  });
  const [streak, setStreak] = useState(() => {
    try { return Number(localStorage.getItem(STREAK_KEY) || "0"); } catch { return 0; }
  });
  const [activeTab, setActiveTab] = useState("Sholat Wajib");

  const categories = ["Sholat Wajib", "Sholat Sunnah", "Tilawah", "Dzikir", "Puasa", "Amal"];

  const save = (newItems: IbadahItem[]) => {
    setItems(newItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  };

  const toggleItem = (id: string) => {
    save(items.map(item => item.id === id ? { ...item, done: !item.done, count: !item.done ? item.target : item.count } : item));
  };

  const increment = (id: string) => {
    save(items.map(item => {
      if (item.id !== id) return item;
      const count = Math.min(item.count + 1, item.target);
      return { ...item, count, done: count >= item.target };
    }));
  };

  const decrement = (id: string) => {
    save(items.map(item => {
      if (item.id !== id) return item;
      const count = Math.max(item.count - 1, 0);
      return { ...item, count, done: count >= item.target };
    }));
  };

  const resetAll = () => {
    save(INITIAL_IBADAH);
    localStorage.setItem(LAST_DATE_KEY, new Date().toDateString());
  };

  const totalDone = items.filter(i => i.done).length;
  const totalItems = items.length;
  const progress = Math.round((totalDone / totalItems) * 100);

  const filteredItems = items.filter(i => i.category === activeTab);
  const filteredDone = filteredItems.filter(i => i.done).length;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-violet-950 to-indigo-950 pb-16">
        <AppPageHeader
          title="Tracker Ibadah Harian"
          subtitle="Pantau & tingkatkan kualitas ibadah Anda"
          backTo="/"
          dark
        />

        <div className="max-w-xl mx-auto px-4 mt-6 space-y-4">
          {/* Summary */}
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-bold text-xl">{totalDone}/{totalItems} Ibadah</p>
                  <p className="text-gray-400 text-sm">Selesai hari ini</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-orange-400">
                      <Flame className="w-5 h-5" />
                      <span className="font-bold text-xl">{streak}</span>
                    </div>
                    <p className="text-gray-400 text-xs">Hari Berturut</p>
                  </div>
                  {totalDone === totalItems && (
                    <div className="text-center">
                      <Trophy className="w-8 h-8 text-yellow-400 mx-auto" />
                      <p className="text-yellow-400 text-xs">Sempurna!</p>
                    </div>
                  )}
                </div>
              </div>
              <Progress value={progress} className="h-3 bg-white/20" />
              <p className="text-right text-purple-300 text-xs mt-1">{progress}% selesai</p>
            </CardContent>
          </Card>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              const catDone = catItems.filter(i => i.done).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeTab === cat ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {cat} {catDone > 0 && <span className="ml-1 text-emerald-400">({catDone}/{catItems.length})</span>}
                </button>
              );
            })}
          </div>

          {/* Items */}
          <div className="space-y-2">
            {filteredItems.map(item => (
              <Card key={item.id} className={`border transition-all ${item.done ? "bg-emerald-900/30 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <button onClick={() => toggleItem(item.id)} className="shrink-0">
                    {item.done
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      : <Circle className="w-6 h-6 text-gray-500" />}
                  </button>
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.done ? "text-emerald-300 line-through" : "text-white"}`}>{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.count}/{item.target} {item.unit}</p>
                  </div>
                  {item.target > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => decrement(item.id)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white text-sm w-8 text-center font-mono">{item.count}</span>
                      <button onClick={() => increment(item.id)} className="w-7 h-7 rounded-full bg-purple-700/50 hover:bg-purple-600 flex items-center justify-center text-white">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="outline" onClick={resetAll} className="w-full border-red-700/40 text-red-400 hover:bg-red-900/30">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset Tracker (Hari Baru)
          </Button>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
