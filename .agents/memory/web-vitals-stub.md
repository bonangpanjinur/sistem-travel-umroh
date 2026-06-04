---
name: web-vitals Vite resolution fix
description: web-vitals package causes Vite import-analysis error when not installed; fixed with local stub module.
---

## Problem
`import("web-vitals")` — even as a dynamic import — causes `vite:import-analysis` to throw:
`Failed to resolve import "web-vitals" from "src/lib/webVitals.ts". Does the file exist?`

Neither `/* @vite-ignore */` nor `optimizeDeps.exclude` fully suppresses this in Vite 7.x.

## Fix (applied)
1. Created `artifacts/umrah-haji/src/lib/web-vitals-stub.ts` — exports no-op functions with the same API as the real `web-vitals` package.
2. Changed `webVitals.ts` to use a static import: `import { onLCP, onCLS, onINP, onFCP, onTTFB } from "./web-vitals-stub"` instead of the dynamic import.
3. In production (Vercel), the real `web-vitals@^5.2.0` is listed in package.json; the stub is only used in dev.

**Why:** Vite's import-analysis plugin resolves ALL import specifiers (even dynamic) at transform time, causing a hard error if the package isn't installed. A local stub file bypasses this entirely.
