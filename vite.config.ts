import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
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
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
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
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.qrserver\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "qr-images",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\/assets\/.+\.js$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "js-chunks",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react-router-dom')) return 'vendor-react';
          
          if (id.includes('node_modules/@radix-ui')) return 'vendor-ui';
          if (id.includes('node_modules/lucide-react')) return 'vendor-ui';
          
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          
          if (id.includes('node_modules/zod')) return 'vendor-utils';
          if (id.includes('node_modules/sonner')) return 'vendor-utils';
          if (id.includes('node_modules/clsx')) return 'vendor-utils';
          if (id.includes('node_modules/date-fns')) return 'vendor-utils';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          
          // Page chunks - Public pages
          if (id.includes('src/pages/packages/PackageDetail')) return 'page-package-detail';
          if (id.includes('src/pages/packages/PackageList')) return 'page-package-list';
          if (id.includes('src/pages/public/')) return 'page-public';
          if (id.includes('src/pages/savings/')) return 'page-savings';
          
          // Page chunks - Admin pages
          if (id.includes('src/pages/admin/AdminAppearance')) return 'page-admin-appearance';
          if (id.includes('src/pages/admin/AdminDashboard')) return 'page-admin-dashboard';
          if (id.includes('src/pages/admin/AdminSettings')) return 'page-admin-settings';
          if (id.includes('src/pages/admin/AdminPackages')) return 'page-admin-packages';
          if (id.includes('src/pages/admin/AdminBookings')) return 'page-admin-bookings';
          if (id.includes('src/pages/admin/AdminFinance')) return 'page-admin-finance';
          if (id.includes('src/pages/admin/')) return 'page-admin-other';
          
          // Page chunks - Customer pages
          if (id.includes('src/pages/customer/')) return 'page-customer';
          if (id.includes('src/pages/operational/')) return 'page-operational';
          if (id.includes('src/pages/agent/')) return 'page-agent';
          
          // Component chunks
          if (id.includes('src/components/admin/')) return 'comp-admin';
          if (id.includes('src/components/')) return 'comp-shared';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
}));
