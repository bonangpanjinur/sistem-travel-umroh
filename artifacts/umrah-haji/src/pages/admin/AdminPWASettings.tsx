import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Smartphone, GripVertical, Eye, EyeOff, RotateCcw, Save,
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { usePWAConfig, ALL_NAV_OPTIONS, BottomNavItem } from "@/hooks/usePWAConfig";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone,
};

function NavItemRow({
  item,
  index,
  onChange,
}: {
  item: BottomNavItem;
  index: number;
  onChange: (updated: BottomNavItem) => void;
}) {
  const Icon = ICON_MAP[item.icon] ?? Home;
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary"
          )}
        >
          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
              item.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", !item.enabled && "text-muted-foreground")}>
              {item.label}
            </p>
            <p className="text-xs text-muted-foreground truncate">{item.path}</p>
          </div>
          <Switch
            checked={item.enabled}
            onCheckedChange={(checked) => onChange({ ...item, enabled: checked })}
          />
        </div>
      )}
    </Draggable>
  );
}

export default function AdminPWASettings() {
  const { items, save, reset } = usePWAConfig();
  const [localItems, setLocalItems] = useState<BottomNavItem[]>(
    ALL_NAV_OPTIONS.map((opt) => {
      const saved = items.find((i) => i.id === opt.id);
      return saved ?? opt;
    }).sort((a, b) => a.order - b.order)
  );

  const activeCount = localItems.filter((i) => i.enabled).length;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(localItems);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setLocalItems(reordered.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleChange = (updated: BottomNavItem) => {
    setLocalItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleSave = () => {
    const toSave = localItems.filter((i) => i.enabled).slice(0, 5);
    if (toSave.length === 0) {
      toast.error("Aktifkan minimal 1 menu.");
      return;
    }
    save(localItems);
    toast.success("Pengaturan menu aplikasi disimpan!");
  };

  const handleReset = () => {
    reset();
    setLocalItems(ALL_NAV_OPTIONS.sort((a, b) => a.order - b.order));
    toast.info("Menu dikembalikan ke default.");
  };

  // Mock phone preview
  const previewItems = localItems.filter((i) => i.enabled).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Smartphone className="h-6 w-6" />
          Pengaturan Aplikasi (PWA)
        </h1>
        <p className="text-muted-foreground">
          Atur menu navigasi bawah dan tampilan saat website dipasang sebagai aplikasi di ponsel.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Tentang Fitur Aplikasi (PWA)</p>
          <p>
            Pengunjung website dapat menekan tombol <strong>"Pasang Aplikasi"</strong> yang muncul otomatis,
            lalu website akan terlihat seperti aplikasi native di layar ponsel — dengan menu bawah, tanpa
            address bar browser, dan bisa dibuka dari ikon di home screen.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu Navigasi Bawah</CardTitle>
            <CardDescription>
              Aktifkan/nonaktifkan dan seret untuk mengubah urutan. Maks. 5 item ditampilkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Aktif: <strong>{activeCount}</strong> dari {localItems.length}
              </span>
              {activeCount > 5 && (
                <Badge variant="destructive" className="text-xs">
                  Hanya 5 pertama yang ditampilkan
                </Badge>
              )}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="bottom-nav">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {localItems.map((item, index) => (
                      <NavItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onChange={handleChange}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <Separator />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reset Default
              </Button>
              <Button size="sm" onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-1.5" />
                Simpan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Aplikasi</CardTitle>
            <CardDescription>Tampilan saat dipasang di ponsel</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* Phone mockup */}
            <div className="relative w-56 h-[480px] rounded-[2rem] border-4 border-foreground bg-background shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground rounded-b-xl z-10" />

              {/* Screen content */}
              <div className="h-full flex flex-col bg-gradient-to-b from-green-700 to-emerald-600">
                {/* Status bar */}
                <div className="flex justify-between px-4 pt-8 pb-2 text-white text-[10px]">
                  <span>9:41</span>
                  <span>●●●</span>
                </div>

                {/* App content area */}
                <div className="flex-1 bg-background mx-0 rounded-t-2xl mt-1 relative overflow-hidden">
                  <div className="p-3 space-y-2">
                    <div className="h-2 w-2/3 bg-muted rounded-full" />
                    <div className="h-20 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-14 bg-muted rounded-lg" />
                      <div className="h-14 bg-muted rounded-lg" />
                    </div>
                    <div className="h-12 bg-muted rounded-lg" />
                    <div className="h-12 bg-muted rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Bottom nav preview */}
              <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border">
                <div
                  className="grid h-14"
                  style={{ gridTemplateColumns: `repeat(${previewItems.length || 1}, 1fr)` }}
                >
                  {previewItems.map((item, idx) => {
                    const Icon = ICON_MAP[item.icon] ?? Home;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-col items-center justify-center gap-0.5",
                          idx === 0 ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[8px] font-medium">{item.label}</span>
                      </div>
                    );
                  })}
                  {previewItems.length === 0 && (
                    <div className="flex items-center justify-center text-[10px] text-muted-foreground col-span-1">
                      Tidak ada menu
                    </div>
                  )}
                </div>
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-foreground/30 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PWA Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cara Pasang Aplikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="space-y-1">
              <p className="font-semibold">📱 Android (Chrome)</p>
              <p className="text-muted-foreground text-xs">
                Buka website → ketuk menu ⋮ → pilih <em>"Tambahkan ke Layar Utama"</em> → Tambahkan
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">🍎 iPhone (Safari)</p>
              <p className="text-muted-foreground text-xs">
                Buka website → ketuk ikon Bagikan 🔗 → gulir ke bawah → pilih <em>"Tambahkan ke Layar Utama"</em>
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">💡 Prompt Otomatis</p>
              <p className="text-muted-foreground text-xs">
                Di Android, banner <em>"Pasang Aplikasi"</em> muncul otomatis setelah beberapa detik saat pengunjung membuka website.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
