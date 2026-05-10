import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

const DZIKIR_LIST = [
  { id: "subhanallah", text: "سُبْحَانَ اللّٰهِ", latin: "Subhanallah", arti: "Maha Suci Allah", target: 33 },
  { id: "alhamdulillah", text: "اَلْحَمْدُ لِلّٰهِ", latin: "Alhamdulillah", arti: "Segala Puji bagi Allah", target: 33 },
  { id: "allahuakbar", text: "اَللّٰهُ أَكْبَرُ", latin: "Allahu Akbar", arti: "Allah Maha Besar", target: 33 },
  { id: "lailahaillallah", text: "لَا إِلٰهَ إِلَّا اللّٰهُ", latin: "La ilaha illallah", arti: "Tiada Tuhan selain Allah", target: 100 },
  { id: "astaghfirullah", text: "أَسْتَغْفِرُ اللّٰهَ", latin: "Astaghfirullah", arti: "Aku memohon ampun kepada Allah", target: 100 },
  { id: "shalawat", text: "اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ", latin: "Allahumma Shalli ala Muhammad", arti: "Ya Allah, limpahkan shalawat kepada Muhammad", target: 100 },
  { id: "hasbiyallah", text: "حَسْبِيَ اللّٰهُ وَنِعْمَ الْوَكِيلُ", latin: "Hasbiyallah wa ni'mal wakil", arti: "Cukuplah Allah bagiku, dan Dia sebaik-baik pelindung", target: 40 },
];

const STORAGE_KEY = "tasbih-state-v2";

interface TasbihState { count: number; total: number; dzikir: string }

export default function TasbihDigital() {
  const [dzikir, setDzikir] = useState(DZIKIR_LIST[0]);
  const [count, setCount] = useState(0);
  const [totalSession, setTotalSession] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const d: TasbihState = JSON.parse(s);
        if (d.dzikir) {
          const found = DZIKIR_LIST.find(z => z.id === d.dzikir);
          if (found) { setDzikir(found); setCount(d.count || 0); setTotalSession(d.total || 0); }
        }
      }
    } catch {}
  }, []);

  const saveState = useCallback((c: number, t: number, id: string) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: c, total: t, dzikir: id })); } catch {}
  }, []);

  const playBeep = useCallback(() => {
    if (!sound) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, [sound]);

  const playChime = useCallback(() => {
    if (!sound) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtx.current;
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15); osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {}
  }, [sound]);

  const tap = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 150);
    if (vibrate && navigator.vibrate) navigator.vibrate(30);

    setCount(prev => {
      const next = prev + 1;
      setTotalSession(t => { saveState(next, t + 1, dzikir.id); return t + 1; });
      if (next >= dzikir.target) {
        playChime();
        if (vibrate && navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        setRounds(r => r + 1);
        setTimeout(() => setCount(0), 500);
        return 0;
      }
      playBeep();
      return next;
    });
  }, [dzikir, vibrate, playBeep, playChime, saveState]);

  const reset = () => {
    setCount(0); setTotalSession(0); setRounds(0);
    saveState(0, 0, dzikir.id);
  };

  const handleDzikirChange = (id: string) => {
    const found = DZIKIR_LIST.find(z => z.id === id);
    if (found) { setDzikir(found); setCount(0); setTotalSession(0); setRounds(0); saveState(0, 0, id); }
  };

  const progress = (count / dzikir.target) * 100;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 pb-16 select-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 py-8 px-4 text-center">
          <Badge className="mb-2 bg-white/20 text-white border-0">📿 Tasbih Digital</Badge>
          <h1 className="text-2xl font-bold text-white">Tasbih Digital</h1>
        </div>

        {/* Settings toggle */}
        <div className="flex justify-center gap-3 mt-4 px-4">
          <button onClick={() => setSound(!sound)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors ${sound ? "bg-emerald-700 text-white" : "bg-white/10 text-gray-400"}`}>
            {sound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {sound ? "Suara On" : "Suara Off"}
          </button>
          <button onClick={() => setVibrate(!vibrate)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors ${vibrate ? "bg-emerald-700 text-white" : "bg-white/10 text-gray-400"}`}>
            📳 {vibrate ? "Getar On" : "Getar Off"}
          </button>
        </div>

        {/* Dzikir selector */}
        <div className="max-w-sm mx-auto px-4 mt-4">
          <Select value={dzikir.id} onValueChange={handleDzikirChange}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {DZIKIR_LIST.map(z => (
                <SelectItem key={z.id} value={z.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                  {z.latin} (×{z.target})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dzikir text */}
        <div className="text-center px-4 mt-4">
          <p className="text-white font-arabic text-3xl md:text-4xl leading-loose mb-1">{dzikir.text}</p>
          <p className="text-emerald-300 text-sm font-medium">{dzikir.latin}</p>
          <p className="text-gray-400 text-xs mt-1 italic">"{dzikir.arti}"</p>
        </div>

        {/* Main counter button */}
        <div className="flex flex-col items-center mt-8 mb-6">
          {/* Circular progress */}
          <div className="relative w-64 h-64 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 264 264">
              <circle cx="132" cy="132" r="110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
              <circle
                cx="132" cy="132" r="110" fill="none"
                stroke="url(#tasbihGrad)" strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
              <defs>
                <linearGradient id="tasbihGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
            </svg>
            {/* Tap button */}
            <button
              onPointerDown={tap}
              className={`absolute inset-6 rounded-full bg-gradient-to-br from-emerald-700 to-teal-700 flex flex-col items-center justify-center transition-all duration-150 shadow-2xl active:shadow-inner ${isAnimating ? "scale-95 from-emerald-600 to-teal-600" : "scale-100 hover:from-emerald-600 hover:to-teal-600"}`}
              style={{ touchAction: "manipulation" }}
            >
              <span className="text-7xl font-bold font-mono text-white tabular-nums leading-none">{count}</span>
              <span className="text-emerald-300 text-sm mt-1">/ {dzikir.target}</span>
              {rounds > 0 && <span className="text-emerald-400 text-xs mt-0.5">🔄 {rounds}×</span>}
            </button>
          </div>
          <p className="text-gray-400 text-sm">Ketuk untuk menghitung</p>
        </div>

        {/* Session stats */}
        <div className="max-w-sm mx-auto px-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold font-mono text-white">{count}</p>
                <p className="text-gray-400 text-xs">Sesi ini</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-emerald-400">{rounds}</p>
                <p className="text-gray-400 text-xs">Putaran</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-teal-400">{totalSession}</p>
                <p className="text-gray-400 text-xs">Total</p>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={reset} className="w-full mt-3 border-red-700/40 text-red-400 hover:bg-red-900/30">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>

        {/* All dzikir quick access */}
        <div className="max-w-sm mx-auto px-4 mt-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Dzikir Lainnya</p>
          <div className="flex flex-wrap gap-2">
            {DZIKIR_LIST.map(z => (
              <button
                key={z.id}
                onClick={() => handleDzikirChange(z.id)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${dzikir.id === z.id ? "bg-emerald-700 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
              >
                {z.latin}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
