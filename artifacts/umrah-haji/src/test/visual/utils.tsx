import { ReactElement } from "react";
import { render, RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;

/** Setel ukuran viewport jsdom untuk snapshot multi-breakpoint. */
export function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
  window.dispatchEvent(new Event("resize"));
}

/** Render dengan router + react-query provider. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Bersihkan atribut yang sering berubah agar snapshot stabil
 * (id react, data-testid otomatis, animation state, dsb).
 */
export function stableMarkup(html: string): string {
  return html
    .replace(/data-state="[^"]*"/g, "")
    .replace(/aria-controls="radix-[^"]*"/g, "")
    .replace(/id="radix-[^"]*"/g, "")
    .replace(/style="[^"]*animation[^"]*"/g, "")
    .replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).sort().join(" ")}"`)
    .replace(/\s+>/g, ">")
    .trim();
}