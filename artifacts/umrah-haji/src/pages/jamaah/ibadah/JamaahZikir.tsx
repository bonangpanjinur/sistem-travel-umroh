import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Moon, Plus, Minus, RotateCcw, CheckCircle2 } from "lucide-react";
import { ZIKIR_PAGI, ZIKIR_PETANG, type ZikirItem } from "@/data/zikirData";
import { useIbadahProgress } from "@/hooks/useIbadahProgress";
import { cn } from "@/lib/utils";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { JamaahPageHeader } from "@/components/jamaah/shell/JamaahPageHeader";

function ZikirCard({ item, sessionType }: { item: ZikirItem; sessionType: "pagi" | "petang" }) {
  const ibadahKey = `zikir-${sessionType}-${item.id}`;
  const { upsert, getProgress } = useIbadahProgress();
  const saved = getProgress(ibadahKey);
  const [localCount, setLocalCount] = useState<number>(saved?.count ?? 0);
  const current = saved ? saved.count : localCount;
  const progress = Math.min(100, (current / item.count) * 100);
  const done = current >= item.count;

  const update = (n: number) => {
    const next = Math.max(0, Math.min(item.count, n));
    setLocalCount(next);
    upsert({
      ibadah_type: ibadahKey,
      count: next,
      target: item.count,
      completed: next >= item.count,
    });
  };

  return (
    <Card className={cn("transition-all", done && "border-emerald-300 bg-emerald-50/30")}>
      <CardContent className="p-4 space-y-3">
        <p className="text-right text-2xl leading-loose font-arabic" style={{ fontFamily: "'Amiri', serif" }}>
          {item.arabic}
        </p>
        <p className="text-sm italic text-muted-foreground">{item.latin}</p>
        <p className="text-sm">{item.translation}</p>
        {item.benefit && (
          <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-900">
            ✨ {item.benefit}
          </p>
        )}
        {item.source && (
          <Badge variant="outline" className="text-xs">{item.source}</Badge>
        )}

        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono font-semibold">
              {current} / {item.count}x
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => update(current - 1)} disabled={current === 0}>
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className={cn("flex-1", done && "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => update(current + 1)}
              disabled={done}
            >
              {done ? (
                <><CheckCircle2 className="h-4 w-4 mr-1" /> Selesai</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Tambah</>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => update(0)} disabled={current === 0}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JamaahZikir() {
  const [tab, setTab] = useState<"pagi" | "petang">(() => {
    const h = new Date().getHours();
    return h >= 14 ? "petang" : "pagi";
  });
  const list = tab === "pagi" ? ZIKIR_PAGI : ZIKIR_PETANG;
  const { progress } = useIbadahProgress();

  const stats = useMemo(() => {
    const completed = list.filter((item) =>
      progress.some(
        (p: any) => p.ibadah_type === `zikir-${tab}-${item.id}` && p.completed
      )
    ).length;
    return { completed, total: list.length };
  }, [list, progress, tab]);

  return (
    <JamaahAppShell>
      <JamaahPageHeader
        title="Zikir Pagi & Petang"
        arabic="ٱلْأَذْكَار"
        subtitle={`Selesai hari ini: ${stats.completed}/${stats.total}`}
      />
      <div className="p-4 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="pagi" className="gap-2">
              <Sun className="h-4 w-4" /> Pagi
            </TabsTrigger>
            <TabsTrigger value="petang" className="gap-2">
              <Moon className="h-4 w-4" /> Petang
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pagi" className="space-y-3 mt-4">
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="p-3 text-sm text-amber-900">
                ☀️ Waktu zikir pagi dimulai setelah Subuh hingga matahari naik (Dhuha).
              </CardContent>
            </Card>
            {ZIKIR_PAGI.map((item) => (
              <ZikirCard key={item.id} item={item} sessionType="pagi" />
            ))}
          </TabsContent>

          <TabsContent value="petang" className="space-y-3 mt-4">
            <Card className="bg-indigo-50/50 border-indigo-200">
              <CardContent className="p-3 text-sm text-indigo-900">
                🌙 Waktu zikir petang dimulai setelah Ashar hingga Maghrib.
              </CardContent>
            </Card>
            {ZIKIR_PETANG.map((item) => (
              <ZikirCard key={item.id} item={item} sessionType="petang" />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </JamaahAppShell>
  );
}