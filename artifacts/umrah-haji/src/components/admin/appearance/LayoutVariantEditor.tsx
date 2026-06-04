import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { WebsiteSettings, useUpdateWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { DEFAULT_LAYOUT, getTheme, LayoutVariant } from '@/lib/themes/registry';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  settings: WebsiteSettings;
}

const HERO_VARIANTS: { value: LayoutVariant['hero']; label: string }[] = [
  { value: 'classic', label: 'Classic — Hero penuh + search widget' },
  { value: 'split', label: 'Split — Teks kiri, gambar kanan' },
  { value: 'asymmetric', label: 'Asymmetric — Layout dinamis' },
  { value: 'serene', label: 'Serene — Tenang, organik' },
  { value: 'neon', label: 'Neon — Dark futuristik' },
  { value: 'royal', label: 'Royal — Dark mewah, aksen emas' },
];

const CTA_VARIANTS: { value: LayoutVariant['cta']; label: string }[] = [
  { value: 'classic', label: 'Classic — CTA tegas standar' },
  { value: 'gradient', label: 'Gradient — Card dengan gradasi' },
  { value: 'serif', label: 'Serif — Tipografi elegan' },
  { value: 'islamic', label: 'Islamic — Sentuhan ornamen Islami' },
  { value: 'organic', label: 'Organic — Bentuk lembut alam' },
  { value: 'neon', label: 'Neon — Glow futuristik' },
  { value: 'gold', label: 'Gold — Aksen emas premium' },
];

const PACKAGES_VARIANTS = [
  { value: 'grid-3', label: 'Grid 3 kolom' },
  { value: 'grid-4', label: 'Grid 4 kolom' },
  { value: 'carousel', label: 'Carousel' },
] as const;

const TESTIMONIALS_VARIANTS = [
  { value: 'grid', label: 'Grid' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'slider', label: 'Slider' },
] as const;

/**
 * LayoutVariantEditor — admin memilih varian tiap section.
 * Override disimpan di `website_settings.layout_variant` (JSONB).
 * Default mengikuti registry (DEFAULT_LAYOUT) untuk template aktif.
 */
export function LayoutVariantEditor({ settings }: Props) {
  const update = useUpdateWebsiteSettings();
  const tokens = getTheme(settings.template);
  const fallback = DEFAULT_LAYOUT[tokens.slug];
  const current = (settings.layout_variant ?? {}) as LayoutVariant;

  const [draft, setDraft] = useState<LayoutVariant>({
    hero: current.hero ?? tokens.components.hero,
    cta: current.cta ?? tokens.components.cta,
    packages: current.packages ?? fallback.packages ?? 'grid-3',
    testimonials: current.testimonials ?? fallback.testimonials ?? 'grid',
  });

  const handleSave = () => {
    update.mutate(
      { layout_variant: draft as any } as any,
      {
        onSuccess: () => toast.success('Layout varian disimpan'),
        onError: (e: any) => toast.error(e?.message || 'Gagal menyimpan'),
      }
    );
  };

  const handleReset = () => {
    setDraft({
      hero: tokens.components.hero,
      cta: tokens.components.cta,
      packages: fallback.packages ?? 'grid-3',
      testimonials: fallback.testimonials ?? 'grid',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layout Varian per Section</CardTitle>
        <CardDescription>
          Override varian section. Default mengikuti tema aktif: <span className="font-semibold">{tokens.name}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Hero Section</Label>
            <Select value={draft.hero} onValueChange={(v) => setDraft({ ...draft, hero: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HERO_VARIANTS.map((o) => (
                  <SelectItem key={o.value} value={o.value!}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CTA Section</Label>
            <Select value={draft.cta} onValueChange={(v) => setDraft({ ...draft, cta: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CTA_VARIANTS.map((o) => (
                  <SelectItem key={o.value} value={o.value!}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Featured Packages</Label>
            <Select value={draft.packages} onValueChange={(v) => setDraft({ ...draft, packages: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PACKAGES_VARIANTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Testimonials</Label>
            <Select value={draft.testimonials} onValueChange={(v) => setDraft({ ...draft, testimonials: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TESTIMONIALS_VARIANTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={update.isPending}>
            Simpan Layout
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={update.isPending}>
            Kembali ke Default Tema
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}