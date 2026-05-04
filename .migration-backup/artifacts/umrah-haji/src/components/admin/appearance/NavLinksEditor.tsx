import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Menu, Save, Trash2, Plus, GripVertical, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavLink {
  href: string;
  label: string;
}

interface NavLinksEditorProps {
  settings: WebsiteSettings;
}

const DEFAULT_NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Beranda' },
  { href: '/packages', label: 'Paket Umroh' },
  { href: '/departures', label: 'Jadwal' },
  { href: '/savings', label: 'Tabungan' },
  { href: '/about', label: 'Tentang Kami' },
  { href: '/contact', label: 'Hubungi Kami' },
];

export function NavLinksEditor({ settings }: NavLinksEditorProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const [navLinks, setNavLinks] = useState<NavLink[]>(DEFAULT_NAV_LINKS);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (settings?.nav_links && Array.isArray(settings.nav_links)) {
      setNavLinks(settings.nav_links as NavLink[]);
    } else {
      setNavLinks(DEFAULT_NAV_LINKS);
    }
  }, [settings]);

  const handleAddLink = () => {
    setNavLinks([...navLinks, { href: '', label: '' }]);
  };

  const handleUpdateLink = (index: number, field: 'href' | 'label', value: string) => {
    const updated = [...navLinks];
    updated[index] = { ...updated[index], [field]: value };
    setNavLinks(updated);
  };

  const handleDeleteLink = (index: number) => {
    const updated = navLinks.filter((_, i) => i !== index);
    setNavLinks(updated);
    setDeleteIndex(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...navLinks];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setNavLinks(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    // Validate that all links have both href and label
    const hasEmpty = navLinks.some(link => !link.href.trim() || !link.label.trim());
    if (hasEmpty) {
      toast.error("Semua menu harus memiliki label dan URL");
      return;
    }

    updateSettings.mutate({ nav_links: navLinks });
  };

  const handleReset = () => {
    setNavLinks(DEFAULT_NAV_LINKS);
    updateSettings.mutate({ nav_links: DEFAULT_NAV_LINKS });
  };

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus menu "{navLinks[deleteIndex || 0]?.label}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteIndex !== null && handleDeleteLink(deleteIndex)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                <div>
                  <CardTitle>Menu Header</CardTitle>
                  <CardDescription>
                    Kelola label dan URL menu navigasi di header website
                  </CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Simpan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info Alert */}
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Tips:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Seret menu untuk mengubah urutan</li>
                  <li>URL harus dimulai dengan "/" (contoh: /packages)</li>
                  <li>Minimal satu menu harus ada</li>
                </ul>
              </div>
            </div>

            {/* Nav Links List */}
            <div className="space-y-3">
              {navLinks.map((link, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex gap-3 p-4 border rounded-lg transition-all ${
                    draggedIndex === index ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Input Fields */}
                  <div className="flex-1 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Label Menu</Label>
                      <Input
                        value={link.label}
                        onChange={(e) => handleUpdateLink(index, 'label', e.target.value)}
                        placeholder="Contoh: Beranda"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">URL</Label>
                      <Input
                        value={link.href}
                        onChange={(e) => handleUpdateLink(index, 'href', e.target.value)}
                        placeholder="Contoh: /packages"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteIndex(index)}
                    disabled={navLinks.length === 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={navLinks.length === 1 ? "Minimal satu menu harus ada" : "Hapus menu"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddLink}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Menu
            </Button>

            {/* Reset Button */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleReset}
            >
              Kembalikan ke Default
            </Button>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>Tampilan menu di header website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
              {navLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {link.label || '(Kosong)'}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
