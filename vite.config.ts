import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react({ tsDecorators: true }), 
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Umrah Haji - Portal Jamaah",
        short_name: "UmrahHaji",
        description: "Aplikasi Portal Jamaah Umrah & Haji",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/jamaah",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "any",
            type: "image/x-icon",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.qrserver\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "qr-images",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimized chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks - separated for better caching
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/@supabase/supabase-js')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Admin pages - single chunk to avoid cross-chunk circular deps.
          // Splitting CRM pages into a separate 'admin-crm' chunk caused
          // "Cannot access '_' before initialization" because shared admin
          // modules ended up referenced across two chunks in the wrong order.
          if (id.includes('pages/admin/')) {
            return 'admin-pages';
          }
        },
      },
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1500, // Increased for better code splitting
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ["console.debug"],
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    // Source maps for production debugging
    sourcemap: false,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Optimization for development
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "recharts",
      "date-fns",
      "lucide-react",
    ],
    exclude: ["@vite/client"],
    // Pre-bundle heavy dependencies
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));
