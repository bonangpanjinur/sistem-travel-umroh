import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  css: {
    postcss: {
      plugins: [
        (await import("tailwindcss")).default,
        (await import("autoprefixer")).default,
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  // In development on Replit, force the Supabase client to use the local
  // Express proxy (→ Neon Postgres) instead of any Supabase cloud URL that
  // may be stored in Replit secrets.  The secrets are intentionally cleared
  // so that `client.ts` falls back to `window.location.origin`.
  define:
    process.env.NODE_ENV !== "production"
      ? {
          "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_PROJECT_URL": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_API_URL": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(""),
          "import.meta.env.VITE_SUPABASE_KEY": JSON.stringify(""),
        }
      : {},
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/auth/v1": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        // Forward all methods including OPTIONS preflight
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.error("[proxy /auth/v1 error]", err.message);
          });
        },
      },
      "/rest/v1": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.error("[proxy /rest/v1 error]", err.message);
          });
        },
      },
      "/sitemap.xml": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // /realtime is intentionally NOT proxied — the Supabase client uses a
      // no-op WebSocket transport (DisabledWebSocket in client.ts) so no
      // actual WS connection is ever attempted.
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
