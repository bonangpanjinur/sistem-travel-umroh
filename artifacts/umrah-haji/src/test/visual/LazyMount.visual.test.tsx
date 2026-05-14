import { describe, it, expect } from "vitest";
import { renderWithProviders, stableMarkup } from "./utils";
import { LazyMount } from "@/components/utils/LazyMount";

class IO { cb:any; constructor(cb:any){this.cb=cb;} observe(t:Element){this.cb([{isIntersecting:true,target:t}],this as any);} unobserve(){} disconnect(){} }

describe("LazyMount · visual regression", () => {
  it("placeholder before intersect", () => {
    (globalThis as any).IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
    const { container } = renderWithProviders(<LazyMount minHeight={180}><div data-testid="c">CHILD</div></LazyMount>);
    expect(stableMarkup(container.innerHTML)).toMatchSnapshot("placeholder");
  });
  it("mounted after intersect", async () => {
    (globalThis as any).IntersectionObserver = IO;
    const { findByTestId, container } = renderWithProviders(<LazyMount minHeight={180}><div data-testid="c">CHILD</div></LazyMount>);
    await findByTestId("c");
    expect(stableMarkup(container.innerHTML)).toMatchSnapshot("mounted");
  });
});
