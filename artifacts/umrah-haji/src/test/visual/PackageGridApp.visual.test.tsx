import { describe, it, expect, vi } from "vitest";
import { VIEWPORTS, setViewport, renderWithProviders, stableMarkup } from "./utils";

vi.mock("@/integrations/supabase/client", () => {
  const result = { data: [
    { id:"p1", name:"Umroh Hemat 9H", featured_image:"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400", duration_days:9, price_quad:24500000, price_triple:26500000, price_double:28500000, price_single:33000000, currency:"IDR", package_type:"umroh", is_popular:true, is_featured:true },
    { id:"p2", name:"Umroh Premium 12H", featured_image:"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400", duration_days:12, price_quad:32500000, price_triple:35500000, price_double:38500000, price_single:44000000, currency:"IDR", package_type:"umroh", is_popular:false, is_featured:true },
    { id:"p3", name:"Umroh Plus Mesir", featured_image:"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400", duration_days:15, price_quad:41500000, price_triple:44500000, price_double:47500000, price_single:53000000, currency:"IDR", package_type:"umroh_plus", is_popular:false, is_featured:false },
    { id:"p4", name:"Haji Khusus 2026", featured_image:"https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=400", duration_days:30, price_quad:285000000, price_triple:295000000, price_double:315000000, price_single:360000000, currency:"IDR", package_type:"haji", is_popular:true, is_featured:false },
  ], error:null };
  const builder: any = { select:()=>builder, eq:()=>builder, order:()=>builder, limit: async()=>result };
  return { supabase: { from: () => builder } };
});
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const C = (t:string) => React.forwardRef((p:any,r:any)=>React.createElement(t,{...p,ref:r},p.children));
  return { motion: new Proxy({},{ get:(_t,k:string)=>C(k) }), AnimatePresence: ({children}:any)=>children };
});
vi.mock("@/hooks/useWishlist", () => ({ useWishlist: () => ({ isWishlisted: () => false, toggle: () => {} }) }));

import { PackageGridApp } from "@/components/jamaah/home/PackageGridApp";

describe("PackageGridApp · visual regression", () => {
  for (const vp of VIEWPORTS) {
    it(`matches snapshot @ ${vp.name}`, async () => {
      setViewport(vp.width, vp.height);
      const { container, findByText } = renderWithProviders(<PackageGridApp limit={6} />);
      await findByText("Umroh Hemat 9H");
      expect(stableMarkup(container.innerHTML)).toMatchSnapshot();
    });
  }
});
