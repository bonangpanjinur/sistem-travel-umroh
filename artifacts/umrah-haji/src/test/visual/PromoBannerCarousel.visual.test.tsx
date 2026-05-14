import { describe, it, expect, vi, beforeEach } from "vitest";
import { VIEWPORTS, setViewport, renderWithProviders, stableMarkup } from "./utils";

// ── Mock Supabase: return 3 paket promosi deterministik ──────────────────────
vi.mock("@/integrations/supabase/client", () => {
  const result = {
    data: [
      { id: "p1", name: "Umroh Reguler 12 Hari", featured_image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200", price_quad: 28500000, price_triple: 31500000, price_double: 34500000, currency: "IDR", is_popular: true,  is_featured: false, package_type: "umroh" },
      { id: "p2", name: "Umroh Plus Turki",      featured_image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200", price_quad: 42500000, price_triple: 45500000, price_double: 48500000, currency: "IDR", is_popular: false, is_featured: true,  package_type: "umroh_plus" },
      { id: "p3", name: "Haji Khusus 2026",       featured_image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200", price_quad: 285000000, price_triple: 295000000, price_double: 315000000, currency: "IDR", is_popular: false, is_featured: true,  package_type: "haji" },
    ],
    error: null,
  };
  const builder: any = {
    select: () => builder, eq: () => builder, or: () => builder,
    order: () => builder, limit: async () => result,
  };
  return { supabase: { from: () => builder } };
});

// Stabilkan framer-motion (hilangkan animasi)
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const Comp = (tag: string) => React.forwardRef((p: any, ref: any) => React.createElement(tag, { ...p, ref }, p.children));
  return {
    motion: new Proxy({}, { get: (_t, k: string) => Comp(k) }),
    AnimatePresence: ({ children }: any) => children,
  };
});

import { PromoBannerCarousel } from "@/components/jamaah/home/PromoBannerCarousel";

describe("PromoBannerCarousel · visual regression", () => {
  beforeEach(() => vi.useFakeTimers());

  for (const vp of VIEWPORTS) {
    it(`matches snapshot @ ${vp.name}`, async () => {
      setViewport(vp.width, vp.height);
      const { container, findByAltText } = renderWithProviders(<PromoBannerCarousel />);
      // Tunggu data ter-resolve
      await findByAltText("Umroh Reguler 12 Hari");
      expect(stableMarkup(container.innerHTML)).toMatchSnapshot();
    });
  }
});